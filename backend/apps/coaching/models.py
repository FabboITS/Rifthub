from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.teams.models import Team


class VODReview(TimeStampedModel):
    class Platform(models.TextChoices):
        YOUTUBE = "YOUTUBE"
        TWITCH = "TWITCH"
        OTHER = "OTHER"

    class Result(models.TextChoices):
        WIN = "WIN"
        LOSS = "LOSS"

    class Status(models.TextChoices):
        DRAFT = "DRAFT"
        IN_REVIEW = "IN_REVIEW"
        COMPLETED = "COMPLETED"

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="vod_reviews")
    title = models.CharField(max_length=150)
    video_url = models.URLField()
    video_platform = models.CharField(max_length=8, choices=Platform.choices, default=Platform.YOUTUBE)
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    player_reviewed = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    match_date = models.DateField(null=True, blank=True)
    champion = models.CharField(max_length=40, blank=True)
    role = models.CharField(max_length=10, blank=True)
    result = models.CharField(max_length=4, choices=Result.choices, blank=True)
    ai_summary = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.IN_REVIEW)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        url = self.video_url.lower()
        if "youtu" in url:
            self.video_platform = self.Platform.YOUTUBE
        elif "twitch.tv" in url:
            self.video_platform = self.Platform.TWITCH
        else:
            self.video_platform = self.Platform.OTHER
        super().save(*args, **kwargs)


class VODComment(TimeStampedModel):
    class Category(models.TextChoices):
        MACRO = "MACRO"
        MICRO = "MICRO"
        LANING = "LANING"
        VISION = "VISION"
        TEAMFIGHT = "TEAMFIGHT"
        DRAFT = "DRAFT"
        MENTAL = "MENTAL"

    class Severity(models.TextChoices):
        INFO = "INFO"
        WARNING = "WARNING"
        CRITICAL = "CRITICAL"

    review = models.ForeignKey(VODReview, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    timestamp_seconds = models.PositiveIntegerField()
    category = models.CharField(max_length=10, choices=Category.choices, default=Category.MACRO)
    severity = models.CharField(max_length=8, choices=Severity.choices, default=Severity.INFO)
    text = models.TextField()

    class Meta:
        ordering = ["timestamp_seconds"]


class CoachingSession(TimeStampedModel):
    class Status(models.TextChoices):
        PLANNED = "PLANNED"
        DONE = "DONE"
        CANCELLED = "CANCELLED"

    coach = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="coached_sessions")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="student_sessions")
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    topic = models.CharField(max_length=150)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PLANNED)
    notes = models.TextField(blank=True)
    homework = models.TextField(blank=True)

    class Meta:
        ordering = ["-scheduled_at"]


class ActionItem(TimeStampedModel):
    session = models.ForeignKey(CoachingSession, on_delete=models.CASCADE, related_name="action_items")
    text = models.CharField(max_length=250)
    done = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
