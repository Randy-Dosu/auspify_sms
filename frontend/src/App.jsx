/**
 * App - the root component.
 *
 * STEP 1: static UI.
 * ------------------
 * Everything you see is local React state filled with DUMMY data. There are
 * NO fetch calls in this step. The buttons are wired to handlers that display
 * a notification, which proves the whole component tree is connected.
 *
 * State owned here (the "single source of truth" pattern):
 *  - students  : rows shown in the table (dummy data for now)
 *  - formValues: what is typed in StudentForm
 *  - isEditing : whether the form is in edit mode
 *  - searchTerm: text in SearchBar
 *  - dialog    : which student we are asking to delete (null = dialog closed)
 *  - notice    : { type, message } for the Notification banner
 */
import { useState } from 'react'

import StudentForm from './components/StudentForm'
import StudentTable from './components/StudentTable'
import SearchBar from './components/SearchBar'
import ConfirmDialog from './components/ConfirmDialog'
import Notification from './components/Notification'
import { dummyStudents } from './data/dummyStudents'
import './App.css'

// The shape of an empty form. Keeping it in one place means "Clear" and
// "Add another" always produce the same reset state.
const EMPTY_FORM = {
  full_name: '',
  student_id: '',
  age: '',
  gender: '',
  email: '',
  phone: '',
  course: '',
  year: '',
}

function App() {
  const [students, setStudents] = useState(dummyStudents)
  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogStudent, setDialogStudent] = useState(null) // null = closed
  const [notice, setNotice] = useState(null) // null = nothing to show

  // ---------- helpers ----------
  const notify = (type, message) => setNotice({ type, message })

  const resetForm = () => {
    setFormValues(EMPTY_FORM)
    setIsEditing(false)
  }

  // ---------- handlers passed to children ----------

  // 1) Typing in the form
  const handleFormChange = (field, value) => {
    setFormValues((previous) => ({ ...previous, [field]: value }))
  }

  // 2) Submitting the form.
  //    STEP 1 stops here on purpose: it just reports what WOULD be saved.
  const handleFormSubmit = () => {
    // Collect a readable summary of whatever is filled in, so you can see
    // that the inputs really are controlled.
    const filled = Object.entries(formValues).filter(
      ([, value]) => String(value).trim() !== '',
    )

    if (filled.length === 0) {
      notify('info', 'The form is empty. Type something first, then submit.')
      return
    }

    notify(
      'success',
      `Form captured ${filled.length} field(s). Saving to the database comes in Step 2.`,
    )
  }

  const handleClearForm = () => {
    resetForm()
    notify('info', 'Form cleared.')
  }

  // 3) Edit button in a table row (real behaviour arrives in Step 3)
  const handleEdit = (student) => {
    setFormValues({
      full_name: student.full_name,
      student_id: student.student_id,
      age: String(student.age),
      gender: student.gender ?? '',
      email: student.email,
      phone: student.phone ?? '',
      course: student.course,
      year: String(student.year ?? ''),
    })
    setIsEditing(true)
    notify('info', `Loaded ${student.full_name} into the form (editing arrives in Step 3).`)
  }

  // 4) Delete button opens the confirmation dialog
  const handleDeleteRequest = (student) => setDialogStudent(student)

  const handleDeleteCancel = () => {
    setDialogStudent(null)
    notify('info', 'Delete cancelled — nothing was removed.')
  }

  const handleDeleteConfirm = () => {
    // STEP 1 only shows the dialog; actual removal is Step 3.
    notify('info', `Delete confirmed for ${dialogStudent?.full_name} (not removed yet).`)
    setDialogStudent(null)
  }

  // 5) Search box - stored, but filtering is Step 4.
  const handleSearchClear = () => setSearchTerm('')

  return (
    <div className="app">
      {/* ---------- Top bar ---------- */}
      <header className="topbar">
        <div className="topbar__inner">
          <div className="topbar__brand">
            <span className="topbar__logo" aria-hidden="true">
              🎓
            </span>
            <div>
              <h1 className="topbar__title">Student Management System</h1>
              <p className="topbar__subtitle">
                Auspify SMS · Step 1 static interface (dummy data, no API yet)
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Page body ---------- */}
      <main className="main">
        {/* Notification banner (reusable, Step 2 will drive it with API results) */}
        <Notification
          type={notice?.type}
          message={notice?.message}
          onClose={() => setNotice(null)}
        />

        {/* Form + a live preview of the raw state, side by side on wide screens */}
        <div className="layout">
          <div className="layout__form">
            <StudentForm
              values={formValues}
              onChange={handleFormChange}
              onSubmit={handleFormSubmit}
              onClear={handleClearForm}
              isEditing={isEditing}
              onCancelEdit={() => {
                resetForm()
                notify('info', 'Edit cancelled.')
              }}
            />
          </div>

          {/* This panel exists only in Step 1 so you can SEE that the form is
              controlled. It is deleted in Step 2. */}
          <aside className="card state-panel">
            <div className="card__header">
              <h2 className="card__title">Live form state</h2>
              <span className="badge badge--neutral">demo only</span>
            </div>
            <pre className="state-panel__json">
              {JSON.stringify(formValues, null, 2)}
            </pre>
            <p className="state-panel__hint">
              Every keystroke updates this object. In Step 2 this exact object is
              what gets sent to <code>POST /api/students</code>.
            </p>
          </aside>
        </div>

        {/* Search + table */}
        <div className="toolbar">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={handleSearchClear}
            resultCount={students.length}
          />

          {/* Temporary helpers so you can preview both extra components. */}
          <div className="toolbar__demo">
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => setDialogStudent(students[0] ?? { full_name: 'a student' })}
            >
              Preview delete dialog
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => setStudents([])}
            >
              Preview empty state
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => {
                setStudents(dummyStudents)
                notify('info', 'Dummy data restored.')
              }}
            >
              Restore dummy data
            </button>
          </div>
        </div>

        <StudentTable
          students={students}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onAddFirst={() => {
            document
              .getElementById('full_name')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            document.getElementById('full_name')?.focus()
          }}
        />
      </main>

      <footer className="footer">
        <p>Flask + React + SQLite · built step by step</p>
      </footer>

      {/* Modal lives at the end so it sits above everything.
          confirmLabel is explicit on purpose: plain "Delete" would put two
          buttons with the same text on screen (row + modal), which is
          confusing for users and for tests. */}
      <ConfirmDialog
        isOpen={Boolean(dialogStudent)}
        confirmLabel="Yes, delete"
        title="Delete student?"
        message={
          <>
            You are about to delete{' '}
            <strong>{dialogStudent?.full_name}</strong>{' '}
            ({dialogStudent?.student_id}). This cannot be undone.
          </>
        }
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

export default App
