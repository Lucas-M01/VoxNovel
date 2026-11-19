"""Scraper HTTP: validate every hop and connect only to the validated address."""

import ipaddress
import socket
import ssl
import time
import zlib
from collections.abc import Callable
from contextlib import suppress
from dataclasses import dataclass
from http.client import HTTPConnection, HTTPException
from threading import Timer
from urllib.parse import SplitResult, quote, urljoin, urlsplit, urlunsplit

import dns.exception
import dns.resolver

from src.core.config import Settings
from src.core.exceptions import BusinessError


def blocked() -> BusinessError:
    return BusinessError("The URL is not an allowed public HTTP destination.")


def unavailable() -> BusinessError:
    return BusinessError(
        "The source could not be accessed.", status=502, title="Source unavailable"
    )


def public_address(value: str) -> str:
    address = ipaddress.ip_address(value)
    if not address.is_global or address.is_multicast or address.is_reserved:
        raise blocked()
    if isinstance(address, ipaddress.IPv6Address) and (
        address.ipv4_mapped is not None
        or address.sixtofour is not None
        or address.teredo is not None
        or address.is_site_local
    ):
        raise blocked()
    return str(address)


def parse_url(url: str) -> SplitResult:
    try:
        if any(ord(char) < 33 for char in url) or "\\" in url:
            raise blocked()
        parsed = urlsplit(url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise blocked()
        if (
            parsed.username is not None
            or parsed.password is not None
            or "%" in parsed.netloc
        ):
            raise blocked()
        if parsed.port is not None and not 1 <= parsed.port <= 65535:
            raise blocked()
        host = parsed.hostname.encode("idna").decode("ascii").lower().rstrip(".")
        if host == "localhost" or host.endswith((".localhost", ".local", ".internal")):
            raise blocked()
        return parsed._replace(
            netloc=parsed.netloc.encode("idna").decode("ascii"), fragment=""
        )
    except (ValueError, UnicodeError) as exc:
        raise blocked() from exc


def resolve_public(host: str, timeout: float) -> list[str]:
    try:
        return [public_address(host)]
    except ValueError:
        pass
    end = time.monotonic() + timeout
    resolver = dns.resolver.Resolver()
    addresses: list[str] = []
    for kind in ("A", "AAAA"):
        remaining = end - time.monotonic()
        if remaining <= 0:
            raise unavailable()
        try:
            answer = resolver.resolve(host, kind, lifetime=remaining, search=False)
            addresses.extend(public_address(record.to_text()) for record in answer)
        except dns.resolver.NoAnswer:
            continue
        except dns.exception.DNSException as exc:
            raise unavailable() from exc
    if not addresses:
        raise unavailable()
    return addresses


class PinnedConnection(HTTPConnection):
    def __init__(
        self, host: str, port: int, address: str, secure: bool, timeout: float
    ):
        super().__init__(host, port=port, timeout=timeout)
        self.address = public_address(address)
        self.secure = secure
        self.deadline = time.monotonic() + timeout

    def connect(self) -> None:
        # Numeric connect avoids a second hostname lookup (DNS rebinding).
        family = socket.AF_INET6 if ":" in self.address else socket.AF_INET
        sock = socket.socket(family, socket.SOCK_STREAM)
        self.sock = sock
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            sock.close()
            raise TimeoutError()
        sock.settimeout(remaining)
        end = self.deadline
        try:
            sock.connect((self.address, self.port))
            if self.secure:
                context = ssl.create_default_context()
                context.set_alpn_protocols(["http/1.1"])
                self.sock = context.wrap_socket(
                    sock, server_hostname=self.host, do_handshake_on_connect=False
                )
                remaining = end - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError()
                self.sock.settimeout(remaining)
                self.sock.do_handshake()
        except BaseException:
            self.close()
            raise

    def expire(self) -> None:
        sock = self.sock
        if sock is not None:
            with suppress(OSError):
                sock.shutdown(socket.SHUT_RDWR)
            self.close()


@dataclass(frozen=True)
class Page:
    url: str
    status: int
    headers: dict[str, str]
    content: bytes

    @property
    def text(self) -> str:
        return self.content.decode("utf-8", errors="replace")


class PublicHttp:
    def __init__(
        self,
        settings: Settings,
        resolver: Callable[[str, float], list[str]] = resolve_public,
    ):
        self.settings = settings
        self.resolver = resolver
        self.denied = [
            ipaddress.ip_network(value) for value in settings.scraper_denied_networks
        ]

    def _exchange(self, parsed: SplitResult, address: str, timeout: float) -> Page:
        host = parsed.hostname
        assert host is not None
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        connection = PinnedConnection(
            host, port, address, parsed.scheme == "https", timeout
        )
        end = time.monotonic() + timeout
        timer = Timer(timeout, connection.expire)
        timer.daemon = True
        timer.start()
        try:
            target = urlunsplit(
                (
                    "",
                    "",
                    quote(parsed.path or "/", safe="/%:@!$&'()*+,;=-._~"),
                    quote(parsed.query, safe="%/:?@!$&'()*+,;=-._~"),
                    "",
                )
            )
            connection.request(
                "GET",
                target,
                headers={
                    "User-Agent": self.settings.scraper_user_agent,
                    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
                    "Accept-Encoding": "gzip, deflate",
                },
            )
            response = connection.getresponse()
            headers = {key.lower(): value for key, value in response.getheaders()}
            if not 200 <= response.status < 300:
                return Page(parsed.geturl(), response.status, headers, b"")
            limit = self.settings.scraper_max_bytes
            if int(headers.get("content-length", "0")) > limit:
                raise BusinessError("The source response is too large.", status=502)
            encoding = headers.get("content-encoding", "identity").lower()
            if encoding not in {"gzip", "deflate", "identity"}:
                raise unavailable()
            decoder = (
                zlib.decompressobj(31 if encoding == "gzip" else 15)
                if encoding != "identity"
                else None
            )
            body = bytearray()
            transferred = 0
            while chunk := response.read1(min(65536, limit + 1)):
                transferred += len(chunk)
                decoded = (
                    decoder.decompress(chunk, limit - len(body) + 1)
                    if decoder
                    else chunk
                )
                body.extend(decoded)
                if (
                    transferred > limit
                    or len(body) > limit
                    or (decoder and decoder.unconsumed_tail)
                ):
                    raise BusinessError("The source response is too large.", status=502)
            if time.monotonic() >= end:
                raise unavailable()
            if "content-length" in headers and transferred != int(
                headers["content-length"]
            ):
                raise unavailable()
            if decoder and (not decoder.eof or decoder.unused_data):
                raise unavailable()
            return Page(parsed.geturl(), response.status, headers, bytes(body))
        finally:
            timer.cancel()
            connection.close()

    def get(self, url: str) -> Page:
        deadline = time.monotonic() + self.settings.scraper_total_timeout
        redirects = 0
        retries = 0
        while True:
            parsed = parse_url(url)
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise unavailable()
            host = parsed.hostname
            assert host is not None
            addresses = self.resolver(
                host, min(remaining, self.settings.scraper_dns_timeout)
            )
            # Validate injected resolvers too, and reject mixed public/private answers.
            addresses = [public_address(address) for address in addresses]
            if any(
                ipaddress.ip_address(address) in network
                for address in addresses
                for network in self.denied
            ):
                raise blocked()
            if not addresses:
                raise unavailable()
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise unavailable()
            try:
                page = self._exchange(
                    parsed,
                    addresses[retries % len(addresses)],
                    min(remaining, self.settings.scraper_request_timeout),
                )
                if time.monotonic() >= deadline:
                    raise unavailable()
                if page.status in {301, 302, 303, 307, 308}:
                    if (
                        redirects >= self.settings.scraper_max_redirects
                        or not page.headers.get("location")
                    ):
                        raise unavailable()
                    url = urljoin(parsed.geturl(), page.headers["location"])
                    redirects += 1
                    continue
                if page.status in {429, 500, 502, 503, 504}:
                    raise OSError("Retryable source status")
                if not 200 <= page.status < 300:
                    raise unavailable()
                return page
            except (OSError, HTTPException, zlib.error, ValueError) as exc:
                if retries >= self.settings.scraper_retries:
                    raise unavailable() from exc
                retries += 1
