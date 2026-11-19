import pytest

from src.core.exceptions import BusinessError
from src.services.chapter_urls import (
    chapter_url,
    detect_chapter,
    pattern_url,
    source_chapter_number,
)


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://source.example/chapter-3", "https://source.example/chapter-7"),
        ("https://source.example/capitulo-3/", "https://source.example/capitulo-7/"),
        (
            "https://source.example/chapter/3/name",
            "https://source.example/chapter/7/name",
        ),
        ("https://source.example/capitulo/3", "https://source.example/capitulo/7"),
        (
            "https://source.example/book?page=3&other=1",
            "https://source.example/book?page=7&other=1",
        ),
        (
            "https://source.example/book?other=1",
            "https://source.example/book?other=1&page=7",
        ),
        ("https://source.example/book", "https://source.example/book?page=7"),
    ],
)
def test_url_formats(url: str, expected: str) -> None:
    assert chapter_url(url, 7) == expected


def test_detection_preserves_the_two_existing_fallbacks() -> None:
    assert detect_chapter("https://source.example/chapter-91") == 91
    assert detect_chapter("https://source.example/capitulo-12") == 12
    assert detect_chapter("https://source.example/chapter/91") == 1
    assert source_chapter_number("https://source.example/chapter/91") == 91
    assert source_chapter_number("https://source.example/book?page=12") == 1
    assert pattern_url("https://source.example/{cap}", 7) == "https://source.example/7"
    assert pattern_url(None, 7) is None
    with pytest.raises(BusinessError):
        chapter_url("https://source.example/", 0)
