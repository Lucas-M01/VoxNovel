from typing import Literal
from uuid import UUID

from pydantic import BaseModel, PositiveInt

from src.core.exceptions import BusinessError
from src.repositories.chapter_text import ChapterText, ChapterTextRepository
from src.repositories.library import LibraryRepository
from src.services.chapter_urls import pattern_url
from src.services.chapters import ChapterService
from src.services.logs import LogBuffer


class DownloadResult(BaseModel):
    status: Literal["ok", "cache"]
    novel_id: UUID
    chapter: PositiveInt


class DownloadList(BaseModel):
    novel_id: UUID
    chapters: list[PositiveInt]


class RemovedPaths(BaseModel):
    removed: list[str]


class DownloadService:
    def __init__(
        self,
        library: LibraryRepository,
        cache: ChapterTextRepository,
        chapters: ChapterService,
        logs: LogBuffer,
    ):
        self.library = library
        self.cache = cache
        self.chapters = chapters
        self.logs = logs

    def generate(self, novel_id: UUID, chapter: int) -> DownloadResult:
        novel = self.library.get(novel_id)
        if self.cache.exists(novel_id, chapter):
            self.logs.add("Texto remoto já está no cache")
            return DownloadResult(status="cache", novel_id=novel_id, chapter=chapter)
        source = next(
            (source for source in novel.sources if source.id == novel.active_source_id),
            next(iter(novel.sources), None),
        )
        if source is None or not source.chapter_url_pattern:
            raise BusinessError("The active source has no chapter URL pattern.")
        identifier = chapter
        if source.chapter_ids:
            if not 1 <= chapter <= len(source.chapter_ids):
                raise BusinessError("Chapter is outside the source chapter list.")
            identifier = source.chapter_ids[chapter - 1]
        url = pattern_url(source.chapter_url_pattern, identifier)
        assert url is not None
        text = self.chapters.text(url, chapter, require_content=True, resolved=True)
        self.cache.save(novel_id, ChapterText(chapter=chapter, text=text.text))
        self.logs.add("Texto remoto salvo")
        return DownloadResult(status="ok", novel_id=novel_id, chapter=chapter)

    def list_chapters(self, novel_id: UUID) -> DownloadList:
        self.library.get(novel_id)
        return DownloadList(
            novel_id=novel_id, chapters=self.cache.list_chapters(novel_id)
        )

    def read(self, novel_id: UUID, chapter: int) -> ChapterText:
        text = self.cache.get(novel_id, chapter)
        if text is None:
            raise BusinessError(
                "Chapter is not downloaded.", status=404, title="Not Found"
            )
        return text

    def remove_chapter(self, novel_id: UUID, chapter: int) -> RemovedPaths:
        paths = self.cache.remove_chapter(novel_id, chapter)
        if not paths:
            raise BusinessError(
                "Chapter is not downloaded.", status=404, title="Not Found"
            )
        self.logs.add("Texto remoto removido")
        return RemovedPaths(removed=paths)

    def remove_novel(self, novel_id: UUID) -> RemovedPaths:
        return RemovedPaths(removed=self.cache.remove_novel(novel_id))
