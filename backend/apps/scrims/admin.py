from django.contrib import admin

from . import models

admin.site.register(
    [models.AvailabilitySlot, models.ScrimRequest, models.Scrim, models.Tournament,
     models.TournamentEntry, models.TournamentMatch]
)
