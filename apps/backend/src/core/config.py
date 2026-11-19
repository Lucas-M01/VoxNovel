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

    app_name: str = "VoxNovel API"
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    cors_origins: list[str] = Field(default_factory=list)


def get_settings() -> Settings:
    return Settings()
