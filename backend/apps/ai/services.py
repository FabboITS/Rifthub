import time
from collections import defaultdict

from apps.riot.datadragon import champion_names

from . import prompts
from .models import AIReport
from .providers.factory import get_provider


def mmss(seconds):
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def _run(kind, prompt, input_ref, user):
    provider = get_provider()
    start = time.monotonic()
    resp = provider.chat([{"role": "system", "content": prompts.SYSTEM_ANALYST}, {"role": "user", "content": prompt}])
    return AIReport.objects.create(
        kind=kind,
        input_ref=input_ref,
        output=resp.content.strip(),
        provider=provider.name,
        model=provider.model,
        latency_ms=int((time.monotonic() - start) * 1000),
        created_by=user,
    )


def vod_summary(review, user):
    grouped = defaultdict(list)
    for c in review.comments.all():
        grouped[c.category].append(f"- [{mmss(c.timestamp_seconds)}, {c.severity}] {c.text}")
    comments = "\n\n".join(f"### {cat}\n" + "\n".join(lines) for cat, lines in grouped.items())
    prompt = prompts.VOD_SUMMARY.format(
        title=review.title, champion=review.champion or "n/d", role=review.role or "n/d",
        result=review.result or "n/d", comments=comments or "(nessun commento)",
    )
    report = _run(AIReport.Kind.VOD_SUMMARY, prompt, {"vod_review_id": str(review.id)}, user)
    review.ai_summary = report.output
    review.save(update_fields=["ai_summary", "updated_at"])
    return report


def scout_summary(card, user):
    stats = getattr(card, "stats", None)
    fields = ["games", "winrate", "kda", "cs_per_min", "gold_per_min", "damage_share",
              "vision_score_per_min", "kill_participation", "first_blood_rate"]
    values = {f: getattr(stats, f) if stats else "n/d" for f in fields}
    prompt = prompts.SCOUT_SUMMARY.format(
        nickname=card.nickname, role=card.role, region=card.region, rank=card.rank, age=card.age or "n/d",
        champions=", ".join(card.champion_pool) or "n/d", bio=card.bio or "-", **values,
    )
    return _run(AIReport.Kind.SCOUT_SUMMARY, prompt, {"player_card_id": str(card.id)}, user)


def draft_advice(our_picks, enemy_picks, side, user):
    prompt = prompts.DRAFT_ADVICE.format(
        side=side, our=", ".join(our_picks) or "nessuno", enemy=", ".join(enemy_picks) or "nessuno",
        pool=", ".join(champion_names()),
    )
    ref = {"our_picks": our_picks, "enemy_picks": enemy_picks, "side": side}
    return _run(AIReport.Kind.DRAFT_ADVICE, prompt, ref, user)
