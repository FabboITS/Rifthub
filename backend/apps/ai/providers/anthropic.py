import anthropic

from .base import LLMProvider, LLMResponse, ProviderError, ToolCall

MAX_TOKENS = 16000


class AnthropicProvider(LLMProvider):
    name = "anthropic"
    default_model = "claude-opus-5-5"

    def __init__(self, api_key, **kw):
        super().__init__(**kw)
        self.api_key = api_key

    @staticmethod
    def _convert(messages):
        system = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
        out = []
        for m in messages:
            if m["role"] == "system":
                continue
            if m["role"] == "tool":
                block = {"type": "tool_result", "tool_use_id": m["tool_call_id"], "content": m["content"]}
                if out and out[-1]["role"] == "user" and isinstance(out[-1]["content"], list):
                    out[-1]["content"].append(block)  # consecutive results share one user turn
                else:
                    out.append({"role": "user", "content": [block]})
            elif m.get("tool_calls"):
                blocks = [{"type": "text", "text": m["content"]}] if m.get("content") else []
                blocks += [{"type": "tool_use", "id": c.id, "name": c.name, "input": c.args} for c in m["tool_calls"]]
                out.append({"role": "assistant", "content": blocks})
            else:
                out.append({"role": m["role"], "content": m.get("content") or ""})
        return system, out

    def chat(self, messages, tools=None, **kw):
        if not self.api_key:
            raise ProviderError("Chiave API mancante per anthropic.")
        system, msgs = self._convert(messages)
        params = {"model": self.model, "max_tokens": MAX_TOKENS, "messages": msgs}
        if system:
            params["system"] = system
        if tools:
            params["tools"] = [
                {"name": t["function"]["name"], "description": t["function"]["description"],
                 "input_schema": t["function"]["parameters"]}
                for t in tools
            ]
        try:
            client = anthropic.Anthropic(api_key=self.api_key, timeout=self.timeout)
            resp = client.messages.create(**params)
        except anthropic.APIError as e:
            raise ProviderError(f"Anthropic: {e}") from e
        text = "".join(b.text for b in resp.content if b.type == "text")
        calls = [ToolCall(b.name, b.input, b.id) for b in resp.content if b.type == "tool_use"]
        return LLMResponse(text, calls, self.model, self.name)

    def status(self):
        return {"reachable": bool(self.api_key), "model_available": bool(self.api_key)}
