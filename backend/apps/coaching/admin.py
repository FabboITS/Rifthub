from django.contrib import admin

from . import models

admin.site.register([models.VODReview, models.VODComment, models.CoachingSession, models.ActionItem])
