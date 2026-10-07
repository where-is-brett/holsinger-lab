'use client'

import { useEffect } from 'react'

import {
  effectiveScheme,
  otherScheme,
  parseStoredScheme,
  SCHEME_STORAGE_KEY,
  switchLabel,
} from './colorScheme'

// The footer's light/dark switch. Which icon and label show is decided by
// CSS alone (`.scheme-when-light` / `.scheme-when-dark` in styles/index.css,
// keyed on the device setting and <html data-scheme>), so the server render
// is already right and nothing here can mismatch on hydration. JavaScript
// only handles the click. See colorScheme.ts for the agreed behaviour.

const BUTTON =
  'inline-flex size-7 shrink-0 items-center justify-center self-start rounded-full text-text-faint transition-colors duration-(--sem-motion-fast) ease-(--sem-ease) hover:text-text md:self-auto'

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="block"
    >
      <path
        d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="block"
    >
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
    </svg>
  )
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Points the browser's address-bar colour at the page surface now showing.
 * The `theme-color` metas carry device media queries, which a picked scheme
 * would otherwise contradict.
 */
function syncThemeColor() {
  const surface = getComputedStyle(document.documentElement)
    .getPropertyValue('--sem-surface')
    .trim()
  if (!surface) return
  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]'
  )) {
    meta.content = surface
  }
}

export function ThemeToggle() {
  // A choice restored by the <head> script on reload: bring the address bar
  // along with it.
  useEffect(() => {
    if (parseStoredScheme(document.documentElement.dataset.scheme))
      syncThemeColor()
  }, [])

  function toggle() {
    const root = document.documentElement
    const next = otherScheme(
      effectiveScheme(parseStoredScheme(root.dataset.scheme), prefersDark())
    )
    root.dataset.scheme = next
    try {
      sessionStorage.setItem(SCHEME_STORAGE_KEY, next)
    } catch {
      // Storage blocked: the switch still works until the next reload.
    }
    syncThemeColor()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={BUTTON}
      data-testid="theme-toggle"
    >
      <span className="scheme-when-light">
        <MoonIcon />
        <span className="sr-only">{switchLabel('light')}</span>
      </span>
      <span className="scheme-when-dark">
        <SunIcon />
        <span className="sr-only">{switchLabel('dark')}</span>
      </span>
    </button>
  )
}
