import os


MIN_SESSION_SECRET_LENGTH = 32
INSECURE_SESSION_SECRET_MARKERS = (
    "change-me",
    "changeme",
    "dev-only-insecure-session-secret",
    "replace-with",
)


def validate_session_secret(secret: str) -> None:
    normalized = secret.strip().casefold()
    if len(secret) < MIN_SESSION_SECRET_LENGTH:
        raise RuntimeError(
            f"SESSION_SECRET must contain at least {MIN_SESSION_SECRET_LENGTH} characters"
        )
    if any(marker in normalized for marker in INSECURE_SESSION_SECRET_MARKERS):
        raise RuntimeError("SESSION_SECRET must not use a public placeholder or default value")


def _env_bool(name: str, default: str = "false") -> bool: # read a boolfrom the env
    return os.getenv(name, default).strip().lower() in {"true", "1", "yes", "on"}


class DerivedSettings:
    @property
    def sqlalchemy_url(self) -> str:
        if self.database_url:
            if self.database_url.startswith("postgres://"):
                return self.database_url.replace("postgres://", "postgresql://", 1)
            return self.database_url
        return f"sqlite:///{os.path.join(os.getcwd(), 'guildboard.db')}"

    @property
    def google_oauth_configured(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)


try:
    from pydantic_settings import BaseSettings

    class Settings(DerivedSettings, BaseSettings):
        app_name: str = os.getenv("APP_NAME", "GuildBoard")
        database_url: str = os.getenv("DATABASE_URL", "")
        port: int = int(os.getenv("PORT", "8000"))
        environment: str = os.getenv("ENVIRONMENT", "development")

        # Google OAuth2
        google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
        google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
        google_redirect_uri: str = os.getenv(
            "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback"
        )

        allowed_email_domain: str = os.getenv("ALLOWED_EMAIL_DOMAIN", "ku.th")

        # session cookie
        session_secret: str = os.getenv("SESSION_SECRET", "")

        dev_login_enabled: bool = _env_bool("DEV_LOGIN_ENABLED")
        demo_student_email: str = os.getenv("DEMO_STUDENT_EMAIL", "")
        demo_student_password: str = os.getenv("DEMO_STUDENT_PASSWORD", "")
        demo_lecturer_email: str = os.getenv("DEMO_LECTURER_EMAIL", "")
        demo_lecturer_password: str = os.getenv("DEMO_LECTURER_PASSWORD", "")

        class Config:
            env_file = ".env"
            extra = "ignore"

except ImportError:

    class Settings(DerivedSettings):
        app_name: str = os.getenv("APP_NAME", "GuildBoard")
        database_url: str = os.getenv("DATABASE_URL", "")
        port: int = int(os.getenv("PORT", "8000"))
        environment: str = os.getenv("ENVIRONMENT", "development")

        google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
        google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
        google_redirect_uri: str = os.getenv(
            "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback"
        )
        allowed_email_domain: str = os.getenv("ALLOWED_EMAIL_DOMAIN", "ku.th")
        session_secret: str = os.getenv("SESSION_SECRET", "")
        dev_login_enabled: bool = _env_bool("DEV_LOGIN_ENABLED")
        demo_student_email: str = os.getenv("DEMO_STUDENT_EMAIL", "")
        demo_student_password: str = os.getenv("DEMO_STUDENT_PASSWORD", "")
        demo_lecturer_email: str = os.getenv("DEMO_LECTURER_EMAIL", "")
        demo_lecturer_password: str = os.getenv("DEMO_LECTURER_PASSWORD", "")


settings = Settings()
