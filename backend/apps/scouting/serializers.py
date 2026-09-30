from rest_framework import serializers

from apps.accounts.serializers import UserSummarySerializer
from apps.teams.models import Team
from apps.teams.serializers import TeamSummarySerializer

from .models import Direction, PlayerCard, PlayerStats, ScoutMatch, ScoutMessage
from .services import radar


class PlayerStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerStats
        exclude = ["id", "player", "created_at"]


class PlayerCardSerializer(serializers.ModelSerializer):
    stats = PlayerStatsSerializer(read_only=True)
    radar = serializers.SerializerMethodField()

    class Meta:
        model = PlayerCard
        fields = [
            "id", "user", "nickname", "real_name", "age", "role", "region", "rank", "rank_score",
            "champion_pool", "bio", "looking_for_team", "riot_puuid", "avatar_url", "stats", "radar",
            "created_at",
        ]
        read_only_fields = ["user", "rank_score"]

    def get_radar(self, card):
        return radar(getattr(card, "stats", None))

    def validate_rank(self, v):
        from .ranks import rank_to_score

        try:
            rank_to_score(v)
        except ValueError as e:
            raise serializers.ValidationError(str(e)) from e
        return v.upper()

    def validate_champion_pool(self, v):
        if not isinstance(v, list) or not all(isinstance(c, str) for c in v):
            raise serializers.ValidationError("Deve essere una lista di nomi campione.")
        return v


class SwipeSerializer(serializers.Serializer):
    team = serializers.PrimaryKeyRelatedField(queryset=Team.objects.all())
    player = serializers.PrimaryKeyRelatedField(queryset=PlayerCard.objects.all())
    direction = serializers.ChoiceField(choices=Direction.choices)


class PlayerSwipeSerializer(serializers.Serializer):
    team = serializers.PrimaryKeyRelatedField(queryset=Team.objects.all())
    direction = serializers.ChoiceField(choices=Direction.choices)


class ScoutMessageSerializer(serializers.ModelSerializer):
    sender = UserSummarySerializer(read_only=True)

    class Meta:
        model = ScoutMessage
        fields = ["id", "sender", "text", "created_at"]


class ScoutMatchSerializer(serializers.ModelSerializer):
    team = TeamSummarySerializer(read_only=True)
    player = PlayerCardSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ScoutMatch
        fields = ["id", "team", "player", "matched_at", "chat_open", "last_message"]

    def get_last_message(self, m):
        msg = m.messages.last()
        return ScoutMessageSerializer(msg).data if msg else None
