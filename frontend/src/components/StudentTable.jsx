/**
 * StudentTable
 * ------------
 * Displays the students returned by the API.
 *
 * STEP 4: live data.
 *  - Rows come from App, which fetches them from GET /api/students.
 *  - Column headers are buttons that request a sort; the active column shows
 *    a ▲ / ▼ arrow and aria-sort so screen readers know the order too.
 *  - Shows a loading state, an error state, and an empty state.
 *
 * Props
 *  - students   : array of student objects
 *  - sort       : currently sorted field, e.g. "full_name"
 *  - order      : 'asc' | 'desc'
 *  - onSort     : (field) => void
 *  - onEdit     : (student) => void   (Step 3)
 *  - onDelete   : (student) => void   (Step 3)
 *  - onAddFirst : () => void          (used by the empty state)
 *  - isLoading  : a fetch is in flight
 *  - error      : error message string, or null
 *  - onRetry    : () => void          (re-run the fetch)
 *  - searchTerm : shown in the empty state so the message makes sense
 */

// [field, label, sortable]  - the single source of truth for the columns.
const COLUMNS = [
  ['student_id', 'Student ID', true],
  ['full_name', 'Full name', true],
  ['age', 'Age', true],
  ['gender', 'Gender', true],
  ['email', 'Email', true],
  ['phone', 'Phone', false], // sorting by phone adds nothing
  ['course', 'Course', true],
  ['year', 'Year', true],
]

function SortArrow({ active, order }) {
  if (!active) return <span className="th__arrow th__arrow--idle">↕</span>
  return <span className="th__arrow">{order === 'asc' ? '▲' : '▼'}</span>
}

function StudentTable({
  students = [],
  sort = 'created_at',
  order = 'desc',
  onSort,
  onEdit,
  onDelete,
  onAddFirst,
  isLoading = false,
  error = null,
  onRetry,
  searchTerm = '',
}) {
  // ---------- header, reused by every state below ----------
  const header = (
    <div className="card__header">
      <h2 className="card__title" id="table-title">
        Students
      </h2>
      <span className="badge badge--neutral">
        {isLoading && students.length === 0
          ? 'Loading…'
          : `${students.length} ${students.length === 1 ? 'record' : 'records'}`}
      </span>
    </div>
  )

  // ---------- error state ----------
  if (error) {
    return (
      <section className="card" aria-labelledby="table-title">
        {header}
        <div className="empty-state empty-state--error">
          <p className="empty-state__icon" aria-hidden="true">
            ⚠️
          </p>
          <h3 className="empty-state__title">Could not load students</h3>
          <p className="empty-state__text">{error}</p>
          {onRetry && (
            <button type="button" className="btn btn--primary" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      </section>
    )
  }

  // ---------- loading state (first load only) ----------
  if (isLoading && students.length === 0) {
    return (
      <section className="card" aria-labelledby="table-title" aria-busy="true">
        {header}
        <div className="skeleton-table" aria-label="Loading students">
          {[0, 1, 2, 3].map((row) => (
            <div className="skeleton-row" key={row}>
              <span className="skeleton-bar" />
              <span className="skeleton-bar" />
              <span className="skeleton-bar" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  // ---------- empty state ----------
  if (students.length === 0) {
    // Two different messages: "nothing here yet" vs "your search matched nothing".
    const isSearching = searchTerm.trim() !== ''
    return (
      <section className="card" aria-labelledby="table-title">
        {header}
        <div className="empty-state">
          <p className="empty-state__icon" aria-hidden="true">
            {isSearching ? '🔍' : '🎓'}
          </p>
          <h3 className="empty-state__title">
            {isSearching ? 'No matching students' : 'No students yet'}
          </h3>
          <p className="empty-state__text">
            {isSearching
              ? `Nothing matches “${searchTerm}”. Try a different name or student ID.`
              : 'Add your first student using the form to see them listed here.'}
          </p>
          {onAddFirst && !isSearching && (
            <button type="button" className="btn btn--primary" onClick={onAddFirst}>
              Add a student
            </button>
          )}
        </div>
      </section>
    )
  }

  // ---------- normal table ----------
  return (
    <section className="card" aria-labelledby="table-title">
      {header}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {COLUMNS.map(([field, label, sortable]) => {
                const isActive = sort === field
                return (
                  <th
                    key={field}
                    scope="col"
                    // aria-sort tells screen readers the current order.
                    aria-sort={
                      isActive ? (order === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className={`th__button${isActive ? ' th__button--active' : ''}`}
                        onClick={() => onSort?.(field)}
                        title={`Sort by ${label}${isActive ? ` (${order})` : ''}`}
                      >
                        {label}
                        <SortArrow active={isActive} order={order} />
                      </button>
                    ) : (
                      <span className="th__plain">{label}</span>
                    )}
                  </th>
                )
              })}
              <th scope="col" className="table__actions-head">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              // student_id is unique in the database, so it is the safest
              // React key (plain `id` can clash with preview/dummy rows).
              <tr key={student.student_id ?? student.id}>
                <td className="mono">{student.student_id}</td>
                <td className="table__name">{student.full_name}</td>
                <td>{student.age}</td>
                <td>{student.gender || '—'}</td>
                <td className="table__email">{student.email}</td>
                <td className="mono">{student.phone || '—'}</td>
                <td>{student.course}</td>
                <td>{student.year ? `Year ${student.year}` : '—'}</td>
                <td>
                  <div className="table__actions">
                    <button
                      type="button"
                      className="btn btn--small btn--edit"
                      onClick={() => onEdit?.(student)}
                      aria-label={`Edit ${student.full_name}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--small btn--danger"
                      onClick={() => onDelete?.(student)}
                      aria-label={`Delete ${student.full_name}`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* A quiet hint that a refresh is happening while old rows stay visible */}
      {isLoading && <p className="table__refreshing">Refreshing…</p>}
    </section>
  )
}

export default StudentTable
