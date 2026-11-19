import re
from uuid import UUID, uuid4

from pydantic import TypeAdapter
from slugify import slugify

from src.core.exceptions import BusinessError
from src.repositories.models import Novel, NovelInput, Source, SourceInput
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
        novel_id = uuid4()
        values = data.model_dump(mode="json")
        values["slug"] = slug
        self.transport.write("create", novel_id, ROWS.validate_python([values])[0])
        return self.get(novel_id)

    def add_source(self, novel_id: UUID, data: SourceInput) -> Novel:
        self.transport.write(
            "add_source",
            novel_id,
            ROWS.validate_python([data.model_dump(mode="json")])[0],
        )
        return self.get(novel_id)

    def update_progress(self, novel_id: UUID, chapter: int) -> Novel:
        if chapter < 1:
            raise BusinessError("Chapter must be positive.")
        self.transport.write("progress", novel_id, {"chapter": chapter})
        return self.get(novel_id)

    def activate_source(self, novel_id: UUID, source_id: UUID) -> Novel:
        novel = self.get(novel_id)
        if not any(s.id == source_id for s in novel.sources):
            raise missing("Source not found in this novel.")
        self.transport.write("activate_source", novel_id, {"source_id": str(source_id)})
        return self.get(novel_id)

    def remove_source(self, novel_id: UUID, source_id: UUID) -> Novel:
        novel = self.get(novel_id)
        if not any(s.id == source_id for s in novel.sources):
            raise missing("Source not found in this novel.")
        if len(novel.sources) <= 1:
            raise BusinessError("A novel must retain at least one source.")
        self.transport.write("remove_source", novel_id, {"source_id": str(source_id)})
        return self.get(novel_id)

    def delete(self, novel_id: UUID) -> None:
        self.transport.write("delete", novel_id, {})
