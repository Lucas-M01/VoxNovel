from concurrent.futures import ThreadPoolExecutor
from threading import Event as ThreadEvent
from typing import Any, cast
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from starlette.types import Message, Receive, Scope, Send

from src.adapters.http import Page
from src.api.deps import chapters
from src.core.config import Settings
from src.core.exceptions import BusinessError
from src.core.http_limits import BodyLimitMiddleware
from src.main import create_app
from src.repositories.preferences import Filters, PreferencesRepository
from src.services.chapters import ChapterService
from src.services.content import apply_filters, clean_chapter, extract_chapter
from src.services.limits import ProcessingLimit
from src.services.logs import Event, LogBuffer
from src.services.translation import TextTranslator


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def test_pathological_regex_has_effective_execution_timeout() -> None:
    with pytest.raises(BusinessError, match="processing budget"):
        apply_filters("a" * 10000 + "!", Filters(regex=["(a|aa)+$"]), timeout=0.001)
    assert apply_filters("Keep [ad]", Filters(regex=[r"\[ad\]"])) == "Keep"
    assert apply_filters("Keep", Filters(regex=["[", r"\p{Greek}"])) == "Keep"


def test_html_and_unicode_expansion_are_bounded() -> None:
    with pytest.raises(BusinessError):
        extract_chapter(b"x" * 100, max_bytes=64)
    with pytest.raises(BusinessError):
        clean_chapter("\ufdfa" * 10, max_chars=64)
    with pytest.raises(BusinessError):
        apply_filters("x" * 100, Filters(), max_chars=64)


def test_filter_mutation_limits_and_invalid_bulk_regex_precede_storage() -> None:
    transport = MagicMock()
    repo = PreferencesRepository(
        transport, Settings(filter_max_items=1, filter_max_term_chars=8)
    )
    for filters in (
        Filters(words=["one", "two"]),
        Filters(regex=["["]),
        Filters(words=["x" * 9]),
    ):
        with pytest.raises(BusinessError):
            repo.save_filters(filters)
    with pytest.raises(BusinessError):
        repo.add_filter("regex", "x" * 9)
    transport.send.assert_not_called()


def test_body_limit_preserves_cors_and_never_enters_domain() -> None:
    app = create_app(
        Settings(api_max_body_bytes=128, cors_origins=["https://reader.example"])
    )
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/novels",
            json={"title": "x" * 200},
            headers={"origin": "https://reader.example"},
        )
    assert response.status_code == 413
    assert response.headers["access-control-allow-origin"] == "https://reader.example"
    assert "xxx" not in response.text


@pytest.mark.anyio
async def test_chunked_body_cannot_bypass_limit() -> None:
    called: list[bool] = []
    messages: list[Message] = [
        {"type": "http.request", "body": b"x" * 6, "more_body": True},
        {"type": "http.request", "body": b"y" * 6, "more_body": False},
    ]
    sent: list[Message] = []

    async def app(scope: Scope, receive: Receive, send: Send) -> None:
        called.append(True)

    async def receive() -> Message:
        return messages.pop(0)

    async def send(message: Message) -> None:
        sent.append(message)

    await BodyLimitMiddleware(app, 10)(
        {"type": "http", "method": "POST", "headers": []}, receive, send
    )
    assert sent[0]["status"] == 413
    assert called == []


def test_failure_is_redacted_before_server_logging(
    capsys: pytest.CaptureFixture[str], caplog: pytest.LogCaptureFixture
) -> None:
    app = create_app(Settings())
    marker = "sensitive synthetic payload"

    @app.get("/test-error")
    def fail() -> None:
        raise RuntimeError(marker)

    with TestClient(app) as client:
        response = client.get("/test-error")
        logs = client.get("/api/v1/logs").json()["logs"]
    assert response.status_code == 500
    assert marker not in response.text
    assert marker not in caplog.text + capsys.readouterr().err
    assert logs[-1].endswith(Event.INTERNAL_FAILURE.value)
    with pytest.raises(TypeError):
        LogBuffer().add(cast(Event, marker))


def test_processing_slot_is_bounded_and_released_after_failure() -> None:
    limit = ProcessingLimit(
        Settings(processing_concurrency=1, processing_wait_timeout=0)
    )
    with limit.slot():
        with pytest.raises(BusinessError) as failure, limit.slot():
            pass
        assert failure.value.status == 503
    with pytest.raises(RuntimeError), limit.slot():
        raise RuntimeError("Synthetic")
    with limit.slot():
        pass


def test_blocked_content_does_not_block_status_and_overload_is_safe() -> None:
    config = Settings(processing_concurrency=1, processing_wait_timeout=0)
    entered, release = ThreadEvent(), ThreadEvent()
    http = MagicMock()

    def get(url: str) -> Page:
        entered.set()
        assert release.wait(10)
        return Page(url, 200, {}, b"<p>Synthetic</p>")

    http.get.side_effect = get
    preferences = MagicMock(spec=PreferencesRepository)
    preferences.filters.return_value = Filters()
    translator = MagicMock(spec=TextTranslator)
    translator.translate.side_effect = lambda text: text
    service = ChapterService(http, preferences, translator, settings=config)
    app = create_app(config)
    app.dependency_overrides[chapters] = lambda: service
    with TestClient(app) as client, ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(
            client.get,
            "/api/v1/chapters/text",
            params={"url": "https://source.example/chapter-1", "chapter": 1},
        )
        try:
            assert entered.wait(10)
            assert client.get("/api/v1/status").json() == {"status": "ok"}
            assert (
                client.get(
                    "/api/v1/chapters/text",
                    params={"url": "https://source.example/chapter-1", "chapter": 1},
                ).status_code
                == 503
            )
        finally:
            release.set()
        assert future.result(timeout=10).status_code == 200


def test_translation_total_budget_and_output_size_fall_back(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clock = [0.0]
    monkeypatch.setattr("src.services.translation.time.monotonic", lambda: clock[0])
    calls: list[str] = []

    def translate(text: str) -> str:
        calls.append(text)
        clock[0] += 2
        return "PT"

    service = TextTranslator(
        Settings(
            translation_total_timeout=1,
            translation_block_chars=1,
            translation_block_delay=0,
        ),
        translate,
    )
    assert service.translate("abc") == "PT\n\nb\n\nc"
    assert calls == ["a"]
    service = TextTranslator(
        Settings(translation_block_delay=0), lambda text: "x" * 20001
    )
    assert service.translate("original") == "original"


def test_server_bootstrap_disables_query_access_logs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import src.main as entry

    config = Settings()
    captured: dict[str, Any] = {}

    def run(*args: Any, **kwargs: Any) -> None:
        captured.update(kwargs)

    monkeypatch.setattr(entry, "get_settings", lambda: config)
    monkeypatch.setattr("uvicorn.run", run)
    entry.main()
    assert captured["access_log"] is False
    assert captured["limit_concurrency"] == config.server_concurrency_limit
