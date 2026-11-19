from pydantic import BaseModel, PositiveInt

from src.repositories.preferences import PreferencesRepository
from src.services.chapter_urls import chapter_url
from src.services.content import apply_filters, extract_chapter
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
    ):
        self.http = http
        self.preferences = preferences
        self.translator = translator

    def text(self, url: str, chapter: int) -> ChapterResult:
        resolved = chapter_url(url, chapter)
        extracted = extract_chapter(self.http.get(resolved).content)
        filtered = apply_filters(extracted, self.preferences.filters())
        return ChapterResult(
            url=resolved, chapter=chapter, text=self.translator.translate(filtered)
        )
