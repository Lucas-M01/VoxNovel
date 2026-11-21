import os

from pydantic import Field, HttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from src.core.import_errors import LegacyImportError

DEFAULT_REGEX_TIMEOUT = 0.1
DEFAULT_PROCESSING_MAX_CHARS = 1_000_000
DEFAULT_SCRAPER_MAX_BYTES = 4_000_000


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="VOXNOVEL_", env_file=".env", extra="ignore", env_ignore_empty=True
    )

    legacy_import_database_url: SecretStr | None = None
    legacy_psql_command: list[str] = Field(
        default_factory=lambda: ["psql"], min_length=1
    )
    legacy_pg_dump_command: list[str] = Field(
        default_factory=lambda: ["pg_dump"], min_length=1
    )
    legacy_import_timeout: int = Field(default=300, ge=1, le=3600)
    legacy_import_max_bytes: int = Field(default=64_000_000, ge=1024)

    supabase_url: HttpUrl | None = None
    supabase_service_key: SecretStr | None = None

    supabase_text_bucket: str = Field(default="downloads", min_length=1)
    storage_page_size: int = Field(default=100, ge=1, le=1000)

    default_speed: float = Field(default=1.5, gt=0, allow_inf_nan=False)
    filter_words: list[str] = Field(
        default_factory=lambda: [
            "advertisement",
            "publicidade",
            "patrocinado",
            "sponsored",
            "subscribe",
            "newsletter",
            "clique aqui",
            "click here",
        ]
    )
    filter_phrases: list[str] = Field(
        default_factory=lambda: [
            "aceitar cookies",
            "accept cookies",
            "política de privacidade",
            "todos os direitos reservados",
            "all rights reserved",
            "compartilhe nas redes sociais",
            "share on social media",
            "leia também",
            "read more",
            "veja também",
        ]
    )
    filter_regex: list[str] = Field(
        default_factory=lambda: [
            r"\[anúncio\]",
            r"\[ad\]",
            r"©\s*\d{4}",
            r"https?://\S+",
        ]
    )

    freewebnovel_base: HttpUrl = HttpUrl("https://freewebnovel.com")
    centralnovel_base: HttpUrl = HttpUrl("https://centralnovel.com")

    scraper_denied_networks: list[str] = Field(
        default_factory=lambda: [
            "168.63.129.16/32",
            "64:ff9b::/96",
            "64:ff9b:1::/48",
        ]
    )
    google_translation_base: HttpUrl = HttpUrl("https://translate.google.com/m")
    translation_timeout: float = Field(default=45, gt=0, le=180)
    translation_block_chars: int = Field(default=4500, ge=1, le=4500)
    translation_block_delay: float = Field(default=0.3, ge=0, le=5)

    scraper_request_max_bytes: int = Field(default=64_000, ge=1024)
    scraper_challenge_delay: float = Field(default=5, ge=0, le=10)
    novelfire_base: HttpUrl = HttpUrl("https://novelfire.net")
    royalroad_base: HttpUrl = HttpUrl("https://www.royalroad.com")

    scraper_user_agent: str = "Mozilla/5.0 (compatible; VoxNovel/1.0)"
    scraper_dns_timeout: float = Field(default=5, gt=0, le=30)
    scraper_request_timeout: float = Field(default=20, gt=0, le=120)
    scraper_total_timeout: float = Field(default=45, gt=0, le=180)
    scraper_max_bytes: int = Field(default=DEFAULT_SCRAPER_MAX_BYTES, ge=1024)
    scraper_max_redirects: int = Field(default=5, ge=0, le=10)
    scraper_retries: int = Field(default=2, ge=0, le=3)

    processing_concurrency: int = Field(default=2, ge=1, le=8)
    processing_wait_timeout: float = Field(default=15, ge=0, le=60)
    processing_max_chars: int = Field(
        default=DEFAULT_PROCESSING_MAX_CHARS, ge=64, le=4_000_000
    )
    filter_regex_timeout: float = Field(default=DEFAULT_REGEX_TIMEOUT, gt=0, le=2)
    filter_max_items: int = Field(default=1000, ge=1, le=5000)
    filter_max_term_chars: int = Field(default=4096, ge=1, le=16384)
    api_max_body_bytes: int = Field(default=1_000_000, ge=64, le=4_000_000)
    server_concurrency_limit: int = Field(default=64, ge=4, le=256)
    access_log: bool = False
    persistence_timeout: int = Field(default=20, ge=1, le=120)
    translation_total_timeout: float = Field(default=120, gt=0, le=600)
    translation_block_output_chars: int = Field(default=20_000, ge=4500, le=100_000)

    app_name: str = "VoxNovel API"
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    cors_origins: list[str] = Field(default_factory=list)


def get_settings() -> Settings:
    return Settings()


def legacy_import_environment(settings: Settings) -> dict[str, str]:
    if settings.legacy_import_database_url is None:
        raise LegacyImportError("Configure the import database connection.")
    return {
        **os.environ,
        "PGDATABASE": settings.legacy_import_database_url.get_secret_value(),
    }
