from collections.abc import Iterator
from contextlib import contextmanager
from threading import BoundedSemaphore

from src.core.config import Settings
from src.core.exceptions import BusinessError


class ProcessingLimit:
    def __init__(self, settings: Settings):
        self.slots = BoundedSemaphore(settings.processing_concurrency)
        self.timeout = settings.processing_wait_timeout

    @contextmanager
    def slot(self) -> Iterator[None]:
        if not self.slots.acquire(timeout=self.timeout):
            raise BusinessError(
                "Content processing is busy. Try again later.",
                status=503,
                title="Unavailable",
            )
        try:
            yield
        finally:
            self.slots.release()
