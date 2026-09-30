from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("availability", views.AvailabilitySlotViewSet, basename="availability")
router.register("scrim-requests", views.ScrimRequestViewSet, basename="scrim-request")
router.register("scrims", views.ScrimViewSet, basename="scrim")
router.register("tournaments", views.TournamentViewSet, basename="tournament")
router.register("tournament-matches", views.TournamentMatchViewSet, basename="tournament-match")
urlpatterns = router.urls
