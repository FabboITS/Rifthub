"""OpenAI Chat Completions API; also used for OpenRouter (same schema, different base_url)."""

import json

import requests

from .base import LLMProvider, LLMResponse, ProviderError, ToolCall


class OpenAICompatProvider(LLMProvider):
    def __init__(self, base_url, api_key, name="openai", default_model="gpt-4o-mini", **kw):
        self.name, self.default_model = name, default_model
        super().__init__(**kw)
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    @staticmethod
    def _message(m):
        out = {"role": m["role"], "content": m.get("content") or ""}
        if m.get("tool_calls"):
            out["tool_calls"] = [
                {"id": c.id, "type": "function", "function": {"name": c.name, "arguments": json.dumps(c.args)}}
                for c in m["tool_calls"]
            ]
        if m["role"] == "tool":
            out["tool_call_id"] = m.get("tool_call_id", "")
        return out

    def chat(self, messages, tools=None, **kw):
        if not self.api_key:
            raise ProviderError(f"Chiave API mancante per {self.name}.")
        payload = {"model": self.model, "messages": [self._message(m) for m in messages]}
        if tools:
            payload["tools"] = tools
        try:
            r = requests.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=self.timeout,
            )
        except requests.RequestException as e:
            raise ProviderError(f"{self.name} non raggiungibile: {e}") from e
        if not r.ok:
            raise ProviderError(f"{self.name} {r.status_code}: {r.text[:200]}")
        msg = r.json()["choices"][0]["message"]
        calls = []
        for c in msg.get("tool_calls") or []:
            try:
                args = json.loads(c["function"].get("arguments") or "{}")
            except ValueError:
                args = {}
            calls.append(ToolCall(c["function"]["name"], args, c.get("id", "")))
        return LLMResponse(msg.get("content") or "", calls, self.model, self.name)

    def status(self):
        return {"reachable": bool(self.api_key), "model_available": bool(self.api_key)}
