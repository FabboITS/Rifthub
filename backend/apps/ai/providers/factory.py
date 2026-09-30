from django.conf import settings

from .anthropic import AnthropicProvider
from .fake import FakeProvider
from .ollama import OllamaProvider
from .openai_compat import OpenAICompatProvider


def get_provider(name=None):
    name = (name or settings.AI_PROVIDER).lower()
    common = {"model": settings.AI_MODEL, "timeout": settings.AI_TIMEOUT}
    if name == "ollama":
        return OllamaProvider(
            settings.OLLAMA_BASE_URL, num_thread=settings.OLLAMA_NUM_THREAD,
            keep_alive=settings.OLLAMA_KEEP_ALIVE, **common,
        )
    if name == "openai":
        return OpenAICompatProvider("https://api.openai.com/v1", settings.OPENAI_API_KEY, **common)
    if name == "openrouter":
        return OpenAICompatProvider(
            "https://openrouter.ai/api/v1", settings.OPENROUTER_API_KEY,
            name="openrouter", default_model="openai/gpt-4o-mini", **common,
        )
    if name == "anthropic":
        return AnthropicProvider(settings.ANTHROPIC_API_KEY, **common)
    if name == "fake":
        return FakeProvider(**common)
    raise ValueError(f"AI_PROVIDER sconosciuto: {name}")
