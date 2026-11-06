/**
 * StudentTable
 * ------------
 * Displays the list of students in a scrollable table.
 *
 * STEP 1: rows come from dummy data passed in as props. There is no sorting,
 * searching or fetching yet - those land in Step 4. The Edit and Delete
 * buttons are visible and wired to callbacks, but App only shows a
 * notification so you can confirm they are hooked up.
 *
 * Props
 *  - students   : array of student objects to render
 *  - onEdit     : (student) => void   (Step 3 does the real work)
 *  - onDelete   : (student) => void   (Step 3 does the real work)
 *  - onAddFirst : () => void          (used by the empty state)
 */
function StudentTable({ students = [], onEdit, onDelete, onAddFirst }) {
  // ---------- Empty state ----------
  // Rendered when the list has no rows, so the table is never a blank void.
  if (students.length === 0) {
    return (
      <section className="card" aria-labelledby="table-title">
        <div className="card__header">
          <h2 className="card__title" id="table-title">
            Students
          </h2>
        </div>

        <div className="empty-state">
          <p className="empty-state__icon" aria-hidden="true">
            🎓
          </p>
          <h3 className="empty-state__title">No students yet</h3>
          <p className="empty-state__text">
            Add your first student using the form to see them listed here.
          </p>
          {onAddFirst && (
            <button type="button" className="btn btn--primary" onClick={onAddFirst}>
              Add a student
            </button>
          )}
        </div>
      </section>
    )
  }

  // ---------- Normal table ----------
  return (
    <section className="card" aria-labelledby="table-title">
      <div className="card__header">
        <h2 className="card__title" id="table-title">
          Students
        </h2>
        <span className="badge badge--neutral">
          {students.length} {students.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* The wrapper lets the table scroll sideways on small screens
          instead of squashing the columns. */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Student ID</th>
              <th scope="col">Full name</th>
              <th scope="col">Age</th>
              <th scope="col">Gender</th>
              <th scope="col">Email</th>
              <th scope="col">Phone</th>
              <th scope="col">Course</th>
              <th scope="col">Year</th>
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
                <td>{student.email}</td>
                <td className="mono">{student.phone || '—'}</td>
                <td>{student.course}</td>
                <td>{student.year ? `Year ${student.year}` : '—'}</td>
                <td>
                  <div className="table__actions">
                    <button
                      type="button"
                      className="btn btn--small btn--edit"
                      onClick={() => onEdit?.(student)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--small btn--danger"
                      onClick={() => onDelete?.(student)}
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
    </section>
  )
}

export default StudentTable
