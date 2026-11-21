import pytest
from fastapi.testclient import TestClient

from src.adapters.supabase import SupabaseTransport
from src.core.config import get_settings
from src.main import create_app
from src.repositories.transport import Operation


@pytest.mark.integration
def test_filter_and_settings_http_roundtrip() -> None:
    config = get_settings()
    if config.supabase_url is None or config.supabase_service_key is None:
        pytest.skip("Disposable local Supabase credentials are not configured.")
    assert config.supabase_url.host in {"127.0.0.1", "localhost", "::1"}
    transport = SupabaseTransport.from_settings(config)
    for table in ("filters", "preferences"):
        transport.send(Operation(table, "delete", filters={"id": "1"}))
    try:
        with TestClient(create_app(config)) as client:
            assert client.get("/api/v1/filters").json()["words"] == config.filter_words
            assert client.delete("/api/v1/filters").status_code == 200
            assert client.get("/api/v1/filters").json()["words"] == []
            for kind in ("words", "phrases", "regex"):
                assert (
                    client.post(
                        "/api/v1/filters/term",
                        json={"kind": kind, "value": "Synthetic"},
                    ).status_code
                    == 200
                )
            response = client.request(
                "DELETE",
                "/api/v1/filters/term",
                json={"kind": "words", "value": "Synthetic"},
            )
            assert response.json()["words"] == []
            assert response.json()["phrases"] == ["Synthetic"]
            assert response.json()["regex"] == ["Synthetic"]
            assert (
                client.post("/api/v1/filters/regex", json={"value": "["}).status_code
                == 400
            )
            assert client.post(
                "/api/v1/filters/word", json={"value": "two words"}
            ).json()["phrases"] == ["Synthetic", "two words"]
            assert client.request(
                "DELETE", "/api/v1/filters/word", json={"value": "two words"}
            ).json()["phrases"] == ["Synthetic"]
            response = client.put(
                "/api/v1/filters", json={"words": [], "phrases": [], "regex": []}
            )
            assert response.status_code == 200 and response.json()["regex"] == []
            assert client.get("/api/v1/settings").json()["speed"] == 1.5
            assert (
                client.put("/api/v1/settings", json={"speed": 2.25}).json()["speed"]
                == 2.25
            )
            assert client.get("/api/v1/settings").json()["speed"] == 2.25
            assert client.put("/api/v1/settings", json={"speed": 0}).status_code == 422
    finally:
        for table in ("filters", "preferences"):
            transport.send(Operation(table, "delete", filters={"id": "1"}))
