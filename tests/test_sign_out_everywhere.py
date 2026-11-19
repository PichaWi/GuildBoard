"""Sign Out Everywhere: every device signed in with the account is signed out."""
from fastapi.testclient import TestClient

from src.models.user import User


def google_sign_in(client, google, session_factory, email="lecturer@ku.th"):
    with session_factory() as db:
        if db.query(User).filter_by(email=email).first() is None:
            db.add(User(email=email, name="Demo Lecturer", role="Lecturer"))
            db.commit()
    google({"email": email, "email_verified": True, "name": "Demo Lecturer"})
    assert client.get("/auth/callback", follow_redirects=False).status_code == 303


def second_device(client) -> TestClient:
    """Another browser with a copy of the same signed-in cookie."""
    phone = TestClient(client.app)
    phone.cookies.update(client.cookies)
    return phone


def test_every_device_is_signed_out(client, google, session_factory):
    google_sign_in(client, google, session_factory)
    phone = second_device(client)
    assert phone.get("/api/auth/me").status_code == 200

    response = client.post("/api/auth/sign-out-everywhere")

    assert response.status_code == 200
    assert response.json() == {"status": "signed_out_everywhere"}
    assert client.get("/api/auth/me").status_code == 401
    assert phone.get("/api/auth/me").status_code == 401


def test_signing_in_again_afterwards_works(client, google, session_factory):
    google_sign_in(client, google, session_factory)
    client.post("/api/auth/sign-out-everywhere")

    google_sign_in(client, google, session_factory)

    assert client.get("/api/auth/me").status_code == 200


def test_other_accounts_are_not_affected(client, google, session_factory):
    google_sign_in(client, google, session_factory, email="other@ku.th")
    other_user = second_device(client)
    google_sign_in(client, google, session_factory)

    client.post("/api/auth/sign-out-everywhere")

    assert other_user.get("/api/auth/me").status_code == 200


def test_demo_login_just_ends_the_current_session(client, login_as):
    login_as("Lecturer")

    assert client.post("/api/auth/sign-out-everywhere").status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_requires_sign_in(client):
    assert client.post("/api/auth/sign-out-everywhere").status_code == 401