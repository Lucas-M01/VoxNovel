from uuid import UUID

import httpx
from postgrest import SyncFilterRequestBuilder, SyncSelectRequestBuilder
from postgrest.exceptions import APIError
from pydantic import TypeAdapter
from supabase import Client, ClientOptions, create_client

from src.core.config import Settings
from src.core.exceptions import BusinessError
from src.repositories.transport import Operation, Row

ROWS = TypeAdapter(list[Row])


class SupabaseTransport:
    def __init__(self, client: Client):
        self.client = client

    @classmethod
    def from_settings(cls, settings: Settings) -> "SupabaseTransport":
        if settings.supabase_url is None or settings.supabase_service_key is None:
            raise BusinessError(
                "Persistence is not configured.", status=503, title="Unavailable"
            )
        return cls(
            create_client(
                str(settings.supabase_url).rstrip("/"),
                settings.supabase_service_key.get_secret_value(),
                options=ClientOptions(persist_session=False, auto_refresh_token=False),
            )
        )

    def send(self, operation: Operation) -> list[Row]:
        try:
            table = self.client.table(operation.table)
            request: SyncFilterRequestBuilder | SyncSelectRequestBuilder
            match operation.action:
                case "select":
                    selected = table.select("*")
                    if operation.order:
                        selected = selected.order(operation.order)
                    request = selected
                case "insert":
                    request = table.insert(operation.values)
                case "update":
                    request = table.update(operation.values)
                case "upsert":
                    request = table.upsert(operation.values)
                case "delete":
                    request = table.delete()
            for field, value in operation.filters.items():
                request = request.eq(field, value)
            return ROWS.validate_python(request.execute().data)
        except APIError as exc:
            if exc.code == "23505":
                raise BusinessError(
                    "Record already exists.", status=409, title="Conflict"
                ) from exc
            raise BusinessError(
                "Persistence request failed.", status=503, title="Unavailable"
            ) from exc
        except httpx.HTTPError as exc:
            raise BusinessError(
                "Persistence is unavailable.", status=503, title="Unavailable"
            ) from exc

    def write(self, operation: str, novel_id: UUID, values: Row) -> None:
        try:
            self.client.rpc(
                "voxnovel_write_library",
                {
                    "p_operation": operation,
                    "p_novel_id": str(novel_id),
                    "p_values": values,
                },
            ).execute()
        except APIError as exc:
            if exc.code == "23505":
                raise BusinessError(
                    "Record already exists.", status=409, title="Conflict"
                ) from exc
            if exc.code == "P0002":
                raise BusinessError(
                    "Record not found.", status=404, title="Not Found"
                ) from exc
            if exc.code == "22023":
                raise BusinessError(
                    "The request violates a library invariant."
                ) from exc
            raise BusinessError(
                "Persistence request failed.", status=503, title="Unavailable"
            ) from exc
        except httpx.HTTPError as exc:
            raise BusinessError(
                "Persistence is unavailable.", status=503, title="Unavailable"
            ) from exc
