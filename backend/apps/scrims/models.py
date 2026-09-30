from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.teams.models import Team

FORMATS = [(f, f) for f in ["BO1", "BO2", "BO3", "BO5"]]


class AvailabilitySlot(TimeStampedModel):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="availability")
    weekday = models.PositiveSmallIntegerField(help_text="0=lunedì … 6=domenica")
    start_time = models.TimeField()
    end_time = models.TimeField()
    timezone = models.CharField(max_length=40, default="Europe/Rome")

    class Meta:
        ordering = ["weekday", "start_time"]


class ScrimRequest(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "OPEN"
        MATCHED = "MATCHED"
        CANCELLED = "CANCELLED"

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="scrim_requests")
    format = models.CharField(max_length=3, choices=FORMATS, default="BO3")
    desired_tier = models.CharField(max_length=10, choices=Team.Tier.choices, blank=True)
    min_rank_score = models.PositiveIntegerField(default=0)
    max_rank_score = models.PositiveIntegerField(default=3000)
    preferred_start = models.DateTimeField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)

    class Meta:
        ordering = ["preferred_start"]


class Scrim(TimeStampedModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED"
        PLAYED = "PLAYED"
        CANCELLED = "CANCELLED"

    team_a = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="scrims_as_a")
    team_b = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="scrims_as_b")
    format = models.CharField(max_length=3, choices=FORMATS, default="BO3")
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SCHEDULED)
    score_a = models.PositiveSmallIntegerField(null=True, blank=True)
    score_b = models.PositiveSmallIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    request_a = models.ForeignKey(ScrimRequest, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    request_b = models.ForeignKey(ScrimRequest, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        ordering = ["scheduled_at"]


class Tournament(TimeStampedModel):
    class Format(models.TextChoices):
        SINGLE_ELIM = "SINGLE_ELIM"
        ROUND_ROBIN = "ROUND_ROBIN"

    class Status(models.TextChoices):
        DRAFT = "DRAFT"
        REGISTRATION = "REGISTRATION"
        RUNNING = "RUNNING"
        FINISHED = "FINISHED"

    name = models.CharField(max_length=100)
    organizer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tournaments")
    organizer_team = models.ForeignKey(Team, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    format = models.CharField(max_length=12, choices=Format.choices, default=Format.SINGLE_ELIM)
    start_date = models.DateField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.REGISTRATION)
    max_teams = models.PositiveSmallIntegerField(default=8)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["-start_date"]


class TournamentEntry(TimeStampedModel):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="entries")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="tournament_entries")
    seed = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = ["tournament", "team"]
        ordering = ["seed"]


class TournamentMatch(TimeStampedModel):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="matches")
    round = models.PositiveSmallIntegerField()
    position = models.PositiveSmallIntegerField()
    team_a = models.ForeignKey(Team, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    team_b = models.ForeignKey(Team, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    score_a = models.PositiveSmallIntegerField(null=True, blank=True)
    score_b = models.PositiveSmallIntegerField(null=True, blank=True)
    winner = models.ForeignKey(Team, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    next_match = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    scheduled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["round", "position"]
