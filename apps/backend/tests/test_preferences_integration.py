import pytest

from src.adapters.supabase import SupabaseTransport
from src.core.config import get_settings
from src.repositories.preferences import Filters, PreferencesRepository, Speed
from src.repositories.transport import Operation


@pytest.mark.integration
def test_preferences_roundtrip_defaults_empty_lists_and_speed() -> None:
    settings = get_settings()
    if settings.supabase_url is None or settings.supabase_service_key is None:
        pytest.skip("Disposable local Supabase credentials are not configured.")
    assert settings.supabase_url.host in {"127.0.0.1", "localhost", "::1"}
    transport = SupabaseTransport.from_settings(settings)
    repo = PreferencesRepository(transport, settings)
    for table in ("filters", "preferences"):
        transport.send(Operation(table, "delete", filters={"id": "1"}))
    try:
        assert repo.filters().words == settings.filter_words
        assert repo.speed().speed == 1.5
        repo.clear_filters()
        assert (
            Filters.model_validate(repo.filters().model_dump(exclude={"updated_at"}))
            == Filters()
        )
        repo.add_filter("words", "Synthetic")
        repo.add_filter("phrases", "Synthetic")
        repo.add_filter("regex", "Synthetic")
        repo.add_filter("words", "Synthetic")
        assert repo.filters().words == ["Synthetic"]
        repo.remove_filter("words", "Synthetic")
        assert repo.filters().words == []
        assert repo.filters().phrases == ["Synthetic"]
        assert repo.filters().regex == ["Synthetic"]
        repo.save_speed(Speed(speed=2.25))
        reloaded = PreferencesRepository(
            SupabaseTransport.from_settings(settings), settings
        )
        assert reloaded.speed().speed == 2.25
        assert reloaded.filters().words == []
        # Bootstrap must not overwrite already saved preferences.
        transport.send(
            Operation(
                "preferences", "upsert", {"id": 1, "speed": 1.5}, ignore_duplicates=True
            )
        )
        assert repo.speed().speed == 2.25
    finally:
        for table in ("filters", "preferences"):
            transport.send(Operation(table, "delete", filters={"id": "1"}))
