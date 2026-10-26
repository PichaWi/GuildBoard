"""Course materials (US-1, US-2, SRS-1).

Each new upload of a material is a new row with a higher version, so history is
kept and students are shown only the latest published version.
"""
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base

MAX_FILE_BYTES = 25 * 1024 * 1024  # PB-12: 25 MB


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class CourseMaterial(Base):
    __tablename__ = "course_materials"
    __table_args__ = (
        UniqueConstraint("material_key", "version", name="uq_course_materials_key_version"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # Same material_key = same material; version goes 1, 2, 3...
    material_key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    title: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    course_code: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    file_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    event_id: Mapped[int | None] = mapped_column(
        ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True
    )
    uploaded_by: Mapped[str] = mapped_column(String(320), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)


class MaterialCreate(BaseModel):
    material_key: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=120)
    course_code: str = Field(default="", max_length=32)
    description: str = ""
    file_name: str = Field(default="", max_length=255)
    file_size_bytes: int = Field(default=0, ge=0, le=MAX_FILE_BYTES)
    is_published: bool = False
    event_id: int | None = None


class MaterialRead(MaterialCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: int
    uploaded_by: str
    created_at: datetime
