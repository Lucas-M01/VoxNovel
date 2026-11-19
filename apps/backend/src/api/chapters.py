from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import HttpUrl

from src.api.deps import Chapters
from src.services.chapters import ChapterResult

router = APIRouter(prefix="/api/v1/chapters", tags=["Chapters"])


@router.get("/text")
def text(
    url: HttpUrl, chapter: Annotated[int, Query(gt=0)], service: Chapters
) -> ChapterResult:
    return service.text(str(url), chapter)
