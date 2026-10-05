import pytest

from apps.ai.agent import parse_json_tool, run_agent
from apps.ai.providers.anthropic import AnthropicProvider
from apps.ai.providers.base import LLMProvider, LLMResponse, ProviderError, ToolCall, ToolsNotSupported
from apps.ai.providers.fake import FakeProvider
from apps.coaching.models import VODComment, VODReview
from apps.scouting.models import PlayerCard, PlayerStats


@pytest.fixture(autouse=True)
def fake_ai(settings):
    settings.AI_PROVIDER = "fake"


@pytest.fixture
def players(db):
    for nick, role, rank in [("MidOne", "MID", "DIAMOND_1"), ("MidTwo", "MID", "GOLD_2"), ("Top", "TOP", "MASTER")]:
        PlayerStats.objects.create(player=PlayerCard.objects.create(nickname=nick, role=role, rank=rank), winrate=55)


def test_agent_uses_tool_with_fake_provider(make_user, players):
    result = run_agent(FakeProvider(), make_user(), "Cercami dei mid laner")
    assert result["mode"] == "native"
    assert result["tool_calls"][0]["name"] == "search_players"
    assert result["tool_calls"][0]["args"] == {"role": "MID"}
    assert "MidOne" in result["answer"] and "Top" not in result["answer"]


class JsonOnlyProvider(LLMProvider):
    """Rejects native tools, then speaks the JSON text protocol."""

    name = "jsononly"

    def __init__(self):
        super().__init__(model="x")
        self.calls = 0

    def chat(self, messages, tools=None, **kw):
        if tools:
            raise ToolsNotSupported("does not support tools")
        self.calls += 1
        if not any("RISULTATO TOOL" in m["content"] for m in messages):
            return LLMResponse('Ok: {"tool": "search_players", "args": {"min_rank": "MASTER"}}')
        return LLMResponse("Ho trovato Top.")


def test_agent_json_fallback(make_user, players):
    result = run_agent(JsonOnlyProvider(), make_user(), "Chi è sopra master?")
    assert result["mode"] == "json"
    assert '"Top"' in result["tool_calls"][0]["result"]
    assert result["answer"] == "Ho trovato Top."


def test_agent_tool_errors_are_reported_not_raised(make_user, db):
    class BadCall(LLMProvider):
        def chat(self, messages, tools=None, **kw):
            if messages[-1]["role"] == "tool":
                return LLMResponse("Il player non esiste.")
            return LLMResponse("", [ToolCall("get_player_stats", {"player_id": "nobody"}, "c1")])

    result = run_agent(BadCall(), make_user(), "stats di nobody")
    assert "error" in result["tool_calls"][0]["result"]


def test_agent_stops_after_max_iterations(make_user, db):
    class Loop(LLMProvider):
        n = 0

        def chat(self, messages, tools=None, **kw):
            self.n += 1
            if tools is None:
                return LLMResponse("fine")
            return LLMResponse("", [ToolCall("search_players", {}, f"c{self.n}")])

    p = Loop()
    result = run_agent(p, make_user(), "loop")
    assert len(result["tool_calls"]) == 5 and result["answer"] == "fine"


def test_search_players_string_booleans(players):
    from apps.ai.agent import search_players

    PlayerCard.objects.filter(nickname="Top").update(looking_for_team=True)
    assert [p["nickname"] for p in search_players(looking_for_team="true")] == ["Top"]
    assert "Top" not in [p["nickname"] for p in search_players(looking_for_team="false")]


def test_parse_json_tool():
    assert parse_json_tool('bla {"tool": "get_vod_comments", "args": {"vod_id": "1"}}')[0].name == "get_vod_comments"
    assert parse_json_tool('{"tool": "rm_rf"}') == []
    assert parse_json_tool("nessun json") == []


def test_anthropic_message_conversion():
    system, msgs = AnthropicProvider._convert([
        {"role": "system", "content": "sys"},
        {"role": "user", "content": "q"},
        {"role": "assistant", "content": "", "tool_calls": [ToolCall("a", {}, "t1"), ToolCall("b", {}, "t2")]},
        {"role": "tool", "content": "r1", "tool_call_id": "t1"},
        {"role": "tool", "content": "r2", "tool_call_id": "t2"},
    ])
    assert system == "sys"
    assert [m["role"] for m in msgs] == ["user", "assistant", "user"]
    assert [b["tool_use_id"] for b in msgs[2]["content"]] == ["t1", "t2"]


def test_chat_endpoint_and_conversation(make_user, client_for, players):
    c = client_for(make_user())
    res = c.post("/api/ai/agent/chat/", {"message": "trova un top"}, format="json")
    assert res.status_code == 200 and res.data["tool_calls"]
    res2 = c.post("/api/ai/agent/chat/", {"message": "e un mid?", "conversation_id": res.data["conversation_id"]},
                  format="json")
    assert res2.data["conversation_id"] == res.data["conversation_id"]


def test_vod_summary_saves_report(make_team, client_for):
    team = make_team()
    review = VODReview.objects.create(team=team, title="G1", video_url="https://youtu.be/x", reviewer=team.owner)
    VODComment.objects.create(review=review, timestamp_seconds=65, category="VISION", text="Nessuna ward")
    res = client_for(team.owner).post("/api/ai/vod-summary/", {"vod_review_id": review.id})
    assert res.status_code == 201 and res.data["provider"] == "fake"
    review.refresh_from_db()
    assert "01:05" in review.ai_summary and "VISION" in review.ai_summary


def test_scout_and_draft(make_user, client_for, players):
    c = client_for(make_user())
    card = PlayerCard.objects.get(nickname="MidOne")
    assert c.post("/api/ai/scout-summary/", {"player_card_id": card.id}).status_code == 201
    res = c.post("/api/ai/draft-advice/", {"our_picks": ["Ahri"], "enemy_picks": ["Zed"], "side": "RED"},
                 format="json")
    assert res.status_code == 201


def test_provider_down_returns_503(make_user, client_for, players, monkeypatch):
    def boom(*a, **k):
        raise ProviderError("connection refused")

    monkeypatch.setattr(FakeProvider, "chat", boom)
    res = client_for(make_user()).post("/api/ai/agent/chat/", {"message": "ciao"}, format="json")
    assert res.status_code == 503 and res.data["detail"] == "Provider AI non raggiungibile"


def test_status_ollama_unreachable(make_user, client_for, settings):
    settings.AI_PROVIDER = "ollama"
    settings.OLLAMA_BASE_URL = "http://127.0.0.1:1"
    res = client_for(make_user()).get("/api/ai/status/")
    assert res.data["provider"] == "ollama" and res.data["reachable"] is False


class _Resp:
    def __init__(self, status):
        self.status_code, self.ok, self.text = status, status < 400, ""

    def json(self):
        return {"message": {"content": "ok"}}


def test_ollama_retries_transient_errors(monkeypatch):
    import requests

    from apps.ai.providers import base
    from apps.ai.providers.ollama import OllamaProvider

    replies = [requests.ConnectionError("down"), _Resp(503), _Resp(200)]

    def fake_post(*a, **kw):
        r = replies.pop(0)
        if isinstance(r, Exception):
            raise r
        return r

    monkeypatch.setattr(base.requests, "post", fake_post)
    monkeypatch.setattr(base.time, "sleep", lambda s: None)
    assert OllamaProvider("http://x", model="m").chat([{"role": "user", "content": "hi"}]).content == "ok"
    assert replies == []


def test_ollama_gives_up_after_retries(monkeypatch):
    import requests

    from apps.ai.providers import base
    from apps.ai.providers.ollama import OllamaProvider

    def down(*a, **kw):
        raise requests.ConnectionError("down")

    monkeypatch.setattr(base.requests, "post", down)
    monkeypatch.setattr(base.time, "sleep", lambda s: None)
    with pytest.raises(ProviderError, match="non raggiungibile"):
        OllamaProvider("http://x", model="m").chat([{"role": "user", "content": "hi"}])
