from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.chapters import router as chapters_router
from src.api.deps import Resources
from src.api.downloads import router as downloads_router
from src.api.library import router as library_router
from src.api.preferences import router as preferences_router
from src.api.sources import router as sources_router
from src.api.system import router as system_router
from src.core.config import Settings, get_settings
from src.core.exceptions import register_exception_handlers
from src.core.http_limits import BodyLimitMiddleware, ErrorBoundaryMiddleware


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings if settings is not None else get_settings()
    app = FastAPI(title=config.app_name)
    context = Resources(config)
    app.state.resources = context
    app.include_router(library_router)
    app.include_router(sources_router)
    app.include_router(chapters_router)
    app.include_router(preferences_router)
    app.include_router(downloads_router)
    app.include_router(system_router)
    register_exception_handlers(app)
    app.add_middleware(ErrorBoundaryMiddleware, on_error=context.logs.internal_error)
    app.add_middleware(BodyLimitMiddleware, max_bytes=config.api_max_body_bytes)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
    )
    return app


def main() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        create_app(settings),
        host=settings.host,
        port=settings.port,
        access_log=settings.access_log,
        limit_concurrency=settings.server_concurrency_limit,
    )


if __name__ == "__main__":
    main()
