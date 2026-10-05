"""POST /api/v1/applications (HU-01)."""

import pytest

URL = "/api/v1/applications"


def errors_of(response) -> dict[str, list[str]]:
    return response.get_json()["error"]["details"]


def test_creates_with_minimum_fields_and_defaults(client, fixed_today):
    response = client.post(URL, json={"company": "Oracle", "position": "Becario de Software"})

    assert response.status_code == 201
    body = response.get_json()
    assert body["id"] == 1
    assert body["status"] == "applied"
    assert body["applied_on"] == fixed_today.isoformat()
    assert body["job_url"] is None
    assert body["source"] is None
    assert body["notes"] is None
    assert body["created_at"].endswith("Z")
    assert response.headers["Location"] == "/api/v1/applications/1"


def test_creates_with_all_fields(client):
    payload = {
        "company": "Bosch",
        "position": "Practicante QA",
        "status": "interview",
        "applied_on": "2026-09-28",
        "job_url": "https://www.occ.com.mx/empleo/oferta/12345",
        "source": "OCC",
        "notes": "Entrevista técnica el viernes",
    }

    response = client.post(URL, json=payload)

    assert response.status_code == 201
    body = response.get_json()
    for field, value in payload.items():
        assert body[field] == value


def test_trims_whitespace_and_turns_blank_optionals_into_null(client):
    response = client.post(
        URL,
        json={"company": "  Intel  ", "position": " Becario ", "source": "   ", "notes": ""},
    )

    body = response.get_json()
    assert body["company"] == "Intel"
    assert body["position"] == "Becario"
    assert body["source"] is None
    assert body["notes"] is None


def test_created_application_can_be_fetched(client):
    location = client.post(URL, json={"company": "HP", "position": "Becario"}).headers["Location"]

    response = client.get(location)

    assert response.status_code == 200
    assert response.get_json()["company"] == "HP"


def test_requires_company_and_position(client):
    response = client.post(URL, json={})

    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "validation_error"
    assert errors_of(response) == {
        "company": ["Este campo es obligatorio."],
        "position": ["Este campo es obligatorio."],
    }


@pytest.mark.parametrize(
    ("payload", "field", "message"),
    [
        ({"company": "   "}, "company", "No puede estar vacío."),
        ({"company": None}, "company", "Este campo es obligatorio."),
        ({"company": 123}, "company", "Debe ser texto."),
        ({"company": "x" * 121}, "company", "Debe tener como máximo 120 caracteres."),
        ({"position": "x" * 121}, "position", "Debe tener como máximo 120 caracteres."),
        (
            {"status": "ghosted"},
            "status",
            "Valor no válido. Opciones: applied, interview, offer, rejected.",
        ),
        ({"applied_on": "2026-10-06"}, "applied_on", "La fecha no puede ser futura."),
        ({"applied_on": "05/10/2026"}, "applied_on", "Debe ser una fecha con formato AAAA-MM-DD."),
        ({"applied_on": 20261005}, "applied_on", "Debe ser una fecha con formato AAAA-MM-DD."),
        (
            {"job_url": "occ.com.mx/vacante"},
            "job_url",
            "Escribe una URL válida que empiece con http:// o https://.",
        ),
        (
            {"job_url": "ftp://example.com/vacante"},
            "job_url",
            "Escribe una URL válida que empiece con http:// o https://.",
        ),
        (
            {"job_url": "https://example.com/" + "a" * 500},
            "job_url",
            "Debe tener como máximo 500 caracteres.",
        ),
        ({"source": "x" * 61}, "source", "Debe tener como máximo 60 caracteres."),
        ({"notes": "x" * 5001}, "notes", "Debe tener como máximo 5000 caracteres."),
        ({"id": 99}, "id", "Este campo no está permitido."),
        ({"created_at": "2026-01-01T00:00:00Z"}, "created_at", "Este campo no está permitido."),
    ],
)
def test_rejects_invalid_fields(client, payload, field, message):
    valid = {"company": "Oracle", "position": "Becario"}

    response = client.post(URL, json=valid | payload)

    assert response.status_code == 422
    assert errors_of(response)[field] == [message]


def test_accepts_today_as_date(client, fixed_today):
    response = client.post(
        URL,
        json={"company": "Oracle", "position": "Becario", "applied_on": fixed_today.isoformat()},
    )

    assert response.status_code == 201


def test_rejects_body_that_is_not_an_object(client):
    response = client.post(URL, json=["Oracle", "Becario"])

    assert response.status_code == 422
    assert errors_of(response) == {"body": ["Se esperaba un objeto JSON."]}


def test_rejects_malformed_json(client):
    response = client.post(URL, data="{company: Oracle", content_type="application/json")

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "bad_request"


def test_requires_json_content_type(client):
    response = client.post(URL, data={"company": "Oracle", "position": "Becario"})

    assert response.status_code == 415
    assert response.get_json()["error"]["code"] == "unsupported_media_type"
