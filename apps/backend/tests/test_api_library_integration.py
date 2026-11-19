from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.core.config import get_settings
from src.main import create_app


@pytest.mark.integration
def test_library_http_roundtrip_against_disposable_database() -> None:
    settings = get_settings()
    if settings.supabase_url is None or settings.supabase_service_key is None:
        pytest.skip("Disposable local Supabase credentials are not configured.")
    assert settings.supabase_url.host in {"127.0.0.1", "localhost", "::1"}
    with TestClient(create_app(settings)) as client:
        response = client.post(
            "/api/v1/novels",
            json={
                "title": f"Synthetic HTTP {uuid4()}",
                "sources": [
                    {
                        "provider": "First",
                        "title": "Synthetic",
                        "url_base": "https://source.example/chapter-3",
                        "current_chapter": 3,
                    },
                    {
                        "provider": "Second",
                        "title": "Synthetic",
                        "url_base": "https://other.example/chapter-9",
                        "current_chapter": 9,
                    },
                ],
            },
        )
        assert response.status_code == 201
        novel = response.json()
        novel_id = novel["id"]
        first, second = novel["sources"]
        try:
            assert client.get(f"/api/v1/novels/{novel_id}").json() == novel
            assert any(
                item["id"] == novel_id for item in client.get("/api/v1/novels").json()
            )
            assert (
                client.post(
                    "/api/v1/novels", json={"title": novel["title"]}
                ).status_code
                == 409
            )
            response = client.patch(
                f"/api/v1/novels/{novel_id}/progress", json={"chapter": 7}
            )
            assert (
                response.status_code == 200 and response.json()["current_chapter"] == 7
            )
            response = client.patch(
                f"/api/v1/novels/{novel_id}/active-source",
                json={"source_id": second["id"]},
            )
            assert response.json()["current_chapter"] == 9
            response = client.patch(
                f"/api/v1/novels/{novel_id}/active-source",
                json={"source_id": first["id"]},
            )
            assert response.json()["current_chapter"] == 7
            response = client.post(
                f"/api/v1/novels/{novel_id}/sources",
                json={
                    "provider": "First",
                    "title": "Synthetic refreshed",
                    "url_base": "https://source.example/",
                    "chapter_ids": [9081, 7023],
                },
            )
            assert response.json()["sources"][0]["id"] == first["id"]
            assert response.json()["sources"][0]["chapter_ids"] == [9081, 7023]
            assert (
                client.delete(
                    f"/api/v1/novels/{novel_id}/sources/{first['id']}"
                ).status_code
                == 200
            )
            assert (
                client.delete(
                    f"/api/v1/novels/{novel_id}/sources/{second['id']}"
                ).status_code
                == 400
            )
        finally:
            assert client.delete(f"/api/v1/novels/{novel_id}").status_code == 204
        assert client.get(f"/api/v1/novels/{novel_id}").status_code == 404
