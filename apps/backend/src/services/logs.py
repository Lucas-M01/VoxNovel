from collections import deque
from datetime import datetime
from threading import Lock


class LogBuffer:
    def __init__(self) -> None:
        self._messages: deque[str] = deque(maxlen=500)
        self._lock = Lock()

    def add(self, message: str) -> None:
        value = f"[{datetime.now().strftime('%H:%M:%S')}] {message}"
        with self._lock:
            self._messages.append(value)

    def messages(self) -> list[str]:
        with self._lock:
            return list(self._messages)
