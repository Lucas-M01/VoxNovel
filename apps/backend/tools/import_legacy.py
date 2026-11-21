"""Validate a private legacy export; apply only when explicitly requested."""

import argparse
import hashlib
import json
import os
import re
import sys
from contextlib import suppress
from pathlib import Path

from pydantic import TypeAdapter, ValidationError

from src.adapters.legacy_import import (
    ImportTextStorage,
    backup_import_database,
    run_import_sql,
)
from src.core.config import Settings, get_settings
from src.core.exceptions import BusinessError
from src.core.import_errors import LegacyImportError
from src.repositories.legacy_import import import_sql, inspect_import_texts
from src.services.legacy_import import ImportPlan, parse_export


def private_file(path: Path, content: bytes) -> None:
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "wb") as stream:
        stream.write(content)


def private_directory(path: Path) -> Path:
    target = path.resolve()
    root = Path(__file__).resolve().parents[3]
    if any(part in {"_legacy", ".git"} for part in target.parts):
        raise LegacyImportError("The output cannot be inside legacy or Git metadata.")
    if target.is_relative_to(root) and not target.is_relative_to(root / ".private"):
        raise LegacyImportError("Repository output must be inside .private.")
    target.mkdir(mode=0o700, parents=True, exist_ok=False)
    return target


def validate_limits(plan: ImportPlan, settings: Settings) -> None:
    if plan.filters:
        values = plan.filters.words + plan.filters.phrases + plan.filters.regex
        if len(values) > settings.filter_max_items or any(
            len(term) > settings.filter_max_term_chars for term in values
        ):
            raise LegacyImportError("Exported filters exceed configured limits.")
        for pattern in plan.filters.regex:
            try:
                re.compile(pattern)
            except re.error as error:
                raise LegacyImportError(
                    "Exported filters contain an invalid expression."
                ) from error
    integers = [
        value
        for novel in plan.novels
        for value in [
            novel.current_chapter,
            novel.total_chapters,
            *[
                number
                for source in novel.sources
                for number in [
                    source.current_chapter,
                    source.total_chapters,
                    *(source.chapter_ids or []),
                ]
            ],
        ]
        if value is not None
    ]
    integers.extend(item.chapter for item in plan.texts)
    if any(value > 2_147_483_647 for value in integers):
        raise LegacyImportError("Exported chapter numbers exceed the database limit.")


def write_report(output: Path | None, report: dict[str, object]) -> None:
    if output:
        private_file(output / "report.json", json.dumps(report, indent=2).encode())


def apply_plan(
    plan: ImportPlan, settings: Settings, output: Path, report: dict[str, object]
) -> None:
    report["state"] = "checking_destination"
    write_report(output, report)
    report["destination"] = TypeAdapter(dict[str, int]).validate_json(
        run_import_sql(settings, import_sql(plan))
    )
    storage = ImportTextStorage.from_settings(settings) if plan.texts else None
    missing = inspect_import_texts(storage, plan) if storage else []
    report["texts_create"] = len(missing)
    report["texts_ignore"] = len(plan.texts) - len(missing)
    backup_import_database(settings, output / "destination-backup.sql")
    report["state"] = "applying"
    created: list[str] = []
    report["created_texts"] = created
    write_report(output, report)
    try:
        for path, data in missing:
            if storage:
                storage.create(path, data)
                created.append(path)
                write_report(output, report)
        run_import_sql(settings, import_sql(plan, apply=True))
    except (LegacyImportError, BusinessError, OSError, ValidationError):
        if storage and created:
            try:
                storage.remove(created)
                report["created_texts"] = []
            except BusinessError:
                report["cleanup_required"] = True
        report["state"] = "failed"
        write_report(output, report)
        raise
    report["state"] = "complete"
    write_report(output, report)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check-destination", action="store_true")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args(argv)
    if args.apply and args.output is None:
        parser.error("--apply requires a new private --output directory for backups.")
    output: Path | None = None
    report: dict[str, object] = {"state": "validating"}
    try:
        settings = get_settings()
        if args.output:
            output = private_directory(args.output)
        if args.input.stat().st_size > settings.legacy_import_max_bytes:
            raise LegacyImportError("Export exceeds the configured size limit.")
        with args.input.open("rb") as source:
            raw = source.read(settings.legacy_import_max_bytes + 1)
        if len(raw) > settings.legacy_import_max_bytes:
            raise LegacyImportError("Export exceeds the configured size limit.")
        if output:
            private_file(output / "source-backup.json", raw)
        plan = parse_export(raw)
        validate_limits(plan, settings)
        counts = {
            "novels": len(plan.novels),
            "sources": sum(len(novel.sources) for novel in plan.novels),
            "texts": len(plan.texts),
            "filters_present": plan.filters is not None,
            "speed_present": plan.speed is not None,
        }
        report.update(counts)
        report["fingerprint"] = hashlib.sha256(raw).hexdigest()
        if output:
            private_file(
                output / "id-map.json", json.dumps(plan.id_map, indent=2).encode()
            )
            private_file(
                output / "normalized.json", plan.model_dump_json(indent=2).encode()
            )
            private_file(output / "plan.sql", import_sql(plan).encode())
            private_file(output / "apply.sql", import_sql(plan, apply=True).encode())
        if args.apply:
            if output is None:
                raise LegacyImportError("A private output directory is required.")
            apply_plan(plan, settings, output, report)
        elif args.check_destination:
            report["destination"] = TypeAdapter(dict[str, int]).validate_json(
                run_import_sql(settings, import_sql(plan))
            )
            report["state"] = "checked"
        else:
            report["state"] = "validated"
        write_report(output, report)
        print(
            json.dumps(
                {
                    "mode": report["state"],
                    **counts,
                    **(
                        {"destination": report["destination"]}
                        if "destination" in report
                        else {}
                    ),
                }
            )
        )
        return 0
    except (
        LegacyImportError,
        ValidationError,
        ValueError,
        OSError,
        BusinessError,
    ) as error:
        report["state"] = "failed"
        report["error_type"] = type(error).__name__
        with suppress(OSError):
            if output and isinstance(error, LegacyImportError) and error.details:
                private_file(output / "diagnostics.txt", error.details.encode())
            write_report(output, report)
        print(
            "Import did not finish cleanly. Existing destination values were not "
            "overwritten; inspect the private report when available.",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
