from django.db import transaction

from apps.teams.models import LANE_ROLES

from .models import Direction, PlayerSwipe, ScoutMatch, Swipe

# (field, label, min, max) used to normalise stats to 0-100 for radar charts
RADAR_METRICS = [
    ("winrate", "Winrate", 40, 65),
    ("kda", "KDA", 1, 6),
    ("cs_per_min", "CS/min", 4, 10),
    ("gold_per_min", "Oro/min", 250, 500),
    ("damage_share", "Danni %", 10, 35),
    ("vision_score_per_min", "Visione/min", 0.5, 2.5),
    ("kill_participation", "KP %", 40, 75),
    ("first_blood_rate", "First blood %", 0, 40),
]


def normalize(value, lo, hi):
    return round(max(0.0, min(1.0, (value - lo) / (hi - lo))) * 100)


def radar(stats):
    if stats is None:
        return []
    return [
        {"key": f, "metric": label, "value": normalize(getattr(stats, f), lo, hi), "raw": getattr(stats, f)}
        for f, label, lo, hi in RADAR_METRICS
    ]


def missing_roles(team):
    taken = set(team.memberships.filter(is_active=True).values_list("role_in_team", flat=True))
    return [r for r in LANE_ROLES if r not in taken]


def fit_score(role, rank_score, looking_for_team, liked_us, missing, team_avg):
    """0-100: 50 open role, 30 rank (full if >= team avg), 10 free agent, 10 already liked us."""
    score = 50 if role in missing else 10
    score += 30 * max(0.0, 1 - max(0, team_avg - rank_score) / 1000)
    score += 10 if looking_for_team else 0
    score += 10 if liked_us else 0
    return round(score)


def _mutual(team, player):
    team_like = Swipe.objects.filter(swiper_team=team, player=player, direction=Direction.LIKE).exists()
    player_like = PlayerSwipe.objects.filter(team=team, player=player, direction=Direction.LIKE).exists()
    if team_like and player_like:
        match, created = ScoutMatch.objects.get_or_create(team=team, player=player)
        return match, created
    return None, False


@transaction.atomic
def team_swipe(team, player, direction):
    Swipe.objects.update_or_create(swiper_team=team, player=player, defaults={"direction": direction})
    return _mutual(team, player)


@transaction.atomic
def player_swipe(player, team, direction):
    PlayerSwipe.objects.update_or_create(player=player, team=team, defaults={"direction": direction})
    return _mutual(team, player)
