from uuid import UUID, uuid4

import pytest
from pydantic import HttpUrl

from src.core.exceptions import BusinessError
from src.repositories.library import LibraryRepository, normalized_slug
from src.repositories.models import Novel, NovelInput, Source
from src.repositories.transport import Operation, Row


class ReadTransport:
    def __init__(self, rows: dict[str, list[Row]]):
        self.rows = rows

    def send(self, operation: Operation) -> list[Row]:
        assert operation.action == "select"
        return [
            r.copy()
            for r in self.rows[operation.table]
            if all(str(r.get(k)) == v for k, v in operation.filters.items())
        ]

    def write(self, operation: str, novel_id: UUID, values: Row) -> None:
        raise AssertionError("Read-only unit fixture must never write.")


def test_read_assembly_uses_active_source_progress_and_metadata() -> None:
    novel_id = uuid4()
    source = Source(
        novel_id=novel_id,
        provider="Synthetic",
        title="Synthetic",
        url_base=HttpUrl("https://fiction.example/"),
        current_chapter=7,
        chapter_ids=[90821, 70213],
        total_chapters=12,
    )
    novel = Novel(
        id=novel_id,
        title="Synthetic",
        slug="synthetic",
        sources=[source],
        active_source_id=source.id,
        current_chapter=1,
    )
    book_row = novel.model_dump(mode="json", exclude={"sources"})
    book_row["created_at"] = novel.updated_at.isoformat()
    source_row = source.model_dump(mode="json")
    source_row["created_at"] = source.updated_at.isoformat()
    repo = LibraryRepository(
        ReadTransport({"novels": [book_row], "sources": [source_row]})
    )
    result = repo.get(novel_id)
    assert result.current_chapter == 7
    assert result.total_chapters == 12
    assert result.sources[0].chapter_ids == [90821, 70213]
    assert repo.list_novels() == [result]


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("some-book-light-novel-2026", "some-book"),
        (" Some-Book-Web ", "some-book"),
        ("some-book", "some-book"),
    ],
)
def test_slug_normalization(value: str, expected: str) -> None:
    assert normalized_slug(value) == expected


def test_normalized_duplicate_is_detected_without_a_write() -> None:
    novel = Novel(title="Synthetic book", slug="synthetic-book-novel-2026")
    repo = LibraryRepository(
        ReadTransport(
            {
                "novels": [novel.model_dump(mode="json", exclude={"sources"})],
                "sources": [],
            }
        )
    )
    with pytest.raises(BusinessError) as error:
        repo.create(NovelInput(title="Different title", slug="synthetic-book"))
    assert error.value.status == 409


def test_transport_errors_are_not_silently_converted_to_empty_results() -> None:
    class Broken(ReadTransport):
        def send(self, operation: Operation) -> list[Row]:
            raise BusinessError("Persistence is unavailable.", status=503)

    with pytest.raises(BusinessError) as error:
        LibraryRepository(Broken({})).list_novels()
    assert error.value.status == 503
