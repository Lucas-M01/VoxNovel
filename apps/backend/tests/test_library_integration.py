from uuid import uuid4

import pytest
from pydantic import HttpUrl

from src.adapters.supabase import SupabaseTransport
from src.core.config import get_settings
from src.core.exceptions import BusinessError
from src.repositories.library import LibraryRepository
from src.repositories.models import NovelInput, SourceInput


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
