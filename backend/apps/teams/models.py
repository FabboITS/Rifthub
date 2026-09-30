from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel

REGIONS = [(r, r) for r in ["EUW", "EUNE", "NA", "KR", "BR", "LAN", "LAS", "OCE", "TR", "JP"]]
LANE_ROLES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"]


class Team(TimeStampedModel):
    class Tier(models.TextChoices):
        ACADEMY = "ACADEMY"
        AMATEUR = "AMATEUR"
        SEMI_PRO = "SEMI_PRO"
        PRO = "PRO"

    name = models.CharField(max_length=80, unique=True)
    tag = models.CharField(max_length=5)
    region = models.CharField(max_length=5, choices=REGIONS, default="EUW")
    tier = models.CharField(max_length=10, choices=Tier.choices, default=Tier.AMATEUR)
    logo_url = models.URLField(blank=True)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_teams")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"[{self.tag}] {self.name}"


class Membership(TimeStampedModel):
    class RoleInTeam(models.TextChoices):
        TOP = "TOP"
        JUNGLE = "JUNGLE"
        MID = "MID"
        ADC = "ADC"
        SUPPORT = "SUPPORT"
        COACH = "COACH"
        ANALYST = "ANALYST"
        SUB = "SUB"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="memberships")
    role_in_team = models.CharField(max_length=10, choices=RoleInTeam.choices)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ["user", "team"]
        ordering = ["role_in_team"]
