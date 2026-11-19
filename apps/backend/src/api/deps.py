from threading import Lock
from typing import Annotated

from fastapi import Depends, Request

from src.adapters.providers import ProviderHttp
from src.adapters.storage import SupabaseTextStorage
from src.adapters.supabase import SupabaseTransport
from src.core.config import Settings
from src.repositories.chapter_text import ChapterTextRepository
from src.repositories.library import LibraryRepository
from src.repositories.preferences import PreferencesRepository
from src.services.chapters import ChapterService
from src.services.downloads import DownloadService
from src.services.logs import LogBuffer
from src.services.providers import MetadataService
from src.services.translation import TextTranslator


class Resources:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.logs = LogBuffer()
        self._transport: SupabaseTransport | None = None
        self._lock = Lock()

    def transport(self) -> SupabaseTransport:
        with self._lock:
            if self._transport is None:
                self._transport = SupabaseTransport.from_settings(self.settings)
            return self._transport


def resources(request: Request) -> Resources:
    value = request.app.state.resources
    if not isinstance(value, Resources):
        raise RuntimeError("Application resources are not initialized.")
    return value


Context = Annotated[Resources, Depends(resources)]


def library(context: Context) -> LibraryRepository:
    return LibraryRepository(context.transport())


def metadata(context: Context) -> MetadataService:
    return MetadataService(ProviderHttp(context.settings), context.settings)


Library = Annotated[LibraryRepository, Depends(library)]
Metadata = Annotated[MetadataService, Depends(metadata)]


def preferences(context: Context) -> PreferencesRepository:
    return PreferencesRepository(context.transport(), context.settings)


def chapters(context: Context) -> ChapterService:
    return ChapterService(
        ProviderHttp(context.settings),
        preferences(context),
        TextTranslator(context.settings),
        context.logs,
    )


Preferences = Annotated[PreferencesRepository, Depends(preferences)]
Chapters = Annotated[ChapterService, Depends(chapters)]


def downloads(context: Context, content: Chapters, repo: Library) -> DownloadService:
    storage = SupabaseTextStorage(
        context.transport().client,
        context.settings.supabase_text_bucket,
        context.settings.storage_page_size,
    )
    return DownloadService(repo, ChapterTextRepository(storage), content, context.logs)


Downloads = Annotated[DownloadService, Depends(downloads)]
