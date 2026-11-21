from datetime import UTC, datetime
from typing import Annotated, Self
from uuid import UUID, uuid4

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    PositiveInt,
    StringConstraints,
    model_validator,
)

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


def timestamp() -> datetime:
    return datetime.now(UTC)


class SourceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: Text
    title: Text
    url_base: HttpUrl
    slug: str | None = None
    chapter_url_pattern: str | None = None
    chapter_ids: list[PositiveInt] | None = None
    total_chapters: PositiveInt | None = None
    image_url: HttpUrl | None = None
    current_chapter: PositiveInt | None = None


class Source(SourceInput):
    id: UUID = Field(default_factory=uuid4)
    novel_id: UUID
    current_chapter: PositiveInt = 1
    updated_at: datetime = Field(default_factory=timestamp)


class NovelInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Text
    slug: str | None = None
    current_chapter: PositiveInt = 1
    sources: list[SourceInput] = Field(default_factory=list)


class Novel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    title: Text
    slug: Text
    current_chapter: PositiveInt = 1
    image_url: HttpUrl | None = None
    total_chapters: PositiveInt | None = None
    active_source_id: UUID | None = None
    sources: list[Source] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=timestamp)

    @model_validator(mode="after")
    def validate_sources(self) -> Self:
        source_ids = [source.id for source in self.sources]
        if len(source_ids) != len(set(source_ids)):
            raise ValueError("Duplicate source identifiers.")
        if any(source.novel_id != self.id for source in self.sources):
            raise ValueError("Source does not belong to this novel.")
        if (
            self.active_source_id is not None
            and self.active_source_id not in source_ids
        ):
            raise ValueError("Active source does not belong to this novel.")
        return self


class ProgressInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    chapter: PositiveInt
