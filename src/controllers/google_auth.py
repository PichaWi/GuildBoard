from urllib.parse import urlsplit

from src.config import settings
from src.controllers.auth import AuthenticatedUser, UserRole

GOOGLE_AUTH_MODE = "google-oauth2"

ERROR_UNAUTHORIZED_DOMAIN = "ACCESS_DENIED_UNAUTHORIZED_DOMAIN"
ERROR_EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED"

GOOGLE_PICTURE_HOST_SUFFIX = ".googleusercontent.com"
MAX_PICTURE_URL_LENGTH = 2048
MAX_NAME_LENGTH = 255  # users.name


class GoogleSignInDenied(Exception):
    def __init__(self, error: str, detail: str, status_code: int = 403) -> None:
        super().__init__(detail)
        self.error = error
        self.detail = detail
        self.status_code = status_code

    def to_response(self) -> dict[str, str]:
        return {"detail": self.detail, "error": self.error}


def email_domain(email: str) -> str:
    if not isinstance(email, str) or email.count("@") != 1:
        return ""
    local_part, domain = email.strip().split("@")
    if not local_part:
        return ""
    return domain.lower()


def is_allowed_domain(email: str) -> bool:
    allowed = settings.allowed_email_domain.strip().lower().lstrip("@")
    return bool(allowed) and email_domain(email) == allowed


def google_picture_url(claims: dict) -> str:
    # The browser loads this URL, so only Google's own image host is accepted.
    picture = claims.get("picture")
    if not isinstance(picture, str) or len(picture) > MAX_PICTURE_URL_LENGTH:
        return ""
    try:
        url = urlsplit(picture.strip())
        host = url.hostname or ""
    except ValueError:
        return ""
    if url.scheme != "https" or not host.endswith(GOOGLE_PICTURE_HOST_SUFFIX):
        return ""
    return picture.strip()


def user_from_google_claims(claims: dict) -> AuthenticatedUser:

    email = str(claims.get("email") or "").strip().lower()

    if claims.get("email_verified") not in (True, "true"):
        raise GoogleSignInDenied(
            ERROR_EMAIL_NOT_VERIFIED,
            "Access Denied: Google has not verified this email address.",
        )

    if not is_allowed_domain(email):
        raise GoogleSignInDenied(ERROR_UNAUTHORIZED_DOMAIN, "Access Denied: Unauthorized Domain")

    return AuthenticatedUser(
        user_id=email,
        name=str(claims.get("name") or "").strip()[:MAX_NAME_LENGTH] or email,
        # Least privilege: a Google sign-in proves the account is @ku.th, not
        # whether it belongs to a Lecturer, TA or Admin. Staff role assignment
        # is still to be designed, so every Google account starts as a Student.
        role=UserRole.STUDENT,
        auth_mode=GOOGLE_AUTH_MODE,
        picture=google_picture_url(claims),
    )
