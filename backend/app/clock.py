"""Fecha actual según la zona horaria de la aplicación.

El servidor normalmente corre en UTC. A las 8 p. m. en Guadalajara ya es el día
siguiente en UTC, así que ``date.today()`` daría una fecha equivocada para el
usuario. Por eso "hoy" se calcula con la zona horaria configurada.
"""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from flask import current_app


def today() -> date:
    return datetime.now(ZoneInfo(current_app.config["APP_TIMEZONE"])).date()
