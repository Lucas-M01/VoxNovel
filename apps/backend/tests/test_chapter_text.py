from unittest.mock import MagicMock
from uuid import uuid4

import httpx
import pytest
from storage3.exceptions import StorageApiError

from src.adapters.storage import SupabaseTextStorage
from src.core.exceptions import BusinessError
from src.repositories.chapter_text import ChapterText, ChapterTextRepository


@pytest.mark.parametrize(
    "data", [b"not json", b'{"cap":2,"texto":"wrong chapter"}', b'{"cap":1}']
)
def test_corrupt_cached_text_is_not_a_cache_miss(data: bytes) -> None:
    storage = MagicMock()
    storage.download.return_value = data
    repo = ChapterTextRepository(storage)
    with pytest.raises(BusinessError) as failure:
        repo.get(uuid4(), 1)
    assert failure.value.status == 503


def test_repository_uses_json_and_filters_unrelated_objects() -> None:
    storage = MagicMock()
    storage.names.return_value = [
        "cap_9.json",
        "cap_2.json",
        "cap_0.json",
        "cap_2.wav",
        "broken.json",
        "cap_2.json",
    ]
    repo = ChapterTextRepository(storage)
    novel_id = uuid4()
    assert repo.list_chapters(novel_id) == [2, 9]
    repo.save(novel_id, ChapterText(chapter=1, text="Synthetic"))
    storage.upload.assert_called_once_with(
        f"{novel_id}/cap_1.json", b'{"cap":1,"texto":"Synthetic"}'
    )
    with pytest.raises(BusinessError):
        repo.get(novel_id, 0)


@pytest.mark.parametrize(
    "error",
    [
        StorageApiError("private detail", "InternalError", 500),
        httpx.ConnectError("private detail"),
    ],
)
def test_storage_errors_are_safe_and_never_report_success(error: Exception) -> None:
    client = MagicMock()
    bucket = client.storage.from_.return_value
    storage = SupabaseTextStorage(client, "synthetic", 2)
    for method, args in [
        ("upload", ("key", b"{}")),
        ("download", ("key",)),
        ("names", ("folder",)),
        ("remove", (["key"],)),
    ]:
        sdk_method = {"names": "list"}.get(method, method)
        getattr(bucket, sdk_method).side_effect = error
        with pytest.raises(BusinessError) as failure:
            getattr(storage, method)(*args)
        assert failure.value.status == 503
        assert "private detail" not in failure.value.detail


def test_only_a_missing_object_is_a_cache_miss() -> None:
    client = MagicMock()
    bucket = client.storage.from_.return_value
    storage = SupabaseTextStorage(client, "synthetic", 2)
    bucket.download.side_effect = StorageApiError("Object not found", "not_found", 404)
    assert storage.download("key") is None
    bucket.download.side_effect = StorageApiError("Bucket not found", "not_found", 404)
    with pytest.raises(BusinessError):
        storage.download("key")
