from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import HttpUrl

from src.adapters.http import Page
from src.core.config import Settings
from src.core.exceptions import BusinessError
from src.main import create_app
from src.repositories.chapter_text import ChapterTextRepository
from src.repositories.library import LibraryRepository
from src.repositories.models import Novel, Source
from src.repositories.preferences import PreferencesRepository
from src.services.chapters import ChapterService
from src.services.downloads import DownloadService
from src.services.logs import LogBuffer
from src.services.translation import TextTranslator


def test_log_buffer_is_bounded_and_does_not_expose_mutable_storage() -> None:
    logs = LogBuffer()
    for number in range(501):
        logs.add(f"Synthetic event {number}")
    values = logs.messages()
    assert len(values) == 500 and values[0].endswith("event 1")
    assert values[-1].endswith("event 500")
    values.clear()
    assert len(logs.messages()) == 500
    with TestClient(create_app(Settings())) as client:
        assert client.get("/api/v1/status").json() == {"status": "ok"}
        assert client.get("/api/v1/logs").json() == {"logs": []}


def test_remote_write_failure_never_reports_success() -> None:
    novel_id = uuid4()
    source = Source(
        novel_id=novel_id,
        provider="Synthetic",
        title="Synthetic",
        url_base=HttpUrl("https://source.example/"),
        chapter_url_pattern="https://source.example/chapter-{cap}",
    )
    library = MagicMock(spec=LibraryRepository)
    library.get.return_value = Novel(
        id=novel_id,
        title="Synthetic",
        slug="synthetic",
        sources=[source],
        active_source_id=source.id,
    )
    cache = MagicMock(spec=ChapterTextRepository)
    cache.exists.return_value = False
    cache.save.side_effect = BusinessError("Storage unavailable", status=503)
    content = MagicMock(spec=ChapterService)
    content.text.return_value.text = "Synthetic text"
    logs = LogBuffer()
    service = DownloadService(library, cache, content, logs)
    with pytest.raises(BusinessError) as failure:
        service.generate(novel_id, 1)
    assert failure.value.status == 503
    assert not logs.messages()


def test_empty_scrape_is_not_persisted_as_a_download() -> None:
    http = MagicMock()
    http.get.return_value = Page("", 200, {}, b"")
    preferences = MagicMock(spec=PreferencesRepository)
    translator = MagicMock(spec=TextTranslator)
    service = ChapterService(http, preferences, translator)
    with pytest.raises(BusinessError):
        service.text("https://source.example/chapter-1", 1, require_content=True)
    preferences.filters.assert_not_called()
    translator.translate.assert_not_called()
