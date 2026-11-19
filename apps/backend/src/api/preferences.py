from fastapi import APIRouter

from src.api.deps import Preferences
from src.api.schemas import FilterTermInput, FilterValueInput
from src.repositories.preferences import Filters, FilterState, Speed, SpeedState

router = APIRouter(prefix="/api/v1", tags=["Preferences"])


@router.get("/filters")
def filters(repo: Preferences) -> FilterState:
    return repo.filters()


@router.put("/filters")
def replace_filters(body: Filters, repo: Preferences) -> FilterState:
    return repo.save_filters(body)


@router.delete("/filters")
def clear_filters(repo: Preferences) -> FilterState:
    return repo.clear_filters()


@router.post("/filters/term")
def add_term(body: FilterTermInput, repo: Preferences) -> FilterState:
    return repo.add_filter(body.kind, body.value)


@router.delete("/filters/term")
def remove_term(body: FilterTermInput, repo: Preferences) -> FilterState:
    return repo.remove_filter(body.kind, body.value)


@router.post("/filters/word")
def add_word(body: FilterValueInput, repo: Preferences) -> FilterState:
    return repo.add_word(body.value)


@router.delete("/filters/word")
def remove_word(body: FilterValueInput, repo: Preferences) -> FilterState:
    return repo.remove_word(body.value)


@router.post("/filters/regex")
def add_regex(body: FilterValueInput, repo: Preferences) -> FilterState:
    return repo.add_filter("regex", body.value)


@router.delete("/filters/regex")
def remove_regex(body: FilterValueInput, repo: Preferences) -> FilterState:
    return repo.remove_filter("regex", body.value)


@router.get("/settings")
def settings(repo: Preferences) -> SpeedState:
    return repo.speed()


@router.put("/settings")
def save_settings(body: Speed, repo: Preferences) -> SpeedState:
    return repo.save_speed(body)
