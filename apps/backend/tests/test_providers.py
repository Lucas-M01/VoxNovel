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


def test_novelfire_prefix_fallback_and_optional_chapter_count() -> None:
    http = FixtureHttp(
        {
            "https://novelfire.net/book/synthetic": BusinessError("Blocked"),
            "https://novelfire.net/novel/synthetic": "<h1>Synthetic Fire</h1>",
            "https://novelfire.net/novel/synthetic/chapters": (
                '<input id="gotochapno" max="917">'
            ),
        }
    )
    service = MetadataService(http, Settings())
    result = service.novelfire("https://novelfire.net/book/synthetic/chapter-5")
    assert result.title == "Synthetic Fire" and result.total_chapters == 917
    assert (
        result.chapter_url_pattern
        == "https://novelfire.net/novel/synthetic/chapter-{cap}"
    )
    http.pages["https://novelfire.net/novel/synthetic/chapters"] = BusinessError(
        "Unavailable"
    )
    assert (
        service.novelfire("https://novelfire.net/book/synthetic").total_chapters is None
    )


def test_royalroad_preserves_ordered_unique_real_ids() -> None:
    http = FixtureHttp(
        {
            "https://www.royalroad.com/fiction/123/synthetic": """
        <h1>Synthetic Road</h1><a href="/fiction/123/synthetic/chapter/9081/one">One</a>
        <a href="/fiction/123/synthetic/chapter/7023/two">Two</a>
        <a href="/fiction/123/synthetic/chapter/9081/one">Again</a>
        <div class="tags"><span class="tag">Fantasy</span></div>"""
        }
    )
    result = MetadataService(http, Settings()).royalroad(
        "https://www.royalroad.com/fiction/123/synthetic/chapter/9081"
    )
    assert result.chapter_ids == [9081, 7023]
    assert result.total_chapters == 2 and result.genres == ["Fantasy"]
    assert (
        result.chapter_url_pattern
        == "https://www.royalroad.com/fiction/123/synthetic/chapter/{cap}"
    )


def test_known_provider_errors_and_no_ids() -> None:
    service = MetadataService(
        FixtureHttp(
            {
                "https://novelfire.net/book/synthetic": BusinessError("Unavailable"),
                "https://novelfire.net/novel/synthetic": BusinessError("Unavailable"),
                "https://www.royalroad.com/fiction/123/synthetic": "<h1>Synthetic</h1>",
            }
        ),
        Settings(),
    )
    with pytest.raises(BusinessError):
        service.novelfire("https://novelfire.net/book/synthetic")
    with pytest.raises(BusinessError):
        service.royalroad("https://www.royalroad.com/not-fiction")
    result = service.royalroad("https://www.royalroad.com/fiction/123/synthetic")
    assert result.chapter_ids == [] and result.chapter_url_pattern is None


def test_identification_routes_by_hostname_not_substring() -> None:
    url = "https://freewebnovel.com.evil.example/novel/synthetic"
    http = FixtureHttp(
        {url: '<title>Generic synthetic</title><a href="/chapter/7">7</a>'}
    )
    result = MetadataService(http, Settings()).identify(url)
    assert result.provider == "Genérico" and result.title == "Generic synthetic"
    assert result.total_chapters == 7 and result.slug is None
    assert http.calls == [url]


def test_generic_fallback_preserves_network_policy_failure() -> None:
    url = "https://source.example/synthetic"
    http = FixtureHttp({url: BusinessError("Unavailable", status=502)})
    service = MetadataService(http, Settings())
    assert service.identify(url).title == url
    http.pages[url] = BusinessError("Blocked private redirect", status=400)
    with pytest.raises(BusinessError):
        service.identify(url)
    with pytest.raises(BusinessError):
        service.identify("file:///private")


def test_generic_static_story_resolves_relative_chapters_and_cover() -> None:
    url = "https://author.example/story/"
    page = """<title>Original story</title>
      <meta property="og:image" content="cover.jpg">
      <p>Synopsis, not a chapter.</p>
      <a href="chapter-1.html">I</a><a href="chapter-2.html">II</a>
      <a href="chapter-3.html#story">III</a>
      <a href="https://other.example/chapter-99.html">Other story</a>
      <a href="http://author.example/story/chapter-90.html">Other origin</a>
      <a href="https://[broken/chapter-80.html">Malformed</a>
      <a href="chapter-0.html">Invalid</a>"""
    result = MetadataService(FixtureHttp({url: page}), Settings()).identify(url)
    assert result.total_chapters == 3
    assert result.chapter_url_pattern == url + "chapter-{cap}.html"
    assert str(result.image_url) == url + "cover.jpg"


def test_generic_does_not_guess_between_different_stories() -> None:
    url = "https://author.example/"
    page = '<a href="one/chapter-1.html">One</a><a href="two/chapter-2.html">Two</a>'
    result = MetadataService(FixtureHttp({url: page}), Settings()).identify(url)
    assert result.chapter_url_pattern is None
    assert result.total_chapters is None


def test_generic_chapter_uses_linked_index_instead_of_only_next_chapter() -> None:
    root = "https://author.example/story/"
    chapter = root + "chapter-1.html"
    http = FixtureHttp(
        {
            chapter: '<title>Chapter I</title><a href="index.html#chapters">Home</a>'
            '<a href="chapter-2.html">Next</a>',
            root + "index.html": "<title>Original story</title>"
            '<meta property="og:image" content="cover.jpg">'
            '<a href="chapter-1.html">I</a><a href="chapter-2.html">II</a>'
            '<a href="chapter-3.html">III</a>',
        }
    )
    result = MetadataService(http, Settings()).identify(chapter)
    assert result.title == "Original story"
    assert result.total_chapters == 3
    assert result.chapter_url_pattern == root + "chapter-{cap}.html"
    assert str(result.image_url) == root + "cover.jpg"
    assert http.calls == [chapter, root + "index.html"]


@pytest.mark.parametrize("failure", [502, 400])
def test_generic_chapter_index_failure_keeps_network_policy(failure: int) -> None:
    root = "https://author.example/story/"
    chapter = root + "chapter-1.html"
    http = FixtureHttp(
        {
            chapter: '<a href="index.html">Home</a><a href="chapter-2.html">Next</a>',
            root + "index.html": BusinessError("Unavailable", status=failure),
        }
    )
    service = MetadataService(http, Settings())
    if failure == 400:
        with pytest.raises(BusinessError):
            service.identify(chapter)
    else:
        result = service.identify(chapter)
        assert result.total_chapters == 2
        assert result.chapter_url_pattern == root + "chapter-{cap}.html"


def test_generic_chapter_does_not_follow_external_or_unrelated_index() -> None:
    chapter = "https://author.example/story/chapter-1.html"
    http = FixtureHttp(
        {
            chapter: '<a href="https://other.example/index.html">Home</a>'
            '<a href="https://[broken/index.html">Invalid</a>'
            '<a href="../index.html">Other stories</a><a href="chapter-2.html">Next</a>'
        }
    )
    result = MetadataService(http, Settings()).identify(chapter)
    assert result.total_chapters == 2
    assert http.calls == [chapter]
