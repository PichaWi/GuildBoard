"""Reminders sent about a ticket (US-4 follow-up).

Every Reminder, Flag TA or Batch Ping click is saved here, so the at-risk
monitor can show who followed up and when.
"""
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base

REMINDER_KINDS = ("reminder", "flag")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TicketReminder(Base):
    __tablename__ = "ticket_reminders"
    __table_args__ = (
        CheckConstraint("kind IN ('reminder', 'flag')", name="ck_ticket_reminders_kind"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    sent_by: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )