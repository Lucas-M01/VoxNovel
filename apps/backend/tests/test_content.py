import pytest

from src.repositories.preferences import Filters
from src.services.content import (
    apply_filters,
    clean_chapter,
    extract_chapter,
    normalize_homoglyphs,
)


def test_html_chapter_title_body_and_excluded_elements() -> None:
    html = b"""<html><h1>Synthetic Book</h1><h4>Chapter 7: A visit</h4>
    <nav><p>Navigation</p></nav><article><p>Chapter 7: A visit</p>
    <p>First <em>paragraph.</em></p><p>FIRST paragraph.</p><script>bad()</script>
    <p>Second paragraph.</p><p>First paragraph.</p></article>
    <footer>Footer</footer></html>"""
    assert (
        extract_chapter(html)
        == "Synthetic Book - Chapter 7: A visit\n\nFirst paragraph.\n\n"
        "Second paragraph.\n\nFirst paragraph."
    )


@pytest.mark.parametrize(
    "container",
    ["article", "main", 'div id="content"', 'div class="chapter-body"', "body"],
)
def test_html_container_fallbacks_without_paragraphs(container: str) -> None:
    name = container.split()[0]
    assert (
        extract_chapter(f"<{container}>One<br/>Two</{name}>".encode()) == "One\n\nTwo"
    )


def test_cleaning_preserves_accents_and_removes_watermarks_and_footers() -> None:
    text = (
        "Chapter 9\nChapter 9: repeated\nAção também çãõ. "
        "𝕗𝗿𝕖𝐞𝐰𝗲𝕓𝐧𝕠𝕧𝗲𝐥.𝚌𝐨𝚖\nOutra ƒreewebɴovel.com\nToque no meio da tela\n"
        "Relatório\nreportar erro aqui\nFim."
    )
    assert clean_chapter(text) == "Chapter 9\n\nAção também çãõ.\n\nOutra\n\nFim."
    assert (
        normalize_homoglyphs("Ação também çãõ ƒ ɴ а ο\u200b")
        == "Ação também çãõ f n a o"
    )


def test_filters_remove_lines_by_substring_and_regex_fragments() -> None:
    text = (
        "Chapter 2\nA publicidade aqui\nAccept cookies please\n"
        "Narrativa [ad] intacta\nNarrativa final"
    )
    filters = Filters(
        words=["PUBLICIDADE"], phrases=["accept cookies"], regex=[r"\[ad\]"]
    )
    assert (
        apply_filters(text, filters)
        == "Chapter 2\n\nNarrativa intacta\n\nNarrativa final"
    )
    empty = apply_filters(text, Filters())
    assert "publicidade" in empty and "[ad]" in empty


def test_invalid_stored_regex_and_nonconsecutive_duplicates() -> None:
    assert (
        apply_filters("One\nOne\nTwo\nOne", Filters(regex=["["])) == "One\n\nTwo\n\nOne"
    )


def test_title_detection_only_considers_the_first_eighty_characters() -> None:
    paragraph = "x" * 85 + " chapter 7 is mentioned in the story"
    assert clean_chapter(paragraph) == paragraph


def test_cyrillic_i_matches_reference_without_remapping_ukrainian_i() -> None:
    assert normalize_homoglyphs("Sиntétиco і") == "Sintético і"
    assert (
        apply_filters(
            "Sиntétиco anúncio\nNarrativa com і.", Filters(words=["sintético"])
        )
        == "Narrativa com і."
    )
