"""GET /api/students - listing, searching, sorting (Step 4)."""

import pytest


@pytest.fixture()
def several_students(client):
    """Three students with distinct, easy-to-reason-about values."""
    rows = [
        {
            "student_id": "S-100",
            "full_name": "Zara Yakubu",
            "age": 31,
            "gender": "Female",
            "email": "zara@example.com",
            "course": "Physics",
            "year": 4,
        },
        {
            "student_id": "S-101",
            "full_name": "Ben Addo",
            "age": 19,
            "gender": "Male",
            "email": "ben@example.com",
            "course": "Chemistry",
            "year": 1,
        },
        {
            "student_id": "S-102",
            "full_name": "Chidi Okonkwo",
            "age": 25,
            "gender": "Male",
            "email": "chidi@example.com",
            "course": "Biology",
            "year": 3,
        },
    ]
    for row in rows:
        assert client.post("/api/students", json=row).status_code == 201
    return rows


# ---------------------------------------------------------------------------
# Basic listing
# ---------------------------------------------------------------------------

def test_list_empty_database(client):
    response = client.get("/api/students")

    assert response.status_code == 200
    body = response.get_json()
    assert body["students"] == []
    assert body["count"] == 0


def test_list_returns_all_students(client, several_students):
    body = client.get("/api/students").get_json()

    assert body["count"] == 3
    assert len(body["students"]) == 3


def test_list_count_matches_length(client, several_students):
    body = client.get("/api/students").get_json()
    assert body["count"] == len(body["students"])


def test_list_includes_every_field(client, several_students):
    student = client.get("/api/students").get_json()["students"][0]

    for field in [
        "id", "student_id", "full_name", "age", "gender",
        "email", "phone", "course", "year", "created_at",
    ]:
        assert field in student, f"missing {field}"


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def test_search_by_partial_name(client, several_students):
    body = client.get("/api/students?search=ben").get_json()

    assert body["count"] == 1
    assert body["students"][0]["full_name"] == "Ben Addo"


def test_search_is_case_insensitive(client, several_students):
    lower = client.get("/api/students?search=zara").get_json()
    upper = client.get("/api/students?search=ZARA").get_json()

    assert lower["count"] == upper["count"] == 1


def test_search_by_student_id(client, several_students):
    body = client.get("/api/students?search=S-10").get_json()
    assert body["count"] == 3


def test_search_by_exact_student_id(client, several_students):
    body = client.get("/api/students?search=S-101").get_json()

    assert body["count"] == 1
    assert body["students"][0]["full_name"] == "Ben Addo"


def test_search_no_matches_returns_empty_list(client, several_students):
    body = client.get("/api/students?search=zzzzzz").get_json()

    assert body["count"] == 0
    assert body["students"] == []
    # An empty result is still a success, not a 404.
    assert client.get("/api/students?search=zzzzzz").status_code == 200


def test_search_ignores_surrounding_whitespace(client, several_students):
    body = client.get("/api/students?search=%20%20ben%20%20").get_json()
    assert body["count"] == 1


def test_empty_search_returns_everything(client, several_students):
    assert client.get("/api/students?search=").get_json()["count"] == 3


# ---------------------------------------------------------------------------
# Sorting
# ---------------------------------------------------------------------------

def test_sort_by_age_ascending(client, several_students):
    students = client.get("/api/students?sort=age&order=asc").get_json()["students"]
    assert [s["age"] for s in students] == [19, 25, 31]


def test_sort_by_age_descending(client, several_students):
    students = client.get("/api/students?sort=age&order=desc").get_json()["students"]
    assert [s["age"] for s in students] == [31, 25, 19]


def test_sort_by_full_name_ascending(client, several_students):
    students = client.get("/api/students?sort=full_name&order=asc").get_json()["students"]
    assert [s["full_name"] for s in students] == [
        "Ben Addo", "Chidi Okonkwo", "Zara Yakubu",
    ]


def test_sort_by_full_name_descending(client, several_students):
    students = client.get("/api/students?sort=full_name&order=desc").get_json()["students"]
    assert [s["full_name"] for s in students] == [
        "Zara Yakubu", "Chidi Okonkwo", "Ben Addo",
    ]


def test_sort_by_student_id(client, several_students):
    students = client.get("/api/students?sort=student_id&order=asc").get_json()["students"]
    assert [s["student_id"] for s in students] == ["S-100", "S-101", "S-102"]


def test_sort_by_id(client, several_students):
    students = client.get("/api/students?sort=id&order=asc").get_json()["students"]
    assert [s["id"] for s in students] == sorted(s["id"] for s in students)


def test_sort_defaults_are_applied(client, several_students):
    """No parameters at all must still return a sensible, ordered list."""
    response = client.get("/api/students")
    assert response.status_code == 200
    assert response.get_json()["count"] == 3


def test_sort_combined_with_search(client, several_students):
    students = (
        client.get("/api/students?search=S-10&sort=age&order=desc")
        .get_json()["students"]
    )
    assert [s["age"] for s in students] == [31, 25, 19]


@pytest.mark.parametrize("order", ["asc", "ASC", "desc", "DESC"])
def test_sort_accepts_both_cases(client, several_students, order):
    assert client.get(f"/api/students?sort=age&order={order}").status_code == 200


# ---------------------------------------------------------------------------
# Invalid query parameters
# ---------------------------------------------------------------------------

def test_invalid_sort_field_returns_400(client, several_students):
    response = client.get("/api/students?sort=password")
    assert response.status_code == 400
    assert "sort" in response.get_json()["error"].lower()


@pytest.mark.parametrize(
    "evil",
    [
        "id; DROP TABLE students",
        "id--",
        "1=1",
        "(SELECT 1)",
    ],
)
def test_sort_field_is_not_sql_injectable(client, several_students, evil):
    """A sort value is never pasted into SQL - anything unknown is rejected."""
    response = client.get("/api/students", query_string={"sort": evil})

    assert response.status_code == 400
    # The table must still be there afterwards.
    assert client.get("/api/students").get_json()["count"] == 3


def test_invalid_order_returns_400(client, several_students):
    response = client.get("/api/students?order=sideways")
    assert response.status_code == 400


def test_search_value_is_parameterised(client, several_students):
    """Search text is data, never code - a quote must not break the query."""
    response = client.get("/api/students", query_string={"search": "'; DROP TABLE students;--"})

    assert response.status_code == 200
    assert response.get_json()["count"] == 0
    assert client.get("/api/students").get_json()["count"] == 3
