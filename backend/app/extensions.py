"""Extensiones de Flask compartidas por toda la aplicación.

Se crean aquí "vacías" y se conectan a la app en ``create_app``. Así cualquier
módulo puede importar ``db`` sin provocar imports circulares.
"""

from pathlib import Path

from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# Reglas para nombrar índices y restricciones. Con nombres predecibles, las
# migraciones pueden modificarlos o borrarlos más adelante sin adivinar.
NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


db = SQLAlchemy(model_class=Base)
migrate = Migrate()

# Ruta absoluta a la carpeta de migraciones, para que funcione sin importar
# desde qué carpeta se ejecuten `flask` o `pytest`.
MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"
