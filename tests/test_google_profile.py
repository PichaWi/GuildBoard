import pytest
from sqlalchemy import select

from src.controllers.google_auth import google_picture_url
from src.models.user import User

PICTURE = "https://lh3.googleusercontent.com/a/ACg8ocKexample=s96-c"
CLAIMS = {"email": "navin.b@ku.th", "email_verified": True, "name": "Navin Bunthuphanich", "picture": PICTURE}


def sign_in(client, google, **claims):
    google({**CLAIMS, **claims})
    assert client.get("/auth/callback", follow_redirects=False).status_code == 303
    return client.get("/api/auth/me").json()


def stored_name(session_factory, email="navin.b@ku.th"):
    with session_factory() as db:
        return db.scalar(select(User.name).where(User.email == email))


def test_me_returns_the_google_name_and_picture(client, google):
    me = sign_in(client, google)

    assert me["name"] == "Navin Bunthuphanich"
    assert me["picture"] == PICTURE


def test_the_picture_survives_later_requests(client, google):
    sign_in(client, google)

    assert client.get("/api/auth/me").json()["picture"] == PICTURE


def test_a_google_account_without_a_picture_gets_none(client, google):
    claims = {key: value for key, value in CLAIMS.items() if key != "picture"}
    google(claims)
    client.get("/auth/callback", follow_redirects=False)

    assert client.get("/api/auth/me").json()["picture"] == ""


@pytest.mark.parametrize(
    "picture",
    [
        "http://lh3.googleusercontent.com/a/photo",  # not https
        "https://evil.example.com/photo.png",
        "https://googleusercontent.com.evil.example/photo.png",
        "https://evilgoogleusercontent.com/photo.png",
        "javascript:alert(1)",
        "data:image/png;base64,AAAA",
        "//lh3.googleusercontent.com/a/photo",
        "https://lh3.googleusercontent.com/" + "a" * 2048,
        "https://[lh3.googleusercontent.com/a",
        "",
        None,
        42,
        ["https://lh3.googleusercontent.com/a/photo"],
    ],
)
def test_a_picture_from_anywhere_but_google_is_dropped(picture):
    assert google_picture_url({"picture": picture}) == ""


def test_a_dropped_picture_does_not_block_sign_in(client, google):
    me = sign_in(client, google, picture="https://evil.example.com/photo.png")

    assert me["name"] == "Navin Bunthuphanich"
    assert me["picture"] == ""


def test_a_blank_google_name_falls_back_to_the_email(client, google):
    me = sign_in(client, google, name="   ")

    assert me["name"] == "navin.b@ku.th"


def test_a_dev_login_has_no_picture(client, login_as):
    login_as("Lecturer")

    assert client.get("/api/auth/me").json()["picture"] == ""


def test_a_session_from_before_this_change_still_works(client, google, monkeypatch):
    from src.controllers.auth import AuthenticatedUser

    full = AuthenticatedUser.as_session_data
    monkeypatch.setattr(
        AuthenticatedUser,
        "as_session_data",
        lambda self: {key: value for key, value in full(self).items() if key != "picture"},
    )

    me = sign_in(client, google)

    assert me["name"] == "Navin Bunthuphanich"
    assert me["picture"] == ""


def test_a_new_user_is_stored_with_their_google_name(client, google, session_factory):
    sign_in(client, google)

    assert stored_name(session_factory) == "Navin Bunthuphanich"


@pytest.mark.parametrize("placeholder", ["", "Test User"])
def test_a_user_created_before_signing_in_gets_their_google_name(client, google, session_factory, placeholder):
    with session_factory() as db:
        db.add(User(email="navin.b@ku.th", name=placeholder, role="TA"))
        db.commit()

    me = sign_in(client, google)

    assert stored_name(session_factory) == "Navin Bunthuphanich"
    assert me["role"] == "TA"


def test_a_very_long_google_name_is_cut_to_fit_the_users_table(client, google, session_factory):
    me = sign_in(client, google, name="N" * 400)

    assert len(me["name"]) == 255
    assert stored_name(session_factory) == "N" * 255
