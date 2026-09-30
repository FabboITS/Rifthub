from django.contrib import admin

from . import models

admin.site.register(
    [models.PlayerCard, models.PlayerStats, models.Swipe, models.PlayerSwipe, models.ScoutMatch, models.ScoutMessage]
)
