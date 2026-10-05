"""Modelos de la base de datos (ver docs/02-modelo-de-datos.md)."""

import enum
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, Identity, Index, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db


class Status(enum.StrEnum):
    """Estados posibles de una postulación."""

    APPLIED = "applied"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"


_STATUS_SQL_LIST = ", ".join(f"'{status.value}'" for status in Status)


class Application(db.Model):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)
    company: Mapped[str] = mapped_column(String(120))
    position: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), server_default=Status.APPLIED.value)
    applied_on: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    job_url: Mapped[str | None] = mapped_column(String(500))
    source: Mapped[str | None] = mapped_column(String(60))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        # Última línea de defensa: aunque alguien inserte datos sin pasar por la
        # API, la base de datos rechaza valores inválidos.
        CheckConstraint(f"status IN ({_STATUS_SQL_LIST})", name="status"),
        CheckConstraint("length(trim(company)) > 0", name="company_not_blank"),
        CheckConstraint("length(trim(position)) > 0", name="position_not_blank"),
        Index("ix_applications_status", "status"),
        Index("ix_applications_applied_on", text("applied_on DESC")),
    )

    def __repr__(self) -> str:
        return f"<Application {self.id} {self.company!r} ({self.status})>"
