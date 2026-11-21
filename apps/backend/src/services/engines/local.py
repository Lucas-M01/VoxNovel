"""CPU-only EN→PT-BR inference with the pinned Argos/OPUS model."""

import json
import re
import time
from pathlib import Path
from threading import Lock
from typing import cast

from src.core.config import Settings
from src.core.exceptions import (
    TranslationTimeout,
    TranslationUnavailable,
    TranslationUnsupported,
)

INPUT_TOKENS = 128
OUTPUT_TOKENS = 256
BATCH_SENTENCES = 16
BATCH_TOKENS = 512


def source_language(text: str) -> str:
    # Each detector owns its RNG; no global seed/state is changed by requests.
    from langdetect.detector_factory import PROFILES_DIRECTORY, DetectorFactory

    factory = DetectorFactory()
    factory.load_profile(PROFILES_DIRECTORY)
    factory.seed = 0
    detector = factory.create()
    detector.append(text[:12000])
    languages = detector.get_probabilities()
    if not languages or languages[0].prob < 0.7:
        raise TranslationUnsupported()
    return cast(str, languages[0].lang)


class LocalEngine:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._lock = Lock()
        self._runtime: Runtime | None = None

    def needs_translation(self, text: str) -> bool:
        language = source_language(text)
        if language == "pt":
            return False
        if language != "en":
            raise TranslationUnsupported()
        if self.settings.local_model_path is None:
            raise TranslationUnavailable()
        return True

    def translate(self, text: str, *, timeout: float | None = None) -> str:
        budget = (
            min(self.settings.translation_timeout, timeout)
            if timeout is not None
            else self.settings.translation_timeout
        )
        deadline = time.monotonic() + budget
        if budget <= 0 or not self._lock.acquire(timeout=max(0, budget)):
            raise TranslationTimeout()
        try:
            if time.monotonic() >= deadline:
                raise TranslationTimeout()
            if self._runtime is None:
                path = self.settings.local_model_path
                if path is None:
                    raise TranslationUnavailable()
                try:
                    self._runtime = Runtime(
                        path, self.settings.local_translation_threads
                    )
                except Exception:
                    raise TranslationUnavailable() from None
            return self._runtime.translate(text, deadline)
        finally:
            self._lock.release()


class Runtime:
    def __init__(self, path: Path, threads: int):
        metadata = json.loads((path / "metadata.json").read_text())
        if (
            metadata.get("from_code"),
            metadata.get("to_code"),
            metadata.get("package_version"),
        ) != ("en", "pb", "1.9"):
            raise TranslationUnavailable()
        # Heavy imports and model allocation occur only after a translation request.
        import ctranslate2
        import sentencepiece

        self.model = ctranslate2.Translator(
            str(path / "model"),
            device="cpu",
            compute_type="int8",
            inter_threads=1,
            intra_threads=threads,
        )
        self.tokenizer = sentencepiece.SentencePieceProcessor(
            model_file=str(path / "sentencepiece.model")
        )

    def translate(self, text: str, deadline: float) -> str:
        paragraphs = text.split("\n")
        source: list[list[str]] = []
        owners: list[int] = []
        for index, paragraph in enumerate(paragraphs):
            for sentence in re.split(r"(?<=[.!?…])\s+", paragraph):
                if not sentence.strip():
                    continue
                tokens = cast(list[str], self.tokenizer.encode(sentence, out_type=str))
                for start in range(0, len(tokens), INPUT_TOKENS):
                    source.append(tokens[start : start + INPUT_TOKENS])
                    owners.append(index)
        output: list[list[str]] = [[] for _ in paragraphs]
        for start in range(0, len(source), BATCH_SENTENCES):
            if time.monotonic() >= deadline:
                raise TranslationTimeout()
            results = self.model.translate_batch(
                source[start : start + BATCH_SENTENCES],
                beam_size=1,
                max_batch_size=BATCH_TOKENS,
                batch_type="tokens",
                max_input_length=0,
                max_decoding_length=OUTPUT_TOKENS,
                replace_unknowns=True,
            )
            if time.monotonic() >= deadline:
                raise TranslationTimeout()
            for index, result in enumerate(results):
                tokens = result.hypotheses[0]
                # Never present a capped, silently truncated output as complete.
                if len(tokens) >= OUTPUT_TOKENS:
                    raise TranslationUnavailable()
                decoded = (
                    cast(str, self.tokenizer.decode_pieces(tokens))
                    .replace("▁", " ")
                    .strip()
                )
                if not decoded:
                    raise TranslationUnavailable()
                output[owners[start + index]].append(decoded)
        return "\n".join(" ".join(sentences) for sentences in output)
