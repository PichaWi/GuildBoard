from datetime import date, datetime, time, timedelta, timezone

import pytest

from src.controllers.at_risk import utcnow
from src.models.event import Event
from src.models.ticket import Ticket
from src.models.user import User

# 10:00 on Mon 9 Nov 2026 in Thailand.
NOW = datetime(2026, 11, 9, 3, 0, tzinfo=timezone.utc)
TODAY = date(2026, 11, 9)


@pytest.fixture
def frozen_now(client):
    client.app.dependency_overrides[utcnow] = lambda: NOW
    return NOW


@pytest.fixture
def sign_in(client, google, session_factory):
    def _sign_in(role: str) -> None:
        email = f"{role.lower()}@ku.th"
        with session_factory() as db:
            db.add(User(email=email, name=role, role=role))
            db.commit()
        google({"email": email, "email_verified": True, "name": role})
        assert client.get("/auth/callback", follow_redirects=False).status_code == 303

    return _sign_in


def add_event(session_factory, title: str, on: date, published: bool = True, start: time = time(9, 0)) -> int:
    with session_factory() as db:
        event = Event(
            title=title,
            course_code="ISP",
            event_type="Project Milestone",
            event_date=on,
            start_time=start,
            end_time=time(12, 0),
            publish_immediately=published,
            created_by_role="Lecturer",
        )
        db.add(event)
        db.commit()
        return event.id


def add_ticket(session_factory, title: str, due_in: timedelta, status: str = "Open") -> int:
    with session_factory() as db:
        ticket = Ticket(title=title, owner="Alex Chen", status=status, due_at=NOW + due_in, created_by="lecturer@ku.th")
        db.add(ticket)
        db.commit()
        return ticket.id


def titles(response) -> list[str]:
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["count"] == len(body["items"])
    return [item["title"] for item in body["items"]]


def test_nobody_signed_in_gets_no_notifications(client):
    assert client.get("/api/notifications").status_code == 401


@pytest.mark.parametrize("role", ["Student", "TA", "Lecturer", "Admin"])
def test_everyone_signed_in_sees_events_in_the_next_seven_days(client, sign_in, session_factory, frozen_now, role):
    add_event(session_factory, "Yesterday", TODAY - timedelta(days=1))
    add_event(session_factory, "Today", TODAY)
    add_event(session_factory, "In 7 days", TODAY + timedelta(days=7))
    add_event(session_factory, "In 8 days", TODAY + timedelta(days=8))
    sign_in(role)

    assert titles(client.get("/api/notifications")) == ["Today", "In 7 days"]


def test_an_event_item_says_what_when_and_where_to_look(client, sign_in, session_factory, frozen_now):
    event_id = add_event(session_factory, "Architecture Review", TODAY + timedelta(days=2), start=time(13, 30))
    sign_in("Student")

    item = client.get("/api/notifications").json()["items"][0]

    assert item == {
        "id": f"event-{event_id}",
        "kind": "event",
        "title": "Architecture Review",
        "detail": "ISP · Project Milestone",
        "at": "2026-11-11T13:30:00+07:00",
        "link": "/calendar",
    }


@pytest.mark.parametrize("role", ["Student", "TA", "Lecturer", "Admin"])
def test_a_draft_event_is_never_announced(client, sign_in, session_factory, frozen_now, role):
    add_event(session_factory, "Draft", TODAY + timedelta(days=1), published=False)
    sign_in(role)

    assert titles(client.get("/api/notifications")) == []


def test_today_means_today_in_thailand(client, sign_in, session_factory):
    # 01:00 on 10 Nov in Thailand is still 9 Nov in UTC.
    client.app.dependency_overrides[utcnow] = lambda: datetime(2026, 11, 9, 18, 0, tzinfo=timezone.utc)
    add_event(session_factory, "9 Nov", date(2026, 11, 9))
    add_event(session_factory, "10 Nov", date(2026, 11, 10))
    add_event(session_factory, "17 Nov", date(2026, 11, 17))
    add_event(session_factory, "18 Nov", date(2026, 11, 18))
    sign_in("Student")

    assert titles(client.get("/api/notifications")) == ["10 Nov", "17 Nov"]


@pytest.mark.parametrize("role", ["TA", "Lecturer", "Admin"])
def test_staff_also_see_at_risk_tickets_first(client, sign_in, session_factory, frozen_now, role):
    add_event(session_factory, "Event today", TODAY)
    add_ticket(session_factory, "Due in 47 h", timedelta(hours=47))
    add_ticket(session_factory, "Overdue", timedelta(hours=-26))
    add_ticket(session_factory, "Due in 49 h", timedelta(hours=49))
    add_ticket(session_factory, "Closed and overdue", timedelta(hours=-5), status="Closed")
    sign_in(role)

    assert titles(client.get("/api/notifications")) == ["Overdue", "Due in 47 h", "Event today"]


def test_a_ticket_item_links_to_the_ticket(client, sign_in, session_factory, frozen_now):
    late = add_ticket(session_factory, "Overdue", timedelta(hours=-26))
    soon = add_ticket(session_factory, "Due soon", timedelta(hours=5))
    sign_in("TA")

    overdue, nearing = client.get("/api/notifications").json()["items"]

    assert overdue == {
        "id": f"ticket-{late}-overdue",
        "kind": "overdue",
        "title": "Overdue",
        "detail": "Owner: Alex Chen",
        "at": "2026-11-08T01:00:00+00:00",
        "link": f"/tasks/{late}",
    }
    assert (nearing["id"], nearing["kind"], nearing["link"]) == (f"ticket-{soon}-nearing", "nearing", f"/tasks/{soon}")


def test_a_student_never_sees_tickets(client, sign_in, session_factory, frozen_now):
    add_ticket(session_factory, "Overdue", timedelta(hours=-26))
    sign_in("Student")

    assert titles(client.get("/api/notifications")) == []


def test_closing_a_ticket_removes_its_notification(client, sign_in, session_factory, frozen_now):
    ticket_id = add_ticket(session_factory, "Overdue", timedelta(hours=-2))
    sign_in("TA")
    assert titles(client.get("/api/notifications")) == ["Overdue"]

    assert client.patch(f"/api/tickets/{ticket_id}", json={"status": "Closed"}).status_code == 200

    assert client.get("/api/notifications").json() == {"count": 0, "items": []}


def test_a_dev_login_gets_notifications_for_its_role(client, login_as, session_factory, frozen_now):
    add_ticket(session_factory, "Overdue", timedelta(hours=-2))
    add_event(session_factory, "Event today", TODAY)

    login_as("Student")
    assert titles(client.get("/api/notifications")) == ["Event today"]
    login_as("Lecturer")
    assert titles(client.get("/api/notifications")) == ["Overdue", "Event today"]
