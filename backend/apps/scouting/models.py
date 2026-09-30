from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.teams.models import REGIONS, Team

from .ranks import rank_to_score

ROLES = [(r, r) for r in ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"]]


class Direction(models.TextChoices):
    LIKE = "LIKE"
    PASS = "PASS"


class PlayerCard(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="player_card"
    )
    nickname = models.CharField(max_length=40, unique=True)
    real_name = models.CharField(max_length=80, blank=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    role = models.CharField(max_length=10, choices=ROLES)
    region = models.CharField(max_length=5, choices=REGIONS, default="EUW")
    rank = models.CharField(max_length=20, default="GOLD_4")
    rank_score = models.PositiveIntegerField(default=0, editable=False)
    champion_pool = models.JSONField(default=list, blank=True)
    bio = models.TextField(blank=True)
    looking_for_team = models.BooleanField(default=False)
    riot_puuid = models.CharField(max_length=100, blank=True)
    avatar_url = models.URLField(blank=True)

    class Meta:
        ordering = ["-rank_score", "nickname"]

    def save(self, *args, **kwargs):
        self.rank_score = rank_to_score(self.rank)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nickname


class PlayerStats(models.Model):
    player = models.OneToOneField(PlayerCard, on_delete=models.CASCADE, related_name="stats")
    games = models.PositiveIntegerField(default=0)
    winrate = models.FloatField(default=0, help_text="%")
    kda = models.FloatField(default=0)
    cs_per_min = models.FloatField(default=0)
    gold_per_min = models.FloatField(default=0)
    damage_share = models.FloatField(default=0, help_text="%")
    vision_score_per_min = models.FloatField(default=0)
    kill_participation = models.FloatField(default=0, help_text="%")
    first_blood_rate = models.FloatField(default=0, help_text="%")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Swipe(TimeStampedModel):
    swiper_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="swipes")
    player = models.ForeignKey(PlayerCard, on_delete=models.CASCADE, related_name="team_swipes")
    direction = models.CharField(max_length=4, choices=Direction.choices)

    class Meta:
        unique_together = ["swiper_team", "player"]


class PlayerSwipe(TimeStampedModel):
    player = models.ForeignKey(PlayerCard, on_delete=models.CASCADE, related_name="swipes")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="player_swipes")
    direction = models.CharField(max_length=4, choices=Direction.choices)

    class Meta:
        unique_together = ["player", "team"]


class ScoutMatch(TimeStampedModel):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="scout_matches")
    player = models.ForeignKey(PlayerCard, on_delete=models.CASCADE, related_name="scout_matches")
    matched_at = models.DateTimeField(auto_now_add=True)
    chat_open = models.BooleanField(default=True)

    class Meta:
        unique_together = ["team", "player"]
        ordering = ["-matched_at"]


class ScoutMessage(TimeStampedModel):
    scout_match = models.ForeignKey(ScoutMatch, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    text = models.TextField(max_length=2000)

    class Meta:
        ordering = ["created_at"]
