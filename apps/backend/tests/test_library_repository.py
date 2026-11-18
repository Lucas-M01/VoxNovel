from uuid import uuid4

import pytest
from pydantic import HttpUrl

from src.core.exceptions import BusinessError
from src.repositories.library import LibraryRepository
from src.repositories.models import NovelInput, SourceInput
from src.repositories.transport import Operation, Row


class MemoryTransport:
    """Unit-test transport only; real integration is verified separately."""

    def __init__(self) -> None:
        self.rows: dict[str, list[Row]] = {"novels": [], "sources": []}

    def send(self, operation: Operation) -> list[Row]:
        rows = self.rows[operation.table]
        matching = [
            r for r in rows if all(r.get(k) == v for k, v in operation.filters.items())
        ]
        if operation.action == "select":
            return [r.copy() for r in matching]
        if operation.action in {"insert", "upsert"}:
            existing = next(
                (r for r in rows if r["id"] == operation.values["id"]), None
            )
            if existing is not None:
                existing.update(operation.values)
            else:
                rows.append(operation.values.copy())
        elif operation.action == "update":
            for row in matching:
                row.update(operation.values)
        elif operation.action == "delete":
            self.rows[operation.table] = [r for r in rows if r not in matching]
            if operation.table == "novels":
                self.rows["sources"] = [
                    s
                    for s in self.rows["sources"]
                    if all(s["novel_id"] != n["id"] for n in matching)
                ]
        return []


def source(provider: str, chapter: int) -> SourceInput:
    return SourceInput(
        provider=provider,
        title="Synthetic book",
        url_base=HttpUrl("https://fiction.example/"),
        current_chapter=chapter,
    )


def test_create_switch_progress_update_source_and_delete() -> None:
    store = MemoryTransport()
    repo = LibraryRepository(store)
    novel = repo.create(
        NovelInput(
            title="Synthetic book", sources=[source("first", 4), source("second", 9)]
        )
    )
    assert novel.active_source_id == novel.sources[0].id
    assert novel.current_chapter == 4
    first_id, second_id = [s.id for s in novel.sources]
    assert repo.update_progress(novel.id, 7).current_chapter == 7
    assert repo.activate_source(novel.id, second_id).current_chapter == 9
    assert repo.activate_source(novel.id, first_id).current_chapter == 7
    updated = repo.add_source(novel.id, source("first", 12))
    assert len(updated.sources) == 2
    assert updated.sources[0].id == first_id
    remaining = repo.remove_source(novel.id, first_id)
    assert remaining.active_source_id == second_id
    assert remaining.current_chapter == 9
    with pytest.raises(BusinessError, match="at least one"):
        repo.remove_source(novel.id, second_id)
    repo.delete(novel.id)
    assert repo.list_novels() == []
    assert store.rows["sources"] == []


def test_slug_normalization_detects_duplicate_titles() -> None:
    repo = LibraryRepository(MemoryTransport())
    repo.create(NovelInput(title="Synthetic book", slug="synthetic-book-novel-2026"))
    with pytest.raises(BusinessError) as error:
        repo.create(NovelInput(title="Other title", slug="synthetic-book"))
    assert error.value.status == 409


def test_missing_foreign_source_does_not_remove_any_record() -> None:
    store = MemoryTransport()
    repo = LibraryRepository(store)
    novel = repo.create(
        NovelInput(
            title="Synthetic book", sources=[source("first", 1), source("second", 2)]
        )
    )
    with pytest.raises(BusinessError) as error:
        repo.remove_source(novel.id, uuid4())
    assert error.value.status == 404
    assert len(repo.get(novel.id).sources) == 2
    with pytest.raises(BusinessError):
        repo.update_progress(novel.id, 0)


def test_transport_errors_are_not_silently_converted_to_empty_results() -> None:
    class Broken:
        def send(self, operation: Operation) -> list[Row]:
            raise BusinessError("Persistence is unavailable.", status=503)

    with pytest.raises(BusinessError) as error:
        LibraryRepository(Broken()).list_novels()
    assert error.value.status == 503
