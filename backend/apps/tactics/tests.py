from apps.tactics.models import TacticBoard


def _board(client, team):
    res = client.post("/api/tactic-boards/", {"team": team.id, "title": "Invade"})
    assert res.status_code == 201
    return res.data["id"]


def test_board_frames_elements_and_duplicate(make_team, client_for):
    team = make_team()
    c = client_for(team.owner)
    board = _board(c, team)
    f1 = c.post(f"/api/tactic-boards/{board}/frames/", {"label": "0:45"}, format="json").data
    f2 = c.post(f"/api/tactic-boards/{board}/frames/", {"label": "1:30"}, format="json").data
    assert (f1["order"], f2["order"]) == (0, 1)
    elements = [
        {"type": "CHAMPION_TOKEN", "x": 0.2, "y": 0.8, "champion": "LeeSin", "team_side": "BLUE"},
        {"type": "ARROW", "x": 0.2, "y": 0.8, "x2": 0.4, "y2": 0.6, "color": "#fff"},
    ]
    assert c.put(f"/api/tactic-frames/{f1['id']}/elements/", elements, format="json").status_code == 200
    # PUT replaces, never appends
    c.put(f"/api/tactic-frames/{f1['id']}/elements/", elements, format="json")
    assert len(c.get(f"/api/tactic-frames/{f1['id']}/elements/").data) == 2
    bad = [{"type": "WARD", "x": 1.5, "y": 0.1}]
    assert c.put(f"/api/tactic-frames/{f1['id']}/elements/", bad, format="json").status_code == 400

    dup = c.post(f"/api/tactic-boards/{board}/duplicate-frame/", {"frame_id": f1["id"]}, format="json").data
    assert dup["order"] == 2 and len(dup["elements"]) == 2
    assert len(c.get(f"/api/tactic-boards/{board}/").data["frames"]) == 3


def test_other_team_cannot_edit_board(make_team, client_for):
    team, other = make_team(), make_team()
    board = _board(client_for(team.owner), team)
    c = client_for(other.owner)
    assert c.patch(f"/api/tactic-boards/{board}/", {"title": "x"}).status_code == 403
    assert c.post(f"/api/tactic-boards/{board}/frames/", {"label": "x"}).status_code == 403
    assert c.post("/api/tactic-boards/", {"team": team.id, "title": "x"}).status_code == 403


def test_shadow_session_coach_controls_player_polls(make_team, make_user, client_for):
    team = make_team()
    coach, player = team.owner, make_user(role="PLAYER")
    cc, pc = client_for(coach), client_for(player)
    board = _board(cc, team)
    for label in ("a", "b"):
        cc.post(f"/api/tactic-boards/{board}/frames/", {"label": label})
    s = cc.post("/api/shadow-sessions/", {"board": board, "player": player.id}).data
    assert pc.post(f"/api/shadow-sessions/{s['id']}/set-frame/", {"frame": 1}).status_code == 403
    assert cc.post(f"/api/shadow-sessions/{s['id']}/set-frame/", {"frame": 5}).status_code == 400
    assert cc.post(f"/api/shadow-sessions/{s['id']}/set-frame/", {"frame": 1}).status_code == 200
    state = pc.get(f"/api/shadow-sessions/{s['id']}/state/").data
    assert state["current_frame"] == 1 and state["role"] == "player"
    assert len(state["board"]["frames"]) == 2
    assert client_for(make_user()).get(f"/api/shadow-sessions/{s['id']}/state/").status_code == 404
    assert TacticBoard.objects.count() == 1


def test_only_team_staff_create_boards(make_team, make_user, client_for):
    team = make_team()
    player = make_user(role="PLAYER")
    team.memberships.create(user=player, role_in_team="TOP")
    body = {"team": team.id, "title": "Setup drago"}
    assert client_for(player).post("/api/tactic-boards/", body).status_code == 403
    assert client_for(team.owner).post("/api/tactic-boards/", body).status_code == 201
