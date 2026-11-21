"""Explicit, checksum-verified installation; never called by an HTTP request."""

import hashlib
import json
import shutil
import tempfile
import urllib.request
from pathlib import Path
from zipfile import ZipFile

from src.core.config import get_settings

FILES = {
    "metadata.json",
    "README.md",
    "sentencepiece.model",
    "model/config.json",
    "model/model.bin",
    "model/shared_vocabulary.json",
}
MAX_ARCHIVE_BYTES = 70_000_000
MAX_EXTRACTED_BYTES = 100_000_000


def install_archive(archive: Path, destination: Path, expected_sha256: str) -> None:
    if archive.stat().st_size > MAX_ARCHIVE_BYTES:
        raise ValueError("Model archive exceeds the limit.")
    with archive.open("rb") as source:
        digest = hashlib.file_digest(source, "sha256").hexdigest()
    if digest != expected_sha256:
        raise ValueError("Model archive checksum mismatch.")
    if destination.exists():
        raise ValueError("Destination already exists; nothing was overwritten.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent) as temporary:
        root = Path(temporary) / "runtime"
        with ZipFile(archive) as package:
            matches: dict[str, str] = {}
            for entry in package.infolist():
                pieces = Path(entry.filename).parts
                name = "/".join(pieces[1:])
                if name in FILES:
                    if name in matches or entry.file_size > MAX_EXTRACTED_BYTES:
                        raise ValueError("Invalid model archive.")
                    matches[name] = entry.filename
            if (
                set(matches) != FILES
                or sum(package.getinfo(name).file_size for name in matches.values())
                > MAX_EXTRACTED_BYTES
            ):
                raise ValueError("Invalid model archive.")
            for name, member in matches.items():
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                with package.open(member) as source, target.open("xb") as output:
                    shutil.copyfileobj(source, output)
        metadata = json.loads((root / "metadata.json").read_text())
        if (
            metadata.get("from_code"),
            metadata.get("to_code"),
            metadata.get("package_version"),
        ) != ("en", "pb", "1.9"):
            raise ValueError(
                "Expected the pinned English to Brazilian Portuguese model."
            )
        root.rename(destination)


def main() -> None:
    settings = get_settings()
    if settings.local_model_path is None:
        raise SystemExit("Set VOXNOVEL_LOCAL_MODEL_PATH in the backend .env first.")
    destination = settings.local_model_path
    if destination.exists():
        raise SystemExit("Destination already exists; nothing was overwritten.")
    with tempfile.TemporaryDirectory() as temporary:
        archive = Path(temporary) / "model.zip"
        request = urllib.request.Request(
            str(settings.local_model_url),
            headers={"User-Agent": "VoxNovel-model-installer/1.0"},
        )
        with (
            urllib.request.urlopen(request, timeout=60) as response,
            archive.open("xb") as output,
        ):
            total = 0
            while chunk := response.read(1_048_576):
                total += len(chunk)
                if total > MAX_ARCHIVE_BYTES:
                    raise ValueError("Model archive exceeds the limit.")
                output.write(chunk)
        install_archive(archive, destination, settings.local_model_sha256)
    print(
        "Installed English to Portuguese (Brazil) model. "
        "Attribution is in README.md inside the model directory."
    )


if __name__ == "__main__":
    main()
