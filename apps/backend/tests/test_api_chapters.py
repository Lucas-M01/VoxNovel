from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from src.adapters.http import Page
from src.adapters.providers import ProviderHttp
from src.api.deps import chapters
from src.core.config import Settings
from src.main import create_app
from src.repositories.preferences import Filters, PreferencesRepository
from src.services.chapters import ChapterService
from src.services.logs import Event, LogBuffer
from src.services.translation import TextTranslator


def test_original_text_keeps_cleaning_and_filters_without_calling_translation() -> None:
    config = Settings(translation_block_delay=0)
    http = MagicMock()
    http.get.return_value = Page(
        "",
        200,
        {},
        b"<h1>Chapter 3</h1><article><p>Keep this.</p><p>Advertisement</p></article>",
    )
    preferences = MagicMock(spec=PreferencesRepository)
    preferences.filters.return_value = Filters(words=["advertisement"])
    translator = MagicMock(spec=TextTranslator)
    logs = LogBuffer()
    app = create_app(config)
    app.dependency_overrides[chapters] = lambda: ChapterService(
        http, preferences, translator, logs, settings=config
    )
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/chapters/text",
            params={
                "url": "https://source.example/chapter-1",
                "chapter": 3,
                "translate": "false",
            },
        )
        assert response.status_code == 200
        assert response.json()["text"] == "Chapter 3\n\nKeep this."
        assert (
            client.get(
                "/api/v1/chapters/text",
                params={
                    "url": "https://source.example/chapter-1",
                    "chapter": 3,
                    "translate": "invalid",
                },
            ).status_code
            == 422
        )
    translator.translate.assert_not_called()
    assert not any(Event.TRANSLATION_START.value in entry for entry in logs.messages())
    assert logs.messages()[-1].endswith(Event.TEXT_READY.value)


def test_text_http_extracts_filters_before_translation() -> None:
    config = Settings(translation_block_delay=0)
    http = MagicMock()
    http.get.return_value = Page(
        "",
        200,
        {},
        b"<h1>Chapter 3</h1><article><p>Keep this.</p><p>Advertisement</p></article>",
    )
    preferences = MagicMock(spec=PreferencesRepository)
    preferences.filters.return_value = Filters(words=["advertisement"])
    translator = MagicMock(spec=TextTranslator)
    translator.translate.side_effect = lambda text: "PT: " + text
    app = create_app(config)
    app.dependency_overrides[chapters] = lambda: ChapterService(
        http, preferences, translator
    )
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/chapters/text",
            params={"url": "https://source.example/chapter-1", "chapter": 3},
        )
        assert response.status_code == 200
        assert response.json() == {
            "url": "https://source.example/chapter-3",
            "chapter": 3,
            "text": "PT: Chapter 3\n\nKeep this.",
        }
        assert (
            client.get(
                "/api/v1/chapters/text",
                params={"url": "https://source.example/", "chapter": 0},
            ).status_code
            == 422
        )
    http.get.assert_called_once_with("https://source.example/chapter-3")
    translator.translate.assert_called_once_with("Chapter 3\n\nKeep this.")


def test_private_source_is_blocked_before_filters_or_translation() -> None:
    config = Settings()
    preferences = MagicMock(spec=PreferencesRepository)
    translator = MagicMock(spec=TextTranslator)
    service = ChapterService(ProviderHttp(config), preferences, translator)
    app = create_app(config)
    app.dependency_overrides[chapters] = lambda: service
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/chapters/text",
            params={"url": "http://127.0.0.1/secret", "chapter": 1},
        )
        assert response.status_code == 400
    preferences.filters.assert_not_called()
    translator.translate.assert_not_called()
