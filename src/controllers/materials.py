"""Course materials controllers (US-1, US-2, SRS-1)."""
from typing import Any

from fastapi import status
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.controllers.access import Action, ensure_permission
from src.controllers.auth import AuthenticatedUser
from src.models.material import CourseMaterial, MaterialCreate, MAX_FILE_BYTES


ERROR_REQUIRED_FIELDS_MISSING = "REQUIRED_FIELDS_MISSING"
ERROR_INVALID_FIELD_FORMAT = "INVALID_FIELD_FORMAT"
ERROR_FILE_TOO_LARGE = "FILE_TOO_LARGE"
ERROR_INVALID_FILE_TYPE = "INVALID_FILE_TYPE"

ALLOWED_MIME_TYPES = {"application/zip", "application/x-zip-compressed"}
ALLOWED_EXTENSIONS = {".zip"}


def _is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _validate_file(file_name: str, file_size: int, content_type: str) -> None:
    # Check extension
    ext = file_name.lower().rsplit(".", 1)[-1] if "." in file_name else ""
    if f".{ext}" not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Invalid file type: only .zip files are allowed")

    # Check MIME type (lenient: allow empty or octet-stream as some clients don't set it correctly)
    if content_type and content_type not in ALLOWED_MIME_TYPES and content_type != "application/octet-stream":
        raise ValueError(f"Invalid MIME type: {content_type}")

    # Check size
    if file_size > MAX_FILE_BYTES:
        raise ValueError(f"File too large: max {MAX_FILE_BYTES // (1024*1024)} MB")


def validate_material_payload(raw: Any, file_name: str = "", file_size: int = 0, content_type: str = "") -> MaterialCreate:
    data = raw if isinstance(raw, dict) else {}
    cleaned = {key: value.strip() if isinstance(value, str) else value for key, value in data.items()}

    required = ["material_key", "title"]
    missing = [name for name in required if _is_blank(cleaned.get(name))]
    if missing:
        raise ValueError(f"Missing required field(s): {', '.join(missing)}")

    # Validate file metadata if provided
    if file_name and file_size:
        try:
            _validate_file(file_name, file_size, content_type)
        except ValueError as e:
            # Re-raise with specific error type for 400
            raise ValueError(str(e)) from None

    try:
        return MaterialCreate.model_validate(cleaned)
    except ValidationError as exc:
        problems = "; ".join(str(e["msg"]) for e in exc.errors())
        raise ValueError(f"Invalid material field(s): {problems}") from None


def create_material(
    db: Session,
    payload: MaterialCreate,
    user: AuthenticatedUser,
) -> CourseMaterial:
    ensure_permission(user, Action.CREATE_MATERIAL)

    # Determine next version for this material_key
    latest_version = db.scalar(
        select(func.max(CourseMaterial.version)).where(CourseMaterial.material_key == payload.material_key)
    ) or 0

    material = CourseMaterial(
        **payload.model_dump(),
        version=latest_version + 1,
        uploaded_by=user.id,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


def list_materials(
    db: Session,
    *,
    course_code: str | None = None,
    include_unpublished: bool = False,
) -> list[CourseMaterial]:
    query = select(CourseMaterial)
    if not include_unpublished:
        query = query.where(CourseMaterial.is_published.is_(True))
    if course_code:
        query = query.where(func.upper(CourseMaterial.course_code) == course_code.strip().upper())
    query = query.order_by(CourseMaterial.created_at.desc())
    return list(db.scalars(query))


def get_material(db: Session, material_id: int) -> CourseMaterial | None:
    return db.get(CourseMaterial, material_id)


def get_latest_material(db: Session, material_key: str) -> CourseMaterial | None:
    return db.scalar(
        select(CourseMaterial)
        .where(CourseMaterial.material_key == material_key, CourseMaterial.is_published.is_(True))
        .order_by(CourseMaterial.version.desc())
    )