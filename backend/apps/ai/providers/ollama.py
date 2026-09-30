import requests

from .base import LLMProvider, LLMResponse, ProviderError, ToolCall, ToolsNotSupported


class OllamaProvider(LLMProvider):
    name = "ollama"
    default_model = "llama3.2:3b"

    def __init__(self, base_url, **kw):
        super().__init__(**kw)
        self.base_url = base_url.rstrip("/")

    @staticmethod
    def _message(m):
        out = {"role": m["role"], "content": m.get("content") or ""}
        if m.get("tool_calls"):
            out["tool_calls"] = [{"function": {"name": c.name, "arguments": c.args}} for c in m["tool_calls"]]
        if m["role"] == "tool":
            out["tool_name"] = m.get("name", "")
        return out

    def chat(self, messages, tools=None, **kw):
        payload = {"model": self.model, "messages": [self._message(m) for m in messages], "stream": False}
        if tools:
            payload["tools"] = tools
        try:
            r = requests.post(f"{self.base_url}/api/chat", json=payload, timeout=self.timeout)
        except requests.RequestException as e:
            raise ProviderError(f"Ollama non raggiungibile: {e}") from e
        if r.status_code == 400 and "does not support tools" in r.text:
            raise ToolsNotSupported(r.text)
        if r.status_code == 404:
            raise ProviderError(f"Modello '{self.model}' non ancora disponibile: attendi il download (ollama-init).")
        if not r.ok:
            raise ProviderError(f"Ollama {r.status_code}: {r.text[:200]}")
        msg = r.json().get("message", {})
        calls = [
            ToolCall(c["function"]["name"], c["function"].get("arguments") or {}, f"call_{i}")
            for i, c in enumerate(msg.get("tool_calls") or [])
        ]
        return LLMResponse(msg.get("content", ""), calls, self.model, self.name)

    def status(self):
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=3)
            models = [m["name"] for m in r.json().get("models", [])]
        except (requests.RequestException, ValueError):
            return {"reachable": False, "model_available": False, "models": []}
        wanted = self.model if ":" in self.model else f"{self.model}:latest"
        return {"reachable": True, "model_available": wanted in models, "models": models}
