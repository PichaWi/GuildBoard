"""Tests for Course Materials API (upload/download)."""
import io
import os
import zipfile

import pytest
from fastapi.testclient import TestClient

from src.config import settings


def get_lecturer_cookies(client: TestClient):
    """Get session cookies for a lecturer user."""
    response = client.post(
        "/api/auth/dev-login",
        json={"email": settings.demo_lecturer_email, "password": settings.demo_lecturer_password},
    )
    assert response.status_code == 200
    return response.cookies


def get_student_cookies(client: TestClient):
    """Get session cookies for a student user."""
    response = client.post(
        "/api/auth/dev-login",
        json={"email": settings.demo_student_email, "password": settings.demo_student_password},
    )
    assert response.status_code == 200
    return response.cookies


def create_test_zip(content: str = "test content") -> bytes:
    """Create a simple zip file in memory."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("test.txt", content)
    buffer.seek(0)
    return buffer.read()


def test_materials_list_empty_initially(client):
    """GET /api/materials returns empty list initially."""
    response = client.get("/api/materials")
    assert response.status_code == 200
    assert response.json() == []


def test_lecturer_can_upload_material(client):
    """Lecturer can upload a material via POST /api/materials."""
    cookies = get_lecturer_cookies(client)
    zip_content = create_test_zip("lecturer upload test")

    response = client.post(
        "/api/materials",
        data={
            "title": "Lecturer Upload",
            "material_key": "lecturer-upload",
            "course_code": "ISP",
            "description": "Test upload by lecturer",
            "is_published": "true",
        },
        files={"file": ("test.zip", zip_content, "application/zip")},
        cookies=cookies,
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["title"] == "Lecturer Upload"
    assert data["material_key"] == "lecturer-upload"
    assert data["course_code"] == "ISP"
    assert data["file_name"] == "test.zip"
    assert data["is_published"] is True
    assert data["version"] == 1
    assert data["id"] == 1


def test_student_cannot_upload_material(client):
    """Student cannot upload a material (403 Forbidden)."""
    cookies = get_student_cookies(client)
    zip_content = create_test_zip("student upload attempt")

    response = client.post(
        "/api/materials",
        data={
            "title": "Student Upload",
            "material_key": "student-upload",
            "course_code": "ISP",
            "description": "Should fail",
            "is_published": "true",
        },
        files={"file": ("test.zip", zip_content, "application/zip")},
        cookies=cookies,
    )
    assert response.status_code == 403
    assert "not permitted" in response.json()["detail"].lower()


def test_unauthenticated_cannot_upload_material(client):
    """Unauthenticated user cannot upload (401 Unauthorized)."""
    zip_content = create_test_zip("no auth upload")

    response = client.post(
        "/api/materials",
        data={
            "title": "No Auth Upload",
            "material_key": "no-auth-upload",
            "course_code": "ISP",
            "description": "Should fail",
            "is_published": "true",
        },
        files={"file": ("test.zip", zip_content, "application/zip")},
    )
    assert response.status_code == 401


def test_material_versioning(client):
    """Uploading same material_key increments version."""
    cookies = get_lecturer_cookies(client)
    zip_content = create_test_zip("version 1")

    # First upload
    r1 = client.post(
        "/api/materials",
        data={"title": "V1", "material_key": "version-test", "course_code": "KE", "is_published": "true"},
        files={"file": ("v1.zip", zip_content, "application/zip")},
        cookies=cookies,
    )
    assert r1.status_code == 201
    assert r1.json()["version"] == 1

    # Second upload with same material_key
    zip_content_v2 = create_test_zip("version 2")
    r2 = client.post(
        "/api/materials",
        data={"title": "V2", "material_key": "version-test", "course_code": "KE", "is_published": "true"},
        files={"file": ("v2.zip", zip_content_v2, "application/zip")},
        cookies=cookies,
    )
    assert r2.status_code == 201
    assert r2.json()["version"] == 2


def test_list_materials_returns_uploaded(client):
    """GET /api/materials returns uploaded materials."""
    cookies = get_lecturer_cookies(client)
    zip_content = create_test_zip("list test")

    # Upload one
    client.post(
        "/api/materials",
        data={"title": "List Test", "material_key": "list-test", "course_code": "SCS", "is_published": "true"},
        files={"file": ("list.zip", zip_content, "application/zip")},
        cookies=cookies,
    )

    # List
    response = client.get("/api/materials")
    assert response.status_code == 200
    materials = response.json()
    assert len(materials) >= 1
    found = [m for m in materials if m["material_key"] == "list-test"]
    assert len(found) == 1
    assert found[0]["title"] == "List Test"


def test_download_material(client):
    """GET /api/materials/{id}/download returns the file."""
    cookies = get_lecturer_cookies(client)
    original_content = "download test content"
    zip_content = create_test_zip(original_content)

    # Upload
    upload_response = client.post(
        "/api/materials",
        data={"title": "Download Test", "material_key": "download-test", "course_code": "FM", "is_published": "true"},
        files={"file": ("download.zip", zip_content, "application/zip")},
        cookies=cookies,
    )
    assert upload_response.status_code == 201
    material_id = upload_response.json()["id"]

    # Download
    download_response = client.get(f"/api/materials/{material_id}/download")
    assert download_response.status_code == 200
    assert download_response.headers["content-type"] == "application/zip"
    assert "download.zip" in download_response.headers["content-disposition"]

    # Verify zip content
    downloaded_zip = io.BytesIO(download_response.content)
    with zipfile.ZipFile(downloaded_zip, "r") as zf:
        assert "test.txt" in zf.namelist()
        assert zf.read("test.txt").decode() == original_content


def test_student_can_download_published_material(client):
    """Student can download published materials."""
    lecturer_cookies = get_lecturer_cookies(client)
    zip_content = create_test_zip("student download test")

    # Lecturer uploads
    upload_response = client.post(
        "/api/materials",
        data={"title": "Student Download", "material_key": "student-download", "course_code": "ISP", "is_published": "true"},
        files={"file": ("student.zip", zip_content, "application/zip")},
        cookies=lecturer_cookies,
    )
    material_id = upload_response.json()["id"]

    # Student downloads
    student_cookies = get_student_cookies(client)
    download_response = client.get(f"/api/materials/{material_id}/download", cookies=student_cookies)
    assert download_response.status_code == 200


def test_student_cannot_download_unpublished_material(client):
    """Student cannot download unpublished materials (404)."""
    lecturer_cookies = get_lecturer_cookies(client)
    zip_content = create_test_zip("unpublished test")

    # Lecturer uploads as unpublished
    upload_response = client.post(
        "/api/materials",
        data={"title": "Unpublished", "material_key": "unpublished-test", "course_code": "ISP", "is_published": "false"},
        files={"file": ("unpub.zip", zip_content, "application/zip")},
        cookies=lecturer_cookies,
    )
    material_id = upload_response.json()["id"]

    # Student tries to download
    student_cookies = get_student_cookies(client)
    download_response = client.get(f"/api/materials/{material_id}/download", cookies=student_cookies)
    assert download_response.status_code == 404


def test_lecturer_can_download_unpublished_material(client):
    """Lecturer can download unpublished materials."""
    lecturer_cookies = get_lecturer_cookies(client)
    zip_content = create_test_zip("unpublished lecturer test")

    # Lecturer uploads as unpublished
    upload_response = client.post(
        "/api/materials",
        data={"title": "Unpublished Lecturer", "material_key": "unpub-lecturer", "course_code": "ISP", "is_published": "false"},
        files={"file": ("unpub.zip", zip_content, "application/zip")},
        cookies=lecturer_cookies,
    )
    material_id = upload_response.json()["id"]

    # Lecturer downloads
    download_response = client.get(f"/api/materials/{material_id}/download", cookies=lecturer_cookies)
    assert download_response.status_code == 200


def test_file_size_limit_enforced(client):
    """Files larger than MAX_FILE_BYTES are rejected (413)."""
    cookies = get_lecturer_cookies(client)

    # Create a zip with incompressible random data larger than 25MB
    large_content = os.urandom(26 * 1024 * 1024)  # 26 MB of random data
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as zf:  # STORED = no compression
        zf.writestr("large.bin", large_content)
    buffer.seek(0)
    zip_content = buffer.read()

    response = client.post(
        "/api/materials",
        data={"title": "Large File", "material_key": "large-file", "course_code": "ISP", "is_published": "true"},
        files={"file": ("large.zip", zip_content, "application/zip")},
        cookies=cookies,
    )
    assert response.status_code == 413
    assert "too large" in response.json()["detail"].lower()


def test_invalid_file_extension_rejected(client):
    """Non-zip files are rejected (400)."""
    cookies = get_lecturer_cookies(client)

    # Try to upload a .pdf file
    pdf_content = b"%PDF-1.4 fake pdf content"

    response = client.post(
        "/api/materials",
        data={"title": "PDF Upload", "material_key": "pdf-upload", "course_code": "ISP", "is_published": "true"},
        files={"file": ("test.pdf", pdf_content, "application/pdf")},
        cookies=cookies,
    )
    assert response.status_code == 400
    assert "invalid file type" in response.json()["detail"].lower()


def test_missing_file_rejected(client):
    """Upload without file is rejected (400)."""
    cookies = get_lecturer_cookies(client)

    response = client.post(
        "/api/materials",
        data={"title": "No File", "material_key": "no-file", "course_code": "ISP", "is_published": "true"},
        cookies=cookies,
    )
    assert response.status_code == 400
    assert "file" in response.json()["detail"].lower()


def test_course_filter_on_list(client):
    """GET /api/materials?course=ISP filters by course."""
    cookies = get_lecturer_cookies(client)
    zip_content = create_test_zip("filter test")

    # Upload to ISP
    client.post(
        "/api/materials",
        data={"title": "ISP Material", "material_key": "isp-filter", "course_code": "ISP", "is_published": "true"},
        files={"file": ("isp.zip", zip_content, "application/zip")},
        cookies=cookies,
    )

    # Upload to KE
    client.post(
        "/api/materials",
        data={"title": "KE Material", "material_key": "ke-filter", "course_code": "KE", "is_published": "true"},
        files={"file": ("ke.zip", zip_content, "application/zip")},
        cookies=cookies,
    )

    # Filter by ISP
    response = client.get("/api/materials?course=ISP")
    assert response.status_code == 200
    materials = response.json()
    isp_materials = [m for m in materials if m["course"] == "ISP"]
    assert len(isp_materials) >= 1
    assert all(m["course"] == "ISP" for m in isp_materials)

    # Filter by KE
    response = client.get("/api/materials?course=KE")
    assert response.status_code == 200
    materials = response.json()
    ke_materials = [m for m in materials if m["course"] == "KE"]
    assert len(ke_materials) >= 1
    assert all(m["course"] == "KE" for m in ke_materials)