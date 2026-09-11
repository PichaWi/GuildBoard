from src.config import settings
from src.controllers.auth import AuthenticatedUser, UserRole

GOOGLE_AUTH_MODE = "google-oauth2"

ERROR_UNAUTHORIZED_DOMAIN = "ACCESS_DENIED_UNAUTHORIZED_DOMAIN"
ERROR_EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED"


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
        name=str(claims.get("name") or email),
        # Least privilege: a Google sign-in proves the account is @ku.th, not
        # whether it belongs to a Lecturer, TA or Admin. Staff role assignment
        # is still to be designed, so every Google account starts as a Student.
        role=UserRole.STUDENT,
        auth_mode=GOOGLE_AUTH_MODE,
    )
