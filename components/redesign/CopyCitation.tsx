'use client'

import { useEffect, useRef, useState } from 'react'

import { CONTROL_BASE, HAIRLINE, MICRO_LABEL, PRESS } from './tokens'

export interface CopyCitationProps {
  cite: string
  compact?: boolean
  copiedLabel?: string
}

// CONTROL_BASE, not LABEL_BASE: this renders once per publication row, so
// a shouted mono-caps label would blow the micro-label budget on
// /publications by itself. Gives the mono font/size with no colour baked
// in -- see the matching comment in Button.tsx for why the colour and
// border utilities are chosen per branch instead of layered on a fixed
// class.
const SHAPE = `inline-flex min-h-11 min-w-11 items-center justify-center ${CONTROL_BASE} leading-none`

// `navigator.platform`/`navigator.userAgent` say what OS the device runs,
// not whether it has a keyboard -- a touch phone can read as neither Mac
// nor definitively "not Mac" in any way that implies a keyboard exists, and
// a Mac laptop in tablet mode is still keyboard-equipped. `(pointer:
// coarse)` asks the right question instead: is the primary input imprecise
// (touch), as opposed to a mouse/trackpad. Exported so `copyFallbackMessage`
// below (and e2e) can be exercised without mounting the component.
export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches)
}

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? navigator.userAgent)
}

/**
 * The message shown once the citation text has been selected as a
 * manual-copy fallback, after the Clipboard API is unavailable or its write
 * rejects. A pure function of the two device facts it depends on, so its
 * branching is unit-testable without mounting React or mocking
 * `navigator`/`matchMedia`. Sentence case, not a shouted mono label -- this
 * reads as a message, not a data column head (label-budget.spec.ts).
 */
export function copyFallbackMessage({ coarsePointer, mac }: { coarsePointer: boolean; mac: boolean }): string {
  // A coarse (touch) pointer has no keyboard to press a key on -- the
  // citation text is already selected, so point the reader at their
  // platform's own copy action instead of an invented keystroke.
  if (coarsePointer) return "Use your device's copy action"
  return `Press ${mac ? '⌘C' : 'Ctrl+C'} to copy`
}

export function CopyCitation({ cite, compact = false, copiedLabel }: CopyCitationProps) {
  const [copied, setCopied] = useState(false)
  // '', not null: keeps the aria-live region's rendered content a plain
  // string always, so React never toggles it in and out of the DOM --
  // some assistive technology only reliably announces a change to an
  // already-present live region, not one that appears at the same time as
  // its content.
  const [fallback, setFallback] = useState('')
  // Typed via the bare (unprefixed) setTimeout/clearTimeout, not
  // window.setTimeout: with @types/node in scope (as it is for the whole
  // project), `window.setTimeout` and the ambient `setTimeout` type
  // -check to different return types (`number` vs `NodeJS.Timeout`) even
  // though they're the same function at runtime in a browser -- mixing the
  // two would make the ref's assignment fail type-check.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Off-screen but selectable -- selectNodeContents/Range work on a
  // visually hidden node, so the fallback can select the full citation for
  // a manual Cmd/Ctrl+C even though the button's own visible text is just
  // its label ("Copy citation"), never the citation itself.
  const hiddenTextRef = useRef<HTMLSpanElement>(null)

  // Clear any pending revert if the component unmounts mid-timeout.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    }
  }, [])

  function selectHiddenCitationText() {
    const node = hiddenTextRef.current
    if (!node || typeof window === 'undefined') return
    const range = document.createRange()
    range.selectNodeContents(node)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  const copy = async () => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    // navigator.clipboard is undefined on insecure origins (non-HTTPS,
    // non-localhost). `navigator.clipboard?.writeText(cite)` alone would
    // short-circuit to `undefined` here, and `await undefined` does not
    // throw -- so a bare optional-chained call falls through to a false
    // "copied" success instead of silently doing nothing. Route both the
    // missing-API and the rejected-write cases through the same fallback
    // below rather than returning early: neither may fail silently
    // (Review Focus 4 / the task brief).
    if (navigator.clipboard) {
      try {
        // Pass `cite` straight through, untouched: it is a case-sensitive
        // citation string, never reformatted for display.
        await navigator.clipboard.writeText(cite)
        setFallback('')
        setCopied(true)
        timeoutRef.current = setTimeout(() => setCopied(false), 1800)
        return
      } catch {
        // Clipboard write rejected (denied permission, or unsupported).
        // Fall through to the manual-select fallback below.
      }
    }
    setCopied(false)
    selectHiddenCitationText()
    setFallback(copyFallbackMessage({ coarsePointer: isCoarsePointer(), mac: isMac() }))
  }

  // Sentence case, not shouted caps: these literal strings are what the
  // accessible name and the rendered text actually are -- no CSS transform
  // uppercases them.
  const restLabel = compact ? 'Cite' : 'Copy citation'
  const doneLabel = compact ? '✓' : copiedLabel || '✓ Copied'
  const border = copied ? 'border border-link' : HAIRLINE
  const color = copied ? 'text-link' : 'text-text-muted'
  const sizing = compact ? 'px-2 py-1' : 'px-3 py-2'

  return (
    <span className="inline-flex items-baseline gap-2">
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
      {/* The visible fallback message and its screen-reader announcement
          share this one element -- text placed inside an aria-live="polite"
          region is announced when it changes, so no separate visually
          hidden live region is needed. MICRO_LABEL (13px, sentence case):
          large enough to sit outside label-budget.spec.ts's <=12px shouted-
          caps scan by size alone, and it already reads as a message, not a
          data label. */}
      <span role="status" aria-live="polite" className={MICRO_LABEL}>
        {fallback}
      </span>
      <span ref={hiddenTextRef} data-testid="copy-citation-text" className="sr-only">
        {cite}
      </span>
    </span>
  )
}
