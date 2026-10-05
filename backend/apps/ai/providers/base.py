"""Provider-agnostic chat interface.

Messages use a normalised OpenAI-like shape:
  {"role": "system"|"user"|"assistant"|"tool", "content": str,
   "tool_calls": [ToolCall] (assistant only), "tool_call_id": str, "name": str (tool only)}
Tools use the OpenAI function schema: {"type": "function", "function": {name, description, parameters}}.
"""

import logging
import time
from dataclasses import dataclass, field

import requests

log = logging.getLogger("apps.ai")

RETRY_STATUS = {429, 502, 503, 504}
RETRY_DELAYS = (1, 3)  # seconds between attempts: 3 attempts in total


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


def post_with_retry(provider, url, **kw):
    """POST with retry on connection errors and transient statuses (429/5xx).

    Timeouts are not retried: a call can already take AI_TIMEOUT seconds and
    gunicorn kills the worker after 180 s.
    """
    for attempt, delay in enumerate((*RETRY_DELAYS, None), start=1):
        start = time.monotonic()
        try:
            r = requests.post(url, timeout=provider.timeout, **kw)
        except requests.ConnectionError as e:
            log.warning("%s attempt %d: connection error %s", provider.name, attempt, e)
            if delay is None:
                raise
        else:
            log.info("%s %s -> %s in %.1fs", provider.name, provider.model, r.status_code, time.monotonic() - start)
            if r.status_code not in RETRY_STATUS or delay is None:
                return r
        time.sleep(delay)
