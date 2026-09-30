from datetime import timedelta

from django.utils import timezone

from apps.coaching.models import VODReview


def test_vod_comments_sorted_and_permissions(make_team, make_user, client_for):
    team = make_team()
    c = client_for(team.owner)
    vod = c.post("/api/vod-reviews/", {"team": team.id, "title": "G1", "video_url": "https://youtu.be/abc"}).data
    assert vod["video_platform"] == "YOUTUBE"
    for ts in (300, 60, 120):
        assert c.post("/api/vod-comments/", {"review": vod["id"], "timestamp_seconds": ts, "text": "x"}).status_code == 201
    got = [x["timestamp_seconds"] for x in c.get(f"/api/vod-comments/?review={vod['id']}").data["results"]]
    assert got == [60, 120, 300]

    outsider = client_for(make_user())
    assert outsider.post("/api/vod-comments/", {"review": vod["id"], "timestamp_seconds": 1, "text": "x"}).status_code == 403
    assert outsider.patch(f"/api/vod-reviews/{vod['id']}/", {"title": "hack"}).status_code == 403
    assert VODReview.objects.get().title == "G1"


def test_coaching_session_and_action_items(make_team, make_user, client_for):
    coach, student = make_user(role="COACH"), make_user(role="PLAYER")
    make_team(owner=coach)
    cc, sc = client_for(coach), client_for(student)
    s = cc.post("/api/coaching-sessions/", {
        "student": student.id, "scheduled_at": timezone.now() + timedelta(days=1), "topic": "Wave management",
    }).data
    item = cc.post("/api/action-items/", {"session": s["id"], "text": "10 cs/min"}).data
    assert sc.post("/api/action-items/", {"session": s["id"], "text": "x"}).status_code == 403
    assert sc.patch(f"/api/action-items/{item['id']}/", {"done": True}).status_code == 200
    assert sc.patch(f"/api/action-items/{item['id']}/", {"text": "changed"}).status_code == 403
    assert sc.get("/api/coaching-sessions/").data["results"][0]["action_items"][0]["done"] is True
    assert client_for(make_user()).get("/api/coaching-sessions/").data["count"] == 0


def test_only_staff_create_coaching_sessions(make_team, make_user, client_for):
    team = make_team()
    player = make_user(role="PLAYER")
    body = {"student": team.owner.id, "topic": "Wave", "scheduled_at": "2030-01-01T10:00:00Z"}
    assert client_for(player).post("/api/coaching-sessions/", body).status_code == 403
    assert client_for(team.owner).post("/api/coaching-sessions/", {**body, "student": player.id}).status_code == 201
