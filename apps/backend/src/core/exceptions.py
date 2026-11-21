from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException


class BusinessError(Exception):
    """Only public, safe details belong in a business exception."""

    def __init__(self, detail: str, *, status: int = 400, title: str = "Bad Request"):
        super().__init__(detail)
        self.detail = detail
        self.status = status
        self.title = title


def problem_response(status: int, title: str, detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": title,
            "status": status,
            "detail": detail,
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(BusinessError)
    async def business_error(request: Request, exc: BusinessError) -> JSONResponse:
        return problem_response(exc.status, exc.title, exc.detail)

    @app.exception_handler(RequestValidationError)
    async def validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return problem_response(
            422, "Unprocessable Content", "Request validation failed."
        )

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        # Do not reflect arbitrary HTTPException details or input data.
        response = problem_response(exc.status_code, "Request Error", "Request failed.")
        if exc.headers:
            response.headers.update(exc.headers)
        return response

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        return problem_response(
            500, "Internal Server Error", "An unexpected error occurred."
        )


class TranslationRateLimited(Exception):
    """The translation provider rejected a request with a rate limit."""
