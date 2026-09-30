import pytest

from apps.riot.client import MockRiotClient, aggregate
from apps.scouting.models import PlayerCard, PlayerStats, PlayerSwipe, ScoutMatch
from apps.scouting.services import fit_score
from apps.teams.models import Membership


@pytest.fixture
def card(db):
    def make(nick, role="SUPPORT", rank="DIAMOND_2", **kw):
        c = PlayerCard.objects.create(nickname=nick, role=role, rank=rank, **kw)
        PlayerStats.objects.create(player=c, games=100, winrate=55, kda=3.2, cs_per_min=7)
        return c

    return make


def test_rank_score_computed(card):
    assert card("a", rank="DIAMOND_2").rank_score == 2600
    assert card("b", rank="IRON_4").rank_score == 0


def test_fit_score_prefers_missing_role():
    assert fit_score("SUPPORT", 2000, True, False, ["SUPPORT"], 1800) > fit_score("MID", 2000, True, False, ["SUPPORT"], 1800)
    assert fit_score("SUPPORT", 2000, True, True, ["SUPPORT"], 1800) == 100


def test_mutual_like_creates_match(make_team, client_for, card):
    team = make_team()
    p = card("Mutual")
    c = client_for(team.owner)
    res = c.post("/api/scouting/swipe/", {"team": team.id, "player": p.id, "direction": "LIKE"})
    assert res.data["matched"] is False
    PlayerSwipe.objects.create(player=p, team=team, direction="LIKE")
    other = card("Other")
    PlayerSwipe.objects.create(player=other, team=team, direction="LIKE")
    res = c.post("/api/scouting/swipe/", {"team": team.id, "player": other.id, "direction": "LIKE"})
    assert res.data["matched"] is True and res.data["new_match"] is True
    # PASS never matches
    third = card("Third")
    PlayerSwipe.objects.create(player=third, team=team, direction="LIKE")
    assert c.post("/api/scouting/swipe/", {"team": team.id, "player": third.id, "direction": "PASS"}).data["matched"] is False
    assert ScoutMatch.objects.filter(team=team).count() == 1


def test_player_swipe_completes_match(make_team, make_user, client_for, card):
    team = make_team()
    user = make_user(role="PLAYER")
    p = card("Solo", user=user)
    client_for(team.owner).post("/api/scouting/swipe/", {"team": team.id, "player": p.id, "direction": "LIKE"})
    res = client_for(user).post("/api/scouting/player-swipe/", {"team": team.id, "direction": "LIKE"})
    assert res.data["matched"] is True
    # both sides see the match and can chat
    match_id = res.data["match"]["id"]
    assert client_for(user).post(f"/api/scouting/matches/{match_id}/messages/", {"text": "Ciao!"}).status_code == 201
    msgs = client_for(team.owner).get(f"/api/scouting/matches/{match_id}/messages/").data["results"]
    assert msgs[0]["text"] == "Ciao!"
    # outsiders cannot read the chat
    assert client_for(make_user()).get(f"/api/scouting/matches/{match_id}/messages/").status_code == 404


def test_deck_excludes_swiped_and_members_and_ranks_fit(make_team, make_user, client_for, card):
    team = make_team()
    for role in ["TOP", "JUNGLE", "MID", "ADC"]:
        u = make_user(role="PLAYER")
        Membership.objects.create(user=u, team=team, role_in_team=role)
        card(f"m-{role}", role=role, user=u)
    swiped = card("Swiped")
    card("Mid", role="MID", looking_for_team=True)
    card("Sup", role="SUPPORT", looking_for_team=True)
    c = client_for(team.owner)
    c.post("/api/scouting/swipe/", {"team": team.id, "player": swiped.id, "direction": "PASS"})
    res = c.get(f"/api/scouting/deck/?team={team.id}")
    assert res.data["missing_roles"] == ["SUPPORT"]
    names = [r["nickname"] for r in res.data["results"]]
    assert names == ["Sup", "Mid"]


def test_cannot_swipe_for_other_team(make_team, client_for, card):
    mine, other = make_team(), make_team()
    p = card("X")
    res = client_for(mine.owner).post("/api/scouting/swipe/", {"team": other.id, "player": p.id, "direction": "LIKE"})
    assert res.status_code == 403
    assert client_for(mine.owner).get(f"/api/scouting/deck/?team={other.id}").status_code == 403


def test_compare_and_filters(make_user, client_for, card):
    a, b = card("A", role="MID", champion_pool=["Ahri", "Syndra"]), card("B", role="ADC", rank="GOLD_1")
    c = client_for(make_user())
    res = c.get(f"/api/scouting/cards/{a.id}/compare/?with={b.id}")
    assert len(res.data["metrics"]) == 8 and {"a", "b", "metric"} <= set(res.data["metrics"][0])
    assert [x["nickname"] for x in c.get("/api/scouting/cards/?champion=ahri").data["results"]] == ["A"]
    assert [x["nickname"] for x in c.get("/api/scouting/cards/?rank_max=1800").data["results"]] == ["B"]


def test_import_riot_uses_mock_without_key(make_user, client_for, card, settings):
    settings.RIOT_API_KEY = ""
    p = card("Faker#KR1", role="MID")
    res = client_for(make_user()).post(f"/api/scouting/cards/{p.id}/import-riot/")
    assert res.data["source"] == "mock"
    assert res.data["stats"] == client_for(make_user()).get(f"/api/scouting/cards/{p.id}/").data["stats"]
    assert MockRiotClient().fetch_profile("x", "EUW") == MockRiotClient().fetch_profile("x", "EUW")


def test_aggregate_riot_matches():
    p = {"kills": 4, "deaths": 2, "assists": 6, "totalMinionsKilled": 200, "neutralMinionsKilled": 10,
         "goldEarned": 12000, "visionScore": 30, "win": True, "firstBloodKill": True,
         "challenges": {"teamDamagePercentage": 0.25, "killParticipation": 0.6}}
    stats = aggregate([(p, 30), ({**p, "win": False, "firstBloodKill": False}, 30)])
    assert stats["winrate"] == 50 and stats["kda"] == 5 and stats["cs_per_min"] == 7
    assert stats["damage_share"] == 25 and stats["first_blood_rate"] == 50


def test_champions_fallback(make_user, client_for, monkeypatch):
    import requests

    from apps.riot import datadragon

    def boom(*a, **k):
        raise requests.ConnectionError("offline")

    monkeypatch.setattr(datadragon.requests, "get", boom)
    datadragon.cache.clear()
    res = client_for(make_user()).get("/api/riot/champions/")
    assert res.data["source"] == "fallback" and len(res.data["champions"]) >= 40


def test_liked_list_opens_chat_and_is_staff_only(make_team, make_user, client_for, card):
    team = make_team()
    p = card("Liked")
    c = client_for(team.owner)
    c.post("/api/scouting/swipe/", {"team": team.id, "player": p.id, "direction": "LIKE"})
    liked = c.get("/api/scouting/liked/", {"team": team.id}).data
    assert [x["nickname"] for x in liked] == ["Liked"] and liked[0]["match_id"] is None
    res = c.post("/api/scouting/liked/", {"team": team.id, "player": p.id})
    assert res.status_code == 201
    assert c.get("/api/scouting/liked/", {"team": team.id}).data[0]["match_id"] == res.data["id"]
    # a plain player of the team cannot scout
    player = make_user(role="PLAYER")
    Membership.objects.create(user=player, team=team, role_in_team="MID")
    assert client_for(player).get("/api/scouting/liked/", {"team": team.id}).status_code == 403
    assert client_for(player).get("/api/scouting/deck/", {"team": team.id}).status_code == 403


def test_anyone_creates_one_own_card(make_user, client_for):
    user = make_user(role="COACH")
    c = client_for(user)
    body = {"nickname": "Me", "role": "MID", "rank": "GOLD_1", "champion_pool": ["Ahri"]}
    assert c.post("/api/scouting/cards/", body, format="json").data["user"] == user.id
    assert c.get("/api/scouting/cards/mine/").data["nickname"] == "Me"
    assert c.post("/api/scouting/cards/", {**body, "nickname": "Me2"}, format="json").status_code == 400
