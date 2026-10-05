"""Operaciones sobre postulaciones."""

from datetime import date
from typing import Any

from flask_sqlalchemy.pagination import Pagination
from sqlalchemy import ColumnElement, func, or_, select

from app.errors import APIError
from app.extensions import db
from app.models import Application
from app.schemas import ApplicationCreate, ApplicationListParams

# Columnas por las que se puede ordenar. La empresa se ordena sin distinguir
# mayúsculas, para que "bosch" no quede después de "Wizeline".
SORT_COLUMNS: dict[str, ColumnElement[Any]] = {
    "applied_on": Application.applied_on,
    "company": func.lower(Application.company),
    "status": Application.status,
    "created_at": Application.created_at,
}


def escape_like(text: str) -> str:
    """Escapa los comodines de LIKE para buscar el texto literal.

    Sin esto, buscar "100%" o "data_eng" daría resultados inesperados, porque
    en SQL `%` significa "cualquier texto" y `_` "cualquier carácter".
    """
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def list_applications(params: ApplicationListParams) -> Pagination:
    query = select(Application)

    if params.status:
        query = query.where(Application.status == params.status)
    if params.q:
        pattern = f"%{escape_like(params.q)}%"
        query = query.where(
            or_(
                Application.company.ilike(pattern, escape="\\"),
                Application.position.ilike(pattern, escape="\\"),
            )
        )
    if params.applied_from:
        query = query.where(Application.applied_on >= params.applied_from)
    if params.applied_to:
        query = query.where(Application.applied_on <= params.applied_to)

    descending = params.sort.startswith("-")
    column = SORT_COLUMNS[params.sort.removeprefix("-")]
    # El id desempata cuando varias filas tienen el mismo valor, para que el
    # orden sea estable y la paginación no repita ni salte postulaciones.
    if descending:
        query = query.order_by(column.desc(), Application.id.desc())
    else:
        query = query.order_by(column.asc(), Application.id.asc())

    return db.paginate(query, page=params.page, per_page=params.per_page, error_out=False)


def get_application(application_id: int) -> Application:
    application = db.session.get(Application, application_id)
    if application is None:
        raise APIError(404, "not_found", f"No existe la postulación con id {application_id}.")
    return application


def create_application(data: ApplicationCreate, today: date) -> Application:
    values = data.model_dump()
    values["applied_on"] = values["applied_on"] or today
    application = Application(**values)
    db.session.add(application)
    db.session.commit()
    return application


def update_application(application: Application, changes: dict[str, Any]) -> Application:
    for field, value in changes.items():
        setattr(application, field, value)
    db.session.commit()
    return application


def delete_application(application: Application) -> None:
    db.session.delete(application)
    db.session.commit()
