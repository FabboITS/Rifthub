from django.db import transaction
from django.db.models import Max, Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.core.permissions import TeamScopedMixin, is_admin, is_team_staff

from .models import ReplayOverlay, ShadowSession, TacticBoard, TacticElement, TacticFrame
from .serializers import (
    DuplicateFrameSerializer,
    ReplayOverlaySerializer,
    SetFrameSerializer,
    ShadowSessionSerializer,
    TacticBoardListSerializer,
    TacticBoardSerializer,
    TacticElementSerializer,
    TacticFrameSerializer,
)


def _require_editor(user, team):
    if not is_team_staff(user, team):
        raise PermissionDenied("Solo coach e analyst del team possono gestire le tattiche.")


class TacticBoardViewSet(TeamScopedMixin, viewsets.ModelViewSet):
    editor_check = staticmethod(is_team_staff)
    queryset = TacticBoard.objects.select_related("team").prefetch_related("frames__elements")
    filterset_fields = ["team", "is_shared"]
    search_fields = ["title"]

    def get_serializer_class(self):
        return TacticBoardListSerializer if self.action == "list" else TacticBoardSerializer

    def create_extra(self):
        return {"created_by": self.request.user}

    @extend_schema(request=TacticFrameSerializer, responses=TacticFrameSerializer(many=True))
    @action(detail=True, methods=["get", "post"])
    def frames(self, request, pk=None):
        board = self.get_object()
        if request.method == "POST":
            _require_editor(request.user, board.team)
            data = request.data.copy()
            data["board"] = board.id
            if "order" not in data:
                last = board.frames.aggregate(m=Max("order"))["m"]
                data["order"] = 0 if last is None else last + 1
            ser = TacticFrameSerializer(data=data)
            ser.is_valid(raise_exception=True)
            frame = ser.save()
            return Response(TacticFrameSerializer(frame).data, status=status.HTTP_201_CREATED)
        return Response(TacticFrameSerializer(board.frames.all(), many=True).data)

    @extend_schema(request=DuplicateFrameSerializer, responses=TacticFrameSerializer)
    @action(detail=True, methods=["post"], url_path="duplicate-frame")
    def duplicate_frame(self, request, pk=None):
        board = self.get_object()
        _require_editor(request.user, board.team)
        ser = DuplicateFrameSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        src = board.frames.filter(id=ser.validated_data["frame_id"]).first()
        if not src:
            raise ValidationError("Frame non trovato in questa lavagna.")
        with transaction.atomic():
            last = board.frames.aggregate(m=Max("order"))["m"]
            copy = TacticFrame.objects.create(
                board=board, order=last + 1, label=f"{src.label} (copia)",
                game_time_seconds=src.game_time_seconds, notes=src.notes,
            )
            TacticElement.objects.bulk_create(
                TacticElement(frame=copy, **{f: getattr(e, f) for f in TacticElementSerializer.Meta.fields[2:]})
                for e in src.elements.all()
            )
        return Response(TacticFrameSerializer(copy).data, status=status.HTTP_201_CREATED)


class TacticFrameViewSet(TeamScopedMixin, viewsets.ModelViewSet):
    editor_check = staticmethod(is_team_staff)
    queryset = TacticFrame.objects.select_related("board__team").prefetch_related("elements")
    serializer_class = TacticFrameSerializer
    team_path = "board__team"
    filterset_fields = ["board"]

    @extend_schema(request=TacticElementSerializer(many=True), responses=TacticElementSerializer(many=True))
    @action(detail=True, methods=["get", "post", "put"])
    def elements(self, request, pk=None):
        """GET list · POST add one · PUT replace all (bulk save from the editor)."""
        frame = self.get_object()
        if request.method == "GET":
            return Response(TacticElementSerializer(frame.elements.all(), many=True).data)
        _require_editor(request.user, frame.board.team)
        many = request.method == "PUT"
        ser = TacticElementSerializer(data=request.data, many=many)
        ser.is_valid(raise_exception=True)
        with transaction.atomic():
            if many:
                frame.elements.all().delete()
            ser.save(frame=frame)
        frame.board.save(update_fields=["updated_at"])  # bump for shadow polling
        return Response(ser.data, status=status.HTTP_200_OK if many else status.HTTP_201_CREATED)


class TacticElementViewSet(TeamScopedMixin, viewsets.ModelViewSet):
    editor_check = staticmethod(is_team_staff)
    queryset = TacticElement.objects.select_related("frame__board__team")
    serializer_class = TacticElementSerializer
    team_path = "frame__board__team"
    filterset_fields = ["frame"]
    http_method_names = ["get", "put", "patch", "delete", "head", "options"]


class ShadowSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ShadowSessionSerializer
    filterset_fields = ["status", "board"]

    def get_queryset(self):
        qs = ShadowSession.objects.select_related("board", "coach", "player")
        user = self.request.user
        return qs if is_admin(user) else qs.filter(Q(coach=user) | Q(player=user))

    def perform_create(self, serializer):
        _require_editor(self.request.user, serializer.validated_data["board"].team)
        serializer.save(coach=self.request.user)

    def _require_coach(self, session):
        if session.coach_id != self.request.user.id and not is_admin(self.request.user):
            raise PermissionDenied("Solo il coach può controllare la sessione.")

    def perform_update(self, serializer):
        self._require_coach(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._require_coach(instance)
        instance.delete()

    @extend_schema(responses=dict)
    @action(detail=True)
    def state(self, request, pk=None):
        """Polled every 2s by the player in shadow mode."""
        s = self.get_object()
        board = TacticBoard.objects.prefetch_related("frames__elements").get(pk=s.board_id)
        return Response({
            "session": ShadowSessionSerializer(s).data,
            "role": "coach" if s.coach_id == request.user.id else "player",
            "current_frame": s.current_frame,
            "board": TacticBoardSerializer(board).data,
            "version": max(s.updated_at, board.updated_at).isoformat(),
        })

    @extend_schema(request=SetFrameSerializer, responses=ShadowSessionSerializer)
    @action(detail=True, methods=["post"], url_path="set-frame")
    def set_frame(self, request, pk=None):
        s = self.get_object()
        self._require_coach(s)
        ser = SetFrameSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if ser.validated_data["frame"] >= max(s.board.frames.count(), 1):
            raise ValidationError("Frame inesistente.")
        s.current_frame = ser.validated_data["frame"]
        s.save(update_fields=["current_frame", "updated_at"])
        return Response(ShadowSessionSerializer(s).data)


class ReplayOverlayViewSet(TeamScopedMixin, viewsets.ModelViewSet):
    editor_check = staticmethod(is_team_staff)
    queryset = ReplayOverlay.objects.select_related("board__team").prefetch_related("board__frames__elements")
    serializer_class = ReplayOverlaySerializer
    team_path = "board__team"
    filterset_fields = ["vod_review", "board"]
