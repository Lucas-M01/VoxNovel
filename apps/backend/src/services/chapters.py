from pydantic import BaseModel, PositiveInt

from src.core.exceptions import BusinessError
from src.repositories.preferences import PreferencesRepository
from src.services.chapter_urls import chapter_url
from src.services.content import apply_filters, extract_chapter
from src.services.logs import LogBuffer
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
    ):
        self.http = http
        self.preferences = preferences
        self.translator = translator
        self.logs = logs

    def text(
        self, url: str, chapter: int, *, require_content: bool = False
    ) -> ChapterResult:
        resolved = chapter_url(url, chapter)
        if self.logs:
            self.logs.add("Acessando fonte")
        try:
            extracted = extract_chapter(self.http.get(resolved).content)
            if require_content and not extracted:
                raise BusinessError(
                    "The source chapter has no content.",
                    status=502,
                    title="Source unavailable",
                )
            if self.logs:
                self.logs.add("Aplicando filtros globais")
            filtered = apply_filters(extracted, self.preferences.filters())
            if self.logs:
                self.logs.add("Traduzindo capítulo")
            result = ChapterResult(
                url=resolved, chapter=chapter, text=self.translator.translate(filtered)
            )
            if self.logs:
                self.logs.add("Texto pronto")
            return result
        except Exception:
            if self.logs:
                self.logs.add("Falha ao processar capítulo")
            raise
