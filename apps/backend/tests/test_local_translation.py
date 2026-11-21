import hashlib
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock
from zipfile import ZipFile

import pytest

from src.api.deps import Resources
from src.core.config import Settings
from src.core.exceptions import (
    TranslationTimeout,
    TranslationUnavailable,
)
from src.services.engines.local import LocalEngine, Runtime, source_language
from src.services.logs import Event, LogBuffer
from src.services.translation import TextTranslator
from tools.install_translation_model import FILES, install_archive


@pytest.fixture(autouse=True)
def isolated_settings(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(tmp_path)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("The small boat crossed the quiet river. She waited for her brother.", "en"),
        ("O pequeno barco atravessou o rio tranquilo. Ela esperava pelo irmão.", "pt"),
        ("Le petit bateau traversait la rivière. Elle attendait son frère.", "fr"),
    ],
)
def test_source_language_is_deterministic(text: str, expected: str) -> None:
    assert source_language(text) == source_language(text) == expected


def test_local_engine_loads_lazily_and_reuses_one_model(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    runtime = MagicMock()
    runtime.return_value.translate.return_value = "Texto em português."
    monkeypatch.setattr("src.services.engines.local.Runtime", runtime)
    resources = Resources(Settings(local_model_path=tmp_path))
    runtime.assert_not_called()
    assert (
        resources.translator.translate("The boat crossed the quiet river.")
        == "Texto em português."
    )
    assert (
        resources.translator.translate("She waited for her brother.")
        == "Texto em português."
    )
    runtime.assert_called_once_with(tmp_path, 1)


def test_local_detection_uses_the_whole_text_once_not_tiny_trailing_blocks(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    detect = MagicMock(return_value="en")
    runtime = MagicMock()
    runtime.return_value.translate.side_effect = lambda text, deadline: "PT:" + text
    monkeypatch.setattr("src.services.engines.local.source_language", detect)
    monkeypatch.setattr("src.services.engines.local.Runtime", runtime)
    translator = TextTranslator(
        Settings(
            local_model_path=tmp_path,
            translation_block_chars=3,
            translation_block_delay=0,
        )
    )
    assert translator.translate("abcdefgh") == "PT:abc\n\nPT:def\n\nPT:gh"
    detect.assert_called_once_with("abcdefgh")


@pytest.mark.parametrize(
    ("text", "event"),
    [
        ("The boat crossed the quiet river.", Event.TRANSLATION_UNAVAILABLE),
        (
            "Le petit bateau traversait la rivière. Elle attendait son frère.",
            Event.TRANSLATION_UNSUPPORTED,
        ),
    ],
)
def test_unavailable_or_unsupported_local_translation_keeps_original_safely(
    text: str,
    event: Event,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    runtime = MagicMock()
    monkeypatch.setattr("src.services.engines.local.Runtime", runtime)
    logs = LogBuffer()
    translator = TextTranslator(Settings(), logs=logs)
    assert translator.translate(text) == text
    runtime.assert_not_called()
    assert len(logs.messages()) == 1
    assert logs.messages()[0].endswith(event.value)
    assert text not in caplog.text


def test_portuguese_passes_through_without_a_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    runtime = MagicMock()
    monkeypatch.setattr("src.services.engines.local.Runtime", runtime)
    text = "O pequeno barco atravessou o rio tranquilo. Ela esperava pelo irmão."
    assert TextTranslator(Settings()).translate(text) == text
    runtime.assert_not_called()


def test_local_lock_wait_is_bounded() -> None:
    engine = LocalEngine(Settings())
    with pytest.raises(TranslationTimeout):
        engine.translate("Synthetic text", timeout=0)


def fake_runtime() -> Runtime:
    runtime = object.__new__(Runtime)
    runtime.tokenizer = MagicMock()
    runtime.tokenizer.encode.side_effect = lambda text, out_type: list(text)
    runtime.tokenizer.decode_pieces.side_effect = lambda tokens: "".join(tokens)
    runtime.model = MagicMock()
    runtime.model.translate_batch.side_effect = lambda batch, **options: [
        SimpleNamespace(hypotheses=[row]) for row in batch
    ]
    return runtime


def test_runtime_preserves_paragraphs_and_subdivides_without_input_truncation() -> None:
    runtime = fake_runtime()
    text = "First_sentence.\n\n" + "x" * 300
    translated = runtime.translate(text, float("inf"))
    assert translated.startswith("First_sentence.\n\n")
    assert translated.count("x") == 300
    assert all(
        len(row) <= 128
        for call in runtime.model.translate_batch.call_args_list
        for row in call.args[0]
    )
    assert runtime.model.translate_batch.call_args.kwargs["max_input_length"] == 0


@pytest.mark.parametrize("capped", [True, False])
def test_runtime_rejects_capped_or_empty_outputs(capped: bool) -> None:
    runtime = fake_runtime()
    runtime.model.translate_batch.side_effect = None
    runtime.model.translate_batch.return_value = [
        SimpleNamespace(hypotheses=[["x"] * 256 if capped else []])
    ]
    with pytest.raises(TranslationUnavailable):
        runtime.translate("Synthetic text", float("inf"))


def test_runtime_checks_deadline_before_inference() -> None:
    runtime = fake_runtime()
    with pytest.raises(TranslationTimeout):
        runtime.translate("Synthetic text", 0)
    runtime.model.translate_batch.assert_not_called()


def model_archive(path: Path) -> str:
    with ZipFile(path, "w") as archive:
        for name in FILES:
            content = (
                json.dumps(
                    {"from_code": "en", "to_code": "pb", "package_version": "1.9"}
                )
                if name == "metadata.json"
                else "synthetic file"
            )
            archive.writestr("package/" + name, content)
        archive.writestr("package/../../outside", "must not be extracted")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_model_installer_verifies_checksum_and_extracts_only_named_files(
    tmp_path: Path,
) -> None:
    archive = tmp_path / "model.zip"
    checksum = model_archive(archive)
    destination = tmp_path / "installed"
    install_archive(archive, destination, checksum)
    assert {
        path.relative_to(destination).as_posix()
        for path in destination.rglob("*")
        if path.is_file()
    } == FILES
    assert not (tmp_path / "outside").exists()
    with pytest.raises(ValueError, match="already exists"):
        install_archive(archive, destination, checksum)


def test_model_installer_rejects_tampering_without_installing(tmp_path: Path) -> None:
    archive = tmp_path / "model.zip"
    model_archive(archive)
    destination = tmp_path / "installed"
    with pytest.raises(ValueError, match="checksum mismatch"):
        install_archive(archive, destination, "0" * 64)
    assert not destination.exists()


def test_configured_but_missing_model_preserves_original(tmp_path: Path) -> None:
    logs = LogBuffer()
    text = "The boat crossed the quiet river."
    translator = TextTranslator(Settings(local_model_path=tmp_path), logs=logs)
    assert translator.translate(text) == text
    assert logs.messages()[0].endswith(Event.TRANSLATION_UNAVAILABLE.value)
