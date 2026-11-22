"""Tests for Ticket Comments API."""
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select

from src.config import settings
from src.models.ticket import Ticket
from src.models.ticket_comment import TicketComment
from src.models.user import User
from src.database import SessionLocal


def get_lecturer_cookies(client: TestClient):
    response = client.post(
        "/api/auth/dev-login",
        json={"email": settings.demo_lecturer_email, "password": settings.demo_lecturer_password},
    )
    assert response.status_code == 200
    return response.cookies


def get_ta_cookies(client: TestClient):
    response = client.post(
        "/api/auth/dev-login",
        json={"email": settings.demo_ta_email, "password": settings.demo_ta_password},
    )
    assert response.status_code == 200
    return response.cookies


def get_admin_cookies(client: TestClient):
    response = client.post(
        "/api/auth/dev-login",
        json={"email": settings.demo_admin_email, "password": settings.demo_admin_password},
    )
    assert response.status_code == 200
    return response.cookies


def get_student_cookies(client: TestClient):
    response = client.post(
        "/api/auth/dev-login",
        json={"email": settings.demo_student_email, "password": settings.demo_student_password},
    )
    assert response.status_code == 200
    return response.cookies


def seed_ticket_and_users(db):
    """Add a ticket and users for comment tests."""
    # Ensure demo users exist in DB
    lecturer = db.scalar(select(User).where(User.email == settings.demo_lecturer_email))
    if not lecturer:
        lecturer = User(email=settings.demo_lecturer_email, name="Demo Lecturer", role="Lecturer")
        db.add(lecturer)

    ta = db.scalar(select(User).where(User.email == settings.demo_ta_email))
    if not ta:
        ta = User(email=settings.demo_ta_email, name="Demo TA", role="TA")
        db.add(ta)

    admin = db.scalar(select(User).where(User.email == settings.demo_admin_email))
    if not admin:
        admin = User(email=settings.demo_admin_email, name="Demo Admin", role="Admin")
        db.add(admin)

    db.flush()

    # Create a ticket
    ticket = Ticket(
        title="Test Ticket for Comments",
        owner="Test Owner",
        owner_role="TA",
        priority="High",
        status="Open",
        due_at=datetime.now(timezone.utc) + timedelta(days=7),
        created_by=settings.demo_lecturer_email,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return ticket, lecturer, ta, admin


def test_student_cannot_get_comments(client, session_factory):
    with session_factory() as db:
        seed_ticket_and_users(db)

    cookies = get_student_cookies(client)
    response = client.get("/api/tickets/1/comments", cookies=cookies)
    assert response.status_code == 403


def test_unauthenticated_cannot_get_comments(client, session_factory):
    with session_factory() as db:
        seed_ticket_and_users(db)

    response = client.get("/api/tickets/1/comments")
    assert response.status_code == 401


def test_lecturer_can_get_comments(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_lecturer_cookies(client)
    response = client.get(f"/api/tickets/{ticket.id}/comments", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_ta_can_post_comment(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_ta_cookies(client)
    response = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "TA comment"},
        cookies=cookies,
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["body"] == "TA comment"
    assert data["author_role"] in ("TA", "Lecturer", "Admin")


def test_lecturer_can_post_comment(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_lecturer_cookies(client)
    response = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "Lecturer comment"},
        cookies=cookies,
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["body"] == "Lecturer comment"


def test_admin_can_post_comment(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_admin_cookies(client)
    response = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "Admin comment"},
        cookies=cookies,
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["body"] == "Admin comment"


def test_student_cannot_post_comment(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_student_cookies(client)
    response = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "Student comment"},
        cookies=cookies,
    )
    assert response.status_code == 403


def test_empty_body_rejected(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_ta_cookies(client)
    response = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": ""},
        cookies=cookies,
    )
    assert response.status_code == 400
    assert response.json()["error"] == "REQUIRED_FIELDS_MISSING"


def test_body_too_long_rejected(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_ta_cookies(client)
    response = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "x" * 2001},
        cookies=cookies,
    )
    assert response.status_code == 400
    assert response.json()["error"] == "COMMENT_TOO_LONG"


def test_author_can_update_own_comment(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_ta_cookies(client)
    # Post a comment first
    post_resp = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "Original comment"},
        cookies=cookies,
    )
    assert post_resp.status_code == 201
    comment_id = post_resp.json()["id"]

    # Update it
    patch_resp = client.patch(
        f"/api/tickets/{ticket.id}/comments/{comment_id}",
        json={"body": "Updated by author"},
        cookies=cookies,
    )
    assert patch_resp.status_code == 200, patch_resp.text
    assert patch_resp.json()["body"] == "Updated by author"


def test_author_can_delete_own_comment(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_ta_cookies(client)
    # Post a comment first
    post_resp = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "To be deleted"},
        cookies=cookies,
    )
    assert post_resp.status_code == 201
    comment_id = post_resp.json()["id"]

    # Delete it
    del_resp = client.delete(
        f"/api/tickets/{ticket.id}/comments/{comment_id}",
        cookies=cookies,
    )
    assert del_resp.status_code == 204

    # Verify it's gone
    get_resp = client.get(f"/api/tickets/{ticket.id}/comments", cookies=cookies)
    assert get_resp.status_code == 200
    assert all(c["id"] != comment_id for c in get_resp.json())


def test_cannot_update_other_users_comment(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    ta_cookies = get_ta_cookies(client)
    # TA posts a comment
    post_resp = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "TA's comment"},
        cookies=ta_cookies,
    )
    assert post_resp.status_code == 201
    comment_id = post_resp.json()["id"]

    # Lecturer tries to update TA's comment
    lecturer_cookies = get_lecturer_cookies(client)
    patch_resp = client.patch(
        f"/api/tickets/{ticket.id}/comments/{comment_id}",
        json={"body": "Lecturer trying to edit"},
        cookies=lecturer_cookies,
    )
    assert patch_resp.status_code == 403


def test_cannot_delete_other_users_comment(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    ta_cookies = get_ta_cookies(client)
    # TA posts a comment
    post_resp = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "TA's comment to delete"},
        cookies=ta_cookies,
    )
    assert post_resp.status_code == 201
    comment_id = post_resp.json()["id"]

    # Lecturer tries to delete TA's comment
    lecturer_cookies = get_lecturer_cookies(client)
    del_resp = client.delete(
        f"/api/tickets/{ticket.id}/comments/{comment_id}",
        cookies=lecturer_cookies,
    )
    assert del_resp.status_code == 403


def test_admin_can_update_any_comment(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    ta_cookies = get_ta_cookies(client)
    # TA posts a comment
    post_resp = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "TA's comment"},
        cookies=ta_cookies,
    )
    assert post_resp.status_code == 201
    comment_id = post_resp.json()["id"]

    # Admin updates TA's comment
    admin_cookies = get_admin_cookies(client)
    patch_resp = client.patch(
        f"/api/tickets/{ticket.id}/comments/{comment_id}",
        json={"body": "Admin updated it"},
        cookies=admin_cookies,
    )
    assert patch_resp.status_code == 200, patch_resp.text
    assert patch_resp.json()["body"] == "Admin updated it"


def test_admin_can_delete_any_comment(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    ta_cookies = get_ta_cookies(client)
    # TA posts a comment
    post_resp = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "TA's comment"},
        cookies=ta_cookies,
    )
    assert post_resp.status_code == 201
    comment_id = post_resp.json()["id"]

    # Admin deletes TA's comment
    admin_cookies = get_admin_cookies(client)
    del_resp = client.delete(
        f"/api/tickets/{ticket.id}/comments/{comment_id}",
        cookies=admin_cookies,
    )
    assert del_resp.status_code == 204


def test_404_for_nonexistent_comment(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_ta_cookies(client)
    response = client.patch(
        f"/api/tickets/{ticket.id}/comments/99999",
        json={"body": "Doesn't exist"},
        cookies=cookies,
    )
    assert response.status_code == 404
    assert response.json()["error"] == "COMMENT_NOT_FOUND"


def test_404_for_nonexistent_ticket(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_ta_cookies(client)
    response = client.get("/api/tickets/99999/comments", cookies=cookies)
    assert response.status_code == 404


def test_comment_list_includes_author_info(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_ta_cookies(client)
    # Post a comment
    client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "Test comment"},
        cookies=cookies,
    )

    # Get comments
    response = client.get(f"/api/tickets/{ticket.id}/comments", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    comment = data[-1]
    assert "author_name" in comment
    assert "author_role" in comment
    assert "created_at" in comment


def test_comment_validation_error_format(client, session_factory):
    with session_factory() as db:
        ticket, lecturer, ta, admin = seed_ticket_and_users(db)

    cookies = get_ta_cookies(client)
    response = client.post(
        f"/api/tickets/{ticket.id}/comments",
        json={"body": "x" * 2001},
        cookies=cookies,
    )
    assert response.status_code == 400
    error = response.json()
    assert error["error"] == "COMMENT_TOO_LONG"
    assert "detail" in error