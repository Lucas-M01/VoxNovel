from collections import deque
from datetime import datetime
from enum import StrEnum
from threading import Lock


class Event(StrEnum):
    SOURCE_ACCESS = "Acessando fonte"
    FILTERS_APPLY = "Aplicando filtros globais"
    TRANSLATION_START = "Traduzindo capítulo"
    TRANSLATION_LIMITED = (
        "Google limitou a tradução (HTTP 429); bloco original preservado"
    )
    TRANSLATION_FAILURE = "Falha na tradução; bloco original preservado"
    TRANSLATION_EMPTY = (
        "Resposta de tradução ausente ou inválida; bloco original preservado"
    )
    TRANSLATION_TIMEOUT = "Tempo de tradução esgotado; bloco original preservado"
    TEXT_READY = "Texto pronto"
    CHAPTER_FAILURE = "Falha ao processar capítulo"
    CACHE_HIT = "Texto remoto já está no cache"
    CACHE_SAVED = "Texto remoto salvo"
    CACHE_REMOVED = "Texto remoto removido"
    INTERNAL_FAILURE = "Falha interna na API"


class LogBuffer:
    def __init__(self) -> None:
        self._messages: deque[str] = deque(maxlen=500)
        self._lock = Lock()

    def add(self, message: Event) -> None:
        if not isinstance(message, Event):
            raise TypeError("Only fixed process events can be logged.")
        value = f"[{datetime.now().strftime('%H:%M:%S')}] {message.value}"
        with self._lock:
            self._messages.append(value)

    def messages(self) -> list[str]:
        with self._lock:
            return list(self._messages)

    def internal_error(self) -> None:
        self.add(Event.INTERNAL_FAILURE)
