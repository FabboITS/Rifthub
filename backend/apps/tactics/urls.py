from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("tactic-boards", views.TacticBoardViewSet, basename="tactic-board")
router.register("tactic-frames", views.TacticFrameViewSet, basename="tactic-frame")
router.register("tactic-elements", views.TacticElementViewSet, basename="tactic-element")
router.register("shadow-sessions", views.ShadowSessionViewSet, basename="shadow-session")
router.register("replay-overlays", views.ReplayOverlayViewSet, basename="replay-overlay")
urlpatterns = router.urls
