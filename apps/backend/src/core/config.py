from pydantic import Field, HttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="VOXNOVEL_", env_file=".env", extra="ignore", env_ignore_empty=True
    )

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
    scraper_request_max_bytes: int = Field(default=64_000, ge=1024)
    scraper_challenge_delay: float = Field(default=5, ge=0, le=10)
    novelfire_base: HttpUrl = HttpUrl("https://novelfire.net")
    royalroad_base: HttpUrl = HttpUrl("https://www.royalroad.com")

    scraper_user_agent: str = "Mozilla/5.0 (compatible; VoxNovel/1.0)"
    scraper_dns_timeout: float = Field(default=5, gt=0, le=30)
    scraper_request_timeout: float = Field(default=20, gt=0, le=120)
    scraper_total_timeout: float = Field(default=45, gt=0, le=180)
    scraper_max_bytes: int = Field(default=4_000_000, ge=1024)
    scraper_max_redirects: int = Field(default=5, ge=0, le=10)
    scraper_retries: int = Field(default=2, ge=0, le=3)

    app_name: str = "VoxNovel API"
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    cors_origins: list[str] = Field(default_factory=list)


def get_settings() -> Settings:
    return Settings()
