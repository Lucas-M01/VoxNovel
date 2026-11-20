from collections.abc import Callable

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from src.core.exceptions import problem_response


class BodyLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int):
        self.app = app
        self.maximum = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] not in {
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
        }:
            await self.app(scope, receive, send)
            return
        for key, value in scope.get("headers", []):
            if key.lower() == b"content-length":
                try:
                    length = int(value)
                except ValueError:
                    await problem_response(
                        400, "Bad Request", "Invalid request length."
                    )(scope, receive, send)
                    return
                if length < 0 or length > self.maximum:
                    await problem_response(
                        413, "Content Too Large", "Request body is too large."
                    )(scope, receive, send)
                    return
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > self.maximum:
                await problem_response(
                    413, "Content Too Large", "Request body is too large."
                )(scope, receive, send)
                return
            if not message.get("more_body", False):
                break
        delivered = False

        async def replay() -> Message:
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {"type": "http.request", "body": bytes(body), "more_body": False}

        await self.app(scope, replay, send)


class ErrorBoundaryMiddleware:
    def __init__(self, app: ASGIApp, on_error: Callable[[], None]):
        self.app = app
        self.on_error = on_error

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        started = False

        async def track(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, receive, track)
        except Exception:
            self.on_error()
            if not started:
                await problem_response(
                    500, "Internal Server Error", "An unexpected error occurred."
                )(scope, receive, send)
