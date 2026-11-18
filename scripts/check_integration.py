"""Run integration tests against an already started disposable local Supabase."""

import argparse
import json
import os
import subprocess
import sys
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
