/**
 * App - the root component.
 *
 * STEP 4: the table is live.
 * --------------------------
 *  - On mount we GET /api/students and render what the database says.
 *  - Search is debounced (300 ms) and runs on the SERVER via ?search=.
 *  - Clicking a column header flips ?sort= / ?order=.
 *  - After add, update or delete we re-fetch, so the table can never drift
 *    out of sync with the database.
 *
 * State owned here (the "single source of truth" pattern):
 *  - students     : rows shown in the table (from the API)
 *  - isLoading    : a fetch is in flight
 *  - loadError    : message if the fetch failed
 *  - searchInput  : text in the box (updates instantly)
 *  - searchTerm   : the debounced value actually sent to the server
 *  - sort / order : current server-side sort
 *  - formValues   : what is typed in StudentForm
 *  - fieldErrors  : { field: message } from client OR server validation
 *  - editingId    : database id of the record in the form (null = new)
 *  - isSubmitting : a save/delete request is in flight
 *  - dialog       : which student we are asking to delete (null = closed)
 *  - notice       : { type, message } for the Notification banner
 */
import { useCallback, useEffect, useState } from 'react'

import StudentForm from './components/StudentForm'
import StudentTable from './components/StudentTable'
import SearchBar from './components/SearchBar'
import ConfirmDialog from './components/ConfirmDialog'
import Notification from './components/Notification'
import {
  fetchStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  ApiError,
} from './api'
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

// How long to wait after the last keystroke before calling the API.
const SEARCH_DEBOUNCE_MS = 300

function App() {
  const [students, setStudents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('') // debounced
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState('desc')

  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [dialogStudent, setDialogStudent] = useState(null)
  const [notice, setNotice] = useState(null)

  // ---------- helpers ----------
  const notify = (type, message) => setNotice({ type, message })

  const resetForm = () => {
    setFormValues(EMPTY_FORM)
    setFieldErrors({})
    setEditingId(null)
  }

  /**
   * Load students from the server.
   *
   * `signal` lets a newer call cancel an older one, which prevents a slow
   * response from overwriting a newer one (a classic race when typing fast:
   * search "am" then "ama"; if "am" arrives last you would see the wrong rows).
   */
  const loadStudents = useCallback(
    async (signal) => {
      setIsLoading(true)
      try {
        const data = await fetchStudents({ search: searchTerm, sort, order, signal })
        setStudents(data.students)
        setLoadError(null)
      } catch (error) {
        if (error?.name === 'AbortError') return // superseded on purpose
        // Keep any rows already on screen; show the error instead of blanking.
        setLoadError(error.message)
      } finally {
        setIsLoading(false)
      }
    },
    [searchTerm, sort, order],
  )

  // Re-fetch whenever the search term or sort changes, and once on mount.
  // The AbortController is cleaned up when the effect re-runs or unmounts.
  useEffect(() => {
    const controller = new AbortController()
    loadStudents(controller.signal)
    return () => controller.abort()
  }, [loadStudents])

  // Debounce the search box: wait until the user pauses typing.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer) // cancel if they type again quickly
  }, [searchInput])

  // ---------- table handlers ----------

  // Clicking a header sorts by it; clicking the active header flips direction.
  const handleSort = (field) => {
    if (field === sort) {
      setOrder((previous) => (previous === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(field)
      // Start ascending on a new column; a second click flips it.
      setOrder('asc')
    }
  }

  // ---------- form handlers ----------

  const handleFormChange = (field, value) => {
    setFormValues((previous) => ({ ...previous, [field]: value }))
    // Clear the error for the field being edited so stale red text disappears.
    setFieldErrors((previous) => {
      if (!previous[field]) return previous // no change -> no re-render
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

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
      const saved = editingId
        ? await updateStudent(editingId, payload)
        : await createStudent(payload)

      const wasEditing = editingId !== null
      resetForm()

      // (c) Refresh from the server so the table reflects the real database
      //     (and the current search/sort), not just our local guess.
      await loadStudents()

      notify(
        'success',
        wasEditing
          ? `${saved.full_name} was updated successfully.`
          : `${saved.full_name} was added successfully (ID ${saved.student_id}).`,
      )
    } catch (error) {
      if (error instanceof ApiError) {
        if (Object.keys(error.fields).length > 0) {
          setFieldErrors(error.fields)
          notify('error', 'Could not save: ' + error.message + '.')
        } else {
          notify('error', error.message)
        }
      } else {
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
    setEditingId(student.id ?? null)
    setNotice(null)
    // Scroll the form into view so the user sees where the data went.
    scrollToAndFocus('full_name')
  }

  const handleDeleteRequest = (student) => setDialogStudent(student)

  const handleDeleteCancel = () => {
    setDialogStudent(null)
    notify('info', 'Delete cancelled — nothing was removed.')
  }

  const handleDeleteConfirm = async () => {
    const target = dialogStudent
    if (!target) return

    setDialogStudent(null) // close the modal immediately
    setIsSubmitting(true)
    try {
      await deleteStudent(target.id)

      // If the deleted student was loaded in the form, clear it so the form
      // cannot PUT to a row that no longer exists.
      if (editingId === target.id) resetForm()

      await loadStudents()
      notify('success', `${target.full_name} was deleted.`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // Already gone (maybe another tab deleted it) -> reconcile.
        await loadStudents()
        notify('info', 'That student was already deleted.')
      } else {
        notify('error', error.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------- render ----------
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="topbar__brand">
            <span className="topbar__logo" aria-hidden="true">
              🎓
            </span>
            <div>
              <h1 className="topbar__title">Student Management System</h1>
              <p className="topbar__subtitle">
                Auspify SMS · live data from Flask + SQLite
              </p>
            </div>
          </div>
        </div>
      </header>

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
              isEditing={editingId !== null}
              onCancelEdit={resetForm}
              errors={fieldErrors}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Quick stats - a small addition that makes the dashboard feel real */}
          <aside className="card stats-card">
            <div className="card__header">
              <h2 className="card__title">Overview</h2>
            </div>
            <dl className="stats">
              <div className="stats__item">
                <dt>Total students</dt>
                <dd>{isLoading && students.length === 0 ? '—' : students.length}</dd>
              </div>
              <div className="stats__item">
                <dt>Sorting by</dt>
                <dd className="stats__small">
                  {sort} · {order}
                </dd>
              </div>
              <div className="stats__item">
                <dt>Search</dt>
                <dd className="stats__small">{searchTerm || 'none'}</dd>
              </div>
            </dl>
            <p className="state-panel__hint">
              Counts reflect the current search filter.
            </p>
          </aside>
        </div>

        <div className="toolbar">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            onClear={() => setSearchInput('')}
            isSearching={isLoading}
          />
        </div>

        <StudentTable
          students={students}
          sort={sort}
          order={order}
          onSort={handleSort}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onAddFirst={() => scrollToAndFocus('full_name')}
          isLoading={isLoading}
          error={loadError}
          /* Wrapped in an arrow function on purpose: passing `loadStudents`
             directly would hand React's click event to its `signal` parameter,
             which makes fetch reject and leaves the error state stuck. */
          onRetry={() => loadStudents()}
          searchTerm={searchTerm}
        />
      </main>

      <footer className="footer">
        <p>Flask + React + SQLite · built step by step</p>
      </footer>

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
