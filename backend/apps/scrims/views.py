from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.response import Response

from apps.core.permissions import TeamScopedMixin, can_manage_team, is_admin

from .models import AvailabilitySlot, Scrim, ScrimRequest, Tournament, TournamentEntry, TournamentMatch
from .serializers import (
    AvailabilitySlotSerializer,
    RegisterTeamSerializer,
    ResultSerializer,
    ScrimRequestSerializer,
    ScrimSerializer,
    TournamentMatchSerializer,
    TournamentSerializer,
)
from .services import finder
from .services.tournament import generate_bracket, report_result, tournament_standings


class AvailabilitySlotViewSet(TeamScopedMixin, viewsets.ModelViewSet):
    queryset = AvailabilitySlot.objects.all()
    serializer_class = AvailabilitySlotSerializer
    filterset_fields = ["team", "weekday"]


class ScrimRequestViewSet(TeamScopedMixin, viewsets.ModelViewSet):
    queryset = ScrimRequest.objects.select_related("team")
    serializer_class = ScrimRequestSerializer
    filterset_fields = ["team", "status", "format"]
    ordering_fields = ["preferred_start", "created_at"]

    def _own_request(self):
        req = self.get_object()
        if not can_manage_team(self.request.user, req.team):
            raise PermissionDenied("Non puoi gestire le richieste di questo team.")
        return req

    @extend_schema(request=None, responses=dict)
    @action(detail=True, methods=["post"], url_path="find-matches")
    def find_matches(self, request, pk=None):
        return Response({"candidates": finder.find_for_request(self._own_request())})

    @extend_schema(request=None, responses=ScrimSerializer)
    @action(detail=True, methods=["post"], url_path="auto-match")
    def auto_match(self, request, pk=None):
        req = self._own_request()
        if req.status != ScrimRequest.Status.OPEN:
            raise ValidationError("La richiesta non è più aperta.")
        scrim, best = finder.auto_match(req)
        if not scrim:
            return Response({"detail": "Nessun avversario compatibile trovato."}, status=status.HTTP_404_NOT_FOUND)
        data = ScrimSerializer(scrim).data
        data["match"] = best
        return Response(data, status=status.HTTP_201_CREATED)


class ScrimPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return can_manage_team(request.user, obj.team_a) or can_manage_team(request.user, obj.team_b)


class ScrimViewSet(TeamScopedMixin, viewsets.ModelViewSet):
    queryset = Scrim.objects.select_related("team_a", "team_b")
    serializer_class = ScrimSerializer
    team_path = "team_a"
    permission_classes = TeamScopedMixin.permission_classes[:1] + [ScrimPermission]
    filterset_fields = ["status", "format"]
    ordering_fields = ["scheduled_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        team = self.request.query_params.get("team")
        if team:
            qs = qs.filter(Q(team_a=team) | Q(team_b=team))
        if self.request.query_params.get("upcoming"):
            from django.utils import timezone

            qs = qs.filter(scheduled_at__gte=timezone.now(), status=Scrim.Status.SCHEDULED)
        return qs

    @extend_schema(request=ResultSerializer, responses=ScrimSerializer)
    @action(detail=True, methods=["post"], url_path="report-result")
    def report_result(self, request, pk=None):
        scrim = self.get_object()
        ser = ResultSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        scrim.score_a = ser.validated_data["score_a"]
        scrim.score_b = ser.validated_data["score_b"]
        scrim.status = Scrim.Status.PLAYED
        scrim.save()
        return Response(ScrimSerializer(scrim).data)


class TournamentPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS or view.action == "register":
            return True
        return obj.organizer_id == request.user.id or is_admin(request.user)


class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.select_related("organizer").prefetch_related("entries__team")
    serializer_class = TournamentSerializer
    permission_classes = TeamScopedMixin.permission_classes[:1] + [TournamentPermission]
    filterset_fields = ["status", "format"]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

    @extend_schema(request=RegisterTeamSerializer, responses=TournamentSerializer)
    @action(detail=True, methods=["post"])
    def register(self, request, pk=None):
        t = self.get_object()
        ser = RegisterTeamSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        team = ser.validated_data["team"]
        is_organizer = t.organizer_id == request.user.id or is_admin(request.user)
        if not (is_organizer or can_manage_team(request.user, team)):
            raise PermissionDenied("Puoi iscrivere solo un team che gestisci (l'organizzatore può iscrivere qualsiasi team).")
        if t.status != Tournament.Status.REGISTRATION:
            raise ValidationError("Le iscrizioni non sono aperte.")
        if t.entries.count() >= t.max_teams:
            raise ValidationError("Il torneo è al completo.")
        if t.entries.filter(team=team).exists():
            raise ValidationError("Team già iscritto.")
        TournamentEntry.objects.create(tournament=t, team=team, seed=t.entries.count() + 1)
        return Response(self.get_serializer(t).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=None, responses=TournamentMatchSerializer(many=True))
    @action(detail=True, methods=["post"], url_path="generate-bracket")
    def generate_bracket(self, request, pk=None):
        t = self.get_object()
        generate_bracket(t)
        return Response(TournamentMatchSerializer(t.matches.all(), many=True).data)

    @extend_schema(responses=TournamentMatchSerializer(many=True))
    @action(detail=True)
    def bracket(self, request, pk=None):
        t = self.get_object()
        matches = t.matches.select_related("team_a", "team_b", "winner")
        return Response(TournamentMatchSerializer(matches, many=True).data)

    @extend_schema(responses=dict)
    @action(detail=True)
    def standings(self, request, pk=None):
        return Response(tournament_standings(self.get_object()))


class TournamentMatchViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin,
                             viewsets.GenericViewSet):
    queryset = TournamentMatch.objects.select_related("tournament", "team_a", "team_b", "winner")
    serializer_class = TournamentMatchSerializer
    filterset_fields = ["tournament", "round"]

    def _check_organizer(self, match):
        if not (match.tournament.organizer_id == self.request.user.id or is_admin(self.request.user)):
            raise PermissionDenied("Solo l'organizzatore può inserire i risultati.")

    def perform_update(self, serializer):
        self._check_organizer(serializer.instance)
        serializer.save()

    @extend_schema(request=ResultSerializer, responses=TournamentMatchSerializer)
    @action(detail=True, methods=["post"], url_path="report-result")
    def report_result(self, request, pk=None):
        match = get_object_or_404(self.get_queryset(), pk=pk)
        self._check_organizer(match)
        ser = ResultSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        report_result(match, ser.validated_data["score_a"], ser.validated_data["score_b"])
        return Response(TournamentMatchSerializer(match).data)
