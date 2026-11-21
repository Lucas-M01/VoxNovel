"""Explicit import I/O; never log database credentials or exported content."""

import os
import subprocess
from pathlib import Path
from typing import Self

import httpx
from pydantic import ValidationError
from storage3.exceptions import StorageApiError

from src.adapters.storage import SupabaseTextStorage
from src.adapters.supabase import SupabaseTransport
from src.core.config import Settings, legacy_import_environment
from src.core.import_errors import LegacyImportError


def run_import_sql(settings: Settings, sql: str) -> str:
    try:
        result = subprocess.run(
            [*settings.legacy_psql_command, "-X", "-qAt", "--set", "ON_ERROR_STOP=1"],
            input=sql,
            text=True,
            capture_output=True,
            env=legacy_import_environment(settings),
            timeout=settings.legacy_import_timeout,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise LegacyImportError("Cannot run the import database client.") from error
    if result.returncode:
        raise LegacyImportError("Database validation or import failed.", result.stderr)
    return result.stdout.strip()


def backup_import_database(settings: Settings, target: Path) -> None:
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, "wb") as output:
            result = subprocess.run(
                [
                    *settings.legacy_pg_dump_command,
                    "--data-only",
                    "--schema=public",
                    "--no-owner",
                    "--no-privileges",
                ],
                stdout=output,
                stderr=subprocess.PIPE,
                env=legacy_import_environment(settings),
                timeout=settings.legacy_import_timeout,
                check=False,
            )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise LegacyImportError(
            "Destination backup failed; no import was applied."
        ) from error
    if result.returncode:
        raise LegacyImportError(
            "Destination backup failed; no import was applied.",
            result.stderr.decode(errors="replace"),
        )


class ImportTextStorage(SupabaseTextStorage):
    @classmethod
    def from_settings(cls, settings: Settings) -> Self:
        return cls(
            SupabaseTransport.from_settings(settings).client,
            settings.supabase_text_bucket,
            settings.storage_page_size,
        )

    def create(self, path: str, data: bytes) -> None:
        try:
            self.bucket.upload(
                path, data, {"content-type": "application/json", "upsert": "false"}
            )
        except (StorageApiError, httpx.HTTPError, ValidationError) as error:
            raise LegacyImportError("Cannot create imported chapter text.") from error
