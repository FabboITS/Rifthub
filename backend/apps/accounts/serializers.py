from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from rest_framework import serializers

User = get_user_model()


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "display_name", "role", "avatar_url"]


class UserSerializer(serializers.ModelSerializer):
    teams = serializers.SerializerMethodField()
    is_staff = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "username", "display_name", "role", "avatar_url", "teams", "is_staff"]
        read_only_fields = ["id", "email", "username", "role", "teams", "is_staff"]

    def get_is_staff(self, user):
        """COACH/ANALYST in at least one team: unlocks scouting, tactics and coaching creation."""
        from apps.core.permissions import is_staff_anywhere

        return is_staff_anywhere(user)

    def get_teams(self, user):
        from apps.teams.models import Team

        teams = Team.objects.filter(
            Q(owner=user) | Q(memberships__user=user, memberships__is_active=True)
        ).distinct()
        return [{"id": str(t.id), "name": t.name, "tag": t.tag} for t in teams]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.ChoiceField(
        choices=[r for r in User.Role.choices if r[0] != User.Role.ADMIN], default=User.Role.PLAYER
    )

    class Meta:
        model = User
        fields = ["id", "email", "password", "display_name", "role"]

    def create(self, data):
        return User.objects.create_user(username=data["email"], **data)
