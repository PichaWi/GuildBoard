"""Tests for Search API (US-7)."""
import pytest
from datetime import date, time, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import select

from src.config import settings
from src.models.event import Event
from src.models.material import CourseMaterial
from src.models.ticket import Ticket
from src.models.user import User
from src.database import SessionLocal


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


def seed_search_data(db):
    """Add test data for search."""
    from datetime import datetime, date, time, timedelta, timezone

    now = datetime.now(timezone.utc)
    today = date.today()

    # Add events
    events = [
        Event(
            title="Architecture Review", course_code="ISP", event_type="Milestone",
            event_date=today + timedelta(days=7), start_time=time(9), end_time=time(12),
            location="Room 203", instructor="Aj. Milk", publish_immediately=True, created_by_role="Lecturer",
        ),
        Event(
            title="Lab Preparation", course_code="ISP", event_type="Lab",
            event_date=today + timedelta(days=2), start_time=time(9), end_time=time(12),
            location="Room 203", instructor="Aj. Milk", publish_immediately=False, created_by_role="Lecturer",
        ),
    ]
    for e in events:
        db.add(e)
    db.flush()

    # Add materials
    materials = [
        CourseMaterial(
            material_key="architecture-guide", version=1, title="Architecture Guidelines",
            course_code="ISP", file_name="arch.pdf", file_size_bytes=1000000, is_published=True,
            event_id=events[0].id, uploaded_by="lecturer.demo@ku.th",
        ),
        CourseMaterial(
            material_key="draft-notes", version=1, title="Draft Lecture Notes",
            course_code="KE", file_name="notes.pdf", file_size_bytes=500000, is_published=False,
            uploaded_by="ta.demo@ku.th",
        ),
    ]
    for m in materials:
        db.add(m)
    db.flush()

    # Add tickets
    tickets = [
        Ticket(
            title="ISP Code Review", owner="Picha W", owner_role="TA", priority="High", status="Open",
            due_at=now + timedelta(hours=20), created_by="lecturer.demo@ku.th",
        ),
        Ticket(
            title="KE Schema Check", owner="Prima X", owner_role="TA", priority="Medium", status="In-Progress",
            due_at=now + timedelta(hours=50), created_by="lecturer.demo@ku.th",
        ),
    ]
    for t in tickets:
        db.add(t)
    db.commit()

    return events, materials, tickets


def test_empty_query_returns_400(client):
    """Empty q returns 400 with EMPTY_QUERY error."""
    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=", cookies=cookies)
    assert response.status_code == 400
    assert response.json()["error"] == "EMPTY_QUERY"


def test_whitespace_query_returns_400(client):
    """Whitespace-only q returns 400."""
    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=   ", cookies=cookies)
    assert response.status_code == 400


def test_student_gets_403(client):
    """Students are forbidden from searching."""
    cookies = get_student_cookies(client)
    response = client.get("/api/search?q=test", cookies=cookies)
    assert response.status_code == 403


def test_unauthenticated_gets_401(client):
    """Unauthenticated requests get 401."""
    response = client.get("/api/search?q=test")
    assert response.status_code == 401


def test_lecturer_can_search(client, session_factory):
    """Lecturer can search across all types."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Architecture", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1
    result_types = [r["type"] for r in data["results"]]
    assert "event" in result_types
    assert "material" in result_types


def test_admin_can_search(client, session_factory):
    """Admin can search (using lecturer credentials since admin has same perms)."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Architecture", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1


def test_case_insensitive_search(client, session_factory):
    """Search is case-insensitive."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=architecture", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1


def test_no_matches_returns_empty(client, session_factory):
    """No matches returns count 0 and empty list."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=nonexistentxyz", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 0
    assert data["results"] == []


def test_type_filter_ticket(client, session_factory):
    """Filter by type=ticket."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Review&type=ticket", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert all(r["type"] == "ticket" for r in data["results"])
    assert any("Code Review" in r["title"] for r in data["results"])


def test_type_filter_event(client, session_factory):
    """Filter by type=event."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Architecture&type=event", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert all(r["type"] == "event" for r in data["results"])
    assert any("Architecture" in r["title"] for r in data["results"])


def test_type_filter_material(client, session_factory):
    """Filter by type=material."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Guidelines&type=material", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert all(r["type"] == "material" for r in data["results"])
    assert any("Guidelines" in r["title"] for r in data["results"])


def test_draft_events_visible_to_staff(client, session_factory):
    """Draft events are visible to staff (Lecturer/TA/Admin)."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Lab", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    # Staff should see draft event "Lab Preparation"
    event_results = [r for r in data["results"] if r["type"] == "event"]
    assert any("Lab" in r["title"] for r in event_results)


def test_unpublished_materials_visible_to_staff(client, session_factory):
    """Unpublished materials visible to staff."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Draft", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    material_results = [r for r in data["results"] if r["type"] == "material"]
    assert any("Draft" in r["title"] for r in material_results)


def test_special_characters_in_query(client, session_factory):
    """Special characters % and _ are escaped."""
    with session_factory() as db:
        # Add event with % in title
        db.add(Event(
            title="50% Complete Milestone", course_code="ISP", event_type="Milestone",
            event_date=date.today(), start_time=time(9), end_time=time(12),
            location="Room 203", instructor="Aj. Milk", publish_immediately=True, created_by_role="Lecturer",
        ))
        db.commit()

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=50%", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1
    assert any("50%" in r["title"] for r in data["results"])


def test_underscore_in_query(client, session_factory):
    """Underscore in query is escaped."""
    with session_factory() as db:
        db.add(Event(
            title="Milestone_One", course_code="ISP", event_type="Milestone",
            event_date=date.today(), start_time=time(9), end_time=time(12),
            location="Room 203", instructor="Aj. Milk", publish_immediately=True, created_by_role="Lecturer",
        ))
        db.commit()

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Milestone_One", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1
    assert any("Milestone_One" in r["title"] for r in data["results"])


def test_status_filter(client, session_factory):
    """Filter by status."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Review&status=Open", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert all(r["status"] == "Open" for r in data["results"])


def test_owner_filter(client, session_factory):
    """Filter by owner."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Review&owner=Picha", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert all("Picha" in r["owner"] for r in data["results"])


def test_date_from_filter(client, session_factory):
    """Filter by date_from."""
    from datetime import date, timedelta
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    future_date = (date.today() + timedelta(days=10)).strftime("%Y-%m-%d")
    response = client.get(f"/api/search?q=Architecture&date_from={future_date}", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    # Should include events with date >= future_date


def test_date_to_filter(client, session_factory):
    """Filter by date_to."""
    from datetime import date, timedelta
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    near_date = (date.today() + timedelta(days=3)).strftime("%Y-%m-%d")
    response = client.get(f"/api/search?q=Lab&date_to={near_date}", cookies=cookies)
    assert response.status_code == 200
    data = response.json()


def test_response_shape_matches_frontend(client, session_factory):
    """Response shape matches what frontend expects: {count, results: [{id, type, title, owner, status, date, url}]}."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Architecture", cookies=cookies)
    assert response.status_code == 200
    data = response.json()

    assert "count" in data
    assert "results" in data
    assert isinstance(data["results"], list)

    for r in data["results"]:
        assert "id" in r
        assert "type" in r
        assert r["type"] in ("ticket", "event", "material")
        assert "title" in r
        assert "owner" in r
        assert "status" in r
        assert "date" in r
        assert "url" in r


def test_pagination_limit(client, session_factory):
    """Limit parameter restricts number of results."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Architecture&limit=1", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1
    assert len(data["results"]) <= 1


def test_pagination_offset(client, session_factory):
    """Offset parameter skips results."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    # Get first page
    response1 = client.get("/api/search?q=Architecture&limit=1&offset=0", cookies=cookies)
    assert response1.status_code == 200
    data1 = response1.json()

    # Get second page
    response2 = client.get("/api/search?q=Architecture&limit=1&offset=1", cookies=cookies)
    assert response2.status_code == 200
    data2 = response2.json()

    # Results should be different (if there are at least 2 results)
    # Note: IDs can collide across types (event id=1, material id=1), so compare full result
    if data1["count"] >= 2:
        r1 = data1["results"][0]
        r2 = data2["results"][0]
        assert (r1["id"], r1["type"]) != (r2["id"], r2["type"])


def test_pagination_limit_max_100(client, session_factory):
    """Limit is capped at 100 (returns 422 for values > 100)."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Architecture&limit=200", cookies=cookies)
    # FastAPI validation rejects limit > 100 with 422
    assert response.status_code == 422


def test_pagination_default_limit(client, session_factory):
    """Default limit is 50 when not specified."""
    with session_factory() as db:
        seed_search_data(db)

    cookies = get_lecturer_cookies(client)
    response = client.get("/api/search?q=Architecture", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    # Default limit should be 50
    assert len(data["results"]) <= 50