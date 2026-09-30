from rest_framework import serializers

from .models import ReplayOverlay, ShadowSession, TacticBoard, TacticElement, TacticFrame


def _unit(v):
    if v is not None and not 0 <= v <= 1:
        raise serializers.ValidationError("Le coordinate devono essere normalizzate fra 0 e 1.")
    return v


class TacticElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = TacticElement
        fields = ["id", "frame", "type", "x", "y", "x2", "y2", "champion", "color", "team_side", "text"]
        read_only_fields = ["frame"]

    validate_x = validate_y = validate_x2 = validate_y2 = staticmethod(_unit)


class TacticFrameSerializer(serializers.ModelSerializer):
    elements = TacticElementSerializer(many=True, read_only=True)

    class Meta:
        model = TacticFrame
        fields = ["id", "board", "order", "label", "game_time_seconds", "notes", "elements"]


class TacticBoardSerializer(serializers.ModelSerializer):
    frames = TacticFrameSerializer(many=True, read_only=True)
    team_name = serializers.CharField(source="team.name", read_only=True)

    class Meta:
        model = TacticBoard
        fields = [
            "id", "team", "team_name", "title", "description", "map_variant", "created_by", "is_shared",
            "frames", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by"]


class TacticBoardListSerializer(TacticBoardSerializer):
    frames = None
    frame_count = serializers.IntegerField(source="frames.count", read_only=True)

    class Meta(TacticBoardSerializer.Meta):
        fields = [f for f in TacticBoardSerializer.Meta.fields if f != "frames"] + ["frame_count"]


class ShadowSessionSerializer(serializers.ModelSerializer):
    board_title = serializers.CharField(source="board.title", read_only=True)
    coach_name = serializers.CharField(source="coach.__str__", read_only=True)
    player_name = serializers.CharField(source="player.__str__", read_only=True)

    class Meta:
        model = ShadowSession
        fields = [
            "id", "board", "board_title", "coach", "coach_name", "player", "player_name", "status",
            "current_frame", "created_at", "updated_at",
        ]
        read_only_fields = ["coach"]


class ReplayOverlaySerializer(serializers.ModelSerializer):
    board_detail = TacticBoardSerializer(source="board", read_only=True)

    class Meta:
        model = ReplayOverlay
        fields = ["id", "board", "vod_review", "offset_seconds", "board_detail"]


class SetFrameSerializer(serializers.Serializer):
    frame = serializers.IntegerField(min_value=0)


class DuplicateFrameSerializer(serializers.Serializer):
    frame_id = serializers.UUIDField()
