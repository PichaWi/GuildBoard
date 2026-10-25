from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import CheckConstraint, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base

PRIORITY_VALUES = ("Low", "Medium", "High")
STATUS_VALUES = ("Open", "In-Progress", "Closed")

Priority = Literal["Low", "Medium", "High"]
Status = Literal["Open", "In-Progress", "Closed"]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    """A due time without an offset is taken as UTC; one with an offset is converted."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        CheckConstraint("priority IN ('Low', 'Medium', 'High')", name="ck_tickets_priority"),
        CheckConstraint("status IN ('Open', 'In-Progress', 'Closed')", name="ck_tickets_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    owner: Mapped[str] = mapped_column(String(120), nullable=False)
    owner_role: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    priority: Mapped[str] = mapped_column(String(16), nullable=False, default="Medium")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="Open", index=True)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_by: Mapped[str] = mapped_column(String(320), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow
    )


class TicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = ""
    owner: str = Field(min_length=1, max_length=120)
    owner_role: str = Field(default="", max_length=64)
    priority: Priority = "Medium"
    status: Status = "Open"
    due_at: datetime

    @field_validator("due_at")
    @classmethod
    def due_at_in_utc(cls, value: datetime) -> datetime:
        return as_utc(value)


class TicketUpdate(BaseModel):
    """PATCH body: only the fields that are sent are changed."""

    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    owner: str | None = Field(default=None, min_length=1, max_length=120)
    owner_role: str | None = Field(default=None, max_length=64)
    priority: Priority | None = None
    status: Status | None = None
    due_at: datetime | None = None

    @field_validator("due_at")
    @classmethod
    def due_at_in_utc(cls, value: datetime | None) -> datetime | None:
        return as_utc(value) if value is not None else None


class TicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    owner: str
    owner_role: str
    priority: Priority
    status: Status
    due_at: datetime
    created_by: str
    created_at: datetime
    updated_at: datetime

    @field_validator("due_at", "created_at", "updated_at")
    @classmethod
    def in_utc(cls, value: datetime) -> datetime:
        # SQLite hands back naive datetimes; they were stored in UTC.
        return as_utc(value)
