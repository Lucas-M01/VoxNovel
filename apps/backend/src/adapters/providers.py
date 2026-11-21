"""Provider-specific anti-403 transports with no alternative network path."""

import time
import zlib
from collections.abc import Callable
from email.message import Message
from http.client import HTTPException, HTTPResponse
from typing import Any, cast
from urllib.parse import SplitResult
from urllib.request import Request

import cloudscraper
from cloudscraper.exceptions import CloudflareException
from curl_cffi import CurlOpt
from curl_cffi import requests as curl_requests
from requests import PreparedRequest, Response, Session
from requests.adapters import BaseAdapter
from requests.structures import CaseInsensitiveDict

from src.adapters.http import (
    Page,
    PublicHttp,
    blocked,
    parse_url,
    resolve_public,
    unavailable,
)
from src.core.config import Settings
from src.core.exceptions import BusinessError


class CookieResponse:
    def __init__(self, values: tuple[str, ...]):
        self.message = Message()
        for value in values:
            self.message["Set-Cookie"] = value

    def info(self) -> Message:
        return self.message


class ChallengeAdapter(BaseAdapter):
    def __init__(self, http: PublicHttp, session: Session, deadline: float):
        super().__init__()
        self.http = http
        self.session = session
        self.deadline = deadline
        self.exchanges = 0

    def send(self, request: PreparedRequest, *args: Any, **kwargs: Any) -> Response:
        self.exchanges += 1
        if self.exchanges > 2 * (self.http.settings.scraper_max_redirects + 1) + 4:
            raise unavailable()
        if request.url is None or request.method is None:
            raise blocked()
        body = request.body
        if isinstance(body, str):
            body = body.encode()
        if body is not None and not isinstance(body, bytes):
            raise blocked()
        headers = {
            key: value.decode("latin-1") if isinstance(value, bytes) else value
            for key, value in request.headers.items()
            if key.lower()
            in {
                "user-agent",
                "accept",
                "accept-language",
                "cookie",
                "referer",
                "origin",
                "content-type",
            }
        }
        for attempt in range(self.http.settings.scraper_retries + 1):
            try:
                page = self.http.single(
                    request.url, request.method, headers, body, self.deadline
                )
                break
            except (OSError, HTTPException, ValueError) as exc:
                if attempt >= self.http.settings.scraper_retries:
                    raise unavailable() from exc
        self.session.cookies.extract_cookies(
            cast(HTTPResponse, CookieResponse(page.cookie_headers)),
            Request(request.url),
        )
        response = Response()
        response.status_code = page.status
        response.url = request.url
        response.request = request
        response.headers = CaseInsensitiveDict(page.headers)
        response.encoding = "utf-8"
        response._content = page.content
        response._content_consumed = True
        response.cookies = self.session.cookies.copy()
        return response

    def close(self) -> None:
        pass


def challenge_get(url: str, http: PublicHttp) -> Page:
    deadline = time.monotonic() + http.settings.scraper_total_timeout
    session = cast(
        Session,
        cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "windows", "mobile": False},
            interpreter="native",
            solveDepth=2,
            delay=http.settings.scraper_challenge_delay,
        ),
    )
    session.trust_env = False
    session.max_redirects = http.settings.scraper_max_redirects
    adapter = ChallengeAdapter(http, session, deadline)
    # Remove cloudscraper's default networking adapters entirely.
    for existing in session.adapters.values():
        existing.close()
    session.adapters.clear()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    try:
        response = session.get(url, allow_redirects=True)
        if not 200 <= response.status_code < 300 or time.monotonic() >= deadline:
            raise unavailable()
        return Page(
            response.url, response.status_code, dict(response.headers), response.content
        )
    except BusinessError:
        raise
    except (
        CloudflareException,
        OSError,
        HTTPException,
        ValueError,
        RuntimeError,
    ) as exc:
        raise unavailable() from exc
    finally:
        session.close()


class CurlHttp(PublicHttp):
    def __init__(
        self,
        settings: Settings,
        resolver: Callable[[str, float], list[str]] = resolve_public,
    ):
        super().__init__(settings, resolver)
        self.session: curl_requests.Session[curl_requests.Response] = (
            curl_requests.Session(impersonate="chrome", trust_env=False)
        )

    def _exchange(
        self, parsed: SplitResult, address: str, timeout: float, **kwargs: Any
    ) -> Page:
        host = parsed.hostname
        assert host is not None
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        host_entry = f"[{host}]" if ":" in host else host
        address_entry = f"[{address}]" if ":" in address else address
        limit = self.settings.scraper_max_bytes
        data = bytearray()
        oversized = False

        def consume(chunk: bytes) -> int:
            nonlocal oversized
            if len(data) + len(chunk) > limit:
                oversized = True
                return 0
            data.extend(chunk)
            return len(chunk)

        self.session.curl_options = {
            CurlOpt.RESOLVE: [f"{host_entry}:{port}:{address_entry}".encode()],
            CurlOpt.PROXY: b"",
            CurlOpt.NOPROXY: b"*",
            CurlOpt.FOLLOWLOCATION: 0,
            CurlOpt.MAXREDIRS: 0,
            CurlOpt.HTTP_CONTENT_DECODING: 0,
            CurlOpt.MAXFILESIZE_LARGE: limit,
            CurlOpt.TIMEOUT_MS: max(1, int(timeout * 1000)),
            CurlOpt.FRESH_CONNECT: 1,
            CurlOpt.FORBID_REUSE: 1,
        }
        try:
            response = self.session.get(
                parsed.geturl(),
                timeout=timeout,
                allow_redirects=False,
                verify=True,
                accept_encoding="gzip, deflate",
                headers={"Accept-Encoding": "gzip, deflate"},
                content_callback=consume,
            )
        except OSError as exc:
            if oversized:
                raise BusinessError(
                    "The source response is too large.", status=502
                ) from exc
            raise
        headers = {
            key.lower(): value
            for key, value in response.headers.items()
            if value is not None
        }
        if oversized:
            raise BusinessError("The source response is too large.", status=502)
        encoding = headers.get("content-encoding", "identity").lower()
        content = bytes(data)
        if encoding in {"gzip", "deflate"}:
            decoder = zlib.decompressobj(31 if encoding == "gzip" else 15)
            content = decoder.decompress(content, limit + 1)
            if len(content) > limit or decoder.unconsumed_tail:
                raise BusinessError("The source response is too large.", status=502)
            if not decoder.eof or decoder.unused_data:
                raise unavailable()
        elif encoding != "identity":
            raise unavailable()
        return Page(parsed.geturl(), response.status_code, headers, content)

    def get(self, url: str) -> Page:
        try:
            return super().get(url)
        finally:
            self.session.close()


class ProviderHttp:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.public = PublicHttp(settings)

    def get(self, url: str) -> Page:
        host = (parse_url(url).hostname or "").lower().removeprefix("www.").rstrip(".")
        if host == self.settings.novelfire_base.host:
            return challenge_get(url, self.public)
        curl_hosts = {
            (base.host or "").lower().removeprefix("www.").rstrip(".")
            for base in (self.settings.royalroad_base, self.settings.freewebnovel_base)
        }
        if host in curl_hosts:
            return CurlHttp(self.settings).get(url)
        return self.public.get(url)
