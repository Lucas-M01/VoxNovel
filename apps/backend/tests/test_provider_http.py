import gzip
from typing import Any
from unittest.mock import MagicMock
from urllib.parse import SplitResult

import pytest
from curl_cffi import CurlOpt
from curl_cffi import requests as curl_requests
from pydantic import HttpUrl
from requests import Request, Session

from src.adapters.http import Page, PublicHttp
from src.adapters.providers import (
    ChallengeAdapter,
    CurlHttp,
    ProviderHttp,
    challenge_get,
)
from src.core.config import Settings
from src.core.exceptions import BusinessError


class FixtureNetwork(PublicHttp):
    def __init__(self, pages: list[Page]):
        super().__init__(
            Settings(scraper_challenge_delay=0),
            lambda host, timeout: ["127.0.0.1"] if host == "127.0.0.1" else ["8.8.8.8"],
        )
        self.pages = pages
        self.exchanges: list[dict[str, Any]] = []

    def _exchange(
        self, parsed: SplitResult, address: str, timeout: float, **kwargs: Any
    ) -> Page:
        self.exchanges.append(kwargs)
        return self.pages.pop(0)


def test_cloudscraper_redirect_and_cookies_use_only_protected_adapter() -> None:
    http = FixtureNetwork(
        [
            Page(
                "",
                302,
                {"location": "/chapter"},
                b"",
                ("clearance=synthetic; Path=/; Secure", "other=two; Path=/"),
            ),
            Page("", 200, {}, b"<h1>Chapter</h1>"),
        ]
    )
    assert (
        challenge_get("https://novelfire.net/book/synthetic", http).content
        == b"<h1>Chapter</h1>"
    )
    assert len(http.exchanges) == 2
    headers = http.exchanges[1]["request_headers"]
    assert "clearance=synthetic" in headers["Cookie"]
    assert "other=two" in headers["Cookie"]


def test_cloudscraper_redirect_to_private_network_is_blocked() -> None:
    http = FixtureNetwork([Page("", 302, {"location": "http://127.0.0.1/secret"}, b"")])
    with pytest.raises(BusinessError) as failure:
        challenge_get("https://novelfire.net/book/synthetic", http)
    assert failure.value.status == 400
    assert len(http.exchanges) == 1


def test_challenge_post_is_validated_and_bounded() -> None:
    http = FixtureNetwork([Page("", 200, {}, b"ok")])
    adapter = ChallengeAdapter(http, Session(), float("inf"))
    request = Request(
        "POST", "https://novelfire.net/challenge", data={"answer": "synthetic"}
    ).prepare()
    assert adapter.send(request).content == b"ok"
    assert http.exchanges[0]["body"] == b"answer=synthetic"
    with pytest.raises(BusinessError):
        adapter.send(Request("POST", "http://127.0.0.1/challenge", data="x").prepare())
    with pytest.raises(BusinessError):
        adapter.send(
            Request(
                "POST", "https://novelfire.net/challenge", data="x" * 100_000
            ).prepare()
        )
    assert len(http.exchanges) == 1


@pytest.mark.parametrize("bomb", [False, True])
def test_curl_pins_connect_and_bounds_compressed_response(
    monkeypatch: pytest.MonkeyPatch, bomb: bool
) -> None:
    session = MagicMock()
    response = MagicMock(status_code=200)
    response.headers = {"Content-Encoding": "gzip"}
    payload = gzip.compress(b"x" * (2000 if bomb else 10))

    def receive(*args: Any, **kwargs: Any) -> Any:
        kwargs["content_callback"](payload)
        return response

    session.get.side_effect = receive
    factory = MagicMock(return_value=session)
    monkeypatch.setattr("src.adapters.providers.curl_requests.Session", factory)
    http = CurlHttp(Settings(scraper_max_bytes=1024), lambda host, timeout: ["8.8.8.8"])
    if bomb:
        with pytest.raises(BusinessError) as failure:
            http.get("https://www.royalroad.com/fiction/123/synthetic")
        assert failure.value.status == 502
    else:
        assert (
            http.get("https://www.royalroad.com/fiction/123/synthetic").content
            == b"x" * 10
        )
    factory.assert_called_once_with(impersonate="chrome", trust_env=False)
    assert session.curl_options[CurlOpt.RESOLVE] == [b"www.royalroad.com:443:8.8.8.8"]
    assert session.curl_options[CurlOpt.PROXY] == b""
    assert session.curl_options[CurlOpt.HTTP_CONTENT_DECODING] == 0
    assert session.get.call_args.kwargs["allow_redirects"] is False
    assert session.get.call_args.kwargs["verify"] is True
    assert session.get.call_args.kwargs["headers"]["Accept-Encoding"] == "gzip, deflate"
    session.close.assert_called_once()


def test_curl_redirect_private_target_never_reaches_session(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = MagicMock()
    session.get.return_value.status_code = 302
    session.get.return_value.headers = {"Location": "http://127.0.0.1/secret"}
    monkeypatch.setattr(
        "src.adapters.providers.curl_requests.Session", MagicMock(return_value=session)
    )
    http = CurlHttp(
        Settings(),
        lambda host, timeout: ["127.0.0.1"] if host == "127.0.0.1" else ["8.8.8.8"],
    )
    with pytest.raises(BusinessError):
        http.get("https://www.royalroad.com/fiction/123/synthetic")
    session.get.assert_called_once()


def test_cloudscraper_cannot_fall_back_to_default_requests_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    default_send = MagicMock(
        side_effect=AssertionError("Default network adapter must not run")
    )
    monkeypatch.setattr("requests.adapters.HTTPAdapter.send", default_send)
    http = FixtureNetwork([Page("", 200, {}, b"ok")])
    assert challenge_get("https://novelfire.net/book/synthetic", http).content == b"ok"
    default_send.assert_not_called()


def test_unsupported_challenge_returns_safe_access_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from cloudscraper.exceptions import CloudflareException

    session = MagicMock()
    session.get.side_effect = CloudflareException("sensitive challenge contents")
    monkeypatch.setattr(
        "src.adapters.providers.cloudscraper.create_scraper",
        MagicMock(return_value=session),
    )
    with pytest.raises(BusinessError) as failure:
        challenge_get("https://novelfire.net/book/synthetic", FixtureNetwork([]))
    assert failure.value.status == 502
    assert "sensitive" not in failure.value.detail


def test_real_curl_accepts_the_pinned_options_without_performing_network_io(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configured: list[CurlOpt] = []

    def configure(session: Any, *args: Any, **kwargs: Any) -> Any:
        for option, value in session.curl_options.items():
            session.curl.setopt(option, value)
            configured.append(option)
        kwargs["content_callback"](b"Synthetic body")
        return MagicMock(status_code=200, headers={})

    monkeypatch.setattr(curl_requests.Session, "get", configure)
    http = CurlHttp(Settings(), lambda host, timeout: ["8.8.8.8"])
    assert http.get("https://source.example/chapter-1").content == b"Synthetic body"
    assert CurlOpt.RESOLVE in configured
    assert CurlOpt.PROXY in configured


@pytest.mark.parametrize(
    "host", ["source.example", "www.source.example", "source.example.other"]
)
def test_configured_freewebnovel_routes_exact_hosts_to_guarded_curl(
    monkeypatch: pytest.MonkeyPatch, host: str
) -> None:
    curl = MagicMock()
    factory = MagicMock(return_value=curl)
    monkeypatch.setattr("src.adapters.providers.CurlHttp", factory)
    settings = Settings(freewebnovel_base=HttpUrl("https://source.example"))
    http = ProviderHttp(settings)
    public = MagicMock()
    http.public = public
    url = f"https://{host}/novel/synthetic/chapter-1"
    http.get(url)
    if host == "source.example.other":
        factory.assert_not_called()
        public.get.assert_called_once_with(url)
    else:
        factory.assert_called_once_with(settings)
        curl.get.assert_called_once_with(url)
        public.get.assert_not_called()
