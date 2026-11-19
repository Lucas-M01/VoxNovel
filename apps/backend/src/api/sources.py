from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import HttpUrl

from src.api.deps import Metadata
from src.api.schemas import ChapterNumber, ChapterUrl, SearchResult
from src.services.chapter_urls import detect_chapter, pattern_url, source_chapter_number
from src.services.providers import SourceMetadata

router = APIRouter(prefix="/api/v1/sources", tags=["Sources"])


@router.get("/identify")
def identify(url: HttpUrl, service: Metadata) -> SourceMetadata:
    return service.identify(str(url))


@router.get("/search")
def search(
    name: Annotated[str, Query(min_length=1)], service: Metadata
) -> SearchResult:
    return SearchResult(name=name, results=service.search(name))


@router.get("/chapter-number")
def chapter_number(url: HttpUrl) -> ChapterNumber:
    return ChapterNumber(chapter=source_chapter_number(str(url)))


@router.get("/detect-chapter")
def starting_chapter(url: HttpUrl) -> ChapterNumber:
    return ChapterNumber(chapter=detect_chapter(str(url)))


@router.get("/chapter-url")
def build_url(pattern: str, chapter: Annotated[int, Query(gt=0)]) -> ChapterUrl:
    return ChapterUrl(url=pattern_url(pattern, chapter))
