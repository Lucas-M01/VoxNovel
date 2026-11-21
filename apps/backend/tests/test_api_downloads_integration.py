from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.adapters.supabase import SupabaseTransport
from src.api.deps import chapters
from src.core.config import get_settings
from src.main import create_app
from src.services.chapters import ChapterResult, ChapterService


@pytest.mark.integration
def test_remote_download_http_roundtrip_uses_real_private_storage() -> None:
    config = get_settings()
    if config.supabase_url is None or config.supabase_service_key is None:
        pytest.skip("Disposable local Supabase credentials are not configured.")
    assert config.supabase_url.host in {"127.0.0.1", "localhost", "::1"}
    sdk = SupabaseTransport.from_settings(config).client
    bucket = f"synthetic-api-{uuid4()}"
    sdk.storage.create_bucket(
        bucket, options={"public": False, "allowed_mime_types": ["application/json"]}
    )
    app = create_app(config.model_copy(update={"supabase_text_bucket": bucket}))
    content = MagicMock(spec=ChapterService)
    content.text.side_effect = lambda url, chapter, **kwargs: ChapterResult(
        url=url, chapter=chapter, text=f"Synthetic chapter {chapter}"
    )
    app.dependency_overrides[chapters] = lambda: content
    try:
        with TestClient(app) as client:
            created = client.post(
                "/api/v1/novels",
                json={
                    "title": f"Synthetic cache HTTP {uuid4()}",
                    "sources": [
                        {
                            "provider": "Synthetic",
                            "title": "Synthetic",
                            "url_base": "https://source.example/",
                            "chapter_url_pattern": "https://source.example/chapter-{cap}",
                        }
                    ],
                },
            )
            assert created.status_code == 201
            novel_id = created.json()["id"]
            base = f"/api/v1/downloads/{novel_id}"
            try:
                response = client.post(base + "/1")
                assert response.status_code == 200 and response.json()["status"] == "ok"
                assert client.post(base + "/1").json()["status"] == "cache"
                content.text.assert_called_once()
                assert client.get(base).json()["chapters"] == [1]
                assert client.get(base + "/1/text").json() == {
                    "chapter": 1,
                    "text": "Synthetic chapter 1",
                }
                assert client.post(base + "/2").status_code == 200
                assert len(client.delete(base + "/1").json()["removed"]) == 1
                assert client.delete(base + "/1").status_code == 404
                assert len(client.delete(base).json()["removed"]) == 1
                assert client.get(base + "/2/text").status_code == 404
                messages = client.get("/api/v1/logs").json()["logs"]
                assert any("cache" in message for message in messages)
                assert not any(
                    "source.example" in message or "Synthetic chapter" in message
                    for message in messages
                )
            finally:
                assert client.delete(f"/api/v1/novels/{novel_id}").status_code == 204
    finally:
        sdk.storage.empty_bucket(bucket)
        sdk.storage.delete_bucket(bucket)
