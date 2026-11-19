from unittest.mock import MagicMock
from uuid import uuid4

from fastapi.testclient import TestClient

from src.api.deps import library, metadata
from src.core.config import Settings
from src.core.exceptions import BusinessError
from src.main import create_app
from src.repositories.library import LibraryRepository
from src.services.providers import MetadataService, SourceMetadata


def test_api_validation_unavailable_and_safe_domain_errors() -> None:
    app = create_app(Settings())
    repo = MagicMock(spec=LibraryRepository)
    repo.get.side_effect = BusinessError("Novel not found.", status=404)
    repo.create.side_effect = BusinessError("Duplicate.", status=409)
    app.dependency_overrides[library] = lambda: repo
    with TestClient(app) as client:
        assert client.get("/api/v1/novels/not-a-uuid").status_code == 422
        assert (
            client.post("/api/v1/novels", json={"title": "Synthetic"}).status_code
            == 409
        )
        assert client.get(f"/api/v1/novels/{uuid4()}").status_code == 404
        assert (
            client.patch(
                f"/api/v1/novels/{uuid4()}/progress", json={"chapter": 0}
            ).status_code
            == 422
        )
    with TestClient(
        create_app(Settings(supabase_url=None, supabase_service_key=None))
    ) as client:
        response = client.get("/api/v1/novels")
        assert response.status_code == 503
        assert response.headers["content-type"].startswith("application/problem+json")


def test_api_source_resources_and_url_utilities() -> None:
    from pydantic import HttpUrl

    app = create_app(Settings())
    service = MagicMock(spec=MetadataService)
    service.search.return_value = [
        SourceMetadata(
            provider="Synthetic",
            title="Synthetic",
            url_base=HttpUrl("https://source.example/"),
        )
    ]
    service.identify.return_value = service.search.return_value[0]
    app.dependency_overrides[metadata] = lambda: service
    with TestClient(app) as client:
        assert (
            client.get("/api/v1/sources/search", params={"name": "Synthetic"}).json()[
                "results"
            ][0]["provider"]
            == "Synthetic"
        )
        assert (
            client.get(
                "/api/v1/sources/identify", params={"url": "https://source.example/"}
            ).status_code
            == 200
        )
        assert (
            client.get(
                "/api/v1/sources/identify", params={"url": "file:///private"}
            ).status_code
            == 422
        )
        assert client.get(
            "/api/v1/sources/chapter-number",
            params={"url": "https://source.example/chapter/71"},
        ).json() == {"chapter": 71}
        assert client.get(
            "/api/v1/sources/detect-chapter",
            params={"url": "https://source.example/chapter/71"},
        ).json() == {"chapter": 1}
        assert client.get(
            "/api/v1/sources/chapter-url",
            params={"pattern": "https://source.example/{cap}", "chapter": 7},
        ).json() == {"url": "https://source.example/7"}
