"""Google OAuth2 sign-in: consent redirect and the @ku.th domain check (SRS-11, SRS-12)."""
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pytest
from authlib.integrations.starlette_client import OAuth, OAuthError

from src.config import settings
from src.controllers import google_auth as google_auth_controller
from src.controllers.google_auth import (
    GoogleSignInDenied,
    is_allowed_domain,
    user_from_google_claims,
)
from src.views import google_auth as google_auth_views

KU_CLAIMS = {"email": "navin.b@ku.th", "email_verified": True, "name": "Navin B"}
GMAIL_CLAIMS = {**KU_CLAIMS, "email": "navin@gmail.com"}
BROWSER = {"accept": "text/html,application/xhtml+xml"}
VALID_EVENT = {
    "title": "Architecture Review",
    "course_code": "ISP",
    "event_type": "Project Milestone",
    "event_date": "2026-10-20",
    "start_time": "10:00",
    "end_time": "12:00",
}
LOGIN_JSX = Path(__file__).resolve().parent.parent / "frontend" / "src" / "pages" / "Login.jsx"


@pytest.fixture(autouse=True)
def pinned_redirect_settings(monkeypatch):
    """A developer's .env must not change where these tests expect to be sent."""
    monkeypatch.setattr(settings, "frontend_base_url", "")


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


# --- Consent redirect ---------------------------------------------------------

def test_login_returns_503_until_google_credentials_are_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    monkeypatch.setattr(settings, "google_client_secret", "")

    response = client.get("/auth/login", follow_redirects=False)

    assert response.status_code == 503
    assert response.json()["error"] == "OAUTH_NOT_CONFIGURED"


def test_a_browser_is_sent_to_the_login_page_when_google_is_not_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    monkeypatch.setattr(settings, "google_client_secret", "")

    response = client.get("/auth/login", headers=BROWSER, follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == "/login?error=OAUTH_NOT_CONFIGURED"


def test_login_redirects_to_google_with_the_configured_callback(client, google):
    google()

    response = client.get("/auth/login", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"].startswith("https://accounts.google.com/")
    assert settings.google_redirect_uri in response.headers["location"]


def test_login_asks_for_the_account_chooser_and_hints_the_domain(client, google):
    fake = google()

    client.get("/auth/login", follow_redirects=False)

    assert fake.authorize_kwargs == {
        "prompt": "select_account",
        "hd": settings.allowed_email_domain,
    }


def test_the_real_authlib_client_puts_the_consent_parameters_in_the_google_url(
    client, monkeypatch
):
    """Uses Authlib itself (no discovery request) to prove the URL Google receives."""
    oauth = OAuth()
    oauth.register(
        name="google",
        client_id="test-client-id",
        client_secret="test-client-secret",
        authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
        access_token_url="https://oauth2.googleapis.com/token",
        client_kwargs={"scope": "openid email profile"},
    )
    monkeypatch.setattr(google_auth_views, "google_client", lambda: oauth.create_client("google"))

    response = client.get("/auth/login", follow_redirects=False)

    location = urlparse(response.headers["location"])
    query = parse_qs(location.query)
    assert f"{location.scheme}://{location.netloc}{location.path}" == (
        "https://accounts.google.com/o/oauth2/v2/auth"
    )
    assert query["client_id"] == ["test-client-id"]
    assert query["redirect_uri"] == [settings.google_redirect_uri]
    assert query["response_type"] == ["code"]
    assert query["scope"] == ["openid email profile"]
    assert query["prompt"] == ["select_account"]
    assert query["hd"] == [settings.allowed_email_domain]
    assert query["state"][0]  # CSRF protection


# --- Callback: signing in -----------------------------------------------------

def test_callback_signs_in_a_ku_th_account(client, google):
    google(KU_CLAIMS)

    response = client.get("/auth/callback", follow_redirects=False)
    me = client.get("/api/auth/me")

    assert response.status_code == 303
    assert response.headers["location"] == "/calendar"
    assert me.status_code == 200
    assert me.json()["id"] == "navin.b@ku.th"
    assert me.json()["role"] == "Student"


def test_callback_returns_to_the_vite_dev_server_when_a_frontend_url_is_set(
    client, google, monkeypatch
):
    monkeypatch.setattr(settings, "frontend_base_url", "http://localhost:5173/")
    google(KU_CLAIMS)

    response = client.get("/auth/callback", follow_redirects=False)

    assert response.headers["location"] == "http://localhost:5173/calendar"


# --- Callback: refusals -------------------------------------------------------

def test_callback_denies_a_non_ku_th_account(client, google):
    google(GMAIL_CLAIMS)

    response = client.get("/auth/callback", follow_redirects=False)

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Access Denied: Unauthorized Domain",
        "error": "ACCESS_DENIED_UNAUTHORIZED_DOMAIN",
    }
    assert client.get("/api/auth/me").status_code == 401


def test_a_refused_browser_lands_on_the_login_page_with_the_reason(client, google):
    google(GMAIL_CLAIMS)

    response = client.get("/auth/callback", headers=BROWSER, follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == "/login?error=ACCESS_DENIED_UNAUTHORIZED_DOMAIN"
    assert client.get("/api/auth/me").status_code == 401


def test_a_refused_browser_is_returned_to_the_vite_dev_server(client, google, monkeypatch):
    monkeypatch.setattr(settings, "frontend_base_url", "http://localhost:5173")
    google(GMAIL_CLAIMS)

    response = client.get("/auth/callback", headers=BROWSER, follow_redirects=False)

    assert response.headers["location"] == (
        "http://localhost:5173/login?error=ACCESS_DENIED_UNAUTHORIZED_DOMAIN"
    )


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


def test_a_failed_token_exchange_sends_a_browser_to_the_login_page(client, google):
    google(error=OAuthError(error="mismatching_state"))

    response = client.get("/auth/callback", headers=BROWSER, follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == "/login?error=OAUTH_EXCHANGE_FAILED"


def test_the_callback_without_a_prior_login_is_refused(client, monkeypatch):
    """A forged or replayed callback has no stored state, so it must not sign anyone in."""
    oauth = OAuth()
    oauth.register(
        name="google",
        client_id="test-client-id",
        client_secret="test-client-secret",
        authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
        access_token_url="https://oauth2.googleapis.com/token",
        client_kwargs={"scope": "openid email profile"},
    )
    monkeypatch.setattr(google_auth_views, "google_client", lambda: oauth.create_client("google"))

    response = client.get("/auth/callback?code=forged&state=forged", follow_redirects=False)

    assert response.status_code == 401
    assert response.json()["error"] == "OAUTH_EXCHANGE_FAILED"
    assert client.get("/api/auth/me").status_code == 401


# --- Frontend contract --------------------------------------------------------

def test_the_login_page_has_a_message_for_every_error_code_the_backend_can_send():
    sent_by_backend = {
        google_auth_controller.ERROR_UNAUTHORIZED_DOMAIN,
        google_auth_controller.ERROR_EMAIL_NOT_VERIFIED,
        google_auth_views.ERROR_NOT_CONFIGURED,
        google_auth_views.ERROR_EXCHANGE_FAILED,
    }
    block = re.search(r"OAUTH_ERROR_MESSAGES\s*=\s*\{(.*?)\n\};", LOGIN_JSX.read_text(), re.S)
    assert block, "Login.jsx no longer defines OAUTH_ERROR_MESSAGES"

    handled_by_login_page = set(re.findall(r"^\s*([A-Z_]+):", block.group(1), re.M))

    assert sent_by_backend == handled_by_login_page


def test_the_login_page_returns_to_the_route_the_backend_redirects_to():
    assert google_auth_views.LOGIN_PATH == "/login"
    assert f"navigate('{google_auth_views.LOGIN_PATH}', {{ replace: true }})" in LOGIN_JSX.read_text()


# --- Role is still enforced after Google sign-in -------------------------------

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
