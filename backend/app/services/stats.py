"""Estadísticas de las postulaciones (definiciones en docs/03-api.md)."""

from sqlalchemy import func, literal_column, select

from app.extensions import db
from app.models import Application, Status
from app.schemas import MonthCount, StatsOut


def _rate(part: int, total: int) -> float:
    return round(part / total, 4) if total else 0.0


def compute_stats() -> StatsOut:
    # Conteo por estado, empezando en 0 para que siempre aparezcan los cuatro.
    by_status = {status.value: 0 for status in Status}
    rows = db.session.execute(
        select(Application.status, func.count()).group_by(Application.status)
    ).all()
    for status, count in rows:
        by_status[status] = count

    total = sum(by_status.values())
    responded = total - by_status[Status.APPLIED]
    interviewed = by_status[Status.INTERVIEW] + by_status[Status.OFFER]

    # Conteo por mes. El formato se escribe como literal (y no como parámetro)
    # para que PostgreSQL reconozca la misma expresión en SELECT y GROUP BY.
    month = func.to_char(Application.applied_on, literal_column("'YYYY-MM'"))
    months = db.session.execute(select(month, func.count()).group_by(month).order_by(month)).all()

    return StatsOut(
        total=total,
        by_status=by_status,
        response_rate=_rate(responded, total),
        interview_rate=_rate(interviewed, total),
        by_month=[MonthCount(month=m, count=c) for m, c in months],
    )
