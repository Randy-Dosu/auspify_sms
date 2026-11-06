"""DELETE /api/students/<id> - deleting students (Step 3)."""


def test_delete_returns_200(client, created_student):
    response = client.delete(f"/api/students/{created_student['id']}")

    assert response.status_code == 200
    body = response.get_json()
    assert "deleted" in body["message"].lower()


def test_delete_returns_the_removed_record(client, created_student):
    body = client.delete(f"/api/students/{created_student['id']}").get_json()

    # Returning the row makes an "undo" feature possible later.
    assert body["deleted"]["id"] == created_student["id"]
    assert body["deleted"]["full_name"] == created_student["full_name"]


def test_delete_removes_the_row(client, created_student, db_conn):
    client.delete(f"/api/students/{created_student['id']}")

    row = db_conn.execute(
        "SELECT * FROM students WHERE id = ?", (created_student["id"],)
    ).fetchone()
    assert row is None


def test_delete_keeps_other_rows(client, valid_student, created_student):
    other = client.post(
        "/api/students",
        json={
            **valid_student,
            "student_id": "KEEP-1",
            "email": "keep@example.com",
        },
    ).get_json()

    client.delete(f"/api/students/{created_student['id']}")

    remaining = client.get("/api/students").get_json()
    assert remaining["count"] == 1
    assert remaining["students"][0]["id"] == other["id"]


def test_delete_missing_record_returns_404(client):
    response = client.delete("/api/students/999999")

    assert response.status_code == 404
    assert "not found" in response.get_json()["error"].lower()


def test_delete_twice_returns_404_the_second_time(client, created_student):
    first = client.delete(f"/api/students/{created_student['id']}")
    second = client.delete(f"/api/students/{created_student['id']}")

    assert first.status_code == 200
    assert second.status_code == 404


def test_delete_non_numeric_id_returns_404(client):
    assert client.delete("/api/students/abc").status_code == 404


def test_deleted_student_id_can_be_reused(client, valid_student):
    """Deleting frees the unique student_id for a new student."""
    created = client.post("/api/students", json=valid_student).get_json()
    client.delete(f"/api/students/{created['id']}")

    response = client.post("/api/students", json=valid_student)
    assert response.status_code == 201


def test_delete_empties_the_list(client, created_student):
    client.delete(f"/api/students/{created_student['id']}")
    assert client.get("/api/students").get_json()["count"] == 0


def test_ids_are_not_reused(client, valid_student, created_student):
    """AUTOINCREMENT guarantees a new row never inherits a deleted id."""
    old_id = created_student["id"]
    client.delete(f"/api/students/{old_id}")

    new_record = client.post(
        "/api/students",
        json={**valid_student, "student_id": "REUSE-1", "email": "reuse@example.com"},
    ).get_json()

    assert new_record["id"] > old_id
