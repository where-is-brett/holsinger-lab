'use client'

import { useEffect, useRef, useState } from 'react'

import { HAIRLINE, LABEL_BASE, PRESS } from './tokens'

export interface CopyCitationProps {
  cite: string
  compact?: boolean
  copiedLabel?: string
}

// LABEL_BASE gives the mono caps font/size/case with no colour baked in --
// see the matching comment in Button.tsx for why the colour and border
// utilities are chosen per branch instead of layered on a fixed class.
const SHAPE = `inline-flex min-h-11 min-w-11 items-center justify-center ${LABEL_BASE} leading-none`

export function CopyCitation({ cite, compact = false, copiedLabel }: CopyCitationProps) {
  const [copied, setCopied] = useState(false)
  // Typed via the bare (unprefixed) setTimeout/clearTimeout, not
  // window.setTimeout: with @types/node in scope (as it is for the whole
  // project), `window.setTimeout` and the ambient `setTimeout` type
  // -check to different return types (`number` vs `NodeJS.Timeout`) even
  // though they're the same function at runtime in a browser -- mixing the
  // two would make the ref's assignment fail type-check.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear any pending revert if the component unmounts mid-timeout.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    }
  }, [])

  const copy = async () => {
    // navigator.clipboard is undefined on insecure origins (non-HTTPS,
    // non-localhost). `navigator.clipboard?.writeText(cite)` alone would
    // short-circuit to `undefined` here, and `await undefined` does not
    // throw -- so a bare optional-chained call falls through to a false
    // "copied" success instead of silently doing nothing. Bail out first.
    if (!navigator.clipboard) return
    try {
      // Pass `cite` straight through, untouched: it is a case-sensitive
      // citation string, never reformatted for display.
      await navigator.clipboard.writeText(cite)
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
      setCopied(true)
      timeoutRef.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard write rejected (denied permission). Leave the control in
      // its rest state rather than showing a false success.
    }
  }

  const restLabel = compact ? 'CITE' : 'COPY CITATION'
  const doneLabel = compact ? '✓' : copiedLabel || '✓ COPIED'
  const border = copied ? 'border border-link' : HAIRLINE
  const color = copied ? 'text-link' : 'text-text-muted'
  const sizing = compact ? 'px-2 py-1' : 'px-3 py-2'

  return (
    <button
      type="button"
      onClick={copy}
      // Stable accessible name across the copied/rest swap, matching the
      // convention in components/pages/publications/CopyButton.tsx -- a
      // test or screen reader locating the control by name would otherwise
      // lose it the instant a copy succeeds.
      aria-label={restLabel}
      className={`${SHAPE} ${border} ${color} ${sizing} ${PRESS}`}
    >
      {copied ? doneLabel : restLabel}
    </button>
  )
}
