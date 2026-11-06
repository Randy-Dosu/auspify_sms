/**
 * ConfirmDialog
 * -------------
 * A modal that asks "are you sure?" before a destructive action (delete).
 *
 * STEP 1: rendered only, and previewed through a temporary "Preview delete
 * dialog" button in App so you can see it. The delete flow itself is built in
 * Step 3.
 *
 * Props
 *  - isOpen       : whether the dialog is visible
 *  - title        : heading text
 *  - message      : body text (ReactNode, so we can bold the student name)
 *  - confirmLabel : text on the destructive button
 *  - cancelLabel  : text on the safe button
 *  - onConfirm    : called when the user accepts
 *  - onCancel     : called when the user declines / presses Escape
 */
import { useEffect } from 'react'

function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  // Let the user press Escape to cancel - a small but expected detail.
  // The listener is only attached while the dialog is open.
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    // Clicking the dark backdrop cancels the action.
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel?.()
      }}
    >
      {/* role="dialog" + aria-modal tell assistive tech this is a modal */}
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h2 className="dialog__title" id="confirm-dialog-title">
          {title}
        </h2>

        <div className="dialog__body">{message}</div>

        <div className="dialog__actions">
          {/* Cancel is first in the DOM so it gets focus first: the safe option */}
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
