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
        self.block = block if block is not None else GoogleEngine(settings).translate
        self.pause = pause

    def translate(self, text: str) -> str:
        if not text.strip():
            return text
        parts: list[str] = []
        size = self.settings.translation_block_chars
        for position in range(0, len(text), size):
            original = text[position : position + size]
            try:
                parts.append(self.block(original) or original)
                self.pause(self.settings.translation_block_delay)
            except Exception:
                # Preserve the prototype's fallback independently for each block.
                parts.append(original)
        return "\n\n".join(parts)
