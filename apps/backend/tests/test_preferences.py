from uuid import UUID

import pytest
from pydantic import ValidationError

from src.core.config import Settings
from src.core.exceptions import BusinessError
from src.repositories.preferences import FilterKind, PreferencesRepository, Speed
from src.repositories.transport import Operation, Row


class FailedTransport:
    def send(self, operation: Operation) -> list[Row]:
        raise BusinessError("Synthetic failure", status=503)

    def write(self, operation: str, novel_id: UUID, values: Row) -> None:
        raise AssertionError("Not a library operation")


def test_preferences_do_not_hide_persistence_failure() -> None:
    repo = PreferencesRepository(FailedTransport(), Settings())
    for action in (repo.filters, repo.speed, repo.clear_filters):
        with pytest.raises(BusinessError) as failure:
            action()
        assert failure.value.status == 503
    with pytest.raises(BusinessError):
        repo.save_speed(Speed(speed=2))


@pytest.mark.parametrize("speed", [0, -1, float("inf"), float("nan")])
def test_speed_rejects_invalid_numbers(speed: float) -> None:
    with pytest.raises(ValidationError):
        Speed(speed=speed)


def test_filter_validation_precedes_storage() -> None:
    repo = PreferencesRepository(FailedTransport(), Settings())
    cases: list[tuple[FilterKind, str]] = [("words", " "), ("regex", "[")]
    for kind, value in cases:
        with pytest.raises(BusinessError) as failure:
            repo.add_filter(kind, value)
        assert failure.value.status == 400
