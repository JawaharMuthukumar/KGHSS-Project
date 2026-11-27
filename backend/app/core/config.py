from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "GHSS Kangayampalayam API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg2://postgres:password@localhost:5432/ghss_portal"
    jwt_secret_key: str = "development-only-change-this-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    cors_origins: str = "http://localhost:5173"
    # Web push (phone notifications); push is off while the keys are blank
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "https://kghss-project.vercel.app"
    cron_secret: str = ""  # guards /push/reminders, called by an external cron
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
