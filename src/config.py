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
            url = self.database_url
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            # SQLAlchemy 2.1 defaults "postgresql://" to the psycopg 3 driver, but
            # requirements.txt installs psycopg2, so name the driver explicitly.
            # (See Project_documents/QA_Docker_Smoke.md.)
            if url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            return url
        return f"sqlite:///{os.path.join(os.getcwd(), 'guildboard.db')}"

    @property
    def google_oauth_configured(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    def frontend_url(self, path: str) -> str:
        path = path if path.startswith("/") else f"/{path}"
        base = self.frontend_base_url.strip().rstrip("/")
        return f"{base}{path}" if base else path

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
        frontend_base_url: str = os.getenv("FRONTEND_BASE_URL", "")

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
        frontend_base_url: str = os.getenv("FRONTEND_BASE_URL", "")
        session_secret: str = os.getenv("SESSION_SECRET", "")
        dev_login_enabled: bool = _env_bool("DEV_LOGIN_ENABLED")
        demo_student_email: str = os.getenv("DEMO_STUDENT_EMAIL", "")
        demo_student_password: str = os.getenv("DEMO_STUDENT_PASSWORD", "")
        demo_lecturer_email: str = os.getenv("DEMO_LECTURER_EMAIL", "")
        demo_lecturer_password: str = os.getenv("DEMO_LECTURER_PASSWORD", "")


settings = Settings()
