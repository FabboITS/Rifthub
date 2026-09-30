"""Deterministic offline provider: used by tests and as a declared fallback (AI_PROVIDER=fake)."""

from .base import LLMProvider, LLMResponse, ToolCall

ROLE_WORDS = {"top": "TOP", "jungl": "JUNGLE", "mid": "MID", "adc": "ADC", "bot": "ADC", "support": "SUPPORT"}


class FakeProvider(LLMProvider):
    name = "fake"
    default_model = "fake-1"

    def chat(self, messages, tools=None, **kw):
        last_user = max(i for i, m in enumerate(messages) if m["role"] == "user")
        after = messages[last_user + 1:]
        text = messages[last_user]["content"]

        if tools and not any(m["role"] == "tool" for m in after):
            role = next((r for w, r in ROLE_WORDS.items() if w in text.lower()), None)
            args = {"role": role} if role else {}
            return LLMResponse("", [ToolCall("search_players", args, "fake_call_1")], self.model, self.name)

        results = [m["content"] for m in after if m["role"] == "tool"]
        if results:
            return LLMResponse(
                "[Risposta simulata] Ecco cosa ho trovato con i tool:\n" + "\n".join(r[:500] for r in results),
                model=self.model, provider=self.name,
            )
        return LLMResponse(
            "## Report simulato (provider fake)\n\nQuesto testo è generato offline a scopo di test.\n\n"
            "### Dati ricevuti\n" + text[:1500],
            model=self.model, provider=self.name,
        )
