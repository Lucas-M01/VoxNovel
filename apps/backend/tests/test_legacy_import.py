import json
import stat
from copy import deepcopy
from pathlib import Path
from subprocess import CompletedProcess
from unittest.mock import MagicMock

import pytest
from legacy_fixture import legacy_payload
from pydantic import SecretStr, ValidationError

from src.adapters.legacy_import import ImportTextStorage, run_import_sql
from src.core.config import Settings
from src.core.import_errors import LegacyImportError
from src.repositories.legacy_import import import_sql, inspect_import_texts
from src.services.legacy_import import parse_export
from tools import import_legacy as importer


def raw_export() -> bytes:
    return json.dumps(legacy_payload()).encode()


def test_export_preserves_progress_ids_empty_filters_speed_and_stable_mapping() -> None:
    raw = raw_export()
    plan = parse_export(raw)
    assert plan.novels[0].current_chapter == 4
    assert [source.current_chapter for source in plan.novels[0].sources] == [4, 9]
    assert plan.novels[0].sources[0].chapter_ids == [11, 18, 24, 35]
    assert plan.filters is not None and plan.filters.words == []
    assert plan.speed is not None and plan.speed.speed == 1.25
    assert parse_export(raw).id_map == plan.id_map
    assert plan.novels[0].active_source_id == plan.novels[0].sources[0].id


def test_flat_table_export_matches_api_export() -> None:
    data = json.loads(raw_export())
    expected = parse_export(json.dumps(data).encode())
    data["format"] = "voxnovel-legacy-tables-v1"
    novel = data["obras"][0]
    data["fontes"] = [
        {**source, "obra_id": novel["id"]} for source in novel.pop("fontes")
    ]
    data["filtros"] = [{"id": 1, **data["filtros"]}]
    data["config"] = [{"id": 1, **data["config"]}]
    assert parse_export(json.dumps(data).encode()) == expected


@pytest.mark.parametrize(
    "kind", ["format", "owner", "progress", "duplicate", "text", "speed"]
)
def test_invalid_or_ambiguous_exports_abort(kind: str) -> None:
    data = json.loads(raw_export())
    if kind == "format":
        data["format"] = "unknown"
    elif kind == "owner":
        data["obras"][0]["fonte_ativa"] = "not-a-source"
    elif kind == "progress":
        data["obras"][0]["pagina_atual"] = 7
    elif kind == "duplicate":
        data["obras"].append(deepcopy(data["obras"][0]))
    elif kind == "text":
        data["downloads"][0]["obra_id"] = "missing"
    else:
        data["config"]["velocidade"] = 0
    with pytest.raises((LegacyImportError, ValidationError)):
        parse_export(json.dumps(data).encode())


def test_default_dry_run_is_offline_and_prints_only_counts(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    source = tmp_path / "export.json"
    source.write_bytes(raw_export())
    monkeypatch.setattr(importer, "get_settings", lambda: Settings())
    network = MagicMock(side_effect=AssertionError("No network in default dry-run"))
    monkeypatch.setattr(importer, "run_import_sql", network)
    assert importer.main([str(source)]) == 0
    network.assert_not_called()
    output = capsys.readouterr().out
    assert json.loads(output)["mode"] == "validated"
    assert "Synthetic private" not in output and "source.example" not in output
    assert list(tmp_path.iterdir()) == [source]


def test_private_bundle_and_invalid_report_never_overwrite_existing_output(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    source = tmp_path / "export.json"
    source.write_bytes(raw_export())
    target = tmp_path / "private"
    assert importer.main([str(source), "--output", str(target)]) == 0
    assert stat.S_IMODE(target.stat().st_mode) == 0o700
    assert all(stat.S_IMODE(path.stat().st_mode) == 0o600 for path in target.iterdir())
    assert (target / "source-backup.json").read_bytes() == source.read_bytes()
    assert importer.main([str(source), "--output", str(target)]) == 1
    invalid = tmp_path / "invalid"
    source.write_text('{"format":"unknown","title":"Synthetic private title"}')
    assert importer.main([str(source), "--output", str(invalid)]) == 1
    report = json.loads((invalid / "report.json").read_text())
    assert report["state"] == "failed" and "Synthetic private" not in json.dumps(report)
    assert "Synthetic private" not in capsys.readouterr().err


def test_invalid_regex_aborts_before_any_destination_check(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    data = json.loads(raw_export())
    data["filtros"]["regex"] = ["["]
    source = tmp_path / "export.json"
    source.write_text(json.dumps(data))
    network = MagicMock()
    monkeypatch.setattr(importer, "run_import_sql", network)
    assert importer.main([str(source), "--check-destination"]) == 1
    network.assert_not_called()


def test_text_conflicts_abort_and_matching_text_is_skipped() -> None:
    plan = parse_export(raw_export())
    storage = MagicMock()
    storage.download.return_value = b'{"cap":2,"texto":"Synthetic private saved text."}'
    assert inspect_import_texts(storage, plan) == []
    storage.download.return_value = b'{"cap":2,"texto":"Different text."}'
    with pytest.raises(LegacyImportError):
        inspect_import_texts(storage, plan)


@pytest.mark.parametrize("fail", [False, True])
def test_apply_backs_up_before_writes_and_compensates_new_text_on_sql_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, fail: bool
) -> None:
    source = tmp_path / "export.json"
    source.write_bytes(raw_export())
    events: list[str] = []
    storage = MagicMock()
    storage.download.return_value = None
    storage.create.side_effect = lambda *args: events.append("text")
    monkeypatch.setattr(ImportTextStorage, "from_settings", lambda settings: storage)

    def backup(settings: Settings, path: Path) -> None:
        events.append("backup")
        importer.private_file(path, b"Synthetic database backup")

    def sql(settings: Settings, statement: str) -> str:
        applying = statement.endswith("commit;\n")
        events.append("apply" if applying else "check")
        if applying and fail:
            raise LegacyImportError("Synthetic SQL failure")
        return '{"novels_create":1}'

    monkeypatch.setattr(importer, "backup_import_database", backup)
    monkeypatch.setattr(importer, "run_import_sql", sql)
    target = tmp_path / "private"
    assert importer.main([str(source), "--output", str(target), "--apply"]) == int(fail)
    assert events == ["check", "backup", "text", "apply"]
    report = json.loads((target / "report.json").read_text())
    assert report["state"] == ("failed" if fail else "complete")
    if fail:
        storage.remove.assert_called_once()
        assert report["created_texts"] == []
    else:
        storage.remove.assert_not_called()


def test_psql_receives_connection_only_by_environment_and_never_uses_shell(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    run = MagicMock(
        return_value=CompletedProcess([], 0, stdout='{"novels_create":0}', stderr="")
    )
    monkeypatch.setattr("src.adapters.legacy_import.subprocess.run", run)
    settings = Settings(
        legacy_import_database_url=SecretStr("synthetic-private-connection")
    )
    assert (
        run_import_sql(settings, import_sql(parse_export(raw_export())))
        == '{"novels_create":0}'
    )
    args, kwargs = run.call_args
    assert "synthetic-private-connection" not in str(args)
    assert kwargs["env"]["PGDATABASE"] == "synthetic-private-connection"
    assert "shell" not in kwargs and kwargs["input"].endswith("rollback;\n")
