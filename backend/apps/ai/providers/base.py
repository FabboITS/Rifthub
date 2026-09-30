"""Provider-agnostic chat interface.

Messages use a normalised OpenAI-like shape:
  {"role": "system"|"user"|"assistant"|"tool", "content": str,
   "tool_calls": [ToolCall] (assistant only), "tool_call_id": str, "name": str (tool only)}
Tools use the OpenAI function schema: {"type": "function", "function": {name, description, parameters}}.
"""

from dataclasses import dataclass, field


@dataclass
class ToolCall:
    name: str
    args: dict
    id: str = ""


@dataclass
class LLMResponse:
    content: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    model: str = ""
    provider: str = ""


class ProviderError(Exception):
    """The provider is unreachable or returned an error."""


class ToolsNotSupported(ProviderError):
    """The model rejected native tools: the agent falls back to the JSON text protocol."""


class LLMProvider:
    name = "base"
    default_model = ""

    def __init__(self, model="", timeout=120):
        self.model = model or self.default_model
        self.timeout = timeout

    def chat(self, messages, tools=None, **kw) -> LLMResponse:
        raise NotImplementedError

    def status(self) -> dict:
        return {"reachable": True}
