from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated

EDITOR_USER_ROLES = {"MANAGER", "COACH"}
EDITOR_TEAM_ROLES = {"COACH", "ANALYST"}


def is_admin(user):
    return user.is_authenticated and (user.is_superuser or user.role == "ADMIN")


def is_team_member(user, team):
    return team.memberships.filter(user=user, is_active=True).exists()


def can_manage_team(user, team):
    """Owner, admin, or an active member acting as manager/coach/analyst."""
    if not user.is_authenticated:
        return False
    if is_admin(user) or team.owner_id == user.id:
        return True
    membership = team.memberships.filter(user=user, is_active=True).first()
    return bool(
        membership
        and (user.role in EDITOR_USER_ROLES or membership.role_in_team in EDITOR_TEAM_ROLES)
    )


def is_team_staff(user, team):
    """Admin or an active COACH/ANALYST of the team: the only ones who run scouting, tactics and coaching."""
    if is_admin(user):
        return True
    return user.is_authenticated and team.memberships.filter(
        user=user, is_active=True, role_in_team__in=EDITOR_TEAM_ROLES
    ).exists()


def is_staff_anywhere(user):
    from apps.teams.models import Membership

    return is_admin(user) or Membership.objects.filter(
        user=user, is_active=True, role_in_team__in=EDITOR_TEAM_ROLES
    ).exists()


def resolve_path(obj, path):
    """Follow a django-style path ("board__team") through attributes."""
    for part in path.split("__"):
        obj = obj.get(part) if isinstance(obj, dict) else getattr(obj, part)
        if obj is None:
            return None
    return obj


class TeamEditPermission(BasePermission):
    """Reads are open to authenticated users; writes need team management rights."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        team = obj if not view.team_path else resolve_path(obj, view.team_path)
        return view.editor_check(request.user, team)


class TeamScopedMixin:
    """ViewSet mixin: checks team ownership on create/update via `team_path`."""

    team_path = "team"
    editor_check = staticmethod(can_manage_team)
    permission_classes = [IsAuthenticated, TeamEditPermission]

    def _check_team(self, validated_data):
        first = self.team_path.split("__")[0]
        if first not in validated_data:
            return
        team = resolve_path(validated_data, self.team_path)
        if team is not None and not self.editor_check(self.request.user, team):
            raise PermissionDenied("Non puoi modificare i dati di questo team.")

    def perform_create(self, serializer):
        self._check_team(serializer.validated_data)
        serializer.save(**self.create_extra())

    def perform_update(self, serializer):
        self._check_team(serializer.validated_data)
        serializer.save()

    def create_extra(self):
        return {}
