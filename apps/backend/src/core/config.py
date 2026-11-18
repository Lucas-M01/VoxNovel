from pydantic import Field, HttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="VOXNOVEL_", env_file=".env", extra="ignore", env_ignore_empty=True
    )

    supabase_url: HttpUrl | None = None
    supabase_service_key: SecretStr | None = None

    app_name: str = "VoxNovel API"
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    cors_origins: list[str] = Field(default_factory=list)


def get_settings() -> Settings:
    return Settings()
