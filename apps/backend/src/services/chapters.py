from pydantic import BaseModel, PositiveInt

from src.core.config import Settings, get_settings
from src.core.exceptions import BusinessError
from src.repositories.preferences import PreferencesRepository
from src.services.chapter_urls import resolved_chapter_url
from src.services.content import apply_filters, extract_chapter
from src.services.limits import ProcessingLimit
from src.services.logs import Event, LogBuffer
from src.services.providers import Fetcher
from src.services.translation import TextTranslator


class ChapterResult(BaseModel):
    url: str
    chapter: PositiveInt
    text: str


class ChapterService:
    def __init__(
        self,
        http: Fetcher,
        preferences: PreferencesRepository,
        translator: TextTranslator,
        logs: LogBuffer | None = None,
        *,
        settings: Settings | None = None,
        limit: ProcessingLimit | None = None,
    ):
        self.settings = settings if settings is not None else get_settings()
        self.limit = limit if limit is not None else ProcessingLimit(self.settings)
        self.http = http
        self.preferences = preferences
        self.translator = translator
        self.logs = logs

    def _text(
        self,
        url: str,
        chapter: int,
        *,
        require_content: bool = False,
        resolved: bool = False,
        translate: bool = True,
    ) -> ChapterResult:
        if chapter < 1:
            raise BusinessError("Invalid chapter.")
        target = (
            url
            if resolved
            else resolved_chapter_url(
                url, chapter, self.settings.royalroad_base.host or ""
            )
        )
        if self.logs:
            self.logs.add(Event.SOURCE_ACCESS)
        try:
            extracted = extract_chapter(
                self.http.get(target).content,
                max_chars=self.settings.processing_max_chars,
                max_bytes=self.settings.scraper_max_bytes,
            )
            if require_content and not extracted:
                raise BusinessError(
                    "The source chapter has no content.",
                    status=502,
                    title="Source unavailable",
                )
            if self.logs:
                self.logs.add(Event.FILTERS_APPLY)
            filtered = apply_filters(
                extracted,
                self.preferences.filters(),
                timeout=self.settings.filter_regex_timeout,
                max_chars=self.settings.processing_max_chars,
            )
            if self.logs and translate:
                self.logs.add(Event.TRANSLATION_START)
            result = ChapterResult(
                url=target,
                chapter=chapter,
                text=self.translator.translate(filtered) if translate else filtered,
            )
            if self.logs:
                self.logs.add(Event.TEXT_READY)
            return result
        except Exception:
            if self.logs:
                self.logs.add(Event.CHAPTER_FAILURE)
            raise

    def text(
        self,
        url: str,
        chapter: int,
        *,
        require_content: bool = False,
        resolved: bool = False,
        translate: bool = True,
    ) -> ChapterResult:
        with self.limit.slot():
            return self._text(
                url,
                chapter,
                require_content=require_content,
                resolved=resolved,
                translate=translate,
            )
