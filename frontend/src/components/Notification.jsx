/**
 * Notification
 * ------------
 * A small dismissible banner used to tell the user what happened, e.g.
 * "Student added successfully" or "Email already exists".
 *
 * STEP 1: the component is built and previewed with fixed text.
 * STEP 2+: App will control it with real success/error messages from the API.
 *
 * Props
 *  - type    : 'success' | 'error' | 'info'  (controls colour + icon)
 *  - message : the text to display
 *  - onClose : optional callback for the dismiss (x) button
 */
const ICONS = {
  success: '✓',
  error: '✕',
  info: 'i',
}

function Notification({ type = 'info', message, onClose }) {
  // Nothing to show -> render nothing at all (keeps the DOM clean).
  if (!message) return null

  return (
    // role="status" lets screen readers announce the message politely.
    <div className={`notification notification--${type}`} role="status">
      <span className="notification__icon" aria-hidden="true">
        {ICONS[type] ?? ICONS.info}
      </span>
      <p className="notification__message">{message}</p>

      {onClose && (
        <button
          type="button"
          className="notification__close"
          onClick={onClose}
          aria-label="Dismiss notification"
        >
          &times;
        </button>
      )}
    </div>
  )
}

export default Notification
