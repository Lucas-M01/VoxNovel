from urllib.parse import SplitResult, parse_qs

import pytest
from pydantic import HttpUrl

from src.adapters.http import Page, PublicHttp
from src.core.config import Settings
from src.core.exceptions import BusinessError
from src.services.engines.google import GoogleEngine
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
