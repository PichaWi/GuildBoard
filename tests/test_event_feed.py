"""Ticket 2 — GET /api/events, the calendar feed (SRS-1, SRS-2).

Events are inserted straight into the database, so the feed is tested on its
own rather than through the create endpoint.
"""
from datetime import date, time

import pytest

from src.models.event import Event

# The keys every entry in calendar.html's hardcoded calendarEvents array has.
CALENDAR_KEYS = {"id", "title", "course", "date", "type", "colorClass", "time", "location", "instructor", "isRich"}


@pytest.fixture
def seed(session_factory):
    def _seed(**overrides) -> Event:
        values = {
            "title": "ISP Architecture Review",
            "course_code": "ISP",
            "event_type": "Lecture & Workshop",
            "event_date": date(2026, 10, 14),
            "start_time": time(13, 0),
            "end_time": time(16, 0),
            "location": "E11S603",
            "instructor": "Aj. Milk",
            "description": "Bring your component diagrams.",
            "publish_immediately": True,
            "notify_email": False,
            "created_by_role": "Lecturer",
            **overrides,
        }
        with session_factory() as db:
            event = Event(**values)
            db.add(event)
            db.commit()
            db.refresh(event)
            return event

    return _seed


def test_an_empty_calendar_returns_no_events(client):
    response = client.get("/api/events")

    assert response.status_code == 200
    assert response.json() == {"count": 0, "events": []}


def test_the_published_calendar_needs_no_sign_in(client, seed):
    seed()

    assert client.get("/api/events").json()["count"] == 1


def test_each_event_has_every_key_the_calendar_view_reads(client, seed):
    seed()

    event = client.get("/api/events").json()["events"][0]

    assert CALENDAR_KEYS <= event.keys()
    # SRS-2: title, type, date/time and owner.
    assert event["title"] == "ISP Architecture Review"
    assert event["type"] == "Lecture & Workshop"
    assert event["date"] == "2026-10-14"
    assert event["time"] == "1:00 PM - 4:00 PM"
    assert event["instructor"] == "Aj. Milk"
    assert event["course"] == "ISP"
    assert event["location"] == "E11S603"
    assert event["colorClass"] == "bg-primary-container"
    assert event["isRich"] is True


def test_morning_times_match_the_calendar_format(client, seed):
    seed(start_time=time(9, 0), end_time=time(12, 0))

    assert client.get("/api/events").json()["events"][0]["time"] == "9:00 AM - 12:00 PM"


def test_unpublished_events_are_hidden_from_the_calendar(client, seed):
    seed(publish_immediately=False)

    # SRS-1: students and TAs only see published items.
    assert client.get("/api/events").json()["count"] == 0


def test_drafts_require_sign_in(client, seed):
    seed(publish_immediately=False)

    response = client.get("/api/events?include_drafts=true")

    assert response.status_code == 401


def test_students_cannot_view_drafts(client, seed, login_as):
    seed(publish_immediately=False)
    login_as("Student")

    response = client.get("/api/events?include_drafts=true")

    assert response.status_code == 403


def test_lecturers_can_view_drafts(client, seed, login_as):
    seed(publish_immediately=False)
    login_as("Lecturer")

    response = client.get("/api/events?include_drafts=true")

    assert response.json()["count"] == 1
    assert response.json()["events"][0]["isPublished"] is False


def test_events_can_be_filtered_by_course(client, seed):
    seed(course_code="ISP")
    seed(course_code="KE", title="KE Lab Intro")

    assert client.get("/api/events?course=KE").json()["count"] == 1
    assert client.get("/api/events?course=isp").json()["count"] == 1
    assert client.get("/api/events").json()["count"] == 2


def test_events_can_be_filtered_by_type(client, seed):
    seed(event_type="Lab")
    seed(event_type="Project Milestone", title="Milestone 2")

    events = client.get("/api/events?type=Lab").json()["events"]

    assert [event["type"] for event in events] == ["Lab"]


def test_events_are_ordered_by_date_then_start_time(client, seed):
    seed(title="Later", event_date=date(2026, 11, 10))
    seed(title="Afternoon", event_date=date(2026, 10, 2), start_time=time(13, 0), end_time=time(15, 0))
    seed(title="Morning", event_date=date(2026, 10, 2), start_time=time(9, 0), end_time=time(12, 0))

    titles = [event["title"] for event in client.get("/api/events").json()["events"]]

    assert titles == ["Morning", "Afternoon", "Later"]


def test_one_event_can_be_fetched_by_id(client, seed):
    event = seed()

    response = client.get(f"/api/events/{event.id}")

    assert response.status_code == 200
    assert response.json()["title"] == "ISP Architecture Review"


def test_an_unknown_event_id_returns_404(client):
    assert client.get("/api/events/999").status_code == 404


def test_a_draft_fetched_by_id_is_hidden_from_students(client, seed, login_as):
    draft = seed(publish_immediately=False)

    assert client.get(f"/api/events/{draft.id}").status_code == 404
    login_as("Lecturer")
    assert client.get(f"/api/events/{draft.id}").status_code == 200


def test_the_feed_does_not_shadow_event_creation(client):
    # GET and POST share /api/events; an anonymous POST must still reach the
    # create route and be refused there, not answered with 405.
    assert client.post("/api/events", json={}).status_code == 401
