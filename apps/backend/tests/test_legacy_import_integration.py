import json
import subprocess
from pathlib import Path
from uuid import uuid4

import pytest
from legacy_fixture import legacy_payload
from pydantic import TypeAdapter

from src.adapters.legacy_import import ImportTextStorage
from src.adapters.supabase import SupabaseTransport
from src.core.config import get_settings
from src.core.import_errors import LegacyImportError
from src.repositories.legacy_import import import_sql
from src.services.legacy_import import parse_export


@pytest.mark.integration
def test_import_transaction_idempotency_and_conflict_rollback_in_isolated_schema() -> (
    None
):
    settings = get_settings()
    if settings.legacy_import_database_url is None:
        pytest.skip("Use check_integration.py for the disposable import database.")
    from urllib.parse import urlparse

    assert urlparse(
        settings.legacy_import_database_url.get_secret_value()
    ).hostname in {"localhost", "127.0.0.1", "::1"}
    schema = "synthetic_import_" + uuid4().hex
    fixture = Path("src/repositories/testing")
    command = [
        *settings.legacy_psql_command,
        "-X",
        "-qAt",
        "--set",
        "ON_ERROR_STOP=1",
        "--set",
        f"import_schema={schema}",
    ]

    def execute(sql: str, *, check: bool = True) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            command, input=sql, text=True, capture_output=True, check=check, timeout=60
        )

    try:
        execute((fixture / "import_schema.sql").read_text())
        data = json.loads(json.dumps(legacy_payload()))
        data["downloads"] = []
        # Quotes and SQL-looking text are still just imported data.
        data["obras"][0]["obra"] = "Synthetic '); drop table novels; --"
        plan = parse_export(json.dumps(data).encode())
        counts = TypeAdapter(dict[str, int]).validate_json(
            execute(import_sql(plan, schema=schema)).stdout
        )
        assert counts["novels_create"] == 1 and counts["sources_create"] == 2
        assert counts["filters_create"] == 1 and counts["preferences_create"] == 1
        first = TypeAdapter(dict[str, int]).validate_json(
            execute(import_sql(plan, apply=True, schema=schema)).stdout
        )
        assert first == counts
        second = TypeAdapter(dict[str, int]).validate_json(
            execute(import_sql(plan, apply=True, schema=schema)).stdout
        )
        assert second["novels_create"] == 0 and second["novels_ignore"] == 1
        assert second["sources_create"] == 0 and second["sources_ignore"] == 2
        snapshot = json.loads(
            execute((fixture / "import_snapshot.sql").read_text()).stdout
        )
        assert snapshot == {
            "novels": 1,
            "sources": 2,
            "progress": [4, 9],
            "speed": 1.25,
            "empty_filters": True,
        }
        data["obras"][0]["pagina_atual"] = 5
        data["obras"][0]["fontes"][0]["pagina_atual"] = 5
        conflict = parse_export(json.dumps(data).encode())
        result = execute(import_sql(conflict, apply=True, schema=schema), check=False)
        assert result.returncode != 0
        assert (
            json.loads(execute((fixture / "import_snapshot.sql").read_text()).stdout)
            == snapshot
        )
    finally:
        execute((fixture / "import_cleanup.sql").read_text())


@pytest.mark.integration
def test_import_text_creation_never_overwrites_an_existing_private_object() -> None:
    settings = get_settings()
    if settings.supabase_url is None or settings.supabase_service_key is None:
        pytest.skip("Disposable local Supabase credentials are not configured.")
    assert settings.supabase_url.host in {"localhost", "127.0.0.1", "::1"}
    client = SupabaseTransport.from_settings(settings).client
    bucket = "synthetic-import-" + uuid4().hex
    client.storage.create_bucket(bucket, options={"public": False})
    storage = ImportTextStorage(client, bucket, 100)
    try:
        storage.create("synthetic/cap_1.json", b'{"cap":1,"texto":"Synthetic"}')
        with pytest.raises(LegacyImportError):
            storage.create("synthetic/cap_1.json", b'{"cap":1,"texto":"Replacement"}')
        assert (
            storage.download("synthetic/cap_1.json") == b'{"cap":1,"texto":"Synthetic"}'
        )
    finally:
        client.storage.empty_bucket(bucket)
        client.storage.delete_bucket(bucket)
