import django_filters
from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import can_manage_team, is_admin
from apps.scrims.services.finder import team_avg_rank
from apps.teams.models import Team

from . import services
from .models import Direction, PlayerCard, ScoutMatch
from .serializers import (
    PlayerCardSerializer,
    PlayerSwipeSerializer,
    ScoutMatchSerializer,
    ScoutMessageSerializer,
    SwipeSerializer,
)


class CardFilter(django_filters.FilterSet):
    rank_min = django_filters.NumberFilter(field_name="rank_score", lookup_expr="gte")
    rank_max = django_filters.NumberFilter(field_name="rank_score", lookup_expr="lte")
    champion = django_filters.CharFilter(field_name="champion_pool", lookup_expr="icontains")

    class Meta:
        model = PlayerCard
        fields = ["role", "region", "looking_for_team"]


class CardPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS or view.action == "import_riot":
            return True
        return obj.user_id == request.user.id or is_admin(request.user) or request.user.role == "SCOUT"


class PlayerCardViewSet(viewsets.ModelViewSet):
    queryset = PlayerCard.objects.select_related("stats")
    serializer_class = PlayerCardSerializer
    permission_classes = [IsAuthenticated, CardPermission]
    filterset_class = CardFilter
    search_fields = ["nickname", "real_name"]
    ordering_fields = [
        "rank_score", "age", "nickname", "stats__winrate", "stats__kda", "stats__cs_per_min",
        "stats__gold_per_min", "stats__damage_share", "stats__vision_score_per_min", "stats__kill_participation",
    ]

    def perform_create(self, serializer):
        user = self.request.user
        own = user.role == "PLAYER" and not PlayerCard.objects.filter(user=user).exists()
        serializer.save(user=user if own else None)

    @extend_schema(parameters=[OpenApiParameter("with", str, required=True)], responses=dict)
    @action(detail=True)
    def compare(self, request, pk=None):
        a = self.get_object()
        b = get_object_or_404(PlayerCard, pk=request.query_params.get("with"))
        ra, rb = services.radar(getattr(a, "stats", None)), services.radar(getattr(b, "stats", None))
        metrics = [
            {"metric": x["metric"], "key": x["key"], "a": x["value"], "b": y["value"], "a_raw": x["raw"], "b_raw": y["raw"]}
            for x, y in zip(ra, rb, strict=False)
        ]
        ser = PlayerCardSerializer
        return Response({"a": ser(a).data, "b": ser(b).data, "metrics": metrics})

    @extend_schema(request=None, responses=PlayerCardSerializer)
    @action(detail=True, methods=["post"], url_path="import-riot")
    def import_riot(self, request, pk=None):
        from apps.riot.client import import_player_stats

        card = self.get_object()
        source = import_player_stats(card)
        card.refresh_from_db()
        data = PlayerCardSerializer(card).data
        data["source"] = source
        return Response(data)


def _managed_team(user, team_id):
    team = get_object_or_404(Team, pk=team_id)
    if not can_manage_team(user, team):
        raise PermissionDenied("Puoi fare scouting solo per un team che gestisci.")
    return team


@extend_schema(parameters=[OpenApiParameter("team", str, required=True)], responses=PlayerCardSerializer(many=True))
@api_view(["GET"])
def deck(request):
    team_id = request.query_params.get("team")
    if not team_id:
        raise ValidationError({"team": "Parametro obbligatorio."})
    team = _managed_team(request.user, team_id)
    missing = services.missing_roles(team)
    avg = team_avg_rank(team)
    liked_us = set(team.player_swipes.filter(direction=Direction.LIKE).values_list("player_id", flat=True))
    cards = (
        PlayerCard.objects.select_related("stats")
        .exclude(team_swipes__swiper_team=team)
        .exclude(user__memberships__team=team, user__memberships__is_active=True)
    )
    scored = []
    for card in cards:
        fit = services.fit_score(card.role, card.rank_score, card.looking_for_team, card.id in liked_us, missing, avg)
        data = PlayerCardSerializer(card).data
        data["fit_score"] = fit
        scored.append(data)
    scored.sort(key=lambda d: d["fit_score"], reverse=True)
    return Response({"missing_roles": missing, "results": scored[:20]})


@extend_schema(request=SwipeSerializer, responses=dict)
@api_view(["POST"])
def swipe(request):
    ser = SwipeSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    team = _managed_team(request.user, ser.validated_data["team"].id)
    match, created = services.team_swipe(team, ser.validated_data["player"], ser.validated_data["direction"])
    return Response(
        {"matched": bool(match), "new_match": created, "match": ScoutMatchSerializer(match).data if match else None},
        status=status.HTTP_201_CREATED,
    )


@extend_schema(request=PlayerSwipeSerializer, responses=dict)
@api_view(["POST"])
def player_swipe(request):
    card = PlayerCard.objects.filter(user=request.user).first()
    if not card:
        raise ValidationError("Serve una player card collegata al tuo account.")
    ser = PlayerSwipeSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    match, created = services.player_swipe(card, ser.validated_data["team"], ser.validated_data["direction"])
    return Response(
        {"matched": bool(match), "new_match": created, "match": ScoutMatchSerializer(match).data if match else None},
        status=status.HTTP_201_CREATED,
    )


def visible_matches(user):
    qs = ScoutMatch.objects.select_related("team", "player__stats")
    if is_admin(user):
        return qs
    managed = [t.id for t in Team.objects.filter(Q(owner=user) | Q(memberships__user=user)).distinct()
               if can_manage_team(user, t)]
    return qs.filter(Q(team_id__in=managed) | Q(player__user=user))


class ScoutMatchList(generics.ListAPIView):
    serializer_class = ScoutMatchSerializer

    def get_queryset(self):
        return visible_matches(self.request.user)


class ScoutMessageList(generics.ListCreateAPIView):
    serializer_class = ScoutMessageSerializer

    def get_match(self):
        return get_object_or_404(visible_matches(self.request.user), pk=self.kwargs["pk"])

    def get_queryset(self):
        return self.get_match().messages.select_related("sender")

    def perform_create(self, serializer):
        match = self.get_match()
        if not match.chat_open:
            raise ValidationError("La chat è chiusa.")
        serializer.save(scout_match=match, sender=self.request.user)


