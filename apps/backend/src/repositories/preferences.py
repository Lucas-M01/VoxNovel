import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, PositiveFloat

from src.core.config import Settings
from src.core.exceptions import BusinessError
from src.repositories.models import timestamp
from src.repositories.transport import Operation, Row, Transport

FilterKind = Literal["words", "phrases", "regex"]


class Filters(BaseModel):
    model_config = ConfigDict(extra="forbid")
    words: list[str] = Field(default_factory=list)
    phrases: list[str] = Field(default_factory=list)
    regex: list[str] = Field(default_factory=list)


class Speed(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    speed: PositiveFloat


class FilterState(Filters):
    updated_at: datetime


class SpeedState(Speed):
    updated_at: datetime


class PreferencesRepository:
    def __init__(self, transport: Transport, settings: Settings):
        self.transport = transport
        self.settings = settings

    def _load(self, table: str, defaults: Row) -> Row:
        rows = self.transport.send(Operation(table, filters={"id": "1"}))
        if not rows:
            self.transport.send(
                Operation(
                    table, "upsert", {"id": 1, **defaults}, ignore_duplicates=True
                )
            )
            rows = self.transport.send(Operation(table, filters={"id": "1"}))
        if not rows:
            raise BusinessError(
                "Preferences are unavailable.", status=503, title="Unavailable"
            )
        return {key: value for key, value in rows[0].items() if key != "id"}

    def filters(self) -> FilterState:
        return FilterState.model_validate(
            self._load(
                "filters",
                {
                    "words": list(self.settings.filter_words),
                    "phrases": list(self.settings.filter_phrases),
                    "regex": list(self.settings.filter_regex),
                },
            )
        )

    def save_filters(self, filters: Filters) -> FilterState:
        self.transport.send(
            Operation(
                "filters",
                "upsert",
                {
                    "id": 1,
                    **filters.model_dump(mode="json"),
                    "updated_at": timestamp().isoformat(),
                },
            )
        )
        return self.filters()

    def clear_filters(self) -> FilterState:
        return self.save_filters(Filters())

    def add_filter(self, kind: FilterKind, value: str) -> FilterState:
        value = value.strip()
        if not value:
            raise BusinessError("Filter cannot be empty.")
        if kind == "regex":
            try:
                re.compile(value)
            except re.error as exc:
                raise BusinessError("Invalid regular expression.") from exc
        filters = self.filters()
        items = getattr(filters, kind)
        if value not in items:
            items.append(value)
            return self.save_filters(filters)
        return filters

    def remove_filter(self, kind: FilterKind, value: str) -> FilterState:
        filters = self.filters()
        items = getattr(filters, kind)
        value = value.strip()
        if value in items:
            items.remove(value)
            return self.save_filters(filters)
        return filters

    def add_word(self, value: str) -> FilterState:
        return self.add_filter("phrases" if " " in value else "words", value)

    def remove_word(self, value: str) -> FilterState:
        filters = self.filters()
        if any(term.lower() == value.lower() for term in filters.words):
            return self.remove_filter("words", value)
        if any(term.lower() == value.lower() for term in filters.phrases):
            return self.remove_filter("phrases", value)
        return filters

    def speed(self) -> SpeedState:
        return SpeedState.model_validate(
            self._load("preferences", {"speed": self.settings.default_speed})
        )

    def save_speed(self, speed: Speed) -> SpeedState:
        self.transport.send(
            Operation(
                "preferences",
                "upsert",
                {
                    "id": 1,
                    **speed.model_dump(mode="json"),
                    "updated_at": timestamp().isoformat(),
                },
            )
        )
        return self.speed()
