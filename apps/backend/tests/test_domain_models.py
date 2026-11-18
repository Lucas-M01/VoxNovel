from uuid import uuid4

import pytest
from pydantic import HttpUrl, ValidationError

from src.repositories.models import (
    Novel,
    NovelInput,
    ProgressInput,
    Source,
    SourceInput,
)


def test_source_identifiers_and_per_source_progress_survive_json_roundtrip() -> None:
    novel_id = uuid4()
    first = Source(
        novel_id=novel_id,
        provider="RoyalRoad",
        title="Synthetic novel",
        url_base=HttpUrl("https://fiction.example/chapter/90821"),
        chapter_ids=[90821, 70213],
        chapter_url_pattern="https://fiction.example/chapter/{cap}",
        current_chapter=2,
    )
    second = Source(
        novel_id=novel_id,
        provider="Generic",
        title="Synthetic novel",
        url_base=HttpUrl("https://alternate.example/chapter-8"),
        current_chapter=8,
    )
    novel = Novel(
        id=novel_id,
        title="Synthetic novel",
        slug="synthetic-novel",
        active_source_id=first.id,
        sources=[first, second],
        current_chapter=2,
    )
    restored = Novel.model_validate_json(novel.model_dump_json())
    assert restored == novel
    assert [s.current_chapter for s in restored.sources] == [2, 8]
    assert restored.sources[0].chapter_ids == [90821, 70213]
    assert novel.updated_at.tzinfo is not None
    assert first.updated_at.tzinfo is not None


@pytest.mark.parametrize("reason", ["foreign", "duplicate", "missing_active"])
def test_novel_rejects_inconsistent_source_ownership(reason: str) -> None:
    novel_id = uuid4()
    source = Source(
        novel_id=uuid4() if reason == "foreign" else novel_id,
        provider="Generic",
        title="Synthetic novel",
        url_base=HttpUrl("https://fiction.example/"),
    )
    with pytest.raises(ValidationError):
        Novel(
            id=novel_id,
            title="Synthetic novel",
            slug="synthetic-novel",
            sources=[source, source] if reason == "duplicate" else [source],
            active_source_id=uuid4() if reason == "missing_active" else source.id,
        )


@pytest.mark.parametrize("chapter", [0, -1])
def test_progress_cannot_be_nonpositive(chapter: int) -> None:
    with pytest.raises(ValidationError):
        ProgressInput(chapter=chapter)


def test_empty_novel_can_be_created_before_sources_are_added() -> None:
    novel = NovelInput(title="  Synthetic novel  ")
    assert novel.title == "Synthetic novel"
    assert novel.sources == []
    assert novel.current_chapter == 1


def test_source_allows_unknown_total_and_omitted_progress() -> None:
    source = SourceInput(
        provider="Generic",
        title="Synthetic novel",
        url_base=HttpUrl("https://fiction.example/"),
    )
    assert source.total_chapters is None
    assert source.current_chapter is None


@pytest.mark.parametrize("url", ["not-a-url", "file:///etc/passwd"])
def test_source_requires_an_http_url(url: str) -> None:
    with pytest.raises(ValidationError):
        SourceInput.model_validate(
            {"provider": "Generic", "title": "Synthetic novel", "url_base": url}
        )
