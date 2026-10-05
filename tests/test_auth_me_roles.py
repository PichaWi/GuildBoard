"""Tests for GET /api/auth/me, the endpoint the React app calls on load.

frontend/src/context/AuthContext.jsx reads `role` from this response, lowercases
it, and decides which menu items and pages to show (PR #5):
    "ta"                -> ta
    "lecturer", "admin" -> lecturer
    anything else       -> student
So if the backend ever sends a different role string, the frontend quietly
treats that person as a Student. These tests pin the role strings down.
"""
import pytest

from src.models.user import User


def sign_in_with_google(client, google, session_factory, email, role):
    """Save a user with the given role, then sign in through the fake Google login."""
    with session_factory() as db:
        db.add(User(email=email, name="Test User", role=role))
        db.commit()

    google({"email": email, "email_verified": True, "name": "Test User"})
    response = client.get("/auth/callback", follow_redirects=False)
    assert response.status_code == 303


@pytest.mark.parametrize("role", ["Student", "TA", "Lecturer", "Admin"])
def test_me_returns_the_role_stored_in_the_database(client, google, session_factory, role):
    sign_in_with_google(client, google, session_factory, "someone@ku.th", role)

    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["role"] == role


# What AuthContext.jsx turns each backend role into (lowercased value -> frontend role).
FRONTEND_ROLE = {"student": "student", "ta": "ta", "lecturer": "lecturer", "admin": "lecturer"}


@pytest.mark.parametrize(
    "role, expected",
    [("Student", "student"), ("TA", "ta"), ("Lecturer", "lecturer"), ("Admin", "lecturer")],
)
def test_role_string_is_one_the_frontend_knows(client, google, session_factory, role, expected):
    sign_in_with_google(client, google, session_factory, "someone@ku.th", role)

    backend_role = client.get("/api/auth/me").json()["role"].lower()

    # If this fails, the frontend would fall back to "student" for this user.
    assert backend_role in FRONTEND_ROLE
    assert FRONTEND_ROLE[backend_role] == expected


def test_me_has_the_fields_the_frontend_uses(client, google, session_factory):
    sign_in_with_google(client, google, session_factory, "aj.test@ku.th", "Lecturer")

    data = client.get("/api/auth/me").json()

    assert data["name"] == "Test User"
    assert data["role"] == "Lecturer"
    assert data["id"] != ""


def test_me_without_signing_in_is_401(client):
    # AuthContext only sets a user when res.ok, so a 401 keeps the app on /login.
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_me_after_logout_is_401(client, google, session_factory):
    sign_in_with_google(client, google, session_factory, "someone@ku.th", "TA")
    assert client.get("/api/auth/me").status_code == 200

    client.post("/auth/logout")

    assert client.get("/api/auth/me").status_code == 401
