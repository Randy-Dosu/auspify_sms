"""POST /api/students - creating students (Step 2)."""

import pytest


# ---------------------------------------------------------------------------
# Success
# ---------------------------------------------------------------------------

def test_create_returns_201_and_body(client, valid_student):
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 201
    body = response.get_json()

    # The API must echo back the stored record, not just a success flag.
    assert body["student_id"] == valid_student["student_id"]
    assert body["full_name"] == valid_student["full_name"]
    assert body["email"] == valid_student["email"]
    assert body["age"] == 20
    assert isinstance(body["id"], int)


def test_create_sets_location_header(client, valid_student):
    response = client.post("/api/students", json=valid_student)
    assert response.headers["Location"] == f"/api/students/{response.get_json()['id']}"


def test_create_sets_created_at(client, valid_student):
    body = client.post("/api/students", json=valid_student).get_json()
    # SQLite datetime('now') always looks like "YYYY-MM-DD HH:MM:SS"
    assert body["created_at"] is not None
    assert len(body["created_at"]) >= 19


def test_create_normalises_email_case(client, valid_student):
    valid_student["email"] = "AMA.MENSAH@Example.COM"
    body = client.post("/api/students", json=valid_student).get_json()
    assert body["email"] == "ama.mensah@example.com"


def test_create_accepts_numeric_string_age(client, valid_student):
    """The browser sends strings; "22" must become the integer 22."""
    valid_student["age"] = "22"
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 201
    assert response.get_json()["age"] == 22


def test_create_optional_fields_may_be_omitted(client):
    payload = {
        "student_id": "MIN-1",
        "full_name": "Minimal Student",
        "age": 18,
        "email": "minimal@example.com",
        "course": "Art",
    }
    response = client.post("/api/students", json=payload)

    assert response.status_code == 201
    body = response.get_json()
    assert body["gender"] is None
    assert body["phone"] is None
    assert body["year"] is None


def test_create_ignores_unknown_fields(client, valid_student):
    valid_student["is_admin"] = True
    valid_student["id"] = 9999  # client must not choose the primary key
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 201
    assert response.get_json()["id"] != 9999


def test_create_trims_whitespace(client, valid_student):
    valid_student["full_name"] = "   Spaced Out   "
    body = client.post("/api/students", json=valid_student).get_json()
    assert body["full_name"] == "Spaced Out"


def test_create_persists_to_database(client, valid_student, db_conn):
    """The row must really be in SQLite, not just in the response."""
    client.post("/api/students", json=valid_student)

    row = db_conn.execute(
        "SELECT * FROM students WHERE student_id = ?", (valid_student["student_id"],)
    ).fetchone()

    assert row is not None
    assert row["full_name"] == valid_student["full_name"]


# ---------------------------------------------------------------------------
# 400 - validation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("missing_field", ["student_id", "full_name", "age", "email", "course"])
def test_create_rejects_missing_required_field(client, valid_student, missing_field):
    del valid_student[missing_field]
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 400
    assert missing_field in response.get_json()["errors"]


@pytest.mark.parametrize("missing_field", ["student_id", "full_name", "age", "email", "course"])
def test_create_rejects_empty_required_field(client, valid_student, missing_field):
    valid_student[missing_field] = "   "  # whitespace only counts as empty
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 400
    assert missing_field in response.get_json()["errors"]


@pytest.mark.parametrize(
    "bad_email",
    ["plainaddress", "no@tld", "@example.com", "two@@example.com", "spaces in@example.com"],
)
def test_create_rejects_invalid_email(client, valid_student, bad_email):
    valid_student["email"] = bad_email
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 400
    assert "email" in response.get_json()["errors"]


@pytest.mark.parametrize("bad_age", ["twenty", "12.5", "", None, True])
def test_create_rejects_non_integer_age(client, valid_student, bad_age):
    valid_student["age"] = bad_age
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 400
    assert "age" in response.get_json()["errors"]


@pytest.mark.parametrize("bad_age", [0, -5, 121, 999])
def test_create_rejects_out_of_range_age(client, valid_student, bad_age):
    valid_student["age"] = bad_age
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 400
    assert "age" in response.get_json()["errors"]


def test_create_rejects_bad_gender(client, valid_student):
    valid_student["gender"] = "Robot"
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 400
    assert "gender" in response.get_json()["errors"]


def test_create_rejects_overlong_name(client, valid_student):
    valid_student["full_name"] = "x" * 200
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 400
    assert "full_name" in response.get_json()["errors"]


def test_create_reports_multiple_errors_at_once(client):
    response = client.post("/api/students", json={})

    assert response.status_code == 400
    errors = response.get_json()["errors"]
    assert len(errors) == 5  # all five required fields


def test_create_rejects_non_json_body(client):
    response = client.post(
        "/api/students", data="not json", content_type="application/json"
    )
    assert response.status_code == 400


def test_create_rejects_missing_body(client):
    response = client.post("/api/students")
    assert response.status_code == 400


def test_create_rejects_json_array(client):
    response = client.post("/api/students", json=[{"a": 1}])
    assert response.status_code == 400


def test_failed_validation_writes_nothing(client, db_conn):
    client.post("/api/students", json={"student_id": "X"})
    count = db_conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    assert count == 0


# ---------------------------------------------------------------------------
# 409 - duplicates
# ---------------------------------------------------------------------------

def test_create_rejects_duplicate_student_id(client, valid_student, created_student):
    valid_student["email"] = "different@example.com"
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 409
    assert "student_id" in response.get_json()["errors"]


def test_create_rejects_duplicate_email(client, valid_student, created_student):
    valid_student["student_id"] = "AUS-2024-999"
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 409
    assert "email" in response.get_json()["errors"]


def test_create_rejects_duplicate_student_id_case_insensitively(
    client, valid_student, created_student
):
    valid_student["student_id"] = valid_student["student_id"].lower()
    valid_student["email"] = "other@example.com"
    assert client.post("/api/students", json=valid_student).status_code == 409


def test_create_rejects_duplicate_email_case_insensitively(
    client, valid_student, created_student
):
    valid_student["student_id"] = "NEW-1"
    valid_student["email"] = valid_student["email"].upper()
    assert client.post("/api/students", json=valid_student).status_code == 409


def test_duplicate_does_not_insert_a_second_row(
    client, valid_student, created_student, db_conn
):
    client.post("/api/students", json=valid_student)
    count = db_conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    assert count == 1


def test_duplicate_reports_both_conflicts(client, valid_student, created_student):
    response = client.post("/api/students", json=valid_student)

    assert response.status_code == 409
    errors = response.get_json()["errors"]
    assert "student_id" in errors and "email" in errors
