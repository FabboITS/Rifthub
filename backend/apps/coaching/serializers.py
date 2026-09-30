from rest_framework import serializers

from apps.accounts.serializers import UserSummarySerializer

from .models import ActionItem, CoachingSession, VODComment, VODReview


class VODCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.__str__", read_only=True, default="")

    class Meta:
        model = VODComment
        fields = ["id", "review", "author", "author_name", "timestamp_seconds", "category", "severity", "text",
                  "created_at"]
        read_only_fields = ["author"]


class VODReviewSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.name", read_only=True)
    reviewer_name = serializers.CharField(source="reviewer.__str__", read_only=True, default="")
    comment_count = serializers.IntegerField(source="comments.count", read_only=True)

    class Meta:
        model = VODReview
        fields = [
            "id", "team", "team_name", "title", "video_url", "video_platform", "reviewer", "reviewer_name",
            "player_reviewed", "match_date", "champion", "role", "result", "ai_summary", "status",
            "comment_count", "created_at",
        ]
        read_only_fields = ["video_platform", "reviewer", "ai_summary"]


class ActionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActionItem
        fields = ["id", "session", "text", "done", "created_at"]


class CoachingSessionSerializer(serializers.ModelSerializer):
    action_items = ActionItemSerializer(many=True, read_only=True)
    coach_detail = UserSummarySerializer(source="coach", read_only=True)
    student_detail = UserSummarySerializer(source="student", read_only=True)

    class Meta:
        model = CoachingSession
        fields = [
            "id", "coach", "coach_detail", "student", "student_detail", "scheduled_at", "duration_minutes",
            "topic", "status", "notes", "homework", "action_items", "created_at",
        ]
        read_only_fields = ["coach"]
