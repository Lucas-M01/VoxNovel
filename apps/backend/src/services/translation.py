import time
from collections.abc import Callable

from src.core.config import Settings
from src.services.engines.google import GoogleEngine


class TextTranslator:
    def __init__(
        self,
        settings: Settings,
        block: Callable[[str], str | None] | None = None,
        pause: Callable[[float], None] = time.sleep,
    ):
        self.settings = settings
        self.engine = GoogleEngine(settings) if block is None else None
        self.block = block
        self.pause = pause

    def translate(self, text: str) -> str:
        if not text.strip():
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
                    continue
                translated = (
                    self.engine.translate(original, timeout=remaining)
                    if self.engine is not None
                    else self.block(original)
                    if self.block is not None
                    else None
                )
                parts.append(
                    translated
                    if translated
                    and len(translated) <= self.settings.translation_block_output_chars
                    else original
                )
                self.pause(
                    min(
                        self.settings.translation_block_delay,
                        max(0, deadline - time.monotonic()),
                    )
                )
            except Exception:
                # Preserve the prototype's fallback independently for each block.
                parts.append(original)
        return "\n\n".join(parts)
