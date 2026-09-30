from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.teams.models import Team


class TacticBoard(TimeStampedModel):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="tactic_boards")
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    map_variant = models.CharField(max_length=30, default="summoners_rift")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    is_shared = models.BooleanField(default=False)

    class Meta:
        ordering = ["-updated_at"]


class TacticFrame(TimeStampedModel):
    board = models.ForeignKey(TacticBoard, on_delete=models.CASCADE, related_name="frames")
    order = models.PositiveIntegerField(default=0)
    label = models.CharField(max_length=80, blank=True)
    game_time_seconds = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["order"]


class TacticElement(TimeStampedModel):
    class Type(models.TextChoices):
        CHAMPION_TOKEN = "CHAMPION_TOKEN"
        WARD = "WARD"
        ARROW = "ARROW"
        CIRCLE = "CIRCLE"
        TEXT = "TEXT"
        PATH = "PATH"

    class Side(models.TextChoices):
        BLUE = "BLUE"
        RED = "RED"

    frame = models.ForeignKey(TacticFrame, on_delete=models.CASCADE, related_name="elements")
    type = models.CharField(max_length=16, choices=Type.choices)
    x = models.FloatField()
    y = models.FloatField()
    x2 = models.FloatField(null=True, blank=True)
    y2 = models.FloatField(null=True, blank=True)
    champion = models.CharField(max_length=40, blank=True)
    color = models.CharField(max_length=20, blank=True)
    team_side = models.CharField(max_length=4, choices=Side.choices, default=Side.BLUE)
    text = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["created_at"]


class ShadowSession(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "OPEN"
        CLOSED = "CLOSED"

    board = models.ForeignKey(TacticBoard, on_delete=models.CASCADE, related_name="shadow_sessions")
    coach = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    player = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    status = models.CharField(max_length=6, choices=Status.choices, default=Status.OPEN)
    current_frame = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]


class ReplayOverlay(TimeStampedModel):
    board = models.ForeignKey(TacticBoard, on_delete=models.CASCADE, related_name="overlays")
    vod_review = models.ForeignKey(
        "coaching.VODReview", null=True, blank=True, on_delete=models.CASCADE, related_name="overlays"
    )
    offset_seconds = models.IntegerField(default=0)
