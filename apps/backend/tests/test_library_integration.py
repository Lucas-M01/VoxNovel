from uuid import UUID, uuid4

import pytest
from pydantic import HttpUrl

from src.adapters.supabase import SupabaseTransport
from src.core.config import get_settings
from src.core.exceptions import BusinessError
from src.repositories.library import LibraryRepository
from src.repositories.models import NovelInput, SourceInput
from src.repositories.transport import Operation, Row


@pytest.mark.integration
def test_library_roundtrip_against_disposable_supabase() -> None:
    settings = get_settings()
    if settings.supabase_url is None or settings.supabase_service_key is None:
        pytest.skip("Disposable local Supabase credentials are not configured.")
    assert settings.supabase_url.host in {"127.0.0.1", "localhost", "::1"}, (
        "Integration must use a disposable local stack."
    )
    repo = LibraryRepository(SupabaseTransport.from_settings(settings))
    title = f"Synthetic integration {uuid4()}"
    novel = repo.create(
        NovelInput(
            title=title,
            sources=[
                SourceInput(
                    provider="SyntheticFirst",
                    title=title,
                    url_base=HttpUrl("https://fiction.example/chapter-3"),
                    current_chapter=3,
                ),
                SourceInput(
                    provider="SyntheticSecond",
                    title=title,
                    url_base=HttpUrl("https://other.example/chapter-9"),
                    current_chapter=9,
                ),
            ],
        )
    )
    try:
        assert repo.get(novel.id).model_dump(mode="json") == novel.model_dump(
            mode="json"
        )
        assert any(item.id == novel.id for item in repo.list_novels())
        first, second = novel.sources
        assert repo.update_progress(novel.id, 7).current_chapter == 7
        assert repo.activate_source(novel.id, second.id).current_chapter == 9
        assert repo.activate_source(novel.id, first.id).current_chapter == 7
        refreshed = repo.add_source(
            novel.id,
            SourceInput(
                provider=first.provider,
                title=title,
                url_base=first.url_base,
                current_chapter=11,
                chapter_ids=[90821, 70213],
            ),
        )
        assert len(refreshed.sources) == 2
        assert refreshed.sources[0].id == first.id
        assert refreshed.sources[0].chapter_ids == [90821, 70213]
        with pytest.raises(BusinessError) as duplicate:
            repo.create(NovelInput(title=title))
        assert duplicate.value.status == 409
        remaining = repo.remove_source(novel.id, first.id)
        assert remaining.active_source_id == second.id
        with pytest.raises(BusinessError):
            repo.remove_source(novel.id, second.id)
    finally:
        repo.delete(novel.id)
    with pytest.raises(BusinessError) as missing:
        repo.get(novel.id)
    assert missing.value.status == 404


@pytest.mark.integration
def test_failed_creation_rolls_back_novel_and_preceding_source() -> None:
    settings = get_settings()
    if settings.supabase_url is None or settings.supabase_service_key is None:
        pytest.skip("Disposable local Supabase credentials are not configured.")
    assert settings.supabase_url.host in {"127.0.0.1", "localhost", "::1"}
    transport = SupabaseTransport.from_settings(settings)
    repo = LibraryRepository(transport)
    novel_id = uuid4()
    title = f"Synthetic rollback {novel_id}"
    valid = SourceInput(
        provider="First", title=title, url_base=HttpUrl("https://fiction.example/")
    ).model_dump(mode="json")
    invalid = {**valid, "provider": None}
    with pytest.raises(BusinessError):
        transport.write(
            "create",
            novel_id,
            {
                "title": title,
                "slug": str(novel_id),
                "current_chapter": 1,
                "sources": [valid, invalid],
            },
        )
    with pytest.raises(BusinessError) as missing:
        repo.get(novel_id)
    assert missing.value.status == 404
    assert (
        transport.send(Operation("sources", filters={"novel_id": str(novel_id)})) == []
    )


@pytest.mark.integration
def test_concurrent_removals_cannot_delete_the_last_source() -> None:
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier

    settings = get_settings()
    if settings.supabase_url is None or settings.supabase_service_key is None:
        pytest.skip("Disposable local Supabase credentials are not configured.")
    assert settings.supabase_url.host in {"127.0.0.1", "localhost", "::1"}
    barrier = Barrier(2)

    class ConcurrentTransport(SupabaseTransport):
        def write(self, operation: str, novel_id: UUID, values: Row) -> None:
            if operation == "remove_source":
                barrier.wait(timeout=15)
            super().write(operation, novel_id, values)

    transport = ConcurrentTransport(SupabaseTransport.from_settings(settings).client)
    repo = LibraryRepository(transport)
    title = f"Synthetic concurrency {uuid4()}"
    novel = repo.create(
        NovelInput(
            title=title,
            sources=[
                SourceInput(
                    provider=p,
                    title=title,
                    url_base=HttpUrl("https://fiction.example/"),
                )
                for p in ["First", "Second"]
            ],
        )
    )

    def remove(source_id: UUID) -> bool:
        try:
            repo.remove_source(novel.id, source_id)
            return True
        except BusinessError as exc:
            assert exc.status == 400
            return False

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(remove, [s.id for s in novel.sources]))
        assert results.count(True) == 1
        assert len(repo.get(novel.id).sources) == 1
    finally:
        repo.delete(novel.id)


@pytest.mark.integration
def test_database_rejects_active_source_from_another_novel() -> None:
    settings = get_settings()
    if settings.supabase_url is None or settings.supabase_service_key is None:
        pytest.skip("Disposable local Supabase credentials are not configured.")
    assert settings.supabase_url.host in {"127.0.0.1", "localhost", "::1"}
    transport = SupabaseTransport.from_settings(settings)
    repo = LibraryRepository(transport)
    first = repo.create(
        NovelInput(
            title=f"Synthetic owner {uuid4()}",
            sources=[
                SourceInput(
                    provider="First",
                    title="Synthetic",
                    url_base=HttpUrl("https://fiction.example/"),
                )
            ],
        )
    )
    try:
        second = repo.create(
            NovelInput(
                title=f"Synthetic owner {uuid4()}",
                sources=[
                    SourceInput(
                        provider="Second",
                        title="Synthetic",
                        url_base=HttpUrl("https://other.example/"),
                    )
                ],
            )
        )
        try:
            with pytest.raises(BusinessError):
                transport.send(
                    Operation(
                        "novels",
                        "update",
                        {"active_source_id": str(second.active_source_id)},
                        {"id": str(first.id)},
                    )
                )
            assert repo.get(first.id).active_source_id == first.active_source_id
        finally:
            repo.delete(second.id)
    finally:
        repo.delete(first.id)


@pytest.mark.integration
def test_normalized_slug_uniqueness_is_enforced_by_database() -> None:
    settings = get_settings()
    if settings.supabase_url is None or settings.supabase_service_key is None:
        pytest.skip("Disposable local Supabase credentials are not configured.")
    assert settings.supabase_url.host in {"127.0.0.1", "localhost", "::1"}
    transport = SupabaseTransport.from_settings(settings)
    repo = LibraryRepository(transport)
    first_id, second_id = uuid4(), uuid4()
    slug = f"synthetic-unique-{uuid4()}"
    transport.write(
        "create",
        first_id,
        {"title": "Synthetic uniqueness", "slug": slug, "sources": []},
    )
    try:
        with pytest.raises(BusinessError) as duplicate:
            transport.write(
                "create",
                second_id,
                {
                    "title": "Synthetic uniqueness",
                    "slug": slug + "-novel-2026",
                    "sources": [],
                },
            )
        assert duplicate.value.status == 409
        with pytest.raises(BusinessError) as missing:
            repo.get(second_id)
        assert missing.value.status == 404
    finally:
        repo.delete(first_id)
