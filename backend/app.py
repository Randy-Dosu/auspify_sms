"""
Student Management System - Flask backend
=========================================

Steps implemented so far:
  * Step 0 - health route so the frontend can prove it can reach the API
  * Step 2 - automatic SQLite setup + POST /api/students (create)
  * Step 3 - PUT /api/students/<id> (update) and DELETE /api/students/<id>

Run it with:
    python app.py

The API speaks JSON in and JSON out. Every error looks like:
    { "error": "Validation failed", "errors": { "email": "..." } }
so the React form can highlight the exact field that is wrong.
"""

import sqlite3
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

from db import close_db, get_db, init_db, row_to_dict
from validators import validate_student

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__)

# Where the SQLite file lives. Tests override this with a temporary file.
app.config["DATABASE"] = str(Path(__file__).resolve().parent / "students.db")
# Don't turn JSON keys into sorted order; keeps API output stable and readable.
app.config["JSON_SORT_KEYS"] = False

# The React dev server runs on a different origin, so allow it explicitly.
# The e2b.app entry is a regex that matches the sandbox preview hostname.
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174",
                r"https?://.*\.e2b\.app",
            ]
        }
    },
)

# Close the per-request database connection when the request finishes.
app.teardown_appcontext(close_db)


# ---------------------------------------------------------------------------
# Create the database on startup
# ---------------------------------------------------------------------------
# This runs when the module is imported (including by `flask run` and pytest),
# so the very first request always has a table to talk to.
with app.app_context():
    init_db()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def error_response(message, status, errors=None):
    """Build a consistent error payload."""
    body = {"error": message}
    if errors:
        body["errors"] = errors
    return jsonify(body), status


def find_duplicates(db, student_id, email, exclude_id=None):
    """Check whether student_id or email is already taken.

    Both comparisons are case-insensitive because the columns are declared
    COLLATE NOCASE. `exclude_id` is used by PUT (Step 3) so a record can keep
    its own values.
    """
    duplicates = {}

    sql_suffix = " AND id != ?" if exclude_id is not None else ""
    params_suffix = (exclude_id,) if exclude_id is not None else ()

    row = db.execute(
        f"SELECT id FROM students WHERE student_id = ? COLLATE NOCASE{sql_suffix}",
        (student_id, *params_suffix),
    ).fetchone()
    if row:
        duplicates["student_id"] = "This student ID is already registered"

    row = db.execute(
        f"SELECT id FROM students WHERE email = ? COLLATE NOCASE{sql_suffix}",
        (email, *params_suffix),
    ).fetchone()
    if row:
        duplicates["email"] = "This email is already registered"

    return duplicates


def fetch_student(db, student_id):
    """Load one student by primary key, or None."""
    row = db.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    return row_to_dict(row)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    """Health check used by the frontend and by monitoring."""
    return jsonify(
        status="ok",
        service="auspify-sms-api",
        message="Flask backend is running",
    ), 200


@app.post("/api/students")
def create_student():
    """Create a student.

    Success -> 201 Created with the stored record.
    Missing/invalid fields -> 400 Bad Request with per-field errors.
    Duplicate student_id or email -> 409 Conflict.
    """
    # `silent=True` means a missing/invalid body becomes None instead of
    # raising, so we can answer with a friendly 400.
    payload = request.get_json(silent=True)
    if payload is None:
        return error_response("Request body must be valid JSON", 400)

    # 1) Validate everything BEFORE touching the database.
    data, errors = validate_student(payload)
    if errors:
        return error_response("Validation failed", 400, errors)

    db = get_db()

    # 2) Friendly duplicate check (gives a better message than the raw
    #    database error, and tells us WHICH field clashed).
    duplicates = find_duplicates(db, data["student_id"], data["email"])
    if duplicates:
        return error_response("Duplicate student", 409, duplicates)

    # 3) Insert. The UNIQUE constraints are the real guarantee; the except
    #    block covers the rare race where two requests arrive together.
    try:
        cursor = db.execute(
            """
            INSERT INTO students
                (student_id, full_name, age, gender, email, phone, course, year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data["student_id"],
                data["full_name"],
                data["age"],
                data.get("gender") or None,
                data["email"],
                data.get("phone") or None,
                data["course"],
                data.get("year"),
            ),
        )
        db.commit()
    except sqlite3.IntegrityError as exc:
        db.rollback()
        message = str(exc).lower()
        field = "student_id" if "student_id" in message else "email"
        return error_response(
            "Duplicate student",
            409,
            {field: "This value is already registered"},
        )

    created = fetch_student(db, cursor.lastrowid)
    # 201 + Location header is the correct REST answer for a creation.
    response = jsonify(created)
    response.status_code = 201
    response.headers["Location"] = f"/api/students/{cursor.lastrowid}"
    return response



@app.put("/api/students/<int:student_pk>")
def update_student(student_pk):
    """Update an existing student.

    200 OK            -> returns the updated record
    400 Bad Request   -> validation errors
    404 Not Found     -> no student with that id
    409 Conflict      -> student_id/email taken by a DIFFERENT student
    """
    db = get_db()

    # 1) The record must exist before we validate anything else.
    existing = fetch_student(db, student_pk)
    if existing is None:
        return error_response(f"Student {student_pk} not found", 404)

    payload = request.get_json(silent=True)
    if payload is None:
        return error_response("Request body must be valid JSON", 400)

    data, errors = validate_student(payload)
    if errors:
        return error_response("Validation failed", 400, errors)

    # 2) Duplicate check that ignores the record being edited, so saving a
    #    student with its own unchanged email/ID is allowed.
    duplicates = find_duplicates(
        db, data["student_id"], data["email"], exclude_id=student_pk
    )
    if duplicates:
        return error_response("Duplicate student", 409, duplicates)

    try:
        db.execute(
            """
            UPDATE students
               SET student_id = ?, full_name = ?, age = ?, gender = ?,
                   email = ?, phone = ?, course = ?, year = ?
             WHERE id = ?
            """,
            (
                data["student_id"],
                data["full_name"],
                data["age"],
                data.get("gender") or None,
                data["email"],
                data.get("phone") or None,
                data["course"],
                data.get("year"),
                student_pk,
            ),
        )
        db.commit()
    except sqlite3.IntegrityError as exc:
        db.rollback()
        message = str(exc).lower()
        field = "student_id" if "student_id" in message else "email"
        return error_response(
            "Duplicate student", 409, {field: "This value is already registered"}
        )

    return jsonify(fetch_student(db, student_pk)), 200


@app.delete("/api/students/<int:student_pk>")
def delete_student(student_pk):
    """Delete a student.

    200 OK        -> {"message": "...", "deleted": {...}} (the removed row)
    404 Not Found -> no student with that id

    We return the deleted record so the UI can show what was removed and
    could offer an "undo" later.
    """
    db = get_db()

    existing = fetch_student(db, student_pk)
    if existing is None:
        return error_response(f"Student {student_pk} not found", 404)

    db.execute("DELETE FROM students WHERE id = ?", (student_pk,))
    db.commit()

    return jsonify(
        message=f"Student {student_pk} deleted",
        deleted=existing,
    ), 200


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
