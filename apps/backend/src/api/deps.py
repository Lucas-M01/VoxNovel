from threading import Lock
from typing import Annotated

from fastapi import Depends, Request

from src.adapters.providers import ProviderHttp
from src.adapters.supabase import SupabaseTransport
from src.core.config import Settings
from src.repositories.library import LibraryRepository
from src.services.providers import MetadataService


class Resources:
    def __init__(self, settings: Settings):
        self.settings = settings
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
