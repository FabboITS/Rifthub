from django.db.models import Q
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from apps.core.permissions import TeamScopedMixin, can_manage_team, is_admin, is_team_member

from .models import ActionItem, CoachingSession, VODComment, VODReview
from .serializers import ActionItemSerializer, CoachingSessionSerializer, VODCommentSerializer, VODReviewSerializer


class VODReviewViewSet(TeamScopedMixin, viewsets.ModelViewSet):
    queryset = VODReview.objects.select_related("team", "reviewer")
    serializer_class = VODReviewSerializer
    filterset_fields = ["team", "status", "result", "player_reviewed"]
    search_fields = ["title", "champion"]

    def create_extra(self):
        return {"reviewer": self.request.user}


def can_comment(user, review):
    return (
        can_manage_team(user, review.team)
        or is_team_member(user, review.team)
        or user.id in (review.reviewer_id, review.player_reviewed_id)
    )


class VODCommentViewSet(viewsets.ModelViewSet):
    queryset = VODComment.objects.select_related("author", "review__team")
    serializer_class = VODCommentSerializer
    filterset_fields = ["review", "category", "severity"]
    ordering_fields = ["timestamp_seconds", "created_at"]
    ordering = ["timestamp_seconds"]

    def perform_create(self, serializer):
        if not can_comment(self.request.user, serializer.validated_data["review"]):
            raise PermissionDenied("Non puoi commentare questa VOD.")
        serializer.save(author=self.request.user)

    def _check_owner(self, comment):
        if comment.author_id != self.request.user.id and not can_manage_team(self.request.user, comment.review.team):
            raise PermissionDenied("Puoi modificare solo i tuoi commenti.")

    def perform_update(self, serializer):
        self._check_owner(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_owner(instance)
        instance.delete()


class CoachingSessionViewSet(viewsets.ModelViewSet):
    serializer_class = CoachingSessionSerializer
    filterset_fields = ["status", "student", "coach"]
    ordering_fields = ["scheduled_at"]

    def get_queryset(self):
        qs = CoachingSession.objects.select_related("coach", "student").prefetch_related("action_items")
        user = self.request.user
        return qs if is_admin(user) else qs.filter(Q(coach=user) | Q(student=user))

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user)

    def _check_coach(self, session):
        if session.coach_id != self.request.user.id and not is_admin(self.request.user):
            raise PermissionDenied("Solo il coach può modificare la sessione.")

    def perform_update(self, serializer):
        self._check_coach(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_coach(instance)
        instance.delete()


class ActionItemViewSet(viewsets.ModelViewSet):
    serializer_class = ActionItemSerializer
    filterset_fields = ["session", "done"]

    def get_queryset(self):
        user = self.request.user
        qs = ActionItem.objects.select_related("session")
        return qs if is_admin(user) else qs.filter(Q(session__coach=user) | Q(session__student=user))

    def perform_create(self, serializer):
        session = serializer.validated_data["session"]
        if session.coach_id != self.request.user.id and not is_admin(self.request.user):
            raise PermissionDenied("Solo il coach può assegnare action item.")
        serializer.save()

    def perform_update(self, serializer):
        item = serializer.instance
        is_coach = item.session.coach_id == self.request.user.id or is_admin(self.request.user)
        if not is_coach and set(serializer.validated_data) - {"done"}:
            raise PermissionDenied("Lo studente può solo segnare l'item come completato.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.session.coach_id != self.request.user.id and not is_admin(self.request.user):
            raise PermissionDenied("Solo il coach può eliminare action item.")
        instance.delete()
