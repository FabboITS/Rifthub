from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.serializers import UserSummarySerializer

from .models import Membership, Team


class TeamSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "tag", "region", "tier", "logo_url"]


class MembershipSerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user", queryset=get_user_model().objects.all(), write_only=True, required=False
    )
    email = serializers.EmailField(write_only=True, required=False)

    class Meta:
        model = Membership
        fields = ["id", "user", "user_id", "email", "role_in_team", "is_active", "created_at"]

    def validate(self, data):
        if "user" not in data:
            user = get_user_model().objects.filter(email=data.pop("email", "")).first()
            if not user:
                raise serializers.ValidationError("Utente non trovato (indica user_id o email).")
            data["user"] = user
        data.pop("email", None)
        return data


class TeamSerializer(serializers.ModelSerializer):
    owner = UserSummarySerializer(read_only=True)
    members = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    is_staff = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            "id", "name", "tag", "region", "tier", "logo_url", "description",
            "owner", "members", "can_edit", "is_staff", "created_at", "updated_at",
        ]

    def get_members(self, team):
        active = [m for m in team.memberships.all() if m.is_active]
        return MembershipSerializer(active, many=True).data

    def get_can_edit(self, team):
        from apps.core.permissions import can_manage_team

        return can_manage_team(self.context["request"].user, team)

    def get_is_staff(self, team):
        from apps.core.permissions import is_team_staff

        return is_team_staff(self.context["request"].user, team)
