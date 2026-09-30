from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    path("api/", include("apps.core.urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.teams.urls")),
    path("api/", include("apps.scrims.urls")),
    path("api/scouting/", include("apps.scouting.urls")),
    path("api/", include("apps.tactics.urls")),
    path("api/", include("apps.coaching.urls")),
    path("api/ai/", include("apps.ai.urls")),
    path("api/riot/", include("apps.riot.urls")),
]
