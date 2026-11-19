from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.repositories.preferences import FilterKind
from src.services.providers import SourceMetadata


class ActiveSourceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_id: UUID


class SearchResult(BaseModel):
    name: str
    results: list[SourceMetadata]


class ChapterNumber(BaseModel):
    chapter: int


class ChapterUrl(BaseModel):
    url: str | None


class FilterValueInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: str = Field(min_length=1)


class FilterTermInput(FilterValueInput):
    kind: FilterKind
