import logging
import time
import uuid

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.coaching.models import VODReview
from apps.coaching.views import can_comment
from apps.scouting.models import PlayerCard

from . import services
from .agent import run_agent
from .models import AIReport
from .providers.base import ProviderError
from .providers.factory import get_provider

HISTORY_TURNS = 6
log = logging.getLogger(__name__)


def unavailable(e):
    log.error("AI provider error: %s", e)
    return Response(
        {"detail": "Provider AI non raggiungibile", "error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE
    )


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIReport
        fields = ["id", "kind", "input_ref", "output", "provider", "model", "latency_ms", "created_at"]


class VodSummaryIn(serializers.Serializer):
    vod_review_id = serializers.UUIDField()


class ScoutSummaryIn(serializers.Serializer):
    player_card_id = serializers.UUIDField()


class DraftIn(serializers.Serializer):
    our_picks = serializers.ListField(child=serializers.CharField(max_length=40), max_length=5, default=list)
    enemy_picks = serializers.ListField(child=serializers.CharField(max_length=40), max_length=5, default=list)
    side = serializers.ChoiceField(choices=["BLUE", "RED"], default="BLUE")


class ChatIn(serializers.Serializer):
    message = serializers.CharField(max_length=2000)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)


def _validated(ser_class, request):
    ser = ser_class(data=request.data)
    ser.is_valid(raise_exception=True)
    return ser.validated_data


@extend_schema(request=VodSummaryIn, responses=ReportSerializer)
@api_view(["POST"])
def vod_summary(request):
    review = get_object_or_404(VODReview, pk=_validated(VodSummaryIn, request)["vod_review_id"])
    if not can_comment(request.user, review):
        raise PermissionDenied("Non hai accesso a questa VOD.")
    try:
        report = services.vod_summary(review, request.user)
    except ProviderError as e:
        return unavailable(e)
    return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)


@extend_schema(request=ScoutSummaryIn, responses=ReportSerializer)
@api_view(["POST"])
def scout_summary(request):
    card = get_object_or_404(PlayerCard, pk=_validated(ScoutSummaryIn, request)["player_card_id"])
    try:
        report = services.scout_summary(card, request.user)
    except ProviderError as e:
        return unavailable(e)
    return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)


@extend_schema(request=DraftIn, responses=ReportSerializer)
@api_view(["POST"])
def draft_advice(request):
    data = _validated(DraftIn, request)
    try:
        report = services.draft_advice(data["our_picks"], data["enemy_picks"], data["side"], request.user)
    except ProviderError as e:
        return unavailable(e)
    return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)


@extend_schema(request=ChatIn, responses=dict)
@api_view(["POST"])
def agent_chat(request):
    data = _validated(ChatIn, request)
    conv = str(data.get("conversation_id") or uuid.uuid4())
    previous = AIReport.objects.filter(
        kind=AIReport.Kind.AGENT_CHAT, created_by=request.user, input_ref__conversation_id=conv
    ).order_by("-created_at")[:HISTORY_TURNS]
    history = [(r.input_ref.get("message", ""), r.output) for r in reversed(previous)]
    provider = get_provider()
    start = time.monotonic()
    try:
        result = run_agent(provider, request.user, data["message"], history)
    except ProviderError as e:
        return unavailable(e)
    AIReport.objects.create(
        kind=AIReport.Kind.AGENT_CHAT,
        input_ref={"conversation_id": conv, "message": data["message"], "tool_calls": result["tool_calls"]},
        output=result["answer"],
        provider=provider.name,
        model=provider.model,
        latency_ms=int((time.monotonic() - start) * 1000),
        created_by=request.user,
    )
    return Response({"conversation_id": conv, **result})


@extend_schema(responses=dict)
@api_view(["GET"])
def ai_status(request):
    provider = get_provider()
    return Response({"provider": provider.name, "model": provider.model, **provider.status()})
