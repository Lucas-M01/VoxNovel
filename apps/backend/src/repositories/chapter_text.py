import re
from typing import Protocol
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, PositiveInt, ValidationError

from src.core.exceptions import BusinessError


class TextStorage(Protocol):
    def upload(self, path: str, data: bytes) -> None: ...
    def download(self, path: str) -> bytes | None: ...
    def names(self, folder: str) -> list[str]: ...
    def remove(self, paths: list[str]) -> None: ...


class ChapterText(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    chapter: PositiveInt = Field(validation_alias="cap", serialization_alias="cap")
    text: str = Field(validation_alias="texto", serialization_alias="texto")


class ChapterTextRepository:
    def __init__(self, storage: TextStorage):
        self.storage = storage

    def _path(self, novel_id: UUID, chapter: int) -> str:
        if chapter < 1:
            raise BusinessError("Invalid chapter.")
        return f"{novel_id}/cap_{chapter}.json"

    def save(self, novel_id: UUID, chapter: ChapterText) -> None:
        self.storage.upload(
            self._path(novel_id, chapter.chapter),
            chapter.model_dump_json(by_alias=True).encode("utf-8"),
        )

    def get(self, novel_id: UUID, chapter: int) -> ChapterText | None:
        raw = self.storage.download(self._path(novel_id, chapter))
        if raw is None:
            return None
        try:
            result = ChapterText.model_validate_json(raw)
            if result.chapter != chapter:
                raise ValueError("Chapter mismatch")
            return result
        except (ValidationError, ValueError) as exc:
            raise BusinessError(
                "Stored chapter text is invalid.", status=503, title="Unavailable"
            ) from exc

    def exists(self, novel_id: UUID, chapter: int) -> bool:
        self._path(novel_id, chapter)
        return chapter in self.list_chapters(novel_id)

    def list_chapters(self, novel_id: UUID) -> list[int]:
        chapters = set()
        for name in self.storage.names(str(novel_id)):
            matched = re.fullmatch(r"cap_([1-9][0-9]*)\.json", name)
            if matched:
                chapters.add(int(matched.group(1)))
        return sorted(chapters)

    def remove_chapter(self, novel_id: UUID, chapter: int) -> list[str]:
        path = self._path(novel_id, chapter)
        if not self.exists(novel_id, chapter):
            return []
        self.storage.remove([path])
        return [path]

    def remove_novel(self, novel_id: UUID) -> list[str]:
        paths = [
            self._path(novel_id, chapter) for chapter in self.list_chapters(novel_id)
        ]
        if paths:
            self.storage.remove(paths)
        return paths
