"""
Database layer tests: automatic setup, constraints, and isolation.

These prove the "it just works on first run" promise and that the database
itself refuses bad data even if the Python validation were bypassed.
"""

import sqlite3

import pytest

from db import CREATE_STUDENTS_TABLE, init_db


def test_init_db_creates_the_table(tmp_path):
    path = tmp_path / "fresh.db"
    assert not path.exists()

    init_db(str(path))

    assert path.exists()
    connection = sqlite3.connect(path)
    tables = connection.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()
    connection.close()
    assert ("students",) in tables


def test_init_db_is_idempotent(tmp_path):
    """Running setup twice must not fail or wipe existing data."""
    path = tmp_path / "fresh.db"
    init_db(str(path))

    connection = sqlite3.connect(path)
    connection.execute(
        """INSERT INTO students (student_id, full_name, age, email, course)
           VALUES ('A-1', 'Test', 20, 'a@b.com', 'C')"""
    )
    connection.commit()
    connection.close()

    init_db(str(path))  # second run

    connection = sqlite3.connect(path)
    count = connection.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    connection.close()
    assert count == 1  # data survived


def test_database_enforces_unique_student_id(tmp_path):
    """Belt and braces: the DB itself blocks duplicates."""
    path = tmp_path / "fresh.db"
    init_db(str(path))
    connection = sqlite3.connect(path)

    connection.execute(
        """INSERT INTO students (student_id, full_name, age, email, course)
           VALUES ('A-1', 'One', 20, 'one@b.com', 'C')"""
    )
    connection.commit()

    with pytest.raises(sqlite3.IntegrityError):
        connection.execute(
            """INSERT INTO students (student_id, full_name, age, email, course)
               VALUES ('A-1', 'Two', 21, 'two@b.com', 'C')"""
        )
    connection.close()


def test_database_enforces_unique_email(tmp_path):
    path = tmp_path / "fresh.db"
    init_db(str(path))
    connection = sqlite3.connect(path)

    connection.execute(
        """INSERT INTO students (student_id, full_name, age, email, course)
           VALUES ('A-1', 'One', 20, 'same@b.com', 'C')"""
    )
    connection.commit()

    with pytest.raises(sqlite3.IntegrityError):
        connection.execute(
            """INSERT INTO students (student_id, full_name, age, email, course)
               VALUES ('A-2', 'Two', 21, 'same@b.com', 'C')"""
        )
    connection.close()


def test_database_enforces_not_null(tmp_path):
    path = tmp_path / "fresh.db"
    init_db(str(path))
    connection = sqlite3.connect(path)

    with pytest.raises(sqlite3.IntegrityError):
        connection.execute(
            """INSERT INTO students (student_id, full_name, age, email, course)
               VALUES ('A-1', NULL, 20, 'x@b.com', 'C')"""
        )
    connection.close()


def test_created_at_has_a_default(tmp_path):
    """Inserting without created_at must still produce a timestamp."""
    path = tmp_path / "fresh.db"
    init_db(str(path))
    connection = sqlite3.connect(path)

    connection.execute(
        """INSERT INTO students (student_id, full_name, age, email, course)
           VALUES ('A-1', 'One', 20, 'one@b.com', 'C')"""
    )
    connection.commit()
    created_at = connection.execute(
        "SELECT created_at FROM students"
    ).fetchone()[0]
    connection.close()

    assert created_at is not None
    assert len(created_at) >= 19


def test_schema_declares_nocase(tmp_path):
    """COLLATE NOCASE is what makes duplicate checks case-insensitive."""
    assert "COLLATE NOCASE" in CREATE_STUDENTS_TABLE


def test_row_factory_returns_dict_like_rows(tmp_path):
    """Rows behave like dicts, which is what the API relies on."""
    path = tmp_path / "fresh.db"
    init_db(str(path))

    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute(
        """INSERT INTO students (student_id, full_name, age, email, course)
           VALUES ('A-1', 'One', 20, 'one@b.com', 'C')"""
    )
    connection.commit()
    row = connection.execute("SELECT * FROM students").fetchone()
    connection.close()

    assert row["student_id"] == "A-1"
    assert dict(row)["full_name"] == "One"


# ---------------------------------------------------------------------------
# Isolation between tests
# ---------------------------------------------------------------------------

def test_each_test_starts_with_an_empty_database(client):
    """If tests leaked data into each other this would not be 0."""
    assert client.get("/api/students").get_json()["count"] == 0


def test_tests_do_not_touch_the_real_database(app):
    """The fixture must point at tmp_path, never backend/students.db."""
    import os

    assert os.path.basename(app.config["DATABASE"]) == "test_students.db"
    assert "pytest" in app.config["DATABASE"] or "/tmp" in app.config["DATABASE"]
