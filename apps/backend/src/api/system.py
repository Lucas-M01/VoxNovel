from fastapi import APIRouter

from src.api.deps import Context
from src.api.schemas import ApiStatus, LogResult

router = APIRouter(prefix="/api/v1", tags=["API status"])


@router.get("/logs")
def logs(context: Context) -> LogResult:
    return LogResult(logs=context.logs.messages())


@router.get("/status")
async def status() -> ApiStatus:
    return ApiStatus()
