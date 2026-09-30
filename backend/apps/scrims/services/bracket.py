"""Pure-Python bracket generation and standings."""


def seed_order(size):
    """Standard seeding for a power-of-two bracket: 1vN, 2vN-1 spread across halves."""
    order = [1]
    while len(order) < size:
        n = len(order) * 2
        order = [x for s in order for x in (s, n + 1 - s)]
    return order


def bracket_size(n):
    return 1 << (n - 1).bit_length()


def single_elim_first_round(n):
    """Pairs of seeds for round 1; seeds > n are byes (None)."""
    if n < 2:
        raise ValueError("Servono almeno 2 team")
    order = seed_order(bracket_size(n))
    seeds = [s if s <= n else None for s in order]
    return list(zip(seeds[::2], seeds[1::2], strict=True))


def num_rounds(n):
    return (bracket_size(n) - 1).bit_length()


def next_slot(position):
    """Where the winner of match `position` goes in the next round."""
    return position // 2, "team_a" if position % 2 == 0 else "team_b"


def round_robin_schedule(teams):
    """Circle method: list of rounds, each a list of (a, b) pairs; byes dropped."""
    teams = list(teams)
    if len(teams) % 2:
        teams.append(None)
    n = len(teams)
    rounds = []
    for _ in range(n - 1):
        pairs = [(teams[i], teams[n - 1 - i]) for i in range(n // 2)]
        rounds.append([p for p in pairs if None not in p])
        teams = [teams[0], teams[-1], *teams[1:-1]]
    return rounds


def standings(team_ids, results):
    """results: iterable of (team_a, team_b, score_a, score_b). 3 points per win."""
    table = {t: {"team": t, "played": 0, "wins": 0, "losses": 0, "diff": 0, "points": 0} for t in team_ids}
    for a, b, sa, sb in results:
        for team, mine, theirs in ((a, sa, sb), (b, sb, sa)):
            row = table[team]
            row["played"] += 1
            row["diff"] += mine - theirs
            if mine > theirs:
                row["wins"] += 1
                row["points"] += 3
            else:
                row["losses"] += 1
    return sorted(table.values(), key=lambda r: (-r["points"], -r["diff"], -r["wins"]))
