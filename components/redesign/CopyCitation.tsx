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
  // citation text is already selected and shown below as its own block, so
  // point the reader at their platform's own copy action instead of an
  // invented keystroke.
  if (coarsePointer) return "Use your device's copy action"
  return `Press ${mac ? '⌘C' : 'Ctrl+C'} to copy`
}

export function CopyCitation({ cite, compact = false, copiedLabel }: CopyCitationProps) {
  const [copied, setCopied] = useState(false)
  // '', not null: keeps the aria-live region's rendered content a plain
  // string always, so React never toggles it in and out of the DOM --
  // some assistive technology only reliably announces a change to an
  // already-present live region, not one that appears at the same time as
  // its content. The visible citation block below is a separate concern:
  // it mounts/unmounts with `fallback` (see the JSX), since it must not
  // exist on an ordinary row at all -- see that block's own comment.
  const [fallback, setFallback] = useState('')
  // Incremented on every failed attempt, including a second (or later)
  // failure with the identical message -- `fallback` alone can't drive the
  // re-selection effect below in that case, since setting React state to
  // the same string is a no-op that never re-runs an effect keyed on it.
  // Without this, a reader who cleared the selection (or long-pressed
  // elsewhere) between two failed taps would see the citation text but
  // find nothing actually selected on the second attempt.
  const [fallbackAttempt, setFallbackAttempt] = useState(0)
  // Typed via the bare (unprefixed) setTimeout/clearTimeout, not
  // window.setTimeout: with @types/node in scope (as it is for the whole
  // project), `window.setTimeout` and the ambient `setTimeout` type
  // -check to different return types (`number` vs `NodeJS.Timeout`) even
  // though they're the same function at runtime in a browser -- mixing the
  // two would make the ref's assignment fail type-check.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const citationBlockRef = useRef<HTMLParagraphElement>(null)

  // Clear any pending revert if the component unmounts mid-timeout.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    }
  }, [])

  // Selects the visible citation block's text once it exists. This can't
  // run inside `copy()` itself: the block is only in the DOM once
  // `fallback` is set (see the JSX below), so there is nothing to select
  // until after that state update has actually committed a render.
  useEffect(() => {
    if (!fallback) return
    const node = citationBlockRef.current
    if (!node || typeof window === 'undefined') return
    const range = document.createRange()
    range.selectNodeContents(node)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, [fallback, fallbackAttempt])

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
    setFallback(copyFallbackMessage({ coarsePointer: isCoarsePointer(), mac: isMac() }))
    setFallbackAttempt((n) => n + 1)
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
    <span className="inline-block align-top">
      <span className="inline-flex items-baseline">
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
            data label. `ml-2` only when `fallback` is set (not a `gap-2` on
            the row) -- this span stays mounted (empty) at rest, and an
            unconditional gap would still reserve its 8px even with no text
            in it (measured: wrapper 8px wider than the button alone). */}
        <span role="status" aria-live="polite" className={fallback ? `ml-2 ${MICRO_LABEL}` : MICRO_LABEL}>
          {fallback}
        </span>
      </span>
      {/* Only rendered once a copy attempt has actually failed -- an
          ordinary row (the common case) never carries a second, hidden copy
          of the citation for assistive technology to read on top of the
          button's own "Copy citation" label. `break-all`, not just
          `break-words`: `cite` can end in a long DOI/URL with no natural
          break point, and this block must not overflow at 320px (matching
          IDENTIFIER's own `break-all` in PublicationRow.tsx for the same
          reason). `whitespace-normal` overrides a `whitespace-nowrap`
          ancestor (PublicationRow.tsx's compact density row), since this
          block must wrap regardless of what density row it renders inside. */}
      {fallback && (
        <p
          ref={citationBlockRef}
          data-testid="copy-citation-fallback-text"
          className="mt-1 max-w-full font-mono text-[11px] leading-[1.4] break-all whitespace-normal text-text-muted"
        >
          {cite}
        </p>
      )}
    </span>
  )
}
