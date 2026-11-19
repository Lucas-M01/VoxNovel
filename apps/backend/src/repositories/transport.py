from dataclasses import dataclass, field
from typing import Literal, Protocol
from uuid import UUID

from pydantic import JsonValue

Row = dict[str, JsonValue]


@dataclass(frozen=True)
class Operation:
    table: str
    action: Literal["select", "insert", "update", "delete", "upsert"] = "select"
    values: Row = field(default_factory=dict)
    filters: dict[str, str] = field(default_factory=dict)
    order: str | None = None
    ignore_duplicates: bool = False


class Transport(Protocol):
    def send(self, operation: Operation) -> list[Row]: ...

    def write(self, operation: str, novel_id: UUID, values: Row) -> None: ...
