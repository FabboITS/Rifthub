"""Tool-calling agent: native tools when supported, JSON text protocol otherwise."""

import json
import re
import uuid

from django.db.models import Q
from django.utils import timezone

from . import prompts
from .providers.base import ToolCall, ToolsNotSupported

MAX_ITERATIONS = 5
SUMMARY_CHARS = 300


# ── tools ───────────────────────────────────────────────────────────────
def _team(team_id):
    from apps.teams.models import Team

    try:
        return Team.objects.get(pk=uuid.UUID(str(team_id)))
    except ValueError:
        return Team.objects.get(Q(name__iexact=team_id) | Q(tag__iexact=team_id))


def _rank(value):
    from apps.scouting.ranks import rank_to_score

    if value in (None, ""):
        return None
    return int(value) if str(value).isdigit() else rank_to_score(value)


def search_players(role=None, min_rank=None, max_rank=None, region=None, looking_for_team=None):
    from apps.scouting.models import PlayerCard

    qs = PlayerCard.objects.select_related("stats")
    if role:
        qs = qs.filter(role=role.upper())
    if region:
        qs = qs.filter(region=region.upper())
    if (lo := _rank(min_rank)) is not None:
        qs = qs.filter(rank_score__gte=lo)
    if (hi := _rank(max_rank)) is not None:
        qs = qs.filter(rank_score__lte=hi)
    if looking_for_team not in (None, ""):
        # small models send booleans as strings ("false")
        qs = qs.filter(looking_for_team=str(looking_for_team).lower() in ("true", "1", "yes", "si", "sì"))
    return [
        {"id": str(c.id), "nickname": c.nickname, "role": c.role, "rank": c.rank, "region": c.region,
         "looking_for_team": c.looking_for_team,
         "winrate": getattr(getattr(c, "stats", None), "winrate", None),
         "kda": getattr(getattr(c, "stats", None), "kda", None)}
        for c in qs[:10]
    ]


def get_player_stats(player_id):
    from apps.scouting.models import PlayerCard
    from apps.scouting.serializers import PlayerStatsSerializer

    try:
        card = PlayerCard.objects.select_related("stats").get(pk=uuid.UUID(str(player_id)))
    except ValueError:
        card = PlayerCard.objects.select_related("stats").get(nickname__iexact=player_id)
    stats = PlayerStatsSerializer(card.stats).data if hasattr(card, "stats") else None
    return {"id": str(card.id), "nickname": card.nickname, "role": card.role, "rank": card.rank,
            "champion_pool": card.champion_pool, "stats": stats}


def find_scrim_opponents(team_id):
    from apps.scrims.services.finder import find_candidates

    team = _team(team_id)
    return [
        {"team": c["team_name"], "score": c["score"], "reasons": c["reasons"]}
        for c in find_candidates(team, limit=5)
    ]


def get_upcoming_scrims(team_id):
    from apps.scrims.models import Scrim

    team = _team(team_id)
    qs = Scrim.objects.filter(Q(team_a=team) | Q(team_b=team), status="SCHEDULED",
                              scheduled_at__gte=timezone.now()).select_related("team_a", "team_b")[:10]
    return [{"id": str(s.id), "vs": (s.team_b if s.team_a == team else s.team_a).name, "format": s.format,
             "scheduled_at": s.scheduled_at.isoformat()} for s in qs]


def get_vod_comments(vod_id):
    from apps.coaching.models import VODReview

    review = VODReview.objects.get(pk=uuid.UUID(str(vod_id)))
    return {"title": review.title, "comments": [
        {"t": c.timestamp_seconds, "category": c.category, "severity": c.severity, "text": c.text}
        for c in review.comments.all()
    ]}


def _schema(props, required=()):
    return {"type": "object", "properties": props, "required": list(required)}


STR = {"type": "string"}
TOOLS = {
    "search_players": (search_players, "Cerca player card per ruolo, rank (es. DIAMOND_4 o 2400) e regione.", _schema({
        "role": {"type": "string", "enum": ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"]},
        "min_rank": {"type": "string", "description": "Rank minimo, per 'almeno X' (es. DIAMOND_4)"},
        "max_rank": {"type": "string", "description": "Rank massimo, per 'al massimo X'"},
        "region": STR,
        "looking_for_team": {"type": "boolean"},
    })),
    "get_player_stats": (get_player_stats, "Statistiche avanzate di un giocatore (id o nickname).",
                         _schema({"player_id": STR}, ["player_id"])),
    "find_scrim_opponents": (find_scrim_opponents, "Migliori avversari per una scrim (team id o nome).",
                             _schema({"team_id": STR}, ["team_id"])),
    "get_upcoming_scrims": (get_upcoming_scrims, "Prossime scrim programmate di un team (id o nome).",
                            _schema({"team_id": STR}, ["team_id"])),
    "get_vod_comments": (get_vod_comments, "Commenti a timestamp di una VOD review (id).",
                         _schema({"vod_id": STR}, ["vod_id"])),
}
TOOL_SPECS = [
    {"type": "function", "function": {"name": n, "description": d, "parameters": p}} for n, (_, d, p) in TOOLS.items()
]


def execute(call):
    fn = TOOLS.get(call.name, (None,))[0]
    if fn is None:
        return {"error": f"Tool sconosciuto: {call.name}"}
    try:
        return fn(**(call.args or {}))
    except TypeError as e:
        return {"error": f"Argomenti non validi: {e}"}
    except Exception as e:  # DoesNotExist, bad ids, ...
        return {"error": str(e) or e.__class__.__name__}


def parse_json_tool(text):
    """Extract {"tool": ..., "args": {...}} from free text (fallback protocol)."""
    match = re.search(r"\{.*\}", text or "", re.S)
    if not match:
        return []
    try:
        data = json.loads(match.group(0))
    except ValueError:
        return []
    if isinstance(data, dict) and data.get("tool") in TOOLS:
        return [ToolCall(data["tool"], data.get("args") or {}, f"json_{uuid.uuid4().hex[:8]}")]
    return []


# ── loop ────────────────────────────────────────────────────────────────
def system_prompt(user, text_mode):
    from apps.teams.models import Team

    teams = Team.objects.filter(Q(owner=user) | Q(memberships__user=user)).distinct()
    team_str = ", ".join(f"{t.name} (id={t.id})" for t in teams) or "nessuno"
    prompt = prompts.AGENT_SYSTEM.format(user=user, role=user.role, teams=team_str)
    if text_mode:
        tools = "\n".join(f"- {n}: {d} Parametri: {json.dumps(p['properties'])}" for n, (_, d, p) in TOOLS.items())
        prompt += prompts.JSON_TOOL_PROTOCOL.format(tools=tools)
    return prompt


def run_agent(provider, user, message, history=()):
    """history: [(user_msg, assistant_msg)]. Returns {"answer", "tool_calls", "mode"}."""
    text_mode = False
    trace = []

    def build(text_mode):
        msgs = [{"role": "system", "content": system_prompt(user, text_mode)}]
        for q, a in history:
            msgs += [{"role": "user", "content": q}, {"role": "assistant", "content": a}]
        msgs.append({"role": "user", "content": message})
        return msgs

    msgs = build(text_mode)
    answer = None
    for _ in range(MAX_ITERATIONS):
        try:
            resp = provider.chat(msgs, tools=None if text_mode else TOOL_SPECS)
        except ToolsNotSupported:
            text_mode, msgs = True, build(True)
            resp = provider.chat(msgs)
        calls = resp.tool_calls or parse_json_tool(resp.content)
        if not calls:
            answer = resp.content
            break
        msgs.append({"role": "assistant", "content": "" if not text_mode else resp.content,
                     "tool_calls": [] if text_mode else calls})
        for call in calls:
            result = execute(call)
            payload = json.dumps(result, ensure_ascii=False, default=str)
            trace.append({"name": call.name, "args": call.args, "result": payload[:SUMMARY_CHARS]})
            if text_mode:
                msgs.append({"role": "user", "content": f"RISULTATO TOOL {call.name}: {payload}"})
            else:
                msgs.append({"role": "tool", "content": payload, "tool_call_id": call.id, "name": call.name})
    if answer is None:  # iterations exhausted: ask for a final answer without tools
        msgs.append({"role": "user", "content": "Rispondi ora all'utente usando i risultati ottenuti."})
        answer = provider.chat(msgs).content
    return {"answer": answer.strip(), "tool_calls": trace, "mode": "json" if text_mode else "native"}
