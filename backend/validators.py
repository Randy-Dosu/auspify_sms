"""
Server-side validation for student data.

Why validate on the server when the React form already checks things?
Because the browser is not trustworthy: anyone can call the API with curl or
Postman and skip the form entirely. The server is the last line of defence.

This module is deliberately dependency-free (only the standard library) so it
is easy to test and read.
"""

import re

# Simple but practical email pattern:
#   something@something.tld   (no spaces, exactly one @, a dot in the domain)
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")

# Sanity limits so a 10 MB name cannot end up in the database.
MAX_LENGTHS = {
    "student_id": 30,
    "full_name": 120,
    "email": 254,
    "phone": 30,
    "course": 120,
    "gender": 20,
}

# Fields the user must fill in.
REQUIRED_FIELDS = ["student_id", "full_name", "age", "email", "course"]

# Human-readable names used in error messages.
FIELD_LABELS = {
    "student_id": "Student ID",
    "full_name": "Full name",
    "age": "Age",
    "email": "Email",
    "course": "Course",
    "gender": "Gender",
    "phone": "Phone",
    "year": "Year of study",
}

AGE_MIN, AGE_MAX = 1, 120
YEAR_MIN, YEAR_MAX = 1, 10


def _clean(value):
    """Turn anything into a trimmed string. None becomes ''."""
    if value is None:
        return ""
    return str(value).strip()


def _parse_int(value):
    """Return (integer, error_message).

    Accepts 20 and "20" but rejects 20.5, "20.5", "abc", "" and True/False.
    Being strict here is what stops "twenty" reaching an INTEGER column.
    """
    # bool is a subclass of int in Python, so check it FIRST and reject.
    if isinstance(value, bool):
        return None, "must be a whole number"

    if isinstance(value, int):
        return value, None

    text = _clean(value)
    if text == "":
        return None, "is required"

    # Optional leading minus, then digits only. No decimals, no letters.
    if not re.fullmatch(r"-?\d+", text):
        return None, "must be a whole number"

    return int(text), None


def validate_student(payload):
    """Validate a create/update payload.

    Returns (cleaned_data, errors):
      * cleaned_data - a dict ready to be written to SQLite
      * errors       - {field_name: "message"}; empty dict means valid
    """
    if not isinstance(payload, dict):
        return {}, {"_payload": "Request body must be a JSON object"}

    errors = {}
    cleaned = {}

    # ---------- text fields ----------
    for field in ["student_id", "full_name", "email", "course", "gender", "phone"]:
        value = _clean(payload.get(field))

        # Required + empty -> error
        if field in REQUIRED_FIELDS and value == "":
            errors[field] = f"{FIELD_LABELS[field]} is required"
            continue

        # Too long -> error
        limit = MAX_LENGTHS.get(field)
        if limit and len(value) > limit:
            errors[field] = f"{FIELD_LABELS[field]} must be {limit} characters or fewer"
            continue

        cleaned[field] = value

    # ---------- email format ----------
    # Only check the format if the email was not already flagged as missing.
    if "email" not in errors and cleaned.get("email"):
        if not EMAIL_PATTERN.match(cleaned["email"]):
            errors["email"] = "Enter a valid email address (e.g. name@example.com)"
        else:
            # Store emails in lowercase so "Ama@X.com" and "ama@x.com"
            # cannot both be registered.
            cleaned["email"] = cleaned["email"].lower()

    # ---------- age (required integer) ----------
    if "age" not in payload or _clean(payload.get("age")) == "":
        errors["age"] = "Age is required"
    else:
        age, message = _parse_int(payload.get("age"))
        if message:
            errors["age"] = f"Age {message}"
        elif not (AGE_MIN <= age <= AGE_MAX):
            errors["age"] = f"Age must be between {AGE_MIN} and {AGE_MAX}"
        else:
            cleaned["age"] = age

    # ---------- year (optional integer) ----------
    raw_year = payload.get("year")
    if raw_year is None or _clean(raw_year) == "":
        cleaned["year"] = None  # optional -> store as NULL
    else:
        year, message = _parse_int(raw_year)
        if message:
            errors["year"] = f"Year {message}"
        elif not (YEAR_MIN <= year <= YEAR_MAX):
            errors["year"] = f"Year must be between {YEAR_MIN} and {YEAR_MAX}"
        else:
            cleaned["year"] = year

    # ---------- gender (optional, but constrain the vocabulary) ----------
    if cleaned.get("gender") and cleaned["gender"] not in {"Female", "Male", "Other"}:
        errors["gender"] = "Gender must be Female, Male or Other"

    return cleaned, errors
