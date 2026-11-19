from unittest.mock import MagicMock
from urllib.parse import SplitResult

import pytest

from src.adapters.http import (
    Page,
    PinnedConnection,
    PublicHttp,
    parse_url,
    public_address,
)
from src.core.config import Settings
from src.core.exceptions import BusinessError


@pytest.mark.parametrize(
    "address",
    [
        "127.0.0.1",
        "10.0.0.1",
        "172.16.1.1",
        "192.168.1.1",
        "169.254.169.254",
        "0.0.0.0",
        "100.100.100.200",
        "224.0.0.1",
        "::1",
        "::",
        "fe80::1",
        "fc00::1",
        "::ffff:127.0.0.1",
        "::ffff:8.8.8.8",
        "2002:7f00:1::",
        "2001:db8::1",
    ],
)
def test_non_public_addresses_are_blocked(address: str) -> None:
    with pytest.raises(BusinessError):
        public_address(address)


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "ftp://public.example/file",
        "http://localhost/",
        "http://sub.localhost/",
        "https://private.local/",
        "https://private.internal/",
        "http://user:password@public.example/",
        "http://public.example:0/",
        "http://public.example:99999/",
        "http://[::1%25lo]/",
        "http://good.example\\@bad.example/",
        "http://public.example/\r\nInjected: value",
    ],
)
def test_invalid_urls_are_rejected(url: str) -> None:
    with pytest.raises(BusinessError):
        parse_url(url)


class SimulatedHttp(PublicHttp):
    def __init__(
        self,
        pages: list[Page | OSError],
        addresses: list[str] | None = None,
        **limits: int,
    ):
        super().__init__(
            Settings.model_validate(limits),
            lambda host, timeout: addresses or ["8.8.8.8"],
        )
        self.pages = pages
        self.calls: list[tuple[str, str]] = []

    def _exchange(
        self, parsed: SplitResult, address: str, timeout: float, **kwargs: object
    ) -> Page:
        self.calls.append((parsed.geturl(), address))
        page = self.pages.pop(0)
        if isinstance(page, OSError):
            raise page
        return page


def test_redirect_to_private_address_never_connects() -> None:
    http = SimulatedHttp([Page("", 302, {"location": "http://127.0.0.1/secret"}, b"")])
    http.resolver = lambda host, timeout: (
        ["127.0.0.1"] if host == "127.0.0.1" else ["8.8.8.8"]
    )
    with pytest.raises(BusinessError):
        http.get("https://public.example/")
    assert len(http.calls) == 1


def test_mixed_dns_answers_are_rejected_before_connect() -> None:
    http = SimulatedHttp([], addresses=["8.8.8.8", "10.0.0.1"])
    with pytest.raises(BusinessError):
        http.get("https://public.example/")
    assert http.calls == []


def test_redirect_and_retry_limits() -> None:
    redirect = Page("", 302, {"location": "/again"}, b"")
    http = SimulatedHttp([redirect, redirect], scraper_max_redirects=1)
    with pytest.raises(BusinessError):
        http.get("https://public.example/")
    assert len(http.calls) == 2
    failed = SimulatedHttp(
        [OSError("sensitive connection data")] * 3, scraper_retries=2
    )
    with pytest.raises(BusinessError) as error:
        failed.get("https://public.example/")
    assert len(failed.calls) == 3
    assert "sensitive" not in error.value.detail


def test_relative_redirect_and_retry_success() -> None:
    http = SimulatedHttp(
        [
            OSError(),
            Page("", 302, {"location": "/chapter"}, b""),
            Page("", 200, {}, b"ok"),
        ]
    )
    assert http.get("https://public.example/start").text == "ok"
    assert http.calls[-1][0] == "https://public.example/chapter"


def test_tcp_connect_uses_numeric_address_and_tls_original_hostname(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sock = MagicMock()
    context = MagicMock()
    socket_factory = MagicMock(return_value=sock)
    monkeypatch.setattr("src.adapters.http.socket.socket", socket_factory)
    monkeypatch.setattr("src.adapters.http.ssl.create_default_context", lambda: context)
    connection = PinnedConnection("public.example", 443, "8.8.8.8", True, 2)
    connection.connect()
    sock.connect.assert_called_once_with(("8.8.8.8", 443))
    context.wrap_socket.assert_called_once_with(
        sock, server_hostname="public.example", do_handshake_on_connect=False
    )
    context.wrap_socket.return_value.do_handshake.assert_called_once()
    connection.close()


@pytest.mark.parametrize("compressed", [False, True])
def test_streaming_response_size_limit(
    monkeypatch: pytest.MonkeyPatch, compressed: bool
) -> None:
    import gzip

    response = MagicMock()
    response.status = 200
    response.getheaders.return_value = (
        [("content-encoding", "gzip")] if compressed else []
    )
    payload = b"x" * 2000
    response.read1.side_effect = [
        gzip.compress(payload) if compressed else payload,
        b"",
    ]
    connection = MagicMock()
    connection.getresponse.return_value = response
    monkeypatch.setattr(
        "src.adapters.http.PinnedConnection", MagicMock(return_value=connection)
    )
    http = PublicHttp(Settings(scraper_max_bytes=1024))
    with pytest.raises(BusinessError) as error:
        http._exchange(parse_url("https://public.example/"), "8.8.8.8", 2)
    assert error.value.status == 502
    connection.close.assert_called_once()


@pytest.mark.parametrize("address", ["168.63.129.16", "64:ff9b::7f00:1"])
def test_metadata_and_translation_networks_are_blocked(address: str) -> None:
    http = SimulatedHttp([], addresses=[address])
    with pytest.raises(BusinessError):
        http.get("https://public.example/")
    assert http.calls == []


def test_rebinding_on_retry_is_rejected() -> None:
    http = SimulatedHttp([OSError()])
    answers = iter([["8.8.8.8"], ["127.0.0.1"]])
    http.resolver = lambda host, timeout: next(answers)
    with pytest.raises(BusinessError):
        http.get("https://public.example/")
    assert len(http.calls) == 1


def test_total_deadline_includes_dns(monkeypatch: pytest.MonkeyPatch) -> None:
    clock = [0.0]
    monkeypatch.setattr("src.adapters.http.time.monotonic", lambda: clock[0])
    http = SimulatedHttp([])

    def slow_dns(host: str, timeout: float) -> list[str]:
        clock[0] += 100
        return ["8.8.8.8"]

    http.resolver = slow_dns
    with pytest.raises(BusinessError):
        http.get("https://public.example/")
    assert http.calls == []


def test_dns_timeout_is_safe(monkeypatch: pytest.MonkeyPatch) -> None:
    import dns.exception

    from src.adapters.http import resolve_public

    resolver = MagicMock()
    resolver.resolve.side_effect = dns.exception.Timeout
    monkeypatch.setattr("src.adapters.http.dns.resolver.Resolver", lambda: resolver)
    with pytest.raises(BusinessError) as failure:
        resolve_public("public.example", 0.5)
    assert failure.value.status == 502
    assert resolver.resolve.call_args.kwargs["lifetime"] <= 0.5


def test_expired_connection_cannot_reopen(monkeypatch: pytest.MonkeyPatch) -> None:
    clock = [0.0]
    sock = MagicMock()
    monkeypatch.setattr("src.adapters.http.time.monotonic", lambda: clock[0])
    monkeypatch.setattr("src.adapters.http.socket.socket", MagicMock(return_value=sock))
    connection = PinnedConnection("public.example", 443, "8.8.8.8", True, 2)
    clock[0] = 3
    with pytest.raises(TimeoutError):
        connection.connect()
    sock.connect.assert_not_called()
    sock.close.assert_called_once()
