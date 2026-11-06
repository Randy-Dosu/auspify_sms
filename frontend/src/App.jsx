/**
 * App - the root component.
 *
 * STEP 2: creating students for real.
 * -----------------------------------
 * The table still shows dummy data here; Step 4 replaces it with a live
 * GET /api/students. What IS real now: submitting the form validates in the
 * browser, then POSTs to Flask, and handles 201 / 400 / 409 responses.
 *
 * State owned here (the "single source of truth" pattern):
 *  - students    : rows shown in the table (dummy data for now)
 *  - formValues  : what is typed in StudentForm
 *  - fieldErrors : { field: message } from client OR server validation
 *  - isEditing   : whether the form is in edit mode
 *  - isSubmitting: a request is in flight
 *  - searchTerm  : text in SearchBar
 *  - dialog      : which student we are asking to delete (null = closed)
 *  - notice      : { type, message } for the Notification banner
 */
import { useState } from 'react'

import StudentForm from './components/StudentForm'
import StudentTable from './components/StudentTable'
import SearchBar from './components/SearchBar'
import ConfirmDialog from './components/ConfirmDialog'
import Notification from './components/Notification'
import { dummyStudents } from './data/dummyStudents'
import { createStudent, updateStudent, deleteStudent, ApiError } from './api'
import { validateStudent, toApiPayload } from './utils/validateStudent'
import { scrollToAndFocus } from './utils/scrollTo'
import './App.css'

// The shape of an empty form. One place means "Clear" and "Cancel" always
// produce the same reset state.
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
  const [fieldErrors, setFieldErrors] = useState({})
  // The database id of the record currently loaded in the form (null = new).
  const [editingId, setEditingId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogStudent, setDialogStudent] = useState(null) // null = closed
  const [notice, setNotice] = useState(null) // null = nothing to show

  // ---------- helpers ----------
  const notify = (type, message) => setNotice({ type, message })

  const resetForm = () => {
    setFormValues(EMPTY_FORM)
    setFieldErrors({})
    setIsEditing(false)
    setEditingId(null)
  }

  // ---------- handlers passed to children ----------

  // 1) Typing in the form. Clearing the error for the field being edited is a
  //    small touch that stops stale red text hanging around.
  const handleFormChange = (field, value) => {
    setFormValues((previous) => ({ ...previous, [field]: value }))
    setFieldErrors((previous) => {
      if (!previous[field]) return previous // no change -> no re-render
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  // 2) Submitting the form -> validate, then POST (create) or PUT (update).
  const handleFormSubmit = async () => {
    setNotice(null)

    // (a) Client-side validation for instant feedback.
    const clientErrors = validateStudent(formValues)
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      notify('error', 'Please fix the highlighted fields before saving.')
      return
    }

    // (b) Ask the server.
    setIsSubmitting(true)
    try {
      const payload = toApiPayload(formValues)
      const saved = isEditing
        ? await updateStudent(editingId, payload)
        : await createStudent(payload)

      // Replace the row if it exists, otherwise add it at the top.
      // Matching on student_id (the natural unique key) also covers the case
      // where the user changed the record's id.
      setStudents((previous) => [
        saved,
        ...previous.filter(
          (student) =>
            student.id !== saved.id && student.student_id !== saved.student_id,
        ),
      ])

      const wasEditing = isEditing
      resetForm()
      notify(
        'success',
        wasEditing
          ? `${saved.full_name} was updated successfully.`
          : `${saved.full_name} was added successfully (ID ${saved.student_id}).`,
      )
    } catch (error) {
      if (error instanceof ApiError) {
        // 400 / 409 both carry per-field messages we can show inline.
        if (Object.keys(error.fields).length > 0) {
          setFieldErrors(error.fields)
          notify('error', 'Could not save: ' + error.message + '.')
        } else {
          notify('error', error.message)
        }
      } else {
        // Unexpected (a bug in our own code) - still keep the UI usable.
        notify('error', 'Something went wrong: ' + error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearForm = () => {
    resetForm()
    setNotice(null)
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
    setFieldErrors({})
    setIsEditing(true)
    setEditingId(student.id ?? null)
    setNotice(null)
    // Scroll the form into view so the user sees where the data went.
    scrollToAndFocus('full_name')
  }

  // 4) Delete button opens the confirmation dialog
  const handleDeleteRequest = (student) => setDialogStudent(student)

  const handleDeleteCancel = () => {
    setDialogStudent(null)
    notify('info', 'Delete cancelled — nothing was removed.')
  }

  // Confirmed delete -> DELETE /api/students/:id
  const handleDeleteConfirm = async () => {
    const target = dialogStudent
    if (!target) return

    setDialogStudent(null) // close the modal immediately
    setIsSubmitting(true)
    try {
      await deleteStudent(target.id)
      setStudents((previous) => previous.filter((s) => s.id !== target.id))

      // If the deleted student was loaded in the form, clear it so the form
      // cannot PUT to a row that no longer exists.
      if (editingId === target.id) resetForm()

      notify('success', `${target.full_name} was deleted.`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // Already gone (maybe another tab deleted it) -> reconcile the UI.
        setStudents((previous) => previous.filter((s) => s.id !== target.id))
        notify('info', 'That student was already deleted.')
      } else {
        notify('error', error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
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
                Auspify SMS · add students to a live SQLite database
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Page body ---------- */}
      <main className="main">
        <Notification
          type={notice?.type}
          message={notice?.message}
          onClose={() => setNotice(null)}
        />

        <div className="layout">
          <div className="layout__form">
            <StudentForm
              values={formValues}
              onChange={handleFormChange}
              onSubmit={handleFormSubmit}
              onClear={handleClearForm}
              isEditing={isEditing}
              onCancelEdit={resetForm}
              errors={fieldErrors}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Which record was written last - proof the API call worked. */}
          <aside className="card state-panel">
            <div className="card__header">
              <h2 className="card__title">Last saved to the database</h2>
            </div>
            <pre className="state-panel__json">
              {students.length > 0 && students[0].id
                ? JSON.stringify(students[0], null, 2)
                : 'Nothing saved yet — add a student.'}
            </pre>
            <p className="state-panel__hint">
              This is the object Flask returned after saving. Step 4 replaces
              this panel with the real table loaded from{' '}
              <code>GET /api/students</code>.
            </p>
          </aside>
        </div>

        <div className="toolbar">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={handleSearchClear}
            resultCount={students.length}
          />

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
              onClick={() => setStudents(dummyStudents)}
            >
              Restore list
            </button>
          </div>
        </div>

        <StudentTable
          students={students}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onAddFirst={() => scrollToAndFocus('full_name')}
        />
      </main>

      <footer className="footer">
        <p>Flask + React + SQLite · built step by step</p>
      </footer>

      {/* Modal lives at the end so it sits above everything.
          confirmLabel is explicit on purpose: plain "Delete" would put two
          buttons with the same text on screen (row + modal). */}
      <ConfirmDialog
        isOpen={Boolean(dialogStudent)}
        confirmLabel="Yes, delete"
        title="Delete student?"
        message={
          <>
            You are about to delete <strong>{dialogStudent?.full_name}</strong>{' '}
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
