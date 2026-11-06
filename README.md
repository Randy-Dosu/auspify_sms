# Student Management System

A small, complete full-stack CRUD application for managing student records.

* **Backend:** Python 3, Flask, Flask-CORS, SQLite (the built-in `sqlite3` module)
* **Frontend:** React (Vite), functional components and hooks, plain CSS
* **Tests:** pytest — 126 tests, all passing

Built step by step, one verified stage at a time: project setup → static UI →
create → update & delete → display/search/sort → tests.

---

## Features

- Create, read, update and delete student records
- Server-side validation with per-field error messages
- Automatic database and table creation on first run
- Duplicate protection for `student_id` and `email` (case-insensitive)
- Live search by name or student ID (debounced, runs in SQL)
- Sortable columns, both directions, with `aria-sort` for screen readers
- Confirmation dialog before deleting
- Success / error / info notifications
- Loading skeletons, empty states, and a friendly offline error with retry
- Fully responsive layout (desktop → tablet → phone)
- Accessible forms: labels, `aria-invalid`, `aria-describedby`, keyboard support

---

## Project structure

```
auspify_sms/
├── README.md
├── LICENSE
├── .gitignore
├── backend/
│   ├── app.py                 # Flask app: all API routes
│   ├── db.py                  # SQLite connection + schema
│   ├── validators.py          # Server-side validation rules
│   ├── requirements.txt       # Python dependencies
│   ├── pytest.ini             # pytest configuration
│   ├── students.db            # created automatically, git-ignored
│   └── tests/
│       ├── conftest.py        # fixtures: temp DB + test client
│       ├── test_health.py     # 4 tests
│       ├── test_create.py     # 46 tests
│       ├── test_read.py       # 30 tests
│       ├── test_read_one.py   # 5 tests
│       ├── test_update.py     # 21 tests
│       ├── test_delete.py     # 10 tests
│       └── test_db.py         # 10 tests
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js         # dev server + /api proxy to Flask
    └── src/
        ├── main.jsx           # React entry point
        ├── App.jsx            # state owner, wires everything together
        ├── App.css            # all styles (plain CSS)
        ├── api.js             # every fetch call lives here
        ├── components/
        │   ├── StudentForm.jsx      # add/edit form + validation display
        │   ├── StudentTable.jsx     # sortable table, empty/loading/error states
        │   ├── SearchBar.jsx        # debounced search input
        │   ├── ConfirmDialog.jsx    # delete confirmation modal
        │   └── Notification.jsx     # success/error/info banner
        └── utils/
            ├── validateStudent.js   # client-side validation
            └── scrollTo.js          # safe scroll/focus helper
```

---

## Setup

Prerequisites: **Python 3.9+** and **Node.js 18+**.

### 1. Backend

```bash
cd backend

# create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# install dependencies
pip install -r requirements.txt

# run the API (creates students.db automatically on first start)
python app.py
```

The API is now at **http://127.0.0.1:5000**.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app is now at **http://localhost:5173**.

> **Why no CORS problems in development?** Vite proxies any request to
> `/api/...` to Flask on port 5000 (see `vite.config.js`), so the browser only
> ever talks to one origin. Flask-CORS is configured too, in case you call the
> API directly from another origin.

### 3. Run the tests

```bash
cd backend
source venv/bin/activate
pip install pytest        # already included in requirements.txt
pytest
```

Expected result: `126 passed`. Each test uses its own temporary database, so
your real `students.db` is never touched.

---

## API reference

Base URL: `http://127.0.0.1:5000/api`

| Method | Endpoint | Query / Body | Success | Errors |
|---|---|---|---|---|
| `GET` | `/health` | – | `200` `{status, service, message}` | – |
| `GET` | `/students` | `?search=`, `?sort=`, `?order=` (all optional) | `200` `{students: [...], count: n}` | `400` invalid `sort`/`order` |
| `GET` | `/students/<id>` | – | `200` student object | `404` not found |
| `POST` | `/students` | JSON student | `201` created student + `Location` header | `400` validation, `409` duplicate |
| `PUT` | `/students/<id>` | JSON student | `200` updated student | `400` validation, `404` not found, `409` duplicate |
| `DELETE` | `/students/<id>` | – | `200` `{message, deleted}` | `404` not found |

### Student object

```json
{
  "id": 1,
  "student_id": "AUS-2024-001",
  "full_name": "Randy Odawutey",
  "age": 19,
  "gender": "Male",
  "email": "randyodawutey@example.com",
  "phone": "+233241112233",
  "course": "Computer Science",
  "year": 3,
  "created_at": "2026-11-06 08:31:06"
}
```

### Field rules

| Field | Required | Rules |
|---|---|---|
| `student_id` | ✅ | max 30 chars, unique (case-insensitive) |
| `full_name` | ✅ | max 120 chars |
| `age` | ✅ | whole number, 1–120 |
| `gender` | – | `Female`, `Male` or `Other` |
| `email` | ✅ | valid format, max 254 chars, unique (case-insensitive), stored lowercase |
| `phone` | – | max 30 chars |
| `course` | ✅ | max 120 chars |
| `year` | – | whole number, 1–10 |

### Listing options

| Parameter | Values | Default |
|---|---|---|
| `search` | any text — matches part of `full_name` **or** `student_id`, case-insensitive | none |
| `sort` | `id`, `student_id`, `full_name`, `age`, `gender`, `email`, `course`, `year`, `created_at` | `created_at` |
| `order` | `asc`, `desc` | `desc` |

Unknown `sort`/`order` values return `400` rather than being ignored — sort
fields are chosen from a whitelist and never interpolated from user input, so
SQL injection is not possible.

### Error format

Every error uses the same shape, so the UI can highlight the exact field:

```json
{
  "error": "Validation failed",
  "errors": {
    "email": "Enter a valid email address (e.g. name@example.com)",
    "age": "Age must be a whole number"
  }
}
```

### Example calls

```bash
# create
curl -X POST http://127.0.0.1:5000/api/students \
  -H "Content-Type: application/json" \
  -d '{"student_id":"AUS-2024-001","full_name":"Ama Serwaa Mensah","age":20,
       "gender":"Female","email":"ama.mensah@example.com",
       "phone":"+233241112233","course":"Computer Science","year":2}'

# list, search and sort
curl "http://127.0.0.1:5000/api/students?search=ama&sort=full_name&order=asc"

# update
curl -X PUT http://127.0.0.1:5000/api/students/1 \
  -H "Content-Type: application/json" \
  -d '{"student_id":"AUS-2024-001","full_name":"Ama S. Mensah","age":21,
       "email":"ama.mensah@example.com","course":"Software Engineering","year":3}'

# delete
curl -X DELETE http://127.0.0.1:5000/api/students/1
```

---

## Test results

```
tests/test_create.py    46 passed
tests/test_read.py      30 passed
tests/test_update.py    21 passed
tests/test_delete.py    10 passed
tests/test_db.py        10 passed
tests/test_read_one.py   5 passed
tests/test_health.py     4 passed
-----------------------------------
126 passed in 0.82s
```

Coverage includes: creating, reading, updating and deleting; every required
field missing or blank; invalid emails; non-numeric and out-of-range ages;
duplicate `student_id` and `email` (including different casing); missing records
returning 404; search; sorting in both directions; invalid sort/order values;
SQL-injection attempts via `sort` and `search`; automatic table creation;
database-level constraints; and test isolation from the real database.

Edge cases deliberately handled:

| Case | Behaviour |
|---|---|
| Empty database | Friendly "No students yet" state with an Add button |
| Duplicate `student_id` / `email` | `409` with the specific field flagged |
| Duplicate with different casing | Still rejected (`COLLATE NOCASE`) |
| Invalid email | `400`, message under the email field |
| Non-numeric or out-of-range age | `400`, message under the age field |
| Missing record | `404` for GET / PUT / DELETE |
| Deleting an already-deleted record | UI reconciles and says "already deleted" |
| Server offline | "Could not reach the server" + Try again button |
| Double-clicking Save | Button disabled while saving — one record only |
| Typing fast in search | Older responses cancelled (`AbortController`) |
| Very long text | Rejected at 30–254 characters depending on the field |
| SQL injection in `sort`/`search` | Rejected or safely parameterised |

---

## Manual end-to-end checklist

Start both servers, then:

1. **Empty state** — stop the API, delete `backend/students.db`, restart. The
   table shows *"No students yet"* and an **Add a student** button.
2. **Create** — fill all fields, click **Add student**. A green notification
   appears, the record shows in the table, the form clears, and the count
   becomes 1.
3. **Required fields** — click **Add student** on an empty form. Five red
   messages appear; nothing is saved.
4. **Bad email** — enter `not-an-email`. A red message appears under the email
   field and nothing is saved.
5. **Bad age** — enter `abc` or `200`. A red message appears under the age field.
6. **Duplicate student ID** — reuse an existing ID. A `409` message appears under
   the Student ID field.
7. **Duplicate email** — reuse an existing email. A `409` message appears under
   the Email field.
8. **Persistence** — stop the Flask server (Ctrl+C), start it again, reload the
   page. Every record is still there.
9. **Search** — type part of a name. The table filters; type part of a student
   ID, it also filters. Clear the box and all rows return.
10. **Empty search result** — search for `zzzz`. *"No matching students"* appears.
11. **Sort** — click **Age** (▲, ascending), click again (▼, descending). Try
    **Full name** too.
12. **Update** — click **Edit** on a row. The form fills and the heading changes
    to *Edit student*. Change the name, click **Update student**. The table shows
    the new value and the row count is unchanged.
13. **Update to a duplicate email** — edit a student and set another student's
    email. The update is rejected and the record is unchanged.
14. **Cancel edit** — click **Edit**, type something, click **Cancel**. Nothing
    changes.
15. **Delete cancel** — click **Delete**, then **Cancel** (or press Escape, or
    click the backdrop). The record is still there.
16. **Delete confirm** — click **Delete**, then **Yes, delete**. The row
    disappears and the count decreases.
17. **Server offline** — stop Flask and refresh. A clear error with a **Try
    again** button appears; restart Flask and press it.
18. **Responsive** — narrow the window below 900px (the form stacks under the
    table's overview card) and below 560px (buttons go full width, the table
    scrolls sideways). Nothing overlaps.
19. **Console** — open DevTools. There are no errors or warnings while you use
    the app.

---

## Suggested improvements

- **Authentication** — login with hashed passwords (Werkzeug's
  `generate_password_hash`), session or JWT auth, and protect the write routes so
  only staff can add, edit or delete.
- **Export to Excel / PDF** — an endpoint using `openpyxl` for `.xlsx` and
  `reportlab` (or WeasyPrint) for PDF, plus an export button on the table.
- **Grades** — a `grades` table (student_id, course, score, term) with a report
  card view and class averages.
- **Attendance** — daily attendance records with a per-student percentage and an
  "at risk" flag below a threshold.
- **Docker** — a `Dockerfile` per service and a `docker-compose.yml` so the whole
  app starts with one command.
- **Pagination** — `?page=` and `?per_page=` on `GET /api/students` once the
  dataset grows past a few hundred rows.
- **Photo uploads** — a `photo` column plus a file upload endpoint.
- **Audit log** — record who changed what and when.
- **Production server** — run Flask behind `gunicorn` and serve the built
  frontend with nginx instead of the Vite dev server.
