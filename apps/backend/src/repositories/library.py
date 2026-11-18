import re
from uuid import UUID, uuid4

from pydantic import TypeAdapter
from slugify import slugify

from src.core.exceptions import BusinessError
from src.repositories.models import Novel, NovelInput, Source, SourceInput, timestamp
from src.repositories.transport import Operation, Row, Transport

ROWS = TypeAdapter(list[Row])


def normalized_slug(value: str) -> str:
    result = value.strip().lower()
    while True:
        trimmed = re.sub(
            r"-(light-novel|web-novel|web-manga|light-manga|novel|manga|manhwa|manhua|webtoon|comic|online|web|light|\d+)$",
            "",
            result,
        )
        if trimmed == result:
            return result
        result = trimmed


def missing(detail: str) -> BusinessError:
    return BusinessError(detail, status=404, title="Not Found")


class LibraryRepository:
    def __init__(self, transport: Transport):
        self.transport = transport

    def list_novels(self) -> list[Novel]:
        rows = self.transport.send(Operation("novels", order="created_at"))
        sources = self.transport.send(Operation("sources", order="created_at"))
        return [self._assemble(row, sources) for row in rows]

    def get(self, novel_id: UUID) -> Novel:
        rows = self.transport.send(Operation("novels", filters={"id": str(novel_id)}))
        if not rows:
            raise missing("Novel not found.")
        sources = self.transport.send(
            Operation(
                "sources", filters={"novel_id": str(novel_id)}, order="created_at"
            )
        )
        return self._assemble(rows[0], sources)

    def _assemble(self, row: Row, rows: list[Row]) -> Novel:
        sources = [
            Source.model_validate({k: v for k, v in s.items() if k != "created_at"})
            for s in rows
            if s.get("novel_id") == row["id"]
        ]
        active = next(
            (s for s in sources if str(s.id) == row.get("active_source_id")), None
        )
        totals = [s.total_chapters for s in sources if s.total_chapters is not None]
        value = {key: item for key, item in row.items() if key != "created_at"}
        value["sources"] = [s.model_dump(mode="json") for s in sources]
        if active is not None:
            value["current_chapter"] = active.current_chapter
        if totals:
            value["total_chapters"] = max(totals)
        if not value.get("image_url") and sources:
            value["image_url"] = (
                str(sources[0].image_url) if sources[0].image_url else None
            )
        return Novel.model_validate(value)

    def create(self, data: NovelInput) -> Novel:
        slug = data.slug or slugify(data.title)
        if any(
            normalized_slug(n.slug) == normalized_slug(slug) for n in self.list_novels()
        ):
            raise BusinessError("Novel already exists.", status=409, title="Conflict")
        novel = Novel(title=data.title, slug=slug, current_chapter=data.current_chapter)
        row = novel.model_dump(mode="json", exclude={"sources"})
        self.transport.send(
            Operation("novels", "insert", ROWS.validate_python([row])[0])
        )
        for source in data.sources:
            self.add_source(novel.id, source)
        return self.get(novel.id)

    def add_source(self, novel_id: UUID, data: SourceInput) -> Novel:
        novel = self.get(novel_id)
        existing = next((s for s in novel.sources if s.provider == data.provider), None)
        values = data.model_dump(mode="json")
        values["id"] = str(existing.id if existing else uuid4())
        values["novel_id"] = str(novel_id)
        values["slug"] = data.slug or novel.slug
        values["current_chapter"] = data.current_chapter or (
            existing.current_chapter if existing else novel.current_chapter
        )
        values["updated_at"] = timestamp().isoformat()
        self.transport.send(
            Operation("sources", "upsert", ROWS.validate_python([values])[0])
        )
        if novel.active_source_id is None:
            self._update(novel_id, {"active_source_id": values["id"]})
        return self.get(novel_id)

    def update_progress(self, novel_id: UUID, chapter: int) -> Novel:
        if chapter < 1:
            raise BusinessError("Chapter must be positive.")
        novel = self.get(novel_id)
        if novel.active_source_id:
            self.transport.send(
                Operation(
                    "sources",
                    "update",
                    {"current_chapter": chapter, "updated_at": timestamp().isoformat()},
                    {"id": str(novel.active_source_id), "novel_id": str(novel_id)},
                )
            )
        self._update(novel_id, {"current_chapter": chapter})
        return self.get(novel_id)

    def activate_source(self, novel_id: UUID, source_id: UUID) -> Novel:
        novel = self.get(novel_id)
        if not any(s.id == source_id for s in novel.sources):
            raise missing("Source not found in this novel.")
        self._update(novel_id, {"active_source_id": str(source_id)})
        return self.get(novel_id)

    def remove_source(self, novel_id: UUID, source_id: UUID) -> Novel:
        novel = self.get(novel_id)
        if not any(s.id == source_id for s in novel.sources):
            raise missing("Source not found in this novel.")
        if len(novel.sources) <= 1:
            raise BusinessError("A novel must retain at least one source.")
        if novel.active_source_id == source_id:
            self._update(
                novel_id,
                {
                    "active_source_id": str(
                        next(s.id for s in novel.sources if s.id != source_id)
                    )
                },
            )
        self.transport.send(
            Operation(
                "sources",
                "delete",
                filters={"id": str(source_id), "novel_id": str(novel_id)},
            )
        )
        return self.get(novel_id)

    def delete(self, novel_id: UUID) -> None:
        self.get(novel_id)
        self.transport.send(
            Operation("novels", "delete", filters={"id": str(novel_id)})
        )

    def _update(self, novel_id: UUID, values: Row) -> None:
        self.transport.send(
            Operation(
                "novels",
                "update",
                {**values, "updated_at": timestamp().isoformat()},
                {"id": str(novel_id)},
            )
        )
