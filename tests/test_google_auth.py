"""Ticket 1 — Google OAuth2 sign-in and the @ku.th domain block (SRS-11, SRS-12)."""
import pytest
from authlib.integrations.starlette_client import OAuthError
from fastapi.responses import RedirectResponse

from src.config import settings
from src.controllers.google_auth import (
    GoogleSignInDenied,
    is_allowed_domain,
    user_from_google_claims,
)
from src.views import google_auth as google_auth_views

KU_CLAIMS = {"email": "navin.b@ku.th", "email_verified": True, "name": "Navin B"}
GMAIL_CLAIMS = {**KU_CLAIMS, "email": "navin@gmail.com"}
VALID_EVENT = {
    "title": "Architecture Review",
    "course_code": "ISP",
    "event_type": "Project Milestone",
    "event_date": "2026-10-20",
    "start_time": "10:00",
    "end_time": "12:00",
}


class FakeGoogleClient:
    """Stands in for Authlib's Google client so no request leaves the machine."""

    def __init__(self, claims: dict | None = None, error: Exception | None = None) -> None:
        self.claims = claims or {}
        self.error = error

    async def authorize_redirect(self, request, redirect_uri):
        return RedirectResponse(
            f"https://accounts.google.com/o/oauth2/v2/auth?redirect_uri={redirect_uri}",
            status_code=302,
        )

    async def authorize_access_token(self, request):
        if self.error:
            raise self.error
        return {"userinfo": self.claims}


@pytest.fixture
def google(monkeypatch):
    def _use(claims: dict | None = None, error: Exception | None = None) -> FakeGoogleClient:
        fake = FakeGoogleClient(claims, error)
        monkeypatch.setattr(google_auth_views, "google_client", lambda: fake)
        return fake

    return _use


# --- Domain rule --------------------------------------------------------------

@pytest.mark.parametrize("email", ["navin.b@ku.th", "Navin.B@KU.TH", "aj.milk@ku.th"])
def test_ku_th_addresses_are_allowed(email):
    assert is_allowed_domain(email)


@pytest.mark.parametrize(
    "email",
    [
        "someone@gmail.com",
        "someone@notku.th",        # a suffix match would wrongly allow this
        "someone@ku.th.evil.com",  # a prefix match would wrongly allow this
        "someone@student.ku.th",
        "someone@ku.ac.th",
        "@ku.th",
        "double@@ku.th",
        "no-at-sign",
        "",
    ],
)
def test_other_addresses_are_denied(email):
    assert not is_allowed_domain(email)


def test_a_verified_ku_th_account_becomes_a_student_identity():
    user = user_from_google_claims(KU_CLAIMS)

    assert user.id == "navin.b@ku.th"
    assert user.role.value == "Student"
    assert user.auth_mode == "google-oauth2"


def test_an_outside_domain_is_denied_with_the_ticket_message():
    with pytest.raises(GoogleSignInDenied) as denied:
        user_from_google_claims(GMAIL_CLAIMS)

    assert denied.value.status_code == 403
    assert denied.value.to_response() == {
        "detail": "Access Denied: Unauthorized Domain",
        "error": "ACCESS_DENIED_UNAUTHORIZED_DOMAIN",
    }


def test_an_unverified_email_is_denied_even_on_ku_th():
    with pytest.raises(GoogleSignInDenied) as denied:
        user_from_google_claims({**KU_CLAIMS, "email_verified": False})

    assert denied.value.error == "EMAIL_NOT_VERIFIED"


# --- Routes -------------------------------------------------------------------

def test_login_returns_503_until_google_credentials_are_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    monkeypatch.setattr(settings, "google_client_secret", "")

    response = client.get("/auth/login", follow_redirects=False)

    assert response.status_code == 503
    assert response.json()["error"] == "OAUTH_NOT_CONFIGURED"


def test_login_redirects_to_google_with_the_configured_callback(client, google):
    google()

    response = client.get("/auth/login", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"].startswith("https://accounts.google.com/")
    assert settings.google_redirect_uri in response.headers["location"]


def test_callback_signs_in_a_ku_th_account(client, google):
    google(KU_CLAIMS)

    response = client.get("/auth/callback", follow_redirects=False)
    me = client.get("/api/auth/me")

    assert response.status_code == 303
    assert response.headers["location"] == "/calendar"
    assert me.status_code == 200
    assert me.json()["id"] == "navin.b@ku.th"
    assert me.json()["role"] == "Student"


def test_callback_denies_a_non_ku_th_account(client, google):
    google(GMAIL_CLAIMS)

    response = client.get("/auth/callback", follow_redirects=False)

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Access Denied: Unauthorized Domain",
        "error": "ACCESS_DENIED_UNAUTHORIZED_DOMAIN",
    }
    assert client.get("/api/auth/me").status_code == 401


def test_a_denied_sign_in_clears_an_existing_session(client, google, login_as):
    login_as("Lecturer")
    google(GMAIL_CLAIMS)

    client.get("/auth/callback", follow_redirects=False)

    assert client.get("/api/auth/me").status_code == 401


def test_callback_denies_an_unverified_email(client, google):
    google({**KU_CLAIMS, "email_verified": False})

    response = client.get("/auth/callback", follow_redirects=False)

    assert response.status_code == 403
    assert response.json()["error"] == "EMAIL_NOT_VERIFIED"


def test_a_failed_token_exchange_returns_401(client, google):
    google(error=OAuthError(error="access_denied"))

    response = client.get("/auth/callback", follow_redirects=False)

    assert response.status_code == 401
    assert response.json()["error"] == "OAUTH_EXCHANGE_FAILED"


def test_a_google_signed_in_student_still_cannot_publish(client, google):
    google(KU_CLAIMS)
    client.get("/auth/callback", follow_redirects=False)

    response = client.post("/api/events", json=VALID_EVENT)

    assert response.status_code == 403


def test_logout_clears_the_session(client, google):
    google(KU_CLAIMS)
    client.get("/auth/callback", follow_redirects=False)

    response = client.get("/auth/logout", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == "/"
    assert client.get("/api/auth/me").status_code == 401
