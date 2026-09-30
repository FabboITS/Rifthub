"""Pure-Python scrim matchmaking: no Django imports, fully unit-testable."""

from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

WEEK_MINUTES = 7 * 24 * 60
TARGET_OVERLAP_MINUTES = 180  # a full BO3 block
RANK_TOLERANCE = 1000  # rank_score gap that zeroes the rank component
RECENT_LIMIT = 3  # meetings that zero the "variety" component

WEIGHTS = {"availability": 40, "rank": 30, "region_tier": 15, "variety": 15}


@dataclass
class Slot:
    weekday: int
    start: time
    end: time
    tz: str = "Europe/Rome"


@dataclass
class TeamProfile:
    team_id: str
    name: str
    region: str
    tier: str
    avg_rank: float
    slots: list[Slot] = field(default_factory=list)


@dataclass
class Candidate:
    profile: TeamProfile
    request_id: str | None = None
    recent_meetings: int = 0
    has_conflict: bool = False


def slot_to_utc_intervals(slot, ref_monday):
    """Return [(start, end)] minutes from ref_monday 00:00 UTC, split at week wrap."""
    tz = ZoneInfo(slot.tz)
    day = ref_monday + timedelta(days=slot.weekday)
    start = datetime.combine(day, slot.start, tz)
    end = datetime.combine(day, slot.end, tz)
    if end <= start:  # crosses midnight
        end += timedelta(days=1)
    origin = datetime.combine(ref_monday, time(0), UTC)
    s = int((start - origin).total_seconds() // 60) % WEEK_MINUTES
    length = int((end - start).total_seconds() // 60)
    e = s + length
    if e <= WEEK_MINUTES:
        return [(s, e)]
    return [(s, WEEK_MINUTES), (0, e - WEEK_MINUTES)]


def overlap_minutes(slots_a, slots_b, ref_monday):
    ia = [iv for s in slots_a for iv in slot_to_utc_intervals(s, ref_monday)]
    ib = [iv for s in slots_b for iv in slot_to_utc_intervals(s, ref_monday)]
    return sum(max(0, min(a1, b1) - max(a0, b0)) for a0, a1 in ia for b0, b1 in ib)


def compatibility(me, desired_tier, other, recent_meetings, ref_monday):
    """Return (score 0-100, breakdown dict, reasons list in Italian)."""
    reasons = []
    overlap = overlap_minutes(me.slots, other.slots, ref_monday)
    availability = WEIGHTS["availability"] * min(overlap / TARGET_OVERLAP_MINUTES, 1)
    reasons.append(
        f"{overlap} minuti settimanali di disponibilità in comune" if overlap else "Nessuna disponibilità in comune"
    )

    gap = abs(me.avg_rank - other.avg_rank)
    rank = WEIGHTS["rank"] * max(0.0, 1 - gap / RANK_TOLERANCE)
    reasons.append(f"Differenza di rank medio: {round(gap)} punti")

    same_region = me.region == other.region
    tier_ok = other.tier == (desired_tier or me.tier)
    region_tier = WEIGHTS["region_tier"] / 2 * (same_region + tier_ok)
    reasons.append("Stessa regione" if same_region else f"Regione diversa ({other.region})")
    reasons.append("Tier desiderato" if tier_ok else f"Tier diverso ({other.tier})")

    variety = WEIGHTS["variety"] * (1 - min(recent_meetings, RECENT_LIMIT) / RECENT_LIMIT)
    if recent_meetings:
        reasons.append(f"Già affrontati {recent_meetings} volte di recente")
    else:
        reasons.append("Nessuno scontro recente")

    breakdown = {
        "availability": round(availability, 1),
        "rank": round(rank, 1),
        "region_tier": round(region_tier, 1),
        "variety": round(variety, 1),
        "overlap_minutes": overlap,
    }
    score = round(availability + rank + region_tier + variety)
    return score, breakdown, reasons


def rank_candidates(me, desired_tier, candidates, ref_monday: date):
    """Score and sort candidates, excluding those with a conflicting scrim."""
    results = []
    for c in candidates:
        if c.has_conflict or c.profile.team_id == me.team_id:
            continue
        score, breakdown, reasons = compatibility(me, desired_tier, c.profile, c.recent_meetings, ref_monday)
        results.append(
            {
                "team_id": c.profile.team_id,
                "team_name": c.profile.name,
                "request_id": c.request_id,
                "score": score,
                "breakdown": breakdown,
                "reasons": reasons,
            }
        )
    return sorted(results, key=lambda r: r["score"], reverse=True)
