"""Reminders on tickets: Reminder, Flag TA and Batch Ping are saved and shown."""
from datetime import datetime, timedelta, timezone

import pytest

from src.controllers.at_risk import utcnow
from src.models.ticket import Ticket
from src.models.user import User

NOW = datetime(2026, 11, 15, 12, 0, tzinfo=timezone.utc)


@pytest.fixture
def frozen_now(client):
    client.app.dependency_overrides[utcnow] = lambda: NOW
    return NOW


@pytest.fixture
def sign_in(client, google, session_factory):
    def _sign_in(role: str) -> None:
        email = f"{role.lower()}@ku.th"
        with session_factory() as db:
            db.add(User(email=email, name=f"Demo {role}", role=role))
            db.commit()
        google({"email": email, "email_verified": True, "name": f"Demo {role}"})
        assert client.get("/auth/callback",
                          follow_redirects=False).status_code == 303

    return _sign_in


def add_ticket(session_factory, title: str, due_in: timedelta, status: str = "Open") -> int:
    with session_factory() as db:
        ticket = Ticket(title=title, owner="Alex Chen", status=status,
                        due_at=NOW + due_in, created_by="lecturer@ku.th")
        db.add(ticket)
        db.commit()
        return ticket.id


def test_staff_can_save_a_reminder(client, sign_in, session_factory):
    ticket_id = add_ticket(session_factory, "Grade lab 3", timedelta(hours=10))
    sign_in("Lecturer")

    response = client.post(
        f"/api/tickets/{ticket_id}/reminders", json={"kind": "reminder"})

    assert response.status_code == 201
    body = response.json()
    assert (body["ticket_id"], body["kind"], body["sent_by"]) == (
        ticket_id, "reminder", "Demo Lecturer")


def test_reminders_are_listed_newest_first(client, sign_in, session_factory):
    ticket_id = add_ticket(session_factory, "Grade lab 3", timedelta(hours=10))
    sign_in("TA")
    client.post(f"/api/tickets/{ticket_id}/reminders",
                json={"kind": "reminder"})
    client.post(f"/api/tickets/{ticket_id}/reminders", json={"kind": "flag"})

    kinds = [r["kind"]
             for r in client.get(f"/api/tickets/{ticket_id}/reminders").json()]

    assert kinds == ["flag", "reminder"]


def test_unknown_kind_or_ticket_is_rejected(client, sign_in, session_factory):
    ticket_id = add_ticket(session_factory, "Grade lab 3", timedelta(hours=10))
    sign_in("Lecturer")

    assert client.post(
        f"/api/tickets/{ticket_id}/reminders", json={"kind": "spam"}).status_code == 422
    assert client.post("/api/tickets/9999/reminders",
                       json={"kind": "reminder"}).status_code == 404


def test_students_and_nobody_cannot_send_reminders(client, sign_in, session_factory):
    ticket_id = add_ticket(session_factory, "Grade lab 3", timedelta(hours=10))
    assert client.post(
        f"/api/tickets/{ticket_id}/reminders", json={}).status_code == 401
    sign_in("Student")
    assert client.post(
        f"/api/tickets/{ticket_id}/reminders", json={}).status_code == 403
    assert client.post("/api/at-risk/remind").status_code == 403


def test_batch_ping_reminds_only_at_risk_tickets(client, sign_in, session_factory, frozen_now):
    overdue = add_ticket(session_factory, "Overdue", timedelta(hours=-5))
    nearing = add_ticket(session_factory, "Nearing", timedelta(hours=20))
    add_ticket(session_factory, "Far away", timedelta(days=10))
    add_ticket(session_factory, "Closed", timedelta(hours=-5), status="Closed")
    sign_in("Lecturer")

    response = client.post("/api/at-risk/remind")

    assert response.json()["count"] == 2
    assert len(client.get(f"/api/tickets/{overdue}/reminders").json()) == 1
    assert len(client.get(f"/api/tickets/{nearing}/reminders").json()) == 1


def test_at_risk_report_shows_the_latest_reminder(client, sign_in, session_factory, frozen_now):
    ticket_id = add_ticket(session_factory, "Overdue", timedelta(hours=-5))
    other_id = add_ticket(session_factory, "Nearing", timedelta(hours=20))
    sign_in("Lecturer")
    client.post(f"/api/tickets/{ticket_id}/reminders",
                json={"kind": "reminder"})
    client.post(f"/api/tickets/{ticket_id}/reminders", json={"kind": "flag"})

    items = {item["id"]: item for item in client.get(
        "/api/at-risk").json()["items"]}

    assert items[ticket_id]["last_reminder"]["kind"] == "flag"
    assert items[ticket_id]["last_reminder"]["sent_by"] == "Demo Lecturer"
    assert items[other_id]["last_reminder"] is None
