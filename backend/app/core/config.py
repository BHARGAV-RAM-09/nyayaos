from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NYAYAOS API"
    app_version: str = "0.1.0"
    app_description: str = "AI-Powered Justice Operating System"

    supabase_url: str
    supabase_key: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()