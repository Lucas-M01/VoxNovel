import logging
import time
from collections.abc import Callable

from src.core.config import Settings
from src.core.exceptions import (
    TranslationRateLimited,
    TranslationTimeout,
    TranslationUnavailable,
    TranslationUnsupported,
)
from src.services.engines.google import GoogleEngine
from src.services.engines.local import LocalEngine
from src.services.logs import Event, LogBuffer

logger = logging.getLogger(__name__)


class TextTranslator:
    def __init__(
        self,
        settings: Settings,
        block: Callable[[str], str | None] | None = None,
        pause: Callable[[float], None] = time.sleep,
        *,
        logs: LogBuffer | None = None,
    ):
        self.settings = settings
        self.engine = (
            (
                LocalEngine(settings)
                if settings.translation_engine == "local"
                else GoogleEngine(settings)
            )
            if block is None
            else None
        )
        self.block = block
        self.pause = pause
        self.logs = logs

    def _fallback(self, event: Event) -> None:
        if self.logs is not None:
            self.logs.add(event)
        # Exceptions from the provider may contain chapter text or URLs.
        logger.warning("%s", event.value)

    def translate(self, text: str) -> str:
        if not text.strip():
            return text
        if isinstance(self.engine, LocalEngine):
            try:
                if not self.engine.needs_translation(text):
                    return text
            except TranslationUnsupported:
                self._fallback(Event.TRANSLATION_UNSUPPORTED)
                return text
            except TranslationUnavailable:
                self._fallback(Event.TRANSLATION_UNAVAILABLE)
                return text
            except Exception:
                self._fallback(Event.TRANSLATION_FAILURE)
                return text
        parts: list[str] = []
        deadline = time.monotonic() + self.settings.translation_total_timeout
        size = self.settings.translation_block_chars
        for position in range(0, len(text), size):
            original = text[position : position + size]
            try:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    parts.append(original)
                    self._fallback(Event.TRANSLATION_TIMEOUT)
                    continue
                translated = (
                    self.engine.translate(original, timeout=remaining)
                    if self.engine is not None
                    else self.block(original)
                    if self.block is not None
                    else None
                )
                if (
                    translated
                    and len(translated) <= self.settings.translation_block_output_chars
                ):
                    parts.append(translated)
                else:
                    parts.append(original)
                    self._fallback(Event.TRANSLATION_EMPTY)
                self.pause(
                    min(
                        self.settings.translation_block_delay,
                        max(0, deadline - time.monotonic()),
                    )
                )
            except TranslationTimeout:
                parts.append(original)
                self._fallback(Event.TRANSLATION_TIMEOUT)
            except TranslationUnavailable:
                parts.append(original)
                self._fallback(Event.TRANSLATION_UNAVAILABLE)
            except TranslationRateLimited:
                parts.append(original)
                self._fallback(Event.TRANSLATION_LIMITED)
            except Exception:
                # Preserve the prototype's fallback independently for each block.
                parts.append(original)
                self._fallback(Event.TRANSLATION_FAILURE)
        return "\n\n".join(parts)
