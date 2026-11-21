"""Run integration tests against an already started disposable local Supabase."""

import argparse
import json
import os
import re
import subprocess
import sys
import tomllib
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workdir", type=Path, required=True)
    parser.add_argument("--all-checks", action="store_true")
    args = parser.parse_args()
    result = subprocess.run(
        [
            "npx",
            "--yes",
            "supabase@3",
            "status",
            "--workdir",
            str(args.workdir),
            "-o",
            "json",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode:
        parser.error("Cannot read status of the disposable local stack.")
    data = json.loads(result.stdout)
    url = data["API_URL"]
    if urlparse(url).hostname not in {"127.0.0.1", "localhost", "::1"}:
        parser.error("Integration must use a disposable local stack.")
    env = os.environ.copy()
    env["VOXNOVEL_SUPABASE_URL"] = url
    env["VOXNOVEL_SUPABASE_SERVICE_KEY"] = data["SERVICE_ROLE_KEY"]
    project = tomllib.loads((args.workdir / "supabase/config.toml").read_text())[
        "project_id"
    ]
    if not re.fullmatch(r"[A-Za-z0-9_-]+", project):
        parser.error("Invalid disposable project identifier.")
    database_url = data["DB_URL"]
    if urlparse(database_url).hostname not in {"127.0.0.1", "localhost", "::1"}:
        parser.error("Importer integration must use a disposable local database.")
    env["VOXNOVEL_LEGACY_IMPORT_DATABASE_URL"] = database_url
    env["VOXNOVEL_LEGACY_PSQL_COMMAND"] = json.dumps(
        [
            "docker",
            "exec",
            "-i",
            f"supabase_db_{project}",
            "psql",
            "-U",
            "postgres",
            "-d",
            "postgres",
        ]
    )
    command = (
        [sys.executable, "scripts/check.py"]
        if args.all_checks
        else [
            "poetry",
            "-C",
            "apps/backend",
            "run",
            "pytest",
            "-m",
            "integration",
            "-q",
        ]
    )
    subprocess.run(command, cwd=ROOT, env=env, check=True)


if __name__ == "__main__":
    main()
