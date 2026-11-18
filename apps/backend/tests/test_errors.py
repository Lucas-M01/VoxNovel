import httpx
import pytest
from fastapi import HTTPException

from src.core.exceptions import BusinessError
from src.main import create_app


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
@pytest.mark.parametrize(
    "route,status",
    [
        ("business", 409),
        ("validation", 422),
        ("unexpected", 500),
        ("http", 403),
        ("missing", 404),
    ],
)
async def test_errors_use_problem_json_without_internal_details(
    route: str, status: int
) -> None:
    app = create_app()

    @app.get("/business")
    async def business() -> None:
        raise BusinessError("Novel already exists.", status=409, title="Conflict")

    @app.get("/validation")
    async def validation(count: int) -> int:
        return count

    @app.get("/unexpected")
    async def unexpected() -> None:
        raise RuntimeError("internal-sensitive-detail")

    @app.get("/http")
    async def http() -> None:
        raise HTTPException(403, "internal-sensitive-detail")

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://testserver",
    ) as client:
        response = await client.get(f"/{route}?count=internal-sensitive-detail")
    assert response.status_code == status
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["status"] == status
    assert "internal-sensitive-detail" not in response.text
    assert "traceback" not in response.text.lower()
