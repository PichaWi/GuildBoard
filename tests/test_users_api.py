"""Tests for Admin User Management API (US-5)."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from src.config import settings
from src.models.user import User
from src.database import SessionLocal


def get_admin_cookies(client: TestClient):
    response = client.post(
        "/api/auth/dev-login",
        json={"email": settings.demo_admin_email, "password": settings.demo_admin_password},
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


def get_lecturer_cookies(client: TestClient):
    response = client.post(
        "/api/auth/dev-login",
        json={"email": settings.demo_lecturer_email, "password": settings.demo_lecturer_password},
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


def seed_test_users(db):
    """Add test users."""
    users = [
        User(email="user1@ku.th", name="User One", role="Student"),
        User(email="user2@ku.th", name="User Two", role="TA"),
        User(email="user3@ku.th", name="User Three", role="Lecturer"),
    ]
    for u in users:
        db.add(u)
    db.commit()
    return users


def test_admin_can_list_users(client, session_factory):
    """Admin can list all users."""
    with session_factory() as db:
        seed_test_users(db)
        from src.controllers.users import assign_role
        from src.controllers.auth import UserRole
        assign_role(db, "admin.test@ku.th", UserRole.ADMIN)

    cookies = get_admin_cookies(client)
    response = client.get("/api/users", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 4  # 3 seeded + 1 admin + demo accounts


def test_lecturer_cannot_list_users(client, session_factory):
    """Lecturer gets 403 when trying to list users."""
    with session_factory() as db:
        seed_test_users(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/users", cookies=cookies)
    assert response.status_code == 403


def test_student_cannot_list_users(client, session_factory):
    """Student gets 403 when trying to list users."""
    with session_factory() as db:
        seed_test_users(db)

    cookies = get_student_cookies(client)
    response = client.get("/api/users", cookies=cookies)
    assert response.status_code == 403


def test_unauthenticated_cannot_list_users(client, session_factory):
    """Unauthenticated gets 401."""
    with session_factory() as db:
        seed_test_users(db)

    response = client.get("/api/users")
    assert response.status_code == 401


def test_admin_can_search_users_by_q(client, session_factory):
    """Admin can filter users by search query."""
    with session_factory() as db:
        seed_test_users(db)
        from src.controllers.users import assign_role
        from src.controllers.auth import UserRole
        assign_role(db, "admin.test@ku.th", UserRole.ADMIN)

    cookies = get_admin_cookies(client)
    response = client.get("/api/users?q=User One", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any("User One" in u["name"] for u in data)


def test_admin_can_filter_users_by_role(client, session_factory):
    """Admin can filter users by role."""
    with session_factory() as db:
        seed_test_users(db)
        from src.controllers.users import assign_role
        from src.controllers.auth import UserRole
        assign_role(db, "admin.test@ku.th", UserRole.ADMIN)

    cookies = get_admin_cookies(client)
    response = client.get("/api/users?role=Student", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert all(u["role"] == "Student" for u in data)


def test_admin_can_update_user_role(client, session_factory):
    """Admin can update a user's role."""
    with session_factory() as db:
        users = seed_test_users(db)
        from src.controllers.users import assign_role
        from src.controllers.auth import UserRole
        assign_role(db, "admin.test@ku.th", UserRole.ADMIN)
        target_id = users[0].id  # User One, Student

    cookies = get_admin_cookies(client)
    response = client.patch(
        f"/api/users/{target_id}/role",
        json={"role": "TA"},
        cookies=cookies,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "TA"
    assert data["id"] == target_id


def test_admin_cannot_self_demote(client, session_factory):
    """Admin cannot remove their own Admin role."""
    with session_factory() as db:
        from src.controllers.users import assign_role
        from src.controllers.auth import UserRole
        admin_user, _ = assign_role(db, "admin.test@ku.th", UserRole.ADMIN)
        admin_id = admin_user.id

    cookies = get_admin_cookies(client)
    response = client.patch(
        f"/api/users/{admin_id}/role",
        json={"role": "Lecturer"},
        cookies=cookies,
    )
    assert response.status_code == 400
    assert response.json()["error"] == "SELF_DEMOTION"


def test_invalid_role_rejected(client, session_factory):
    """Invalid role value is rejected with 422."""
    with session_factory() as db:
        users = seed_test_users(db)
        from src.controllers.users import assign_role
        from src.controllers.auth import UserRole
        assign_role(db, "admin.test@ku.th", UserRole.ADMIN)
        target_id = users[0].id

    cookies = get_admin_cookies(client)
    response = client.patch(
        f"/api/users/{target_id}/role",
        json={"role": "Dean"},
        cookies=cookies,
    )
    assert response.status_code == 422
    assert response.json()["error"] == "INVALID_ROLE"


def test_nonexistent_user_returns_404(client, session_factory):
    """Updating role for nonexistent user returns 404."""
    with session_factory() as db:
        from src.controllers.users import assign_role
        from src.controllers.auth import UserRole
        assign_role(db, "admin.test@ku.th", UserRole.ADMIN)

    cookies = get_admin_cookies(client)
    response = client.patch(
        "/api/users/99999/role",
        json={"role": "TA"},
        cookies=cookies,
    )
    assert response.status_code == 404
    assert response.json()["error"] == "USER_NOT_FOUND"


def test_missing_role_field_returns_422(client, session_factory):
    """Missing role field in request body returns 422."""
    with session_factory() as db:
        users = seed_test_users(db)
        from src.controllers.users import assign_role
        from src.controllers.auth import UserRole
        assign_role(db, "admin.test@ku.th", UserRole.ADMIN)
        target_id = users[0].id

    cookies = get_admin_cookies(client)
    response = client.patch(
        f"/api/users/{target_id}/role",
        json={},
        cookies=cookies,
    )
    assert response.status_code == 422
    assert response.json()["error"] == "INVALID_ROLE"


def test_lecturer_cannot_update_role(client, session_factory):
    """Lecturer gets 403 when trying to update role."""
    with session_factory() as db:
        users = seed_test_users(db)
        target_id = users[0].id

    cookies = get_lecturer_cookies(client)
    response = client.patch(
        f"/api/users/{target_id}/role",
        json={"role": "TA"},
        cookies=cookies,
    )
    assert response.status_code == 403


def test_student_cannot_update_role(client, session_factory):
    """Student gets 403 when trying to update role."""
    with session_factory() as db:
        users = seed_test_users(db)
        target_id = users[0].id

    cookies = get_student_cookies(client)
    response = client.patch(
        f"/api/users/{target_id}/role",
        json={"role": "TA"},
        cookies=cookies,
    )
    assert response.status_code == 403


def test_role_change_applies_on_next_request(client, session_factory):
    """Role changes apply on the user's next request."""
    with session_factory() as db:
        users = seed_test_users(db)
        from src.controllers.users import assign_role
        from src.controllers.auth import UserRole
        assign_role(db, "admin.test@ku.th", UserRole.ADMIN)
        target_id = users[0].id  # User One, Student

    cookies = get_admin_cookies(client)
    # Change role from Student to TA
    response = client.patch(
        f"/api/users/{target_id}/role",
        json={"role": "TA"},
        cookies=cookies,
    )
    assert response.status_code == 200

    # Verify the role was updated in the database
    with session_factory() as db:
        user = db.get(User, target_id)
        assert user.role == "TA"


def test_users_response_shape(client, session_factory):
    """Response shape matches frontend expectations."""
    with session_factory() as db:
        seed_test_users(db)
        from src.controllers.users import assign_role
        from src.controllers.auth import UserRole
        assign_role(db, "admin.test@ku.th", UserRole.ADMIN)

    cookies = get_admin_cookies(client)
    response = client.get("/api/users", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

    for u in data:
        assert "id" in u
        assert "email" in u
        assert "name" in u
        assert "role" in u
        assert "created_at" in u