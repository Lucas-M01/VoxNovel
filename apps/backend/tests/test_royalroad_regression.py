from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from pydantic import HttpUrl

from src.adapters.http import Page
from src.core.config import Settings
from src.core.exceptions import BusinessError
from src.repositories.chapter_text import ChapterTextRepository
from src.repositories.library import LibraryRepository
from src.repositories.models import Novel, Source
from src.repositories.preferences import Filters, PreferencesRepository
from src.services.chapters import ChapterService
from src.services.downloads import DownloadService
from src.services.logs import LogBuffer
from src.services.translation import TextTranslator


def test_resolved_royalroad_url_keeps_id_instead_of_replacing_it_with_index() -> None:
    url = "https://www.royalroad.com/fiction/123/synthetic/chapter/7023/two"
    http = MagicMock()
    http.get.return_value = Page(url, 200, {}, b"<p>Synthetic paragraph</p>")
    preferences = MagicMock(spec=PreferencesRepository)
    preferences.filters.return_value = Filters()
    translator = MagicMock(spec=TextTranslator)
    translator.translate.side_effect = lambda text: text
    service = ChapterService(http, preferences, translator, settings=Settings())
    result = service.text(url, 2)
    assert result.url == url and result.chapter == 2
    http.get.assert_called_once_with(url)


def test_remote_generation_maps_index_to_real_source_id_and_bounds_it() -> None:
    novel_id = uuid4()
    source = Source(
        novel_id=novel_id,
        provider="RoyalRoad",
        title="Synthetic",
        url_base=HttpUrl("https://www.royalroad.com/fiction/123/synthetic"),
        chapter_url_pattern="https://www.royalroad.com/fiction/123/synthetic/chapter/{cap}",
        chapter_ids=[9081, 7023],
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
    content = MagicMock(spec=ChapterService)
    content.text.return_value.text = "Synthetic text"
    service = DownloadService(library, cache, content, LogBuffer())
    service.generate(novel_id, 2)
    content.text.assert_called_once_with(
        "https://www.royalroad.com/fiction/123/synthetic/chapter/7023",
        2,
        require_content=True,
        resolved=True,
    )
    assert cache.save.call_args.args[1].chapter == 2
    with pytest.raises(BusinessError):
        service.generate(novel_id, 3)
    assert content.text.call_count == 1


def test_remote_source_without_ids_preserves_sequential_pattern() -> None:
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
    content = MagicMock(spec=ChapterService)
    content.text.return_value.text = "Synthetic"
    DownloadService(library, cache, content, LogBuffer()).generate(novel_id, 7)
    content.text.assert_called_once_with(
        "https://source.example/chapter-7", 7, require_content=True, resolved=True
    )
