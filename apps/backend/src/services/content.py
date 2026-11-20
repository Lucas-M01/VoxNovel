"""Chapter extraction and the shared, observable cleaning stages."""

import re
import time
import unicodedata
from functools import lru_cache

import regex
from bs4 import BeautifulSoup

from src.core.config import (
    DEFAULT_PROCESSING_MAX_CHARS,
    DEFAULT_REGEX_TIMEOUT,
    DEFAULT_SCRAPER_MAX_BYTES,
)
from src.core.exceptions import BusinessError
from src.repositories.preferences import Filters

CHAPTER_TITLE = re.compile(r"(?:cap[ií]tulo|chapter)\s+\d+", re.I)
FOOTERS = ("toque no meio da tela", "se você encontrar algum erro", "reportar erro")
WATERMARKS = ("freewebnovel.com", "novelfire.net", "novelbin.com")
# Visual substitutions observed in the prototype; Portuguese accents stay intact.
CONFUSABLES = str.maketrans(
    dict(
        zip(
            "агысртеһіўомнквουνραι",
            "arysptehiyomhkbouvpai",
            strict=True,
        )
    )
)


@lru_cache(maxsize=2048)
def normalize_character(character: str) -> str:
    if character.isascii():
        return character
    name = unicodedata.name(character, "")
    if any(
        accent in name
        for accent in (
            "WITH ACUTE",
            "WITH GRAVE",
            "WITH TILDE",
            "WITH CEDILLA",
            "WITH CIRCUMFLEX",
            "WITH DIAERESIS",
        )
    ):
        return character
    mapped = character.translate(CONFUSABLES)
    if mapped != character:
        return mapped.upper() if character.isupper() else mapped
    match = re.match(
        r"LATIN (?:(?:SMALL|CAPITAL) LETTER|LETTER SMALL CAPITAL) ([A-Z])", name
    )
    if match:
        base = match.group(1)
        return base if character.isupper() else base.lower()
    return character


def normalize_homoglyphs(text: str) -> str:
    return "".join(
        normalize_character(char) for char in text if unicodedata.category(char) != "Cf"
    )


def remove_watermarks(
    text: str, *, max_chars: int = DEFAULT_PROCESSING_MAX_CHARS
) -> str:
    check_text_size(text, max_chars)
    text = unicodedata.normalize("NFKC", text)
    check_text_size(text, max_chars)
    lowered = text.lower()
    removed = bytearray(len(text))
    for domain in WATERMARKS:
        length = len(domain)
        position = 0
        while position + length <= len(text):
            window = lowered[position : position + length]
            if (
                not any(char in window for char in " \n\t")
                and sum(a == b for a, b in zip(window, domain, strict=True)) / length
                >= 0.72
            ):
                removed[position : position + length] = b"\1" * length
                position += length
            else:
                position += 1
    result = "".join(char for index, char in enumerate(text) if not removed[index])
    return re.sub(r"[ \t]+\n", "\n", re.sub(r"[ \t]{2,}", " ", result))


def clean_chapter(text: str, *, max_chars: int = DEFAULT_PROCESSING_MAX_CHARS) -> str:
    result: list[str] = []
    title: str | None = None
    previous: str | None = None
    for line in remove_watermarks(text, max_chars=max_chars).splitlines():
        line = line.strip()
        if not line:
            continue
        if CHAPTER_TITLE.search(line[:80]):
            if title is None:
                title = line
            continue
        lowered = line.lower()
        if lowered == "relatório" or any(footer in lowered for footer in FOOTERS):
            continue
        if lowered != previous:
            result.append(line)
            previous = lowered
    if title:
        result.insert(0, title)
    return "\n\n".join(result)


def check_text_size(text: str, maximum: int) -> None:
    if len(text) > maximum:
        raise BusinessError(
            "The chapter is too large.", status=502, title="Source unavailable"
        )


def apply_filters(
    text: str,
    filters: Filters,
    *,
    timeout: float = DEFAULT_REGEX_TIMEOUT,
    max_chars: int = DEFAULT_PROCESSING_MAX_CHARS,
) -> str:
    check_text_size(text, max_chars)
    normalized = normalize_homoglyphs(text)
    terms = [term.lower() for term in filters.words + filters.phrases]
    filtered = "\n".join(
        line
        for line in normalized.splitlines()
        if not any(term in line.lower() for term in terms)
    )
    deadline = time.monotonic() + timeout
    for pattern in filters.regex:
        try:
            re.compile(pattern, re.I)
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError()
            filtered = regex.sub(
                pattern, "", filtered, flags=regex.I | regex.V0, timeout=remaining
            )
        except (re.error, regex.error):
            # Previously saved invalid patterns never prevent reading.
            continue
        except TimeoutError as exc:
            raise BusinessError("A filter exceeded its processing budget.") from exc
    return clean_chapter(filtered, max_chars=max_chars).strip()


def extract_chapter(
    html: bytes,
    *,
    max_chars: int = DEFAULT_PROCESSING_MAX_CHARS,
    max_bytes: int = DEFAULT_SCRAPER_MAX_BYTES,
) -> str:
    if len(html) > max_bytes:
        raise BusinessError(
            "The source response is too large.", status=502, title="Source unavailable"
        )
    soup = BeautifulSoup(html, "lxml")
    for element in soup.select(
        "script,style,nav,footer,header,aside,form,button,iframe,noscript"
    ):
        element.decompose()
    candidates = [
        tag.get_text(" ", strip=True)
        for selector in (
            "h1",
            "h2",
            "h3",
            "h4",
            ".chapter-title",
            ".entry-title",
            ".post-title",
        )
        for tag in soup.select(selector)
        if len(tag.get_text(" ", strip=True)) >= 3
    ]
    chapter = next((value for value in candidates if CHAPTER_TITLE.search(value)), None)
    h1 = soup.find("h1")
    book = (
        h1.get_text(" ", strip=True)
        if h1 and not CHAPTER_TITLE.search(h1.get_text())
        else None
    )
    if not book:
        for selector in (".novel-title", ".book-title", ".breadcrumb a"):
            tag = soup.select_one(selector)
            if tag and len(value := tag.get_text(" ", strip=True)) > 2:
                book = value
                break
    title = (
        f"{book} - {chapter}"
        if book and chapter
        else chapter or next(iter(candidates), None)
    )
    root = (
        soup.find("article")
        or soup.find("main")
        or soup.find(id=re.compile("content|main|text|body", re.I))
        or soup.find(class_=re.compile("content|main|text|body|chapter", re.I))
        or soup.body
    )
    if root is None:
        return clean_chapter(soup.get_text("\n\n", strip=True), max_chars=max_chars)
    paragraphs = root.find_all("p")
    pieces = ([title] if title else []) + (
        [paragraph.get_text(" ", strip=True) for paragraph in paragraphs]
        if paragraphs
        else root.get_text("\n\n", strip=True).split("\n\n")
    )
    return clean_chapter(
        "\n".join(piece.strip() for piece in pieces if piece.strip()),
        max_chars=max_chars,
    )
