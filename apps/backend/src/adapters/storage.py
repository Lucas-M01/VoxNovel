import httpx
from pydantic import BaseModel, TypeAdapter, ValidationError
from storage3.exceptions import StorageApiError
from supabase import Client

from src.adapters.supabase import SupabaseTransport
from src.core.config import Settings
from src.core.exceptions import BusinessError


class StoredFile(BaseModel):
    name: str


FILES = TypeAdapter(list[StoredFile])


def unavailable() -> BusinessError:
    return BusinessError(
        "Chapter storage is unavailable.", status=503, title="Unavailable"
    )


class SupabaseTextStorage:
    def __init__(self, client: Client, bucket: str, page_size: int):
        self.storage = client.storage
        self.bucket_id = bucket
        self.bucket = self.storage.from_(bucket)
        self.page_size = page_size

    @classmethod
    def from_settings(cls, settings: Settings) -> "SupabaseTextStorage":
        return cls(
            SupabaseTransport.from_settings(settings).client,
            settings.supabase_text_bucket,
            settings.storage_page_size,
        )

    def upload(self, path: str, data: bytes) -> None:
        try:
            self.bucket.upload(
                path, data, {"content-type": "application/json", "upsert": "true"}
            )
        except (StorageApiError, httpx.HTTPError, ValidationError) as exc:
            raise unavailable() from exc

    def download(self, path: str) -> bytes | None:
        try:
            return self.bucket.download(path)
        except StorageApiError as exc:
            if exc.code in {"NoSuchKey", "ObjectNotFound"} or (
                exc.code == "not_found" and exc.message == "Object not found"
            ):
                return None
            raise unavailable() from exc
        except httpx.HTTPError as exc:
            raise unavailable() from exc

    def names(self, folder: str) -> list[str]:
        result: list[str] = []
        offset = 0
        try:
            # The list endpoint can return [] even when the bucket is absent.
            self.storage.get_bucket(self.bucket_id)
            while True:
                batch = FILES.validate_python(
                    self.bucket.list(
                        folder,
                        {
                            "limit": self.page_size,
                            "offset": offset,
                            "sortBy": {"column": "name", "order": "asc"},
                        },
                    )
                )
                result.extend(item.name for item in batch)
                if len(batch) < self.page_size:
                    return result
                offset += self.page_size
        except (StorageApiError, httpx.HTTPError, ValidationError) as exc:
            raise unavailable() from exc

    def remove(self, paths: list[str]) -> None:
        try:
            for offset in range(0, len(paths), self.page_size):
                self.bucket.remove(paths[offset : offset + self.page_size])
        except (StorageApiError, httpx.HTTPError, ValidationError) as exc:
            raise unavailable() from exc
