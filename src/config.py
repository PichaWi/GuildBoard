import os

try:
    from pydantic_settings import BaseSettings

    class Settings(BaseSettings):
        app_name: str = "GuildBoard"
        database_url: str = os.getenv("DATABASE_URL", "")
        port: int = int(os.getenv("PORT", "8000"))
        environment: str = os.getenv("ENVIRONMENT", "development")

        class Config:
            env_file = ".env"
            extra = "ignore"
except ImportError:
    class Settings:
        app_name: str = os.getenv("APP_NAME", "GuildBoard")
        database_url: str = os.getenv("DATABASE_URL", "")
        port: int = int(os.getenv("PORT", "8000"))
        environment: str = os.getenv("ENVIRONMENT", "development")

settings = Settings()

