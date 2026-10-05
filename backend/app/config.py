"""Configuración de la aplicación según el entorno.

La configuración se arma al momento de crear la app (no al importar este módulo),
para que lea las variables de entorno vigentes. Eso también facilita probarla.
"""

import os
from typing import Any
from zoneinfo import ZoneInfo

ENVIRONMENTS = ("development", "testing", "production")

DEFAULT_DATABASE_URL = "postgresql+psycopg://jobtracker:jobtracker@localhost:5432/jobtracker"
DEFAULT_TEST_DATABASE_URL = (
    "postgresql+psycopg://jobtracker:jobtracker@localhost:5432/jobtracker_test"
)
DEFAULT_TIMEZONE = "America/Mexico_City"


def normalize_database_url(url: str) -> str:
    """Hace que la URL use el driver psycopg 3.

    Servicios como AWS RDS dan la URL como ``postgresql://...``, y con ese prefijo
    SQLAlchemy buscaría el driver antiguo (psycopg2), que no está instalado.
    """
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url.removeprefix(prefix)
    return url


def get_config(env: str | None = None) -> dict[str, Any]:
    """Devuelve la configuración para el entorno indicado (o el de ``APP_ENV``)."""
    env = env or os.environ.get("APP_ENV", "development")
    if env not in ENVIRONMENTS:
        raise ValueError(f"APP_ENV no válido: {env!r}. Usa uno de: {', '.join(ENVIRONMENTS)}.")

    if env == "testing":
        database_url = os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)
    elif env == "production":
        database_url = os.environ.get("DATABASE_URL", "")
        if not database_url:
            raise RuntimeError("En producción la variable DATABASE_URL es obligatoria.")
    else:
        database_url = os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)

    timezone = os.environ.get("APP_TIMEZONE", DEFAULT_TIMEZONE)
    ZoneInfo(timezone)  # Falla al arrancar si la zona horaria no existe.

    return {
        "APP_ENV": env,
        "TESTING": env == "testing",
        "APP_TIMEZONE": timezone,
        "SQLALCHEMY_DATABASE_URI": normalize_database_url(database_url),
        "SQLALCHEMY_ENGINE_OPTIONS": {
            # Verifica que la conexión siga viva antes de usarla.
            "pool_pre_ping": True,
            # No esperar indefinidamente si la base de datos no responde.
            "connect_args": {"connect_timeout": 5},
        },
    }
