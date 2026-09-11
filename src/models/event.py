from datetime import date, datetime, time, timezone

from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import Boolean, Date, DateTime, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    course_code: Mapped[str] = mapped_column(String(32), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    instructor: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    publish_immediately: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notify_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by_role: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    course_code: str = Field(min_length=1, max_length=32)
    event_type: str = Field(min_length=1, max_length=64)
    event_date: date
    start_time: time
    end_time: time
    location: str = Field(default="", max_length=255)
    instructor: str = Field(default="", max_length=120)
    description: str = ""
    publish_immediately: bool = True
    notify_email: bool = False

    @model_validator(mode="after")
    def end_must_follow_start(self) -> "EventCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be later than start_time")
        return self


class EventRead(EventCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_role: str
    created_at: datetime
