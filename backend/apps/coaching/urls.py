from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("vod-reviews", views.VODReviewViewSet, basename="vod-review")
router.register("vod-comments", views.VODCommentViewSet, basename="vod-comment")
router.register("coaching-sessions", views.CoachingSessionViewSet, basename="coaching-session")
router.register("action-items", views.ActionItemViewSet, basename="action-item")
urlpatterns = router.urls
