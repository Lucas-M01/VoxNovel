import re

from src.core.exceptions import BusinessError


def detect_chapter(url: str) -> int:
    matched = re.search(r"(?:chapter|capitulo)-(\d+)", url, re.I)
    return int(matched.group(1)) if matched else 1


def source_chapter_number(url: str) -> int:
    matched = re.search(r"chapter[-/](\d+)|capitulo-(\d+)", url, re.I)
    return (
        int(next(value for value in matched.groups() if value is not None))
        if matched
        else 1
    )


def pattern_url(pattern: str | None, chapter: int) -> str | None:
    if chapter < 1:
        raise BusinessError("Invalid chapter.")
    return pattern.replace("{cap}", str(chapter)) if pattern else None


def chapter_url(base: str, chapter: int) -> str:
    if chapter < 1:
        raise BusinessError("Invalid chapter.")
    for pattern in (r"(chapter|capitulo)-\d+", r"/(chapter|capitulo)/\d+"):
        if re.search(pattern, base, re.I):
            return re.sub(
                pattern,
                lambda match: (
                    ("/" if match.group(0).startswith("/") else "")
                    + match.group(1)
                    + ("/" if match.group(0).startswith("/") else "-")
                    + str(chapter)
                ),
                base,
                flags=re.I,
            )
    if "?page=" in base:
        return re.sub(
            r"(\?page=)\d+", lambda match: match.group(1) + str(chapter), base
        )
    return base + ("&" if "?" in base else "?") + f"page={chapter}"
