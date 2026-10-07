// The footer's light/dark switch (ThemeToggle.tsx), as pure functions.
//
// Behaviour agreed with Brett: two choices, Light and Dark. A visit starts
// on the device's own setting; a click holds for the rest of that visit
// (sessionStorage), so a new visit follows the device again. The choice
// lives on <html data-scheme="light|dark">; styles/index.css and
// lib/theme.ts read it. With no attribute the device setting applies,
// exactly as before the switch existed, and also without JavaScript.

export type ColorScheme = 'light' | 'dark'

export const SCHEME_STORAGE_KEY = 'hl-color-scheme'

/** Narrows a stored or attribute value; anything unknown means "no choice". */
export function parseStoredScheme(value: unknown): ColorScheme | null {
  return value === 'light' || value === 'dark' ? value : null
}

/** What the page is showing: the visitor's choice, else the device's. */
export function effectiveScheme(
  choice: ColorScheme | null,
  prefersDark: boolean
): ColorScheme {
  return choice ?? (prefersDark ? 'dark' : 'light')
}

export function otherScheme(scheme: ColorScheme): ColorScheme {
  return scheme === 'dark' ? 'light' : 'dark'
}

/** The button's accessible name while `showing` is on screen. */
export function switchLabel(showing: ColorScheme): string {
  return `Switch to ${otherScheme(showing)} theme`
}

/**
 * Inlined into <head> by app/layout.tsx so this visit's choice is back on
 * <html> before the first paint, with no flash of the other scheme on
 * reload. Storage can throw (blocked site data, some private modes); the
 * device setting then applies.
 */
export const SCHEME_INIT_SCRIPT = `(function(){try{var s=sessionStorage.getItem(${JSON.stringify(
  SCHEME_STORAGE_KEY
)});if(s==='light'||s==='dark')document.documentElement.setAttribute('data-scheme',s)}catch(e){}})()`
