from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("cards", views.PlayerCardViewSet, basename="card")

urlpatterns = [
    path("deck/", views.deck, name="scouting-deck"),
    path("swipe/", views.swipe, name="scouting-swipe"),
    path("liked/", views.liked, name="scouting-liked"),
    path("player-swipe/", views.player_swipe, name="scouting-player-swipe"),
    path("matches/", views.ScoutMatchList.as_view(), name="scouting-matches"),
    path("matches/<uuid:pk>/messages/", views.ScoutMessageList.as_view(), name="scouting-messages"),
    *router.urls,
]
