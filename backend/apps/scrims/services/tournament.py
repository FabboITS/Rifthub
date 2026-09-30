"""DB glue around the pure bracket module."""

from django.db import transaction
from rest_framework.exceptions import ValidationError

from ..models import Tournament, TournamentMatch
from .bracket import next_slot, num_rounds, round_robin_schedule, single_elim_first_round, standings


def _place_winner(match):
    if not match.next_match_id:
        return
    _, slot = next_slot(match.position)
    nxt = match.next_match
    setattr(nxt, slot, match.winner)
    nxt.save(update_fields=[slot, "updated_at"])


@transaction.atomic
def generate_bracket(tournament):
    teams = [e.team for e in tournament.entries.select_related("team").order_by("seed", "created_at")]
    if len(teams) < 2:
        raise ValidationError("Servono almeno 2 team iscritti.")
    tournament.matches.all().delete()

    if tournament.format == Tournament.Format.ROUND_ROBIN:
        for r, pairs in enumerate(round_robin_schedule(teams), start=1):
            for p, (a, b) in enumerate(pairs):
                TournamentMatch.objects.create(tournament=tournament, round=r, position=p, team_a=a, team_b=b)
    else:
        total = num_rounds(len(teams))
        by_round = {}
        for r in range(total, 0, -1):  # final first so next_match exists
            count = 2 ** (total - r)
            by_round[r] = [
                TournamentMatch.objects.create(
                    tournament=tournament, round=r, position=p,
                    next_match=by_round[r + 1][next_slot(p)[0]] if r < total else None,
                )
                for p in range(count)
            ]
        for p, (sa, sb) in enumerate(single_elim_first_round(len(teams))):
            match = by_round[1][p]
            match.team_a = teams[sa - 1] if sa else None
            match.team_b = teams[sb - 1] if sb else None
            if bool(match.team_a) != bool(match.team_b):  # bye: auto-advance
                match.winner = match.team_a or match.team_b
            match.save()
            if match.winner:
                _place_winner(match)

    tournament.status = Tournament.Status.RUNNING
    tournament.save(update_fields=["status", "updated_at"])


@transaction.atomic
def report_result(match, score_a, score_b):
    if not (match.team_a and match.team_b):
        raise ValidationError("Il match non ha ancora entrambi i team.")
    if score_a == score_b:
        raise ValidationError("Il pareggio non è ammesso.")
    nxt = match.next_match
    if nxt and nxt.winner_id:
        raise ValidationError("Il match successivo è già stato giocato.")
    match.score_a, match.score_b = score_a, score_b
    match.winner = match.team_a if score_a > score_b else match.team_b
    match.save()
    _place_winner(match)

    t = match.tournament
    if not t.matches.filter(winner__isnull=True).exists():
        t.status = Tournament.Status.FINISHED
        t.save(update_fields=["status", "updated_at"])
    return match


def tournament_standings(tournament):
    teams = {e.team_id: e.team for e in tournament.entries.select_related("team")}
    results = [
        (m.team_a_id, m.team_b_id, m.score_a, m.score_b)
        for m in tournament.matches.filter(score_a__isnull=False, team_a__isnull=False, team_b__isnull=False)
        if m.team_a_id in teams and m.team_b_id in teams
    ]
    rows = standings(teams.keys(), results)
    for row in rows:
        t = teams[row["team"]]
        row["team"] = {"id": str(t.id), "name": t.name, "tag": t.tag}
    return rows
