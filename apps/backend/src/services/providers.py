import re
from typing import Protocol
from urllib.parse import urljoin, urlsplit

from bs4 import BeautifulSoup, Tag
from pydantic import BaseModel, Field, HttpUrl, PositiveInt, ValidationError
from slugify import slugify

from src.adapters.http import Page, parse_url
from src.core.config import Settings
from src.core.exceptions import BusinessError
from src.services.limits import ProcessingLimit


class Fetcher(Protocol):
    def get(self, url: str) -> Page: ...


class SourceMetadata(BaseModel):
    provider: str
    title: str
    url_base: HttpUrl
    slug: str | None = None
    image_url: HttpUrl | None = None
    total_chapters: PositiveInt | None = None
    chapter_url_pattern: str | None = None
    chapter_ids: list[PositiveInt] | None = None
    authors: list[str] = Field(default_factory=list)
    rating: str | None = None
    genres: list[str] = Field(default_factory=list)


def attribute(tag: Tag | None, key: str) -> str | None:
    value = tag.get(key) if tag else None
    return value if isinstance(value, str) else None


def image_url(soup: BeautifulSoup, base: str, fallback: bool = False) -> HttpUrl | None:
    tag = soup.find("meta", property="og:image")
    image = soup.find("img", class_=re.compile("pic|cover|thumb", re.I))
    if image is None and fallback:
        image = soup.find("img")
    value = (
        attribute(tag, "content")
        or attribute(image, "src")
        or attribute(image, "data-src")
        or attribute(image, "data-original")
    )
    if not value:
        return None
    try:
        return HttpUrl(urljoin(base, value))
    except ValidationError:
        return None


def page_exists(soup: BeautifulSoup) -> bool:
    if soup.find("h1"):
        return True
    title = soup.find("title")
    return title is not None and not any(
        term in title.get_text().lower()
        for term in ("404", "not found", "página não encontrada")
    )


class MetadataService:
    def __init__(
        self, http: Fetcher, settings: Settings, limit: ProcessingLimit | None = None
    ):
        self.limit = limit if limit is not None else ProcessingLimit(settings)
        self.http = http
        self.settings = settings

    def _soup(self, url: str) -> BeautifulSoup:
        return BeautifulSoup(self.http.get(url).content, "lxml")

    def _basic(
        self,
        soup: BeautifulSoup,
        url: str,
        provider: str,
        slug: str,
        fallback_image: bool = False,
    ) -> SourceMetadata:
        h1 = soup.find("h1")
        rating = soup.find(class_=re.compile("rating|score", re.I))
        return SourceMetadata(
            provider=provider,
            title=h1.get_text(strip=True) if h1 else slug,
            slug=slug,
            url_base=HttpUrl(url),
            image_url=image_url(soup, url, fallback_image),
            authors=[tag.get_text(strip=True) for tag in soup.select(".author a")],
            genres=[
                tag.get_text(strip=True)
                for tag in soup.select(".genre a,.categories a")
            ],
            rating=rating.get_text(strip=True) if rating else None,
        )

    def freewebnovel(self, url: str) -> SourceMetadata:
        matched = re.match(r"/novel/([^/]+)", urlsplit(url).path)
        if not matched:
            raise BusinessError("Invalid FreeWebNovel URL.")
        slug = re.sub(r"\.html$", "", matched.group(1))
        page_url = f"{str(self.settings.freewebnovel_base).rstrip('/')}/novel/{slug}"
        soup = self._soup(page_url)
        result = self._basic(soup, url, "FreeWebNovel", slug)
        heading = soup.find("h1", class_=re.compile("tit", re.I))
        result.title = heading.get_text(strip=True) if heading else slug
        numbers = [
            int(match.group(1))
            for tag in soup.select("a[href]")
            if (match := re.search(r"chapter-(\d+)", attribute(tag, "href") or ""))
        ]
        result.total_chapters = max(numbers) if numbers and max(numbers) > 0 else None
        result.chapter_url_pattern = page_url + "/chapter-{cap}"
        return result

    def centralnovel(self, url: str) -> SourceMetadata:
        path = urlsplit(url).path
        matched = re.match(r"/series/([^/]+)", path) or re.match(
            r"/(.+?)-capitulo-\d+", path, re.I
        )
        if not matched:
            raise BusinessError("Invalid CentralNovel URL.")
        slug = matched.group(1).removesuffix(".html")
        base = str(self.settings.centralnovel_base).rstrip("/")
        try:
            soup = self._soup(f"{base}/series/{slug}")
        except BusinessError:
            soup = self._soup(url)
        result = self._basic(soup, url, "CentralNovel", slug, True)
        numbers: list[int] = []
        for tag in soup.select("a[href]"):
            href = attribute(tag, "href") or ""
            if match := re.search(r"capitulo-(\d+)", href, re.I):
                numbers.append(int(match.group(1)))
                if result.chapter_url_pattern is None:
                    result.chapter_url_pattern = urljoin(
                        base,
                        re.sub(r"capitulo-\d+", "capitulo-{cap}", href, flags=re.I),
                    )
        result.total_chapters = max(numbers) if numbers and max(numbers) > 0 else None
        if result.chapter_url_pattern is None:
            result.chapter_url_pattern = f"{base}/{slug}-capitulo-{{cap}}/"
        return result

    def novelfire(self, url: str) -> SourceMetadata:
        parts = urlsplit(url).path.strip("/").split("/")
        prefix, slug = (
            (parts[0], parts[1])
            if len(parts) >= 2 and parts[0] in {"book", "novel"}
            else ("book", parts[0])
        )
        if not slug:
            raise BusinessError("Invalid NovelFire URL.")
        base = str(self.settings.novelfire_base).rstrip("/")
        soup: BeautifulSoup | None = None
        for candidate in (prefix, "novel" if prefix == "book" else "book"):
            try:
                soup = self._soup(f"{base}/{candidate}/{slug}")
                prefix = candidate
                break
            except BusinessError:
                continue
        if soup is None:
            raise BusinessError("NovelFire could not be accessed.", status=502)
        result = self._basic(soup, url, "NovelFire", slug)
        result.rating = None
        result.authors = [
            tag.get_text(strip=True) for tag in soup.select(".author a,.authors a")
        ]
        page = f"{base}/{prefix}/{slug}"
        try:
            chapters = self._soup(page + "/chapters")
            maximum = attribute(chapters.find("input", id="gotochapno"), "max")
            result.total_chapters = (
                int(maximum) if maximum and int(maximum) > 0 else None
            )
        except (BusinessError, ValueError):
            pass
        result.chapter_url_pattern = page + "/chapter-{cap}"
        return result

    def royalroad(self, url: str) -> SourceMetadata:
        matched = re.match(r"/fiction/(\d+)/([^/]+)", urlsplit(url).path)
        if not matched:
            raise BusinessError("Invalid RoyalRoad URL.")
        fiction_id, slug = matched.groups()
        base = str(self.settings.royalroad_base).rstrip("/")
        page = f"{base}/fiction/{fiction_id}/{slug}"
        soup = self._soup(page)
        result = self._basic(soup, url, "RoyalRoad", slug)
        ids = [
            int(match.group(1))
            for tag in soup.select('a[href*="/chapter/"]')
            if (match := re.search(r"/chapter/(\d+)", attribute(tag, "href") or ""))
            and int(match.group(1)) > 0
        ]
        result.chapter_ids = list(dict.fromkeys(ids))
        result.total_chapters = len(result.chapter_ids) or None
        result.chapter_url_pattern = page + "/chapter/{cap}" if ids else None
        rating = soup.find(class_=re.compile("star|rating", re.I))
        result.rating = rating.get_text(strip=True) if rating else None
        result.genres = [tag.get_text(strip=True) for tag in soup.select(".tags .tag")]
        return result

    def generic(self, url: str) -> SourceMetadata:
        result = SourceMetadata(provider="Genérico", title=url, url_base=HttpUrl(url))
        try:
            soup = self._soup(url)
        except BusinessError as exc:
            if exc.status == 400:
                raise
            return result
        title = soup.find("title")
        result.title = title.get_text(strip=True) if title else url
        result.image_url = image_url(soup, url)
        numbers = [
            int(match.group(1))
            for tag in soup.select("a[href]")
            if (
                match := re.search(
                    r"chapter[-/](\d+)", attribute(tag, "href") or "", re.I
                )
            )
        ]
        result.total_chapters = max(numbers) if numbers and max(numbers) > 0 else None
        return result

    def _identify(self, url: str) -> SourceMetadata:
        host = (parse_url(url).hostname or "").lower().rstrip(".").removeprefix("www.")
        for base, parser in (
            (self.settings.freewebnovel_base, self.freewebnovel),
            (self.settings.centralnovel_base, self.centralnovel),
            (self.settings.novelfire_base, self.novelfire),
            (self.settings.royalroad_base, self.royalroad),
        ):
            if host == (base.host or "").lower().rstrip(".").removeprefix("www."):
                return parser(url)
        return self.generic(url)

    def _search(self, name: str) -> list[SourceMetadata]:
        slug = slugify(name)
        if not slug:
            raise BusinessError("Search name cannot be empty.")
        results: list[SourceMetadata] = []
        for base, prefix, parser in (
            (self.settings.freewebnovel_base, "novel", self.freewebnovel),
            (self.settings.centralnovel_base, "series", self.centralnovel),
        ):
            url = f"{str(base).rstrip('/')}/{prefix}/{slug}"
            try:
                if page_exists(self._soup(url)):
                    results.append(parser(url))
            except BusinessError:
                continue
        return results

    def identify(self, url: str) -> SourceMetadata:
        with self.limit.slot():
            return self._identify(url)

    def search(self, name: str) -> list[SourceMetadata]:
        with self.limit.slot():
            return self._search(name)
