"""Reglas de la base de datos y migraciones (docs/02-modelo-de-datos.md)."""

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from flask_migrate import downgrade, upgrade
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from app.extensions import db


@pytest.mark.parametrize(
    ("columns", "values", "constraint"),
    [
        ("company, position, status", "'X', 'Y', 'ghosted'", "ck_applications_status"),
        ("company, position", "'   ', 'Y'", "ck_applications_company_not_blank"),
        ("company, position", "'X', ''", "ck_applications_position_not_blank"),
    ],
)
def test_database_rejects_invalid_rows(app, clean_db, columns, values, constraint):
    """Aunque alguien inserte datos sin pasar por la API, la base los rechaza."""
    with app.app_context():
        with pytest.raises(IntegrityError, match=constraint):
            db.session.execute(text(f"INSERT INTO applications ({columns}) VALUES ({values})"))
        db.session.rollback()


def test_database_defaults(app, clean_db):
    with app.app_context():
        row = db.session.execute(
            text(
                "INSERT INTO applications (company, position) VALUES ('X', 'Y') "
                "RETURNING status, applied_on, created_at"
            )
        ).one()
        db.session.rollback()

    assert row.status == "applied"
    assert row.applied_on is not None
    assert row.created_at is not None


def test_migrations_match_models(app):
    """Si cambias un modelo y olvidas crear la migración, esta prueba falla."""
    with app.app_context(), db.engine.connect() as connection:
        differences = compare_metadata(MigrationContext.configure(connection), db.metadata)

    assert differences == []


def test_migrations_can_be_reverted(app, clean_db):
    with app.app_context():
        downgrade(revision="base")
        assert not inspect(db.engine).has_table("applications")

        upgrade()
        assert inspect(db.engine).has_table("applications")
