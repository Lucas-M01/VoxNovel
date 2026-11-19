"""Keep GoogleTranslator's parser while replacing its module-local HTTP binding."""

import time
from threading import Lock
from typing import cast

import deep_translator.google as google
from requests import Session

from src.adapters.http import PublicHttp, unavailable
from src.adapters.providers import ChallengeAdapter
from src.core.config import Settings

GOOGLE_LOCK = Lock()


class GoogleEngine:
    def __init__(self, settings: Settings):
        self.settings = settings

    def translate(self, text: str) -> str | None:
        deadline = time.monotonic() + self.settings.translation_timeout
        # Upstream exposes no injected HTTP client. Only this module binding is
        # changed, under a lock; the requests module itself is never patched.
        if not GOOGLE_LOCK.acquire(timeout=self.settings.translation_timeout):
            raise unavailable()
        previous = google.requests
        try:
            with Session() as session:
                session.trust_env = False
                session.max_redirects = self.settings.scraper_max_redirects
                adapter = ChallengeAdapter(PublicHttp(self.settings), session, deadline)
                for existing in session.adapters.values():
                    existing.close()
                session.adapters.clear()
                session.mount("https://", adapter)
                session.mount("http://", adapter)
                google.requests = session
                translator = google.GoogleTranslator(source="auto", target="pt")
                translator._base_url = str(self.settings.google_translation_base)
                return cast(str | None, translator.translate(text))
        finally:
            google.requests = previous
            GOOGLE_LOCK.release()
