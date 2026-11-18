import pytest

from tools.check_architecture import find_violations


@pytest.mark.parametrize(
    ("source", "path"),
    [
        ("import httpx as client", "src/services/reader.py"),
        ("from urllib.request import urlopen", "src/api/novels.py"),
        ("from os import getenv as env; env('PORT')", "src/main.py"),
        ("import os as system; system.environ['PORT']", "src/main.py"),
        ("from pydantic_settings import BaseSettings", "src/services/settings.py"),
        ("query = 'SELECT * FROM novels'", "src/services/reader.py"),
        ("session.execute(query)", "src/api/novels.py"),
        ("url = 'https://reader.example'", "src/services/reader.py"),
        ("class Novel(Base, table=True):\n    id: str", "src/repositories/models.py"),
    ],
)
def test_detects_architecture_violations(source: str, path: str) -> None:
    assert find_violations(source, path)


@pytest.mark.parametrize(
    ("source", "path"),
    [
        ("import httpx", "src/adapters/network.py"),
        ("import requests", "src/services/engines/google.py"),
        (
            "query = 'SELECT * FROM novels'; session.execute(query)",
            "src/repositories/novels.py",
        ),
        ("import os; port = os.getenv('PORT')", "src/core/config.py"),
        (
            "class Novel(Base, table=True):\n    updated_at: datetime",
            "src/repositories/models.py",
        ),
    ],
)
def test_accepts_implementation_within_boundaries(source: str, path: str) -> None:
    assert find_violations(source, path) == []
