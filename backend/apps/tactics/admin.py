from django.contrib import admin

from . import models

admin.site.register(
    [models.TacticBoard, models.TacticFrame, models.TacticElement, models.ShadowSession, models.ReplayOverlay]
)
