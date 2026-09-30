from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        PLAYER = "PLAYER"
        COACH = "COACH"
        MANAGER = "MANAGER"
        SCOUT = "SCOUT"
        ADMIN = "ADMIN"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.PLAYER)
    display_name = models.CharField(max_length=60, blank=True)
    avatar_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.display_name or self.email
