"""PUT /api/students/<id> - updating students (Step 3)."""

import pytest


# ---------------------------------------------------------------------------
# Success
# ---------------------------------------------------------------------------

def test_update_changes_fields(client, created_student):
    updated = {
        "student_id": created_student["student_id"],
        "full_name": "Ama S. Mensah (updated)",
        "age": 21,
        "gender": "Female",
        "email": created_student["email"],
        "phone": "+233200000000",
        "course": "Software Engineering",
        "year": 3,
    }
    response = client.put(f"/api/students/{created_student['id']}", json=updated)

    assert response.status_code == 200
    body = response.get_json()
    assert body["full_name"] == "Ama S. Mensah (updated)"
    assert body["age"] == 21
    assert body["course"] == "Software Engineering"
    assert body["year"] == 3


def test_update_persists_to_database(client, created_student, db_conn):
    payload = {**created_student, "full_name": "Persisted Name"}
    client.put(f"/api/students/{created_student['id']}", json=payload)

    row = db_conn.execute(
        "SELECT full_name FROM students WHERE id = ?", (created_student["id"],)
    ).fetchone()
    assert row["full_name"] == "Persisted Name"


def test_update_keeps_the_same_row(client, created_student, db_conn):
    before = db_conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    client.put(
        f"/api/students/{created_student['id']}",
        json={**created_student, "age": 30},
    )
    after = db_conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]

    assert before == after == 1


def test_update_does_not_change_id_or_created_at(client, created_student):
    body = client.put(
        f"/api/students/{created_student['id']}",
        json={**created_student, "age": 30},
    ).get_json()

    assert body["id"] == created_student["id"]
    assert body["created_at"] == created_student["created_at"]


def test_update_can_change_student_id(client, created_student):
    body = client.put(
        f"/api/students/{created_student['id']}",
        json={**created_student, "student_id": "NEW-ID-42"},
    ).get_json()

    assert body["student_id"] == "NEW-ID-42"


def test_update_can_keep_its_own_email_and_id(client, created_student):
    """The duplicate check must ignore the record being edited.

    Without `exclude_id` this would wrongly return 409.
    """
    response = client.put(
        f"/api/students/{created_student['id']}", json={**created_student}
    )
    assert response.status_code == 200


def test_update_can_clear_optional_fields(client, created_student):
    body = client.put(
        f"/api/students/{created_student['id']}",
        json={**created_student, "phone": None, "gender": None, "year": None},
    ).get_json()

    assert body["phone"] is None
    assert body["gender"] is None
    assert body["year"] is None


# ---------------------------------------------------------------------------
# 400 - validation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("missing_field", ["student_id", "full_name", "age", "email", "course"])
def test_update_rejects_missing_required_field(client, created_student, missing_field):
    payload = {**created_student, missing_field: ""}
    response = client.put(f"/api/students/{created_student['id']}", json=payload)

    assert response.status_code == 400
    assert missing_field in response.get_json()["errors"]


def test_update_rejects_invalid_email(client, created_student):
    response = client.put(
        f"/api/students/{created_student['id']}",
        json={**created_student, "email": "not-an-email"},
    )

    assert response.status_code == 400
    assert "email" in response.get_json()["errors"]


def test_update_rejects_non_numeric_age(client, created_student):
    response = client.put(
        f"/api/students/{created_student['id']}",
        json={**created_student, "age": "abc"},
    )

    assert response.status_code == 400
    assert "age" in response.get_json()["errors"]


def test_failed_update_changes_nothing(client, created_student, db_conn):
    client.put(
        f"/api/students/{created_student['id']}",
        json={**created_student, "full_name": "Should Not Apply", "age": "abc"},
    )

    row = db_conn.execute(
        "SELECT full_name FROM students WHERE id = ?", (created_student["id"],)
    ).fetchone()
    assert row["full_name"] == created_student["full_name"]


def test_update_rejects_non_json_body(client, created_student):
    response = client.put(
        f"/api/students/{created_student['id']}",
        data="nope",
        content_type="application/json",
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# 409 - duplicates against OTHER records
# ---------------------------------------------------------------------------

@pytest.fixture()
def two_students(client, valid_student):
    first = client.post("/api/students", json=valid_student).get_json()

    second_payload = {
        **valid_student,
        "student_id": "AUS-2024-002",
        "email": "second@example.com",
        "full_name": "Second Student",
    }
    second = client.post("/api/students", json=second_payload).get_json()
    return first, second


def test_update_rejects_email_owned_by_another(client, two_students):
    first, second = two_students
    response = client.put(
        f"/api/students/{first['id']}",
        json={**first, "email": second["email"]},
    )

    assert response.status_code == 409
    assert "email" in response.get_json()["errors"]


def test_update_rejects_student_id_owned_by_another(client, two_students):
    first, second = two_students
    response = client.put(
        f"/api/students/{first['id']}",
        json={**first, "student_id": second["student_id"]},
    )

    assert response.status_code == 409
    assert "student_id" in response.get_json()["errors"]


def test_update_duplicate_cases_insensitive(client, two_students):
    first, second = two_students
    response = client.put(
        f"/api/students/{first['id']}",
        json={**first, "email": second["email"].upper()},
    )
    assert response.status_code == 409


def test_rejected_update_leaves_row_untouched(client, two_students, db_conn):
    first, second = two_students
    client.put(
        f"/api/students/{first['id']}",
        json={**first, "email": second["email"], "full_name": "Should Not Apply"},
    )

    row = db_conn.execute(
        "SELECT full_name FROM students WHERE id = ?", (first["id"],)
    ).fetchone()
    assert row["full_name"] == first["full_name"]


# ---------------------------------------------------------------------------
# 404
# ---------------------------------------------------------------------------

def test_update_missing_record_returns_404(client, valid_student):
    response = client.put("/api/students/999999", json=valid_student)

    assert response.status_code == 404
    assert "not found" in response.get_json()["error"].lower()
