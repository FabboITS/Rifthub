"""DB glue around the pure matchmaking module."""

from datetime import timedelta

from django.db import transaction
from django.db.models import Avg, Q
from django.utils import timezone

from ..models import Scrim, ScrimRequest
from .matchmaking import Candidate, Slot, TeamProfile, rank_candidates

CONFLICT_WINDOW = timedelta(hours=3)
RECENT_WINDOW = timedelta(days=30)
DEFAULT_RANK = 1500


def team_avg_rank(team):
    from apps.scouting.models import PlayerCard

    avg = PlayerCard.objects.filter(
        user__memberships__team=team, user__memberships__is_active=True
    ).aggregate(v=Avg("rank_score"))["v"]
    return avg if avg is not None else DEFAULT_RANK


def build_profile(team):
    slots = [Slot(s.weekday, s.start_time, s.end_time, s.timezone) for s in team.availability.all()]
    return TeamProfile(str(team.id), team.name, team.region, team.tier, team_avg_rank(team), slots)


def recent_meetings(team_a, team_b, now):
    return (
        Scrim.objects.filter(
            Q(team_a=team_a, team_b=team_b) | Q(team_a=team_b, team_b=team_a),
            scheduled_at__gte=now - RECENT_WINDOW,
        )
        .exclude(status=Scrim.Status.CANCELLED)
        .count()
    )


def has_conflict(team, when):
    return (
        Scrim.objects.filter(Q(team_a=team) | Q(team_b=team), status=Scrim.Status.SCHEDULED)
        .filter(scheduled_at__gte=when - CONFLICT_WINDOW, scheduled_at__lte=when + CONFLICT_WINDOW)
        .exists()
    )


def find_candidates(team, desired_tier="", preferred_start=None, limit=10):
    """Score every other team with an OPEN request against `team`."""
    now = timezone.now()
    when = preferred_start or now + timedelta(days=1)
    ref_monday = (when - timedelta(days=when.weekday())).date()
    open_requests = (
        ScrimRequest.objects.filter(status=ScrimRequest.Status.OPEN)
        .exclude(team=team)
        .select_related("team")
        .order_by("team_id", "preferred_start")
    )
    seen, candidates = set(), []
    for req in open_requests:
        if req.team_id in seen:
            continue
        seen.add(req.team_id)
        candidates.append(
            Candidate(
                profile=build_profile(req.team),
                request_id=str(req.id),
                recent_meetings=recent_meetings(team, req.team, now),
                has_conflict=has_conflict(req.team, when),
            )
        )
    return rank_candidates(build_profile(team), desired_tier, candidates, ref_monday)[:limit]


def find_for_request(scrim_request):
    return find_candidates(scrim_request.team, scrim_request.desired_tier, scrim_request.preferred_start)


@transaction.atomic
def auto_match(scrim_request):
    """Create a Scrim with the best candidate; returns (scrim, candidate) or (None, None)."""
    for best in find_for_request(scrim_request):
        other = ScrimRequest.objects.select_for_update().get(id=best["request_id"])
        if other.status != ScrimRequest.Status.OPEN:
            continue
        scrim = Scrim.objects.create(
            team_a=scrim_request.team,
            team_b=other.team,
            format=scrim_request.format,
            scheduled_at=scrim_request.preferred_start,
            request_a=scrim_request,
            request_b=other,
            notes=f"Auto-match (compatibilità {best['score']}/100)",
        )
        ScrimRequest.objects.filter(id__in=[scrim_request.id, other.id]).update(
            status=ScrimRequest.Status.MATCHED
        )
        return scrim, best
    return None, None
