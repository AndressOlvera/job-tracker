"""GET /api/v1/stats (HU-06)."""

from datetime import date

URL = "/api/v1/stats"


def test_stats_without_applications(client):
    response = client.get(URL)

    assert response.status_code == 200
    assert response.get_json() == {
        "total": 0,
        "by_status": {"applied": 0, "interview": 0, "offer": 0, "rejected": 0},
        "response_rate": 0.0,
        "interview_rate": 0.0,
        "by_month": [],
    }


def test_stats_match_documented_example(client, make_application):
    """Reproduce el ejemplo de docs/03-api.md: 15 / 5 / 1 / 3 = 24 postulaciones."""
    counts = {"applied": 15, "interview": 5, "offer": 1, "rejected": 3}
    number = 0
    for status, count in counts.items():
        for _ in range(count):
            number += 1
            # 6 en agosto y 18 en septiembre
            month = 8 if number % 4 == 0 else 9
            make_application(status=status, applied_on=date(2026, month, 10))

    body = client.get(URL).get_json()

    assert body["total"] == 24
    assert body["by_status"] == counts
    assert body["response_rate"] == 0.375  # (5 + 1 + 3) / 24
    assert body["interview_rate"] == 0.25  # (5 + 1) / 24
    assert body["by_month"] == [
        {"month": "2026-08", "count": 6},
        {"month": "2026-09", "count": 18},
    ]


def test_rates_are_rounded_to_four_decimals(client, make_application):
    make_application(status="interview")
    make_application(status="applied")
    make_application(status="applied")

    body = client.get(URL).get_json()

    assert body["response_rate"] == 0.3333
    assert body["interview_rate"] == 0.3333


def test_months_are_ordered_across_years(client, make_application):
    make_application(applied_on=date(2026, 1, 15))
    make_application(applied_on=date(2025, 12, 31))
    make_application(applied_on=date(2026, 1, 1))

    body = client.get(URL).get_json()

    assert body["by_month"] == [
        {"month": "2025-12", "count": 1},
        {"month": "2026-01", "count": 2},
    ]
