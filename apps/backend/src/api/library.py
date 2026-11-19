from uuid import UUID

from fastapi import APIRouter, Response

from src.api.deps import Library
from src.api.schemas import ActiveSourceInput
from src.repositories.models import Novel, NovelInput, ProgressInput, SourceInput

router = APIRouter(prefix="/api/v1/novels", tags=["Library"])


@router.get("")
def list_novels(repo: Library) -> list[Novel]:
    return repo.list_novels()


@router.post("", status_code=201)
def create_novel(body: NovelInput, repo: Library) -> Novel:
    return repo.create(body)


@router.get("/{novel_id}")
def get_novel(novel_id: UUID, repo: Library) -> Novel:
    return repo.get(novel_id)


@router.patch("/{novel_id}/progress")
def update_progress(novel_id: UUID, body: ProgressInput, repo: Library) -> Novel:
    return repo.update_progress(novel_id, body.chapter)


@router.post("/{novel_id}/sources")
def add_source(novel_id: UUID, body: SourceInput, repo: Library) -> Novel:
    return repo.add_source(novel_id, body)


@router.patch("/{novel_id}/active-source")
def activate_source(novel_id: UUID, body: ActiveSourceInput, repo: Library) -> Novel:
    return repo.activate_source(novel_id, body.source_id)


@router.delete("/{novel_id}/sources/{source_id}")
def remove_source(novel_id: UUID, source_id: UUID, repo: Library) -> Novel:
    return repo.remove_source(novel_id, source_id)


@router.delete("/{novel_id}", status_code=204)
def delete_novel(novel_id: UUID, repo: Library) -> Response:
    repo.delete(novel_id)
    return Response(status_code=204)
