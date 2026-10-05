from flask import current_app
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api import api_v1
from app.extensions import db


@api_v1.get("/health")
def health():
    """Indica si la API está viva y puede hablar con la base de datos."""
    try:
        db.session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        current_app.logger.warning("La base de datos no responde", exc_info=True)
        return {"status": "degraded", "database": "unreachable"}, 503
    return {"status": "ok", "database": "ok"}
