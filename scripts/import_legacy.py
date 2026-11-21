#!/usr/bin/env python3
"""Run the explicit legacy importer in the backend environment."""

import argparse
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(add_help=False)
parser.add_argument("input", nargs="?", type=Path)
parser.add_argument("--output", type=Path)
known, remaining = parser.parse_known_args()
arguments = [str(known.input.resolve())] if known.input else []
if known.output:
    arguments.extend(["--output", str(known.output.resolve())])
raise SystemExit(
    subprocess.call(
        [
            "poetry",
            "-C",
            str(root / "apps/backend"),
            "run",
            "python",
            "-m",
            "tools.import_legacy",
            *arguments,
            *remaining,
        ],
        cwd=root,
    )
)
