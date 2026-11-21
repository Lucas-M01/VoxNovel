from uuid import uuid4

import httpx
import pytest

from src.adapters.storage import SupabaseTextStorage
from src.adapters.supabase import SupabaseTransport
from src.core.config import get_settings
from src.core.exceptions import BusinessError
from src.repositories.chapter_text import ChapterText, ChapterTextRepository


@pytest.mark.integration
def test_text_storage_roundtrip_and_private_access() -> None:
    settings = get_settings()
    if settings.supabase_url is None or settings.supabase_service_key is None:
        pytest.skip("Disposable local Supabase credentials are not configured.")
    assert settings.supabase_url.host in {"127.0.0.1", "localhost", "::1"}
    client = SupabaseTransport.from_settings(settings).client
    bucket = f"synthetic-text-{uuid4()}"
    client.storage.create_bucket(
        bucket, options={"public": False, "allowed_mime_types": ["application/json"]}
    )
    storage = SupabaseTextStorage(client, bucket, page_size=2)
    repo = ChapterTextRepository(storage)
    novel_id, other_id = uuid4(), uuid4()
    try:
        assert repo.get(novel_id, 1) is None
        assert not repo.exists(novel_id, 1)
        assert repo.list_chapters(novel_id) == []
        for number in [9, 1, 3, 2, 7]:
            repo.save(
                novel_id, ChapterText(chapter=number, text=f"Texto sintético {number}")
            )
        repo.save(other_id, ChapterText(chapter=1, text="Outra obra"))
        repo.save(novel_id, ChapterText(chapter=1, text="Substituição sintética"))
        assert repo.list_chapters(novel_id) == [1, 2, 3, 7, 9]
        assert repo.exists(novel_id, 1)
        cached = repo.get(novel_id, 1)
        assert cached is not None and cached.text == "Substituição sintética"
        assert (
            storage.download(f"{novel_id}/cap_1.json")
            == b'{"cap":1,"texto":"Substitui\xc3\xa7\xc3\xa3o sint\xc3\xa9tica"}'
        )
        response = httpx.get(
            f"{str(settings.supabase_url).rstrip('/')}/storage/v1/object/public/{bucket}/{novel_id}/cap_1.json"
        )
        assert response.status_code in {400, 401, 403, 404}
        assert repo.remove_chapter(novel_id, 1) == [f"{novel_id}/cap_1.json"]
        assert repo.remove_chapter(novel_id, 1) == []
        assert len(repo.remove_novel(novel_id)) == 4
        assert repo.list_chapters(novel_id) == []
        assert repo.get(other_id, 1) is not None
        assert repo.remove_novel(novel_id) == []
        unavailable_repo = ChapterTextRepository(
            SupabaseTextStorage(client, f"missing-{uuid4()}", 2)
        )
        for action in (
            lambda: unavailable_repo.get(novel_id, 1),
            lambda: unavailable_repo.list_chapters(novel_id),
            lambda: unavailable_repo.save(
                novel_id, ChapterText(chapter=1, text="Synthetic")
            ),
        ):
            with pytest.raises(BusinessError) as failure:
                action()
            assert failure.value.status == 503
    finally:
        client.storage.empty_bucket(bucket)
        client.storage.delete_bucket(bucket)
