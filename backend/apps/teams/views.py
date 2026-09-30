from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.core.permissions import TeamScopedMixin, can_manage_team

from .models import Membership, Team
from .serializers import MembershipSerializer, TeamSerializer


class TeamViewSet(TeamScopedMixin, viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    team_path = ""
    filterset_fields = ["region", "tier"]
    search_fields = ["name", "tag"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        return Team.objects.select_related("owner").prefetch_related("memberships__user")

    def perform_create(self, serializer):
        team = serializer.save(owner=self.request.user)
        role = "COACH" if self.request.user.role == "COACH" else "ANALYST"
        Membership.objects.create(user=self.request.user, team=team, role_in_team=role)

    @action(detail=False)
    def mine(self, request):
        teams = self.get_queryset().filter(
            Q(owner=request.user) | Q(memberships__user=request.user, memberships__is_active=True)
        ).distinct()
        return Response(self.get_serializer(teams, many=True).data)

    @extend_schema(request=MembershipSerializer, responses=MembershipSerializer(many=True))
    @action(detail=True, methods=["get", "post", "delete"])
    def members(self, request, pk=None):
        """GET: roster · POST {user_id|email, role_in_team}: aggiunge · DELETE ?user_id=: rimuove."""
        team = self.get_object()
        if request.method != "GET" and not can_manage_team(request.user, team):
            raise PermissionDenied("Non puoi modificare il roster di questo team.")
        if request.method == "POST":
            ser = MembershipSerializer(data=request.data)
            ser.is_valid(raise_exception=True)
            Membership.objects.update_or_create(
                team=team, user=ser.validated_data["user"],
                defaults={"role_in_team": ser.validated_data["role_in_team"], "is_active": True},
            )
        elif request.method == "DELETE":
            deleted, _ = team.memberships.filter(user_id=request.query_params.get("user_id")).delete()
            if not deleted:
                return Response({"detail": "Membro non trovato."}, status=status.HTTP_404_NOT_FOUND)
        members = team.memberships.filter(is_active=True).select_related("user")
        return Response(MembershipSerializer(members, many=True).data)
