from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Path

from src.api.deps import Downloads
from src.repositories.chapter_text import ChapterText
from src.services.downloads import DownloadList, DownloadResult, RemovedPaths

router = APIRouter(prefix="/api/v1/downloads", tags=["Remote text"])
Chapter = Annotated[int, Path(gt=0)]


@router.post("/{novel_id}/{chapter}")
def generate(novel_id: UUID, chapter: Chapter, service: Downloads) -> DownloadResult:
    return service.generate(novel_id, chapter)


@router.get("/{novel_id}")
def list_chapters(novel_id: UUID, service: Downloads) -> DownloadList:
    return service.list_chapters(novel_id)


@router.get("/{novel_id}/{chapter}/text", response_model_by_alias=False)
def text(novel_id: UUID, chapter: Chapter, service: Downloads) -> ChapterText:
    return service.read(novel_id, chapter)


@router.delete("/{novel_id}/{chapter}")
def remove_chapter(
    novel_id: UUID, chapter: Chapter, service: Downloads
) -> RemovedPaths:
    return service.remove_chapter(novel_id, chapter)


@router.delete("/{novel_id}")
def remove_novel(novel_id: UUID, service: Downloads) -> RemovedPaths:
    return service.remove_novel(novel_id)
