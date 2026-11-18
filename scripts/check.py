"""Run the checks appropriate to an initialized VoxNovel checkout."""

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(command: list[str], cwd: Path) -> None:
    print("+ " + " ".join(command), flush=True)
    subprocess.run(command, cwd=cwd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scope", choices=["all", "backend", "mobile"], default="all")
    parser.add_argument("--staged", action="store_true")
    args = parser.parse_args()
    if args.scope in {"all", "backend"}:
        backend = ROOT / "apps/backend"
        for command in (
            ["ruff", "check", "--config", "pyproject.toml", ".", "../../scripts"],
            [
                "ruff",
                "format",
                "--check",
                "--config",
                "pyproject.toml",
                ".",
                "../../scripts",
            ],
            ["mypy", "src", "tests", "tools", "../../scripts"],
            ["pytest"],
            ["python", "-m", "tools.check_architecture"],
            ["python", "-m", "compileall", "-q", "src"],
        ):
            run(["poetry", "run", *command], backend)
    if args.scope in {"all", "mobile"}:
        for command in (["lint"], ["typecheck"], ["test", "--runInBand"], ["build"]):
            run(["yarn", "workspace", "@voxnovel/mobile", *command], ROOT)
    scan = [sys.executable, "scripts/check_secrets.py"]
    if args.staged:
        scan.append("--staged")
    run(scan, ROOT)
    run(
        ["git", "diff", "--cached" if args.staged else "--no-ext-diff", "--check"], ROOT
    )


if __name__ == "__main__":
    main()
