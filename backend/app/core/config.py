from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "NYAYAOS API"
    app_version: str = "0.1.0"
    app_description: str = "AI-Powered Justice Operating System"

    supabase_url: str
    supabase_key: str

    class Config:
        env_file = ".env"


settings = Settings()