/**
 * scrollTo.js - tiny DOM helpers.
 *
 * Why a helper? `element.scrollIntoView()` is not implemented everywhere
 * (very old browsers, jsdom, some embedded webviews). Calling it unguarded
 * throws a TypeError inside an event handler, which React reports as a
 * console error and can interrupt whatever the handler was doing.
 *
 * These helpers fail silently instead: scrolling is a nice-to-have, never a
 * requirement for the app to work.
 */

/**
 * Smoothly scroll an element into view and focus it.
 * @param {string} id - element id, e.g. "full_name"
 */
export function scrollToAndFocus(id) {
  const element = document.getElementById(id)
  if (!element) return

  if (typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // focus() may also be missing in exotic environments - guard it too.
  if (typeof element.focus === 'function') element.focus({ preventScroll: true })
}
