"""Reminder emails: sent to the ticket owner when possible, never lost when not."""
import smtplib
from datetime import datetime, timedelta, timezone

import pytest

from src.controllers.at_risk import utcnow
from src.controllers.mailer import Mailer, get_mailer
from src.models.ticket import Ticket
from src.models.user import User

NOW = datetime(2026, 11, 15, 12, 0, tzinfo=timezone.utc)


class FakeMailer(Mailer):
    """Records emails instead of sending them."""

    def __init__(self, fail: bool = False) -> None:
        self.sent: list[tuple[str, str, str]] = []
        self.fail = fail

    def send(self, to: str, subject: str, body: str) -> None:
        if self.fail:
            raise smtplib.SMTPAuthenticationError(535, b"Bad app password")
        self.sent.append((to, subject, body))


@pytest.fixture
def mailer(client):
    fake = FakeMailer()
    client.app.dependency_overrides[get_mailer] = lambda: fake
    client.app.dependency_overrides[utcnow] = lambda: NOW
    return fake


@pytest.fixture
def lecturer(client, google, session_factory):
    with session_factory() as db:
        db.add(User(email="lecturer@ku.th", name="Demo Lecturer", role="Lecturer"))
        db.commit()
    google({"email": "lecturer@ku.th",
           "email_verified": True, "name": "Demo Lecturer"})
    assert client.get("/auth/callback",
                      follow_redirects=False).status_code == 303


def add_ticket(session_factory, title="Grade lab 3", due_in=timedelta(hours=-5), email="alex@ku.th") -> int:
    with session_factory() as db:
        ticket = Ticket(title=title, owner="Alex Chen", owner_email=email, status="Open",
                        due_at=NOW + due_in, created_by="lecturer@ku.th")
        db.add(ticket)
        db.commit()
        return ticket.id


def test_a_reminder_emails_the_ticket_owner(client, lecturer, mailer, session_factory):
    ticket_id = add_ticket(session_factory)

    response = client.post(
        f"/api/tickets/{ticket_id}/reminders", json={"kind": "reminder"})

    assert response.status_code == 201
    assert response.json()["email"] == "sent"
    to, subject, body = mailer.sent[0]
    assert to == "alex@ku.th"
    assert subject == "[GuildBoard] Reminder: Grade lab 3 is overdue"
    assert "Hello Alex Chen" in body and "Demo Lecturer" in body and f"/tasks/{ticket_id}" in body


def test_a_flag_uses_a_follow_up_subject(client, lecturer, mailer, session_factory):
    ticket_id = add_ticket(session_factory, due_in=timedelta(hours=20))

    client.post(f"/api/tickets/{ticket_id}/reminders", json={"kind": "flag"})

    assert mailer.sent[0][1] == "[GuildBoard] TA follow-up requested: Grade lab 3"


def test_no_email_is_sent_when_the_ticket_has_no_address(client, lecturer, mailer, session_factory):
    ticket_id = add_ticket(session_factory, email="")

    response = client.post(
        f"/api/tickets/{ticket_id}/reminders", json={"kind": "reminder"})

    assert response.status_code == 201
    assert response.json()["email"] == "no_email"
    assert mailer.sent == []


def test_without_gmail_settings_the_reminder_is_still_saved(client, lecturer, session_factory):
    ticket_id = add_ticket(session_factory)

    response = client.post(
        f"/api/tickets/{ticket_id}/reminders", json={"kind": "reminder"})

    assert response.status_code == 201
    assert response.json()["email"] == "not_configured"
    assert len(client.get(f"/api/tickets/{ticket_id}/reminders").json()) == 1


def test_a_gmail_error_does_not_lose_the_reminder(client, lecturer, session_factory):
    client.app.dependency_overrides[get_mailer] = lambda: FakeMailer(fail=True)
    ticket_id = add_ticket(session_factory)

    response = client.post(
        f"/api/tickets/{ticket_id}/reminders", json={"kind": "reminder"})

    assert response.status_code == 201
    assert response.json()["email"] == "failed"
    assert len(client.get(f"/api/tickets/{ticket_id}/reminders").json()) == 1


def test_batch_ping_emails_every_at_risk_owner_with_an_address(client, lecturer, mailer, session_factory):
    add_ticket(session_factory, title="Overdue",
               due_in=timedelta(hours=-5), email="a@ku.th")
    add_ticket(session_factory, title="Nearing",
               due_in=timedelta(hours=20), email="")
    add_ticket(session_factory, title="Far away",
               due_in=timedelta(days=10), email="c@ku.th")

    response = client.post("/api/at-risk/remind")

    assert response.json() == {"count": 2, "emailed": 1}
    assert [to for to, _, _ in mailer.sent] == ["a@ku.th"]