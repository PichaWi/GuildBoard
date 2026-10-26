"""Consultation / support sessions (US-9, SG-4, URS-5, SRS-9, SRS-10).

A TA records who they helped, the topic, when, and notes. Indexes on student,
topic and date support the SRS-10 search. Like tickets, people are stored as
text (the signed-in user's id), so students without an account can be logged.
"""
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ConsultationSession(Base):
    __tablename__ = "consultation_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(32), nullable=False, default="", index=True)
    course_code: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    topic: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    session_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    recorded_by: Mapped[str] = mapped_column(String(320), nullable=False)  # the TA
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_utcnow)


class ConsultationCreate(BaseModel):
    # SRS-9 required fields: student, topic, date/time (notes optional)
    student_name: str = Field(min_length=1, max_length=120)
    student_id: str = Field(default="", max_length=32)
    course_code: str = Field(default="", max_length=32)
    topic: str = Field(min_length=1, max_length=255)
    session_at: datetime
    notes: str = ""


class ConsultationRead(ConsultationCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recorded_by: str
    created_at: datetime
