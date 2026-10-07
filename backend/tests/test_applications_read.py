"""GET /api/v1/applications y GET /api/v1/applications/{id} (HU-02, HU-03, HU-07)."""

from datetime import date

import pytest

URL = "/api/v1/applications"


def companies(response) -> list[str]:
    return [item["company"] for item in response.get_json()["items"]]


# --------------------------------------------------------------------------- #
# Obtener una postulación
# --------------------------------------------------------------------------- #
def test_get_one(client, make_application):
    application_id = make_application(company="Oracle", job_url="https://example.com/1")

    response = client.get(f"{URL}/{application_id}")

    assert response.status_code == 200
    body = response.get_json()
    assert body["id"] == application_id
    assert body["company"] == "Oracle"
    assert body["job_url"] == "https://example.com/1"
    assert list(body) == [
        "id",
        "company",
        "position",
        "status",
        "applied_on",
        "job_url",
        "source",
        "notes",
        "created_at",
        "updated_at",
    ]


def test_get_one_not_found(client):
    response = client.get(f"{URL}/999")

    assert response.status_code == 404
    assert response.get_json()["error"] == {
        "code": "not_found",
        "message": "No existe la postulación con id 999.",
    }


# --------------------------------------------------------------------------- #
# Lista: orden y paginación
# --------------------------------------------------------------------------- #
def test_empty_list(client):
    response = client.get(URL)

    assert response.status_code == 200
    assert response.get_json() == {"items": [], "page": 1, "per_page": 20, "total": 0, "pages": 0}


def test_default_order_is_most_recent_first(client, make_application):
    make_application(company="Vieja", applied_on=date(2026, 8, 1))
    make_application(company="Nueva", applied_on=date(2026, 10, 1))
    make_application(company="Media", applied_on=date(2026, 9, 1))

    response = client.get(URL)

    assert companies(response) == ["Nueva", "Media", "Vieja"]


def test_ties_are_ordered_by_id(client, make_application):
    for name in ["A", "B", "C"]:
        make_application(company=name, applied_on=date(2026, 9, 1))

    assert companies(client.get(URL)) == ["C", "B", "A"]
    assert companies(client.get(f"{URL}?sort=applied_on")) == ["A", "B", "C"]


def test_sort_by_company_ignores_case(client, make_application):
    for name in ["wizeline", "Bosch", "oracle", "Accenture"]:
        make_application(company=name)

    assert companies(client.get(f"{URL}?sort=company")) == [
        "Accenture",
        "Bosch",
        "oracle",
        "wizeline",
    ]
    assert companies(client.get(f"{URL}?sort=-company"))[0] == "wizeline"


def test_sort_by_status(client, make_application):
    for status in ["rejected", "applied", "offer", "interview"]:
        make_application(company=status, status=status)

    assert companies(client.get(f"{URL}?sort=status")) == [
        "applied",
        "interview",
        "offer",
        "rejected",
    ]


def test_pagination(client, make_application):
    for number in range(25):
        make_application(company=f"Empresa {number:02d}")

    response = client.get(f"{URL}?per_page=10&page=3&sort=company")

    body = response.get_json()
    assert body["page"] == 3
    assert body["per_page"] == 10
    assert body["total"] == 25
    assert body["pages"] == 3
    assert companies(response) == [f"Empresa {number}" for number in range(20, 25)]


def test_page_out_of_range_returns_empty_items(client, make_application):
    make_application()

    body = client.get(f"{URL}?page=10").get_json()

    assert body["items"] == []
    assert body["total"] == 1


# --------------------------------------------------------------------------- #
# Lista: filtros
# --------------------------------------------------------------------------- #
def test_filter_by_status(client, make_application):
    make_application(company="Oracle", status="interview")
    make_application(company="Bosch", status="applied")

    assert companies(client.get(f"{URL}?status=interview")) == ["Oracle"]


def test_search_in_company_and_position_ignoring_case(client, make_application):
    make_application(company="DataCorp", position="Becario")
    make_application(company="Oracle", position="Becario de Data Science")
    make_application(company="Bosch", position="Practicante QA")

    response = client.get(f"{URL}?q=DATA&sort=company")

    assert companies(response) == ["DataCorp", "Oracle"]


@pytest.mark.parametrize(
    ("query", "expected"),
    [("100%", ["100% Remoto"]), ("data_eng", ["data_eng"])],
)
def test_search_treats_wildcards_as_text(client, make_application, query, expected):
    for name in ["100% Remoto", "1000 Fintech", "data_eng", "dataXeng"]:
        make_application(company=name)

    response = client.get(URL, query_string={"q": query})

    assert companies(response) == expected


def test_filter_by_date_range(client, make_application):
    make_application(company="Agosto", applied_on=date(2026, 8, 31))
    make_application(company="Inicio", applied_on=date(2026, 9, 1))
    make_application(company="Fin", applied_on=date(2026, 9, 30))
    make_application(company="Octubre", applied_on=date(2026, 10, 1))

    response = client.get(f"{URL}?applied_from=2026-09-01&applied_to=2026-09-30")

    assert companies(response) == ["Fin", "Inicio"]


def test_filters_can_be_combined(client, make_application):
    make_application(company="Oracle", status="interview", applied_on=date(2026, 9, 10))
    make_application(company="Oracle Cloud", status="applied", applied_on=date(2026, 9, 10))
    make_application(company="Oracle", status="interview", applied_on=date(2026, 7, 10))

    response = client.get(f"{URL}?q=oracle&status=interview&applied_from=2026-09-01")

    assert response.get_json()["total"] == 1


def test_blank_parameters_are_ignored(client, make_application):
    make_application()

    response = client.get(f"{URL}?status=&q=%20&applied_from=")

    assert response.status_code == 200
    assert response.get_json()["total"] == 1


@pytest.mark.parametrize(
    ("query", "field"),
    [
        ("status=ghosted", "status"),
        ("sort=salary", "sort"),
        ("page=0", "page"),
        ("page=abc", "page"),
        ("per_page=101", "per_page"),
        ("applied_from=ayer", "applied_from"),
        ("applied_from=20260901", "applied_from"),
        ("applied_from=2026-09-30&applied_to=2026-09-01", "applied_to"),
        ("q=" + "x" * 101, "q"),
    ],
)
def test_rejects_invalid_parameters(client, query, field):
    response = client.get(f"{URL}?{query}")

    assert response.status_code == 422
    assert field in response.get_json()["error"]["details"]
