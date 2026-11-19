import pytest

from src.adapters.http import Page
from src.core.config import Settings
from src.core.exceptions import BusinessError
from src.services.providers import MetadataService


class FixtureHttp:
    def __init__(self, pages: dict[str, str | BusinessError]):
        self.pages = pages
        self.calls: list[str] = []

    def get(self, url: str) -> Page:
        self.calls.append(url)
        data = self.pages[url]
        if isinstance(data, BusinessError):
            raise data
        return Page(url, 200, {}, data.encode())


def test_freewebnovel_metadata_from_chapter_url() -> None:
    http = FixtureHttp(
        {
            "https://freewebnovel.com/novel/synthetic": """
      <h1 class="tit">Synthetic Story</h1>
      <meta property="og:image" content="/cover.jpg">
      <a href="/novel/synthetic/chapter-3">3</a>
      <a href="/novel/synthetic/chapter-19">19</a>
      <div class="author"><a>Author</a></div><span class="rating">4.5</span>
      <div class="genre"><a>Fantasy</a></div>"""
        }
    )
    result = MetadataService(http, Settings()).freewebnovel(
        "https://freewebnovel.com/novel/synthetic/chapter-3"
    )
    assert result.title == "Synthetic Story"
    assert result.total_chapters == 19
    assert str(result.image_url) == "https://freewebnovel.com/cover.jpg"
    assert result.authors == ["Author"] and result.genres == ["Fantasy"]
    assert result.rating == "4.5"
    assert (
        result.chapter_url_pattern
        == "https://freewebnovel.com/novel/synthetic/chapter-{cap}"
    )


def test_centralnovel_falls_back_to_original_page_and_detects_pattern() -> None:
    original = "https://centralnovel.com/synthetic-capitulo-9/"
    http = FixtureHttp(
        {
            "https://centralnovel.com/series/synthetic": BusinessError(
                "Synthetic failure"
            ),
            original: """
    <h1>Synthetic</h1><img src="/cover.png"><a href="/synthetic-capitulo-9/">9</a>
    <a href="/synthetic-capitulo-21/">21</a>""",
        }
    )
    result = MetadataService(http, Settings()).centralnovel(original)
    assert result.total_chapters == 21
    assert (
        result.chapter_url_pattern
        == "https://centralnovel.com/synthetic-capitulo-{cap}/"
    )
    assert str(result.image_url) == "https://centralnovel.com/cover.png"


def test_search_confirms_pages_and_tolerates_one_source_failure() -> None:
    http = FixtureHttp(
        {
            "https://freewebnovel.com/novel/synthetic-story": (
                '<h1 class="tit">Synthetic</h1>'
            ),
            "https://centralnovel.com/series/synthetic-story": BusinessError(
                "Unavailable"
            ),
        }
    )
    results = MetadataService(http, Settings()).search("Synthetic Story")
    assert len(results) == 1 and results[0].provider == "FreeWebNovel"
    assert results[0].total_chapters is None


@pytest.mark.parametrize("page", ["<title>404 Not Found</title>", "<div>Missing</div>"])
def test_search_does_not_report_missing_pages(page: str) -> None:
    http = FixtureHttp(
        {
            "https://freewebnovel.com/novel/synthetic": page,
            "https://centralnovel.com/series/synthetic": page,
        }
    )
    assert MetadataService(http, Settings()).search("Synthetic") == []


def test_centralnovel_defaults_and_invalid_image() -> None:
    http = FixtureHttp(
        {
            "https://centralnovel.com/series/synthetic": (
                "<title>Synthetic</title>"
                '<meta property="og:image" content="javascript:alert(1)">'
            )
        }
    )
    result = MetadataService(http, Settings()).centralnovel(
        "https://centralnovel.com/series/synthetic"
    )
    assert result.title == "synthetic" and result.image_url is None
    assert (
        result.chapter_url_pattern
        == "https://centralnovel.com/synthetic-capitulo-{cap}/"
    )


def test_invalid_provider_url_and_empty_search() -> None:
    service = MetadataService(FixtureHttp({}), Settings())
    for action in (
        lambda: service.freewebnovel("https://freewebnovel.com/"),
        lambda: service.centralnovel("https://centralnovel.com/"),
        lambda: service.search("   "),
    ):
        with pytest.raises(BusinessError):
            action()
