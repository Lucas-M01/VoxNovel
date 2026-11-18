import httpx
import pytest
from pydantic import ValidationError

from src.core.config import Settings, get_settings
from src.main import create_app


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_environment_controls_app_configuration() -> None:
    with pytest.MonkeyPatch.context() as patch:
        patch.setenv("VOXNOVEL_APP_NAME", "Configured API")
        patch.setenv("VOXNOVEL_PORT", "8100")
        settings = get_settings()
    assert settings.app_name == "Configured API"
    assert settings.port == 8100
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=create_app(settings)),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/openapi.json")
    assert response.json()["info"]["title"] == "Configured API"


@pytest.mark.parametrize("port", [0, 65536])
def test_invalid_port_fails_before_startup(port: int) -> None:
    with pytest.raises(ValidationError):
        Settings(port=port)


@pytest.mark.anyio
async def test_cors_only_allows_configured_origins() -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(
            app=create_app(Settings(cors_origins=["https://reader.example"]))
        ),
        base_url="http://testserver",
    ) as client:
        allowed = await client.options(
            "/openapi.json",
            headers={
                "origin": "https://reader.example",
                "access-control-request-method": "GET",
            },
        )
        denied = await client.options(
            "/openapi.json",
            headers={
                "origin": "https://other.example",
                "access-control-request-method": "GET",
            },
        )
    assert allowed.headers["access-control-allow-origin"] == "https://reader.example"
    assert denied.status_code == 400
    assert "access-control-allow-origin" not in denied.headers


def test_empty_optional_persistence_configuration_is_ignored() -> None:
    with pytest.MonkeyPatch.context() as patch:
        patch.setenv("VOXNOVEL_SUPABASE_URL", "")
        patch.setenv("VOXNOVEL_SUPABASE_SERVICE_KEY", "")
        settings = get_settings()
    assert settings.supabase_url is None
    assert settings.supabase_service_key is None
