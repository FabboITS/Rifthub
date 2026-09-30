from django.contrib import admin

from .models import Membership, Team

admin.site.register([Team, Membership])
