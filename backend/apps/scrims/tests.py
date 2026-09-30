from datetime import date, time, timedelta

import pytest
from django.utils import timezone

from apps.scrims.models import AvailabilitySlot, Scrim, ScrimRequest, Tournament, TournamentEntry
from apps.scrims.services.bracket import (
    round_robin_schedule,
    seed_order,
    single_elim_first_round,
    standings,
)
from apps.scrims.services.matchmaking import (
    Candidate,
    Slot,
    TeamProfile,
    compatibility,
    overlap_minutes,
    rank_candidates,
)

MONDAY = date(2025, 1, 6)


# ── matchmaking (pure) ──────────────────────────────────────────────────
def profile(tid, slots, rank=1500, region="EUW", tier="AMATEUR"):
    return TeamProfile(tid, tid, region, tier, rank, slots)


def test_overlap_respects_timezones():
    rome = [Slot(0, time(20), time(23), "Europe/Rome")]  # 19-22 UTC in winter
    london = [Slot(0, time(19), time(22), "Europe/London")]  # 19-22 UTC
    ny = [Slot(0, time(8), time(10), "America/New_York")]  # 13-15 UTC
    assert overlap_minutes(rome, london, MONDAY) == 180
    assert overlap_minutes(rome, ny, MONDAY) == 0


def test_overlap_across_midnight_and_week_wrap():
    a = [Slot(6, time(23), time(1), "UTC")]  # sunday 23 -> monday 01
    b = [Slot(0, time(0), time(2), "UTC")]
    assert overlap_minutes(a, b, MONDAY) == 60


def test_compatibility_weights():
    slots = [Slot(1, time(19), time(22))]
    me = profile("a", slots)
    perfect, breakdown, _ = compatibility(me, "", profile("b", slots), 0, MONDAY)
    assert perfect == 100
    assert breakdown["availability"] == 40
    worse, _, reasons = compatibility(me, "", profile("c", [], rank=2600, region="NA", tier="PRO"), 3, MONDAY)
    assert worse == 0
    assert any("Nessuna disponibilità" in r for r in reasons)


def test_rank_candidates_sorts_and_excludes_conflicts():
    slots = [Slot(2, time(18), time(22))]
    me = profile("me", slots)
    cands = [
        Candidate(profile("far", slots, rank=2400)),
        Candidate(profile("near", slots, rank=1550)),
        Candidate(profile("busy", slots), has_conflict=True),
        Candidate(profile("recent", slots), recent_meetings=3),
    ]
    ranked = rank_candidates(me, "", cands, MONDAY)
    assert [r["team_id"] for r in ranked] == ["near", "recent", "far"]
    assert all(0 <= r["score"] <= 100 for r in ranked)


# ── bracket (pure) ──────────────────────────────────────────────────────
def test_seed_order_standard():
    assert seed_order(8) == [1, 8, 4, 5, 2, 7, 3, 6]


@pytest.mark.parametrize("n,byes,matches", [(2, 0, 1), (5, 3, 4), (8, 0, 4), (13, 3, 8)])
def test_single_elim_first_round(n, byes, matches):
    pairs = single_elim_first_round(n)
    assert len(pairs) == matches
    assert sum(None in p for p in pairs) == byes
    seeds = [s for p in pairs for s in p if s]
    assert sorted(seeds) == list(range(1, n + 1))
    # byes go to top seeds
    assert all(p[0] <= byes for p in pairs if None in p)


@pytest.mark.parametrize("n", [2, 5, 6, 8])
def test_round_robin_everyone_meets_once(n):
    rounds = round_robin_schedule(range(n))
    games = [frozenset(p) for r in rounds for p in r]
    assert len(games) == n * (n - 1) // 2 == len(set(games))
    for r in rounds:  # nobody plays twice in a round
        teams = [t for p in r for t in p]
        assert len(teams) == len(set(teams))


def test_standings_order():
    rows = standings(["a", "b", "c"], [("a", "b", 2, 0), ("b", "c", 2, 1), ("a", "c", 1, 2)])
    assert [r["team"] for r in rows] == ["a", "c", "b"]  # all 3 pts, sorted by diff
    assert rows[0]["points"] == 3 and rows[0]["diff"] == 1


# ── DB / API ────────────────────────────────────────────────────────────
def _tournament(make_team, n, fmt="SINGLE_ELIM"):
    teams = [make_team() for _ in range(n)]
    t = Tournament.objects.create(name="Cup", organizer=teams[0].owner, format=fmt, start_date=date.today())
    for i, team in enumerate(teams, 1):
        TournamentEntry.objects.create(tournament=t, team=team, seed=i)
    return t, teams


@pytest.mark.parametrize("n", [2, 5, 8, 13])
def test_generate_bracket_api(make_team, client_for, n):
    t, teams = _tournament(make_team, n)
    res = client_for(t.organizer).post(f"/api/tournaments/{t.id}/generate-bracket/")
    assert res.status_code == 200
    size = 1 << (n - 1).bit_length()
    assert len(res.data) == size - 1
    round2 = [m for m in res.data if m["round"] == 2]
    byes = size - n
    if round2:  # byes already advanced into round 2
        filled = sum(bool(m["team_a"]) + bool(m["team_b"]) for m in round2)
        assert filled == byes


def test_winner_propagates_to_final(make_team, client_for):
    t, teams = _tournament(make_team, 4)
    c = client_for(t.organizer)
    c.post(f"/api/tournaments/{t.id}/generate-bracket/")
    r1 = t.matches.filter(round=1).order_by("position")
    for m in r1:
        assert c.post(f"/api/tournament-matches/{m.id}/report-result/", {"score_a": 2, "score_b": 1}).status_code == 200
    final = t.matches.get(round=2)
    assert {final.team_a, final.team_b} == {r1[0].team_a, r1[1].team_a}
    c.post(f"/api/tournament-matches/{final.id}/report-result/", {"score_a": 0, "score_b": 2})
    t.refresh_from_db()
    assert t.status == "FINISHED"
    # cannot change a match once the next one is played
    res = c.post(f"/api/tournament-matches/{r1[0].id}/report-result/", {"score_a": 0, "score_b": 2})
    assert res.status_code == 400


def test_round_robin_standings(make_team, client_for):
    t, teams = _tournament(make_team, 3, fmt="ROUND_ROBIN")
    c = client_for(t.organizer)
    c.post(f"/api/tournaments/{t.id}/generate-bracket/")
    assert t.matches.count() == 3
    for m in t.matches.all():
        winner_first = m.team_a == teams[0] or (m.team_b != teams[0] and m.team_a == teams[1])
        c.post(f"/api/tournament-matches/{m.id}/report-result/",
               {"score_a": 1 if winner_first else 0, "score_b": 0 if winner_first else 1})
    rows = c.get(f"/api/tournaments/{t.id}/standings/").data
    assert [r["team"]["id"] for r in rows] == [str(x.id) for x in teams]
    assert rows[0]["wins"] == 2 and rows[0]["points"] == 6


def test_tournament_register(make_team, client_for):
    t, _ = _tournament(make_team, 2)
    t.status = "REGISTRATION"
    t.save()
    team = make_team()
    c = client_for(team.owner)
    assert c.post(f"/api/tournaments/{t.id}/register/", {"team": team.id}).status_code == 201
    assert c.post(f"/api/tournaments/{t.id}/register/", {"team": team.id}).status_code == 400
    other = make_team()
    assert c.post(f"/api/tournaments/{t.id}/register/", {"team": other.id}).status_code == 403
    # the organizer can register any team
    assert client_for(t.organizer).post(f"/api/tournaments/{t.id}/register/", {"team": other.id}).status_code == 201


def _request(team, start, **kw):
    AvailabilitySlot.objects.create(team=team, weekday=start.weekday(), start_time=time(18), end_time=time(23))
    return ScrimRequest.objects.create(team=team, preferred_start=start, **kw)


def test_find_and_auto_match(make_team, client_for):
    start = timezone.now().replace(hour=20, minute=0, second=0, microsecond=0) + timedelta(days=2)
    me, good, busy = make_team(), make_team(), make_team()
    req = _request(me, start)
    good_req = _request(good, start)
    _request(busy, start)
    Scrim.objects.create(team_a=busy, team_b=make_team(), scheduled_at=start + timedelta(hours=1))

    c = client_for(me.owner)
    cands = c.post(f"/api/scrim-requests/{req.id}/find-matches/").data["candidates"]
    assert [x["team_id"] for x in cands] == [str(good.id)]

    res = c.post(f"/api/scrim-requests/{req.id}/auto-match/")
    assert res.status_code == 201
    scrim = Scrim.objects.get(id=res.data["id"])
    assert {scrim.team_a, scrim.team_b} == {me, good}
    req.refresh_from_db()
    good_req.refresh_from_db()
    assert req.status == good_req.status == "MATCHED"


def test_team_cannot_edit_other_team_data(make_team, client_for):
    mine, other = make_team(), make_team()
    req = _request(other, timezone.now() + timedelta(days=1))
    c = client_for(mine.owner)
    assert c.patch(f"/api/scrim-requests/{req.id}/", {"format": "BO5"}).status_code == 403
    assert c.post("/api/scrim-requests/", {"team": other.id, "preferred_start": timezone.now()}).status_code == 403
    assert c.post(f"/api/scrim-requests/{req.id}/auto-match/").status_code == 403
    assert c.patch(f"/api/teams/{other.id}/", {"name": "Hacked"}).status_code == 403
    assert c.post(f"/api/teams/{other.id}/members/", {"email": mine.owner.email, "role_in_team": "MID"}).status_code == 403
