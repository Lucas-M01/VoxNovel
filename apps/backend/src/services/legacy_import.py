"""Validate explicit legacy API exports without guessing unknown formats."""

from datetime import datetime, timedelta
from typing import Annotated, Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    PositiveInt,
    RootModel,
)

from src.core.import_errors import LegacyImportError
from src.repositories.library import normalized_slug
from src.repositories.models import Novel, Source
from src.repositories.preferences import Filters, Speed


class LegacySource(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    id: Annotated[str, Field(min_length=1, max_length=128)]
    provider: str
    title: str
    url_base: HttpUrl
    slug: str | None = None
    chapter_url_pattern: str | None = None
    chapter_ids: list[PositiveInt] | None = None
    total_caps: PositiveInt | None = None
    image_url: HttpUrl | None = None
    pagina_atual: PositiveInt | None = None
    created_at: AwareDatetime | None = None


class LegacyNovel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    id: Annotated[str, Field(min_length=1, max_length=128)]
    slug: str
    obra: str
    pagina_atual: PositiveInt
    image_url: HttpUrl | None = None
    total_caps: PositiveInt | None = None
    fonte_ativa: str | None = None
    fontes: list[LegacySource]


class LegacyFilters(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    palavras: list[str]
    frases: list[str]
    regex: list[str]


class LegacySpeed(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, strict=True)
    velocidade: float


class LegacyDownload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    obra_id: str
    cap: PositiveInt
    texto: str


class LegacyExport(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    format: Literal["voxnovel-legacy-api-v1"]
    exported_at: AwareDatetime
    obras: list[LegacyNovel]
    filtros: LegacyFilters | None = None
    config: LegacySpeed | None = None
    downloads: list[LegacyDownload] = Field(default_factory=list)


class ImportedText(BaseModel):
    novel_id: UUID
    chapter: PositiveInt
    text: str


class ImportPlan(BaseModel):
    novels: list[Novel]
    filters: Filters | None
    speed: Speed | None
    texts: list[ImportedText]
    exported_at: datetime
    id_map: dict[str, str]
    source_created_at: dict[str, datetime]


def mapped_id(kind: str, value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError:
        return uuid5(NAMESPACE_URL, f"voxnovel-legacy:{kind}:{value}")


def normalize_export(export: LegacyExport) -> ImportPlan:
    novels: list[Novel] = []
    id_map: dict[str, str] = {}
    source_created_at: dict[str, datetime] = {}
    source_ids: set[UUID] = set()
    slugs: set[str] = set()
    novel_ids: set[UUID] = set()
    for old in export.obras:
        novel_id = mapped_id("novel", old.id)
        slug = normalized_slug(old.slug)
        if not slug or slug in slugs or novel_id in novel_ids:
            raise LegacyImportError("Duplicate or empty novel identity.")
        slugs.add(slug)
        novel_ids.add(novel_id)
        id_map[f"novel:{old.id}"] = str(novel_id)
        sources: list[Source] = []
        providers: set[str] = set()
        for index, item in enumerate(old.fontes):
            source_id = mapped_id(f"source:{old.id}", item.id)
            if source_id in source_ids or item.provider in providers:
                raise LegacyImportError("Duplicate source identity.")
            if item.chapter_ids and len(set(item.chapter_ids)) != len(item.chapter_ids):
                raise LegacyImportError("Duplicate chapter identifiers.")
            source_created_at[str(source_id)] = (
                item.created_at or export.exported_at + timedelta(microseconds=index)
            )
            source_ids.add(source_id)
            providers.add(item.provider)
            id_map[f"source:{old.id}:{item.id}"] = str(source_id)
            sources.append(
                Source(
                    id=source_id,
                    novel_id=novel_id,
                    provider=item.provider,
                    title=item.title,
                    slug=item.slug,
                    url_base=item.url_base,
                    chapter_url_pattern=item.chapter_url_pattern,
                    chapter_ids=item.chapter_ids,
                    total_chapters=item.total_caps,
                    image_url=item.image_url,
                    current_chapter=item.pagina_atual or 1,
                    updated_at=export.exported_at,
                )
            )
        active = next(
            (
                source.id
                for old_source, source in zip(old.fontes, sources, strict=True)
                if old_source.id == old.fonte_ativa
            ),
            None,
        )
        if old.fontes and (old.fonte_ativa is None or active is None):
            raise LegacyImportError("Active source needs an explicit choice.")
        if any(
            source.id == active and source.current_chapter != old.pagina_atual
            for source in sources
        ):
            raise LegacyImportError("Conflicting source and novel progress.")
        novels.append(
            Novel(
                id=novel_id,
                title=old.obra,
                slug=old.slug,
                current_chapter=old.pagina_atual,
                image_url=old.image_url,
                total_chapters=old.total_caps,
                active_source_id=active,
                sources=sources,
                updated_at=export.exported_at,
            )
        )
    texts: list[ImportedText] = []
    text_keys: set[tuple[UUID, int]] = set()
    for download in export.downloads:
        novel_id = mapped_id("novel", download.obra_id)
        if (
            novel_id not in novel_ids
            or (novel_id, download.cap) in text_keys
            or not download.texto.strip()
        ):
            raise LegacyImportError("Invalid exported chapter text.")
        text_keys.add((novel_id, download.cap))
        texts.append(
            ImportedText(novel_id=novel_id, chapter=download.cap, text=download.texto)
        )
    return ImportPlan(
        novels=novels,
        filters=Filters(
            words=export.filtros.palavras,
            phrases=export.filtros.frases,
            regex=export.filtros.regex,
        )
        if export.filtros
        else None,
        speed=Speed(speed=export.config.velocidade) if export.config else None,
        texts=texts,
        exported_at=export.exported_at,
        id_map=id_map,
        source_created_at=source_created_at,
    )


class LegacySourceRow(LegacySource):
    obra_id: str
    created_at: AwareDatetime | None = None
    updated_at: AwareDatetime | None = None


class LegacyNovelRow(LegacyNovel):
    fontes: list[LegacySource] = Field(default_factory=list)
    created_at: AwareDatetime | None = None
    updated_at: AwareDatetime | None = None


class LegacyFilterRow(LegacyFilters):
    id: Literal[1]
    created_at: AwareDatetime | None = None
    updated_at: AwareDatetime | None = None


class LegacySpeedRow(LegacySpeed):
    id: Literal[1]
    created_at: AwareDatetime | None = None
    updated_at: AwareDatetime | None = None


class LegacyTablesExport(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    format: Literal["voxnovel-legacy-tables-v1"]
    exported_at: AwareDatetime
    obras: list[LegacyNovelRow]
    fontes: list[LegacySourceRow]
    filtros: list[LegacyFilterRow] = Field(default_factory=list)
    config: list[LegacySpeedRow] = Field(default_factory=list)
    downloads: list[LegacyDownload] = Field(default_factory=list)


class LegacyDocument(RootModel[LegacyExport | LegacyTablesExport]):
    model_config = ConfigDict(strict=True)


def parse_export(raw: bytes) -> ImportPlan:
    parsed = LegacyDocument.model_validate_json(raw).root
    if isinstance(parsed, LegacyTablesExport):
        if (
            len(parsed.filtros) > 1
            or len(parsed.config) > 1
            or any(novel.fontes for novel in parsed.obras)
        ):
            raise LegacyImportError("Conflicting export formats or singleton rows.")
        if any(
            source.obra_id not in {novel.id for novel in parsed.obras}
            for source in parsed.fontes
        ):
            raise LegacyImportError("Orphan source row.")
        novels = [
            LegacyNovel.model_validate(
                {
                    **novel.model_dump(exclude={"created_at", "updated_at", "fontes"}),
                    "fontes": [
                        source.model_dump(exclude={"obra_id", "updated_at"})
                        for source in parsed.fontes
                        if source.obra_id == novel.id
                    ],
                }
            )
            for novel in parsed.obras
        ]
        parsed = LegacyExport(
            format="voxnovel-legacy-api-v1",
            exported_at=parsed.exported_at,
            obras=novels,
            filtros=LegacyFilters.model_validate(
                parsed.filtros[0].model_dump(exclude={"id", "created_at", "updated_at"})
            )
            if parsed.filtros
            else None,
            config=LegacySpeed.model_validate(
                parsed.config[0].model_dump(exclude={"id", "created_at", "updated_at"})
            )
            if parsed.config
            else None,
            downloads=parsed.downloads,
        )
    return normalize_export(parsed)
