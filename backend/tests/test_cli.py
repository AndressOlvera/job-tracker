"""Comando `flask seed`."""

from sqlalchemy import func, select

from app.extensions import db
from app.models import Application, Status


def count_applications(app) -> int:
    with app.app_context():
        return db.session.scalar(select(func.count()).select_from(Application))


def test_seed_creates_valid_applications(app, clean_db, fixed_today):
    result = app.test_cli_runner().invoke(args=["seed", "--count", "12"])

    assert result.exit_code == 0
    assert "Se crearon 12 postulaciones" in result.output
    assert count_applications(app) == 12
    with app.app_context():
        for application in db.session.scalars(select(Application)):
            assert application.status in set(Status)
            assert application.applied_on <= fixed_today


def test_seed_adds_or_replaces(app, clean_db):
    runner = app.test_cli_runner()

    runner.invoke(args=["seed", "--count", "5"])
    runner.invoke(args=["seed", "--count", "5"])
    assert count_applications(app) == 10

    runner.invoke(args=["seed", "--count", "3", "--reset"])
    assert count_applications(app) == 3


def test_seed_rejects_invalid_count(app, clean_db):
    result = app.test_cli_runner().invoke(args=["seed", "--count", "0"])

    assert result.exit_code != 0
    assert count_applications(app) == 0
