"""GET/POST /api/materials: course materials (US-1, US-2, SRS-1)."""
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from src.controllers.access import Action, require_permission, optional_actor
from src.controllers.auth import AuthenticatedUser, UserRole
from src.controllers.materials import (
    create_material,
    get_latest_material,
    get_material,
    list_materials,
    validate_material_payload,
)
from src.models.material import CourseMaterial
from src.database import get_db
from src.models.material import MaterialRead, MAX_FILE_BYTES
from src.config import settings

router = APIRouter(prefix="/api", tags=["materials"])


def _material_to_dict(m: CourseMaterial) -> dict:
    return {
        "id": m.id,
        "material_key": m.material_key,
        "version": m.version,
        "title": m.title,
        "course": m.course_code,
        "description": m.description,
        "file_name": m.file_name,
        "file_size_bytes": m.file_size_bytes,
        "fileSize": f"{m.file_size_bytes / (1024*1024):.1f} MB" if m.file_size_bytes else "0 MB",
        "fileType": m.file_name.rsplit(".", 1)[-1].lower() if "." in m.file_name else "zip",
        "is_published": m.is_published,
        "publishedDate": m.created_at.strftime("%b %d, %Y"),
        "downloadCount": 0,  # Could be tracked separately
        "author": m.uploaded_by.split("@")[0] if "@" in m.uploaded_by else m.uploaded_by,
        "authorRole": m.uploaded_by,
        "uploaded_by": m.uploaded_by,
        "created_at": m.created_at.isoformat(),
        "event_id": m.event_id,
    }


@router.get("/materials", summary="List course materials")
def read_materials(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[AuthenticatedUser | None, Depends(optional_actor)],
    course: Annotated[str | None, Query(description="Course code, e.g. ISP")] = None,
    include_unpublished: Annotated[bool, Query(description="Include unpublished (TA, Lecturer, Admin only)")] = False,
):
    if include_unpublished and user:
        require_permission(Action.VIEW_UNPUBLISHED_MATERIALS)(user)
    elif include_unpublished:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    materials = list_materials(db, course_code=course, include_unpublished=include_unpublished)
    return [_material_to_dict(m) for m in materials]


@router.post(
    "/materials",
    response_model=MaterialRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a course material (TA, Lecturer, Admin only)",
    responses={
        400: {"description": "REQUIRED_FIELDS_MISSING or FILE_TOO_LARGE or INVALID_FILE_TYPE"},
        401: {"description": "Not signed in"},
        403: {"description": "Signed in as a Student"},
        413: {"description": "FILE_TOO_LARGE"},
        422: {"description": "INVALID_FIELD_FORMAT"},
    },
)
async def post_material(
    user: Annotated[AuthenticatedUser, Depends(require_permission(Action.CREATE_MATERIAL))],
    title: Annotated[str, Form()],
    material_key: Annotated[str, Form()],
    course_code: Annotated[str, Form()] = "",
    description: Annotated[str, Form()] = "",
    is_published: Annotated[bool, Form()] = True,
    event_id: Annotated[int | None, Form()] = None,
    file: Annotated[UploadFile, File()] = None,
    db: Annotated[Session, Depends(get_db)] = None,
):
    # Validate file
    file_name = file.filename if file else ""
    file_size = file.size if file else 0
    content_type = file.content_type if file else ""

    if not file or not file_name:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": "No file uploaded", "error": "FILE_MISSING"},
        )

    if file_size > MAX_FILE_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={
                "detail": f"File too large: max {MAX_FILE_BYTES // (1024*1024)} MB",
                "error": "FILE_TOO_LARGE",
            },
        )

    # Read file content to verify size (UploadFile.size can be unreliable)
    content = await file.read()
    actual_size = len(content)
    if actual_size > MAX_FILE_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={
                "detail": f"File too large: max {MAX_FILE_BYTES // (1024*1024)} MB",
                "error": "FILE_TOO_LARGE",
            },
        )

    # Validate payload (include file metadata in payload)
    raw_payload = {
        "title": title,
        "material_key": material_key,
        "course_code": course_code,
        "description": description,
        "is_published": is_published,
        "event_id": event_id,
        "file_name": file_name,
        "file_size_bytes": actual_size,
    }

    try:
        payload = validate_material_payload(raw_payload, file_name, actual_size, content_type)
    except ValueError as error:
        error_msg = str(error)
        if "Missing required" in error_msg:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": error_msg, "error": "REQUIRED_FIELDS_MISSING"},
            )
        elif "Invalid file type" in error_msg or "Invalid MIME type" in error_msg or "too large" in error_msg.lower():
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": error_msg, "error": "INVALID_FILE_TYPE"},
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"detail": error_msg, "error": "INVALID_FIELD_FORMAT"},
            )

    # Create material (file stored in DB for now; in production use S3/GCS)
    material = create_material(db, payload, user)

    # Store file content in a simple way (in production: upload to object storage)
    # For now, we'll store it in a local uploads directory
    import os
    import tempfile
    upload_dir = getattr(settings, "uploads_dir", None) or os.path.join(tempfile.gettempdir(), "guildboard_uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{material.id}_{material.material_key}_v{material.version}.zip")
    with open(file_path, "wb") as f:
        f.write(content)

    return MaterialRead.model_validate(material)


@router.get("/materials/{material_id}", summary="Get a material by ID")
def read_material(
    material_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[AuthenticatedUser | None, Depends(optional_actor)],
):
    material = get_material(db, material_id)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Material {material_id} not found")
    if not material.is_published:
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        # Students get 404 to not reveal unpublished material existence
        if user.role not in (UserRole.TA, UserRole.LECTURER, UserRole.ADMIN):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Material {material_id} not found")
    return _material_to_dict(material)


@router.get("/materials/{material_id}/download", summary="Download a material file")
def download_material(
    material_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[AuthenticatedUser | None, Depends(optional_actor)],
):
    material = get_material(db, material_id)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Material {material_id} not found")
    if not material.is_published:
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        # Students get 404 to not reveal unpublished material existence
        if user.role not in (UserRole.TA, UserRole.LECTURER, UserRole.ADMIN):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Material {material_id} not found")

    import os
    import tempfile
    upload_dir = getattr(settings, "uploads_dir", None) or os.path.join(tempfile.gettempdir(), "guildboard_uploads")
    file_path = os.path.join(upload_dir, f"{material_id}_{material.material_key}_v{material.version}.zip")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    def iterfile():
        with open(file_path, "rb") as f:
            yield from f

    return StreamingResponse(
        iterfile(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{material.file_name}"'},
    )