"""TA and Admin through the real HTTP endpoints.

The permission matrix says TA and Admin can view drafts and create events, but
the older API tests only sign in as Student or Lecturer (the two dev-login
accounts). These tests sign in as TA and Admin through the fake Google login.
"""
from datetime import date, time

import pytest

from src.models.event import Event
from src.models.user import User


def sign_in_with_google(client, google, session_factory, email, role):
    """Save a user with the given role, then sign in through the fake Google login."""
    with session_factory() as db:
        db.add(User(email=email, name="Test User", role=role))
        db.commit()

    google({"email": email, "email_verified": True, "name": "Test User"})
    response = client.get("/auth/callback", follow_redirects=False)
    assert response.status_code == 303


def add_draft_event(session_factory):
    """Save one unpublished event and return its id."""
    with session_factory() as db:
        event = Event(
            title="Draft: lab prep",
            course_code="ISP",
            event_type="Lab",
            event_date=date(2026, 10, 14),
            start_time=time(9, 0),
            end_time=time(10, 0),
            publish_immediately=False,
            created_by_role="Lecturer",
        )
        db.add(event)
        db.commit()
        return event.id


@pytest.mark.parametrize("role", ["TA", "Admin"])
def test_staff_can_see_drafts_in_the_feed(client, google, session_factory, role):
    add_draft_event(session_factory)
    sign_in_with_google(client, google, session_factory, "staff@ku.th", role)

    response = client.get("/api/events?include_drafts=true")

    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert response.json()["events"][0]["isPublished"] is False


def test_google_student_cannot_see_drafts_in_the_feed(client, google, session_factory):
    add_draft_event(session_factory)
    sign_in_with_google(client, google, session_factory, "student@ku.th", "Student")

    response = client.get("/api/events?include_drafts=true")

    assert response.status_code == 403


NEW_EVENT = {
    "title": "TA Office Hour",
    "course_code": "ISP",
    "event_type": "Lab",
    "event_date": "2026-10-21",
    "start_time": "13:00",
    "end_time": "14:00",
}


@pytest.mark.parametrize("role", ["TA", "Admin"])
def test_staff_can_create_an_event(client, google, session_factory, role):
    sign_in_with_google(client, google, session_factory, "staff@ku.th", role)

    response = client.post("/api/events", json=NEW_EVENT)

    assert response.status_code == 201
    # The saved role comes from the login, not from the request.
    assert response.json()["created_by_role"] == role


def test_google_student_cannot_create_an_event(client, google, session_factory):
    sign_in_with_google(client, google, session_factory, "student@ku.th", "Student")

    response = client.post("/api/events", json=NEW_EVENT)

    assert response.status_code == 403
    with session_factory() as db:
        assert db.query(Event).count() == 0


@pytest.mark.parametrize("role", ["TA", "Admin"])
def test_staff_can_open_one_draft_by_id(client, google, session_factory, role):
    draft_id = add_draft_event(session_factory)
    sign_in_with_google(client, google, session_factory, "staff@ku.th", role)

    response = client.get(f"/api/events/{draft_id}")

    assert response.status_code == 200
    assert response.json()["title"] == "Draft: lab prep"


def test_google_student_gets_404_for_a_draft_id(client, google, session_factory):
    # Students get 404 (not 403) so they can't tell the draft exists.
    draft_id = add_draft_event(session_factory)
    sign_in_with_google(client, google, session_factory, "student@ku.th", "Student")

    response = client.get(f"/api/events/{draft_id}")

    assert response.status_code == 404
