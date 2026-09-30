from rest_framework import serializers

from apps.teams.models import Team
from apps.teams.serializers import TeamSummarySerializer

from .models import AvailabilitySlot, Scrim, ScrimRequest, Tournament, TournamentEntry, TournamentMatch


class TeamRefMixin(serializers.ModelSerializer):
    """Expose FK teams as nested summaries on read, ids on write."""

    team_fields = ()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for f in self.team_fields:
            team = getattr(instance, f)
            data[f] = TeamSummarySerializer(team).data if team else None
        return data


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = ["id", "team", "weekday", "start_time", "end_time", "timezone"]

    def validate_weekday(self, v):
        if v > 6:
            raise serializers.ValidationError("Il giorno deve essere fra 0 (lunedì) e 6 (domenica).")
        return v

    def validate_timezone(self, v):
        from zoneinfo import available_timezones

        if v not in available_timezones():
            raise serializers.ValidationError("Timezone non valido.")
        return v


class ScrimRequestSerializer(TeamRefMixin):
    team_fields = ("team",)

    class Meta:
        model = ScrimRequest
        fields = [
            "id", "team", "format", "desired_tier", "min_rank_score", "max_rank_score",
            "preferred_start", "status", "created_at",
        ]
        read_only_fields = ["status"]


class ScrimSerializer(TeamRefMixin):
    team_fields = ("team_a", "team_b")

    class Meta:
        model = Scrim
        fields = [
            "id", "team_a", "team_b", "format", "scheduled_at", "status", "score_a", "score_b",
            "notes", "request_a", "request_b", "created_at",
        ]
        read_only_fields = ["request_a", "request_b"]

    def validate(self, data):
        a = data.get("team_a", getattr(self.instance, "team_a", None))
        b = data.get("team_b", getattr(self.instance, "team_b", None))
        if a and a == b:
            raise serializers.ValidationError("Un team non può sfidare se stesso.")
        return data


class ResultSerializer(serializers.Serializer):
    score_a = serializers.IntegerField(min_value=0)
    score_b = serializers.IntegerField(min_value=0)


class TournamentEntrySerializer(serializers.ModelSerializer):
    team = TeamSummarySerializer(read_only=True)

    class Meta:
        model = TournamentEntry
        fields = ["id", "team", "seed"]


class TournamentSerializer(serializers.ModelSerializer):
    entries = TournamentEntrySerializer(many=True, read_only=True)
    organizer_name = serializers.CharField(source="organizer.__str__", read_only=True)
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            "id", "name", "organizer", "organizer_name", "organizer_team", "format", "start_date",
            "status", "max_teams", "description", "entries", "can_edit", "created_at",
        ]
        read_only_fields = ["organizer"]

    def get_can_edit(self, t):
        from apps.core.permissions import is_admin

        user = self.context["request"].user
        return t.organizer_id == user.id or is_admin(user)


class TournamentMatchSerializer(TeamRefMixin):
    team_fields = ("team_a", "team_b", "winner")

    class Meta:
        model = TournamentMatch
        fields = [
            "id", "tournament", "round", "position", "team_a", "team_b", "score_a", "score_b",
            "winner", "next_match", "scheduled_at",
        ]
        read_only_fields = ["tournament", "round", "position", "team_a", "team_b", "score_a", "score_b",
                            "winner", "next_match"]


class RegisterTeamSerializer(serializers.Serializer):
    team = serializers.PrimaryKeyRelatedField(queryset=Team.objects.all())
