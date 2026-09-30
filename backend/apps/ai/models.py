from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class AIReport(TimeStampedModel):
    class Kind(models.TextChoices):
        VOD_SUMMARY = "VOD_SUMMARY"
        SCOUT_SUMMARY = "SCOUT_SUMMARY"
        DRAFT_ADVICE = "DRAFT_ADVICE"
        AGENT_CHAT = "AGENT_CHAT"

    kind = models.CharField(max_length=15, choices=Kind.choices)
    input_ref = models.JSONField(default=dict)
    output = models.TextField()
    provider = models.CharField(max_length=20)
    model = models.CharField(max_length=80)
    latency_ms = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        ordering = ["-created_at"]
