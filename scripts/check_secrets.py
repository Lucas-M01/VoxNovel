"""Scan candidate files and committed history without printing secret values."""

import argparse
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--staged", action="store_true")
    args = parser.parse_args()
    binary = os.environ.get("GITLEAKS_BIN") or shutil.which("gitleaks")
    if not binary:
        parser.error("Install Gitleaks or set GITLEAKS_BIN to its executable.")
    command = (
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM", "-z"]
        if args.staged
        else ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"]
    )
    paths = subprocess.check_output(command, cwd=ROOT).decode().split("\0")
    personal_path = re.compile(rb"/(?:home|Users)/[^\s/]+/")
    failed = False
    with tempfile.TemporaryDirectory(prefix="voxnovel-scan-") as directory:
        target = Path(directory)
        for name in sorted(set(filter(None, paths))):
            path = ROOT / name
            if name.startswith("_legacy/") or path.is_symlink():
                print(f"Forbidden candidate: {name}")
                failed = True
                continue
            if not args.staged and not path.is_file():
                continue
            data = (
                subprocess.check_output(["git", "show", f":{name}"], cwd=ROOT)
                if args.staged
                else path.read_bytes()
            )
            if personal_path.search(data):
                print(f"Machine-specific path in candidate: {name}")
                failed = True
            output = target / name
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(data)
        result = subprocess.run(
            [binary, "dir", directory, "--redact", "--no-banner"], check=False
        )
        failed = failed or result.returncode != 0
    if not args.staged:
        result = subprocess.run(
            [binary, "git", str(ROOT), "--redact", "--no-banner", "--log-opts=--all"],
            check=False,
        )
        failed = failed or result.returncode != 0
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
