"""PATCH y DELETE /api/v1/applications/{id} (HU-04, HU-05)."""

import pytest

from app.extensions import db
from app.models import Application

URL = "/api/v1/applications"


def test_updates_only_the_fields_sent(client, make_application):
    application_id = make_application(company="Oracle", position="Becario", notes="Nota")

    response = client.patch(f"{URL}/{application_id}", json={"status": "interview"})

    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "interview"
    assert body["company"] == "Oracle"
    assert body["notes"] == "Nota"


def test_optional_fields_can_be_cleared(client, make_application):
    application_id = make_application(source="OCC", notes="Nota", job_url="https://example.com")

    response = client.patch(
        f"{URL}/{application_id}", json={"notes": None, "source": "", "job_url": None}
    )

    body = response.get_json()
    assert body["notes"] is None
    assert body["source"] is None
    assert body["job_url"] is None


@pytest.mark.parametrize("field", ["company", "position", "status", "applied_on"])
def test_required_fields_cannot_be_null(client, make_application, field):
    application_id = make_application()

    response = client.patch(f"{URL}/{application_id}", json={field: None})

    assert response.status_code == 422
    assert response.get_json()["error"]["details"] == {field: ["Este campo no puede ser nulo."]}


def test_applies_same_rules_as_create(client, make_application):
    application_id = make_application()

    response = client.patch(
        f"{URL}/{application_id}",
        json={"company": "   ", "applied_on": "2030-01-01", "status": "ghosted"},
    )

    assert response.status_code == 422
    assert set(response.get_json()["error"]["details"]) == {"company", "applied_on", "status"}


def test_rejects_empty_body(client, make_application):
    application_id = make_application()

    response = client.patch(f"{URL}/{application_id}", json={})

    assert response.status_code == 422
    assert response.get_json()["error"]["details"] == {
        "body": ["Envía al menos un campo para actualizar."]
    }


def test_update_not_found(client):
    response = client.patch(f"{URL}/999", json={"status": "offer"})

    assert response.status_code == 404


def test_update_refreshes_updated_at(app, client, make_application):
    application_id = make_application()

    client.patch(f"{URL}/{application_id}", json={"status": "offer"})

    with app.app_context():
        application = db.session.get(Application, application_id)
        assert application.updated_at > application.created_at


def test_delete(client, make_application):
    application_id = make_application()

    response = client.delete(f"{URL}/{application_id}")

    assert response.status_code == 204
    assert response.data == b""
    assert client.get(f"{URL}/{application_id}").status_code == 404


def test_delete_not_found(client):
    response = client.delete(f"{URL}/999")

    assert response.status_code == 404
