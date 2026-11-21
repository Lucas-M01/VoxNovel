from urllib.parse import SplitResult, parse_qs

import pytest
from pydantic import HttpUrl

from src.adapters.http import Page, PublicHttp
from src.core.config import Settings
from src.core.exceptions import BusinessError, TranslationRateLimited
from src.services.engines.google import GoogleEngine
from src.services.logs import Event, LogBuffer
from src.services.translation import TextTranslator


def test_translation_blocks_spacing_and_independent_fallback() -> None:
    calls: list[str] = []
    pauses: list[float] = []

    def translate(block: str) -> str | None:
        calls.append(block)
        if len(calls) == 2:
            raise RuntimeError("Synthetic provider failure")
        return f"PT{len(calls)}"

    service = TextTranslator(
        Settings(translation_block_delay=0), translate, pauses.append
    )
    original = "a" * 4500 + "b" * 4500 + "c"
    assert service.translate(original) == "PT1\n\n" + "b" * 4500 + "\n\nPT3"
    assert list(map(len, calls)) == [4500, 4500, 1]
    assert pauses == [0, 0]


def test_empty_and_missing_translation_preserve_input() -> None:
    def missing(block: str) -> None:
        return None

    service = TextTranslator(Settings(translation_block_delay=0), missing)
    assert service.translate(" \n ") == " \n "
    assert service.translate("Synthetic original") == "Synthetic original"


@pytest.mark.parametrize(
    ("failure", "event"),
    [
        (TranslationRateLimited(), Event.TRANSLATION_LIMITED),
        (RuntimeError("private-provider-payload"), Event.TRANSLATION_FAILURE),
        (None, Event.TRANSLATION_EMPTY),
        ("x" * 20001, Event.TRANSLATION_EMPTY),
    ],
)
def test_translation_fallback_logs_only_fixed_safe_reasons(
    failure: Exception | str | None,
    event: Event,
    caplog: pytest.LogCaptureFixture,
) -> None:
    def translate(text: str) -> str | None:
        if isinstance(failure, Exception):
            raise failure
        return failure

    logs = LogBuffer()
    service = TextTranslator(Settings(translation_block_delay=0), translate, logs=logs)
    original = "private-chapter-payload"
    assert service.translate(original) == original
    assert len(logs.messages()) == 1
    assert logs.messages()[0].endswith(event.value)
    assert event.value in caplog.text
    assert original not in caplog.text
    assert "private-provider-payload" not in caplog.text
    assert all(record.exc_info is None for record in caplog.records)


def test_rate_limit_fallback_keeps_later_blocks_independent() -> None:
    calls = 0

    def translate(text: str) -> str:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise TranslationRateLimited()
        return "PT"

    logs = LogBuffer()
    service = TextTranslator(
        Settings(translation_block_chars=1, translation_block_delay=0),
        translate,
        logs=logs,
    )
    assert service.translate("ab") == "a\n\nPT"
    assert calls == 2
    assert len(logs.messages()) == 1
    assert logs.messages()[0].endswith(Event.TRANSLATION_LIMITED.value)


class TranslationNetwork(PublicHttp):
    def __init__(self, settings: Settings, failure: bool = False):
        super().__init__(settings, lambda host, timeout: ["8.8.8.8"])
        self.failure = failure
        self.query: dict[str, list[str]] = {}

    def _exchange(
        self, parsed: SplitResult, address: str, timeout: float, **kwargs: object
    ) -> Page:
        self.query = parse_qs(parsed.query)
        if self.failure:
            raise BusinessError("Synthetic access failure", status=502)
        return Page(
            parsed.geturl(),
            200,
            {},
            '<div class="t0">Texto traduzido sintético</div>'.encode(),
        )


def test_google_rate_limit_is_typed_and_restores_http_binding(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import deep_translator.google as google

    class RateLimitedNetwork(TranslationNetwork):
        def _exchange(
            self, parsed: SplitResult, address: str, timeout: float, **kwargs: object
        ) -> Page:
            return Page(parsed.geturl(), 429, {}, b"private-provider-payload")

    settings = Settings(google_translation_base=HttpUrl("https://translate.example/m"))
    network = RateLimitedNetwork(settings)
    monkeypatch.setattr(
        "src.services.engines.google.PublicHttp", lambda config: network
    )
    previous = google.requests
    with pytest.raises(TranslationRateLimited) as failure:
        GoogleEngine(settings).translate("private-chapter-payload")
    assert str(failure.value) == ""
    assert google.requests is previous


@pytest.mark.parametrize("failure", [False, True])
def test_google_translator_uses_protected_http_and_restores_binding(
    monkeypatch: pytest.MonkeyPatch, failure: bool
) -> None:
    import deep_translator.google as google

    settings = Settings(google_translation_base=HttpUrl("https://translate.example/m"))
    network = TranslationNetwork(settings, failure)
    monkeypatch.setattr(
        "src.services.engines.google.PublicHttp", lambda config: network
    )
    previous = google.requests
    engine = GoogleEngine(settings)
    if failure:
        with pytest.raises(BusinessError):
            engine.translate("Synthetic original")
    else:
        assert engine.translate("Synthetic original") == "Texto traduzido sintético"
    assert google.requests is previous
    assert network.query["sl"] == ["auto"]
    assert network.query["tl"] == ["pt"]
    assert network.query["q"] == ["Synthetic original"]
