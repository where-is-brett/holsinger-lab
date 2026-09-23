'use client'
import { bibtex, type CitationInput, plainCitation, ris } from 'lib/wix/citationExport'
import { downloadFile } from 'lib/wix/download'
import { useEffect, useRef, useState } from 'react'

/** `<slug>.<ext>`, falling back to `_id` when the entry has no slug. */
export function fileBase(pub: CitationInput): string {
  return pub.slug || pub._id
}

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? navigator.userAgent)

// `navigator.platform`/`navigator.userAgent` say what OS the device runs,
// not whether it has a keyboard -- an Android phone can read as neither Mac
// nor "not Mac" in any way that implies a keyboard exists, and a Mac laptop
// in tablet mode is still keyboard-equipped. `(pointer: coarse)` asks the
// right question instead: is the primary input imprecise (touch), as
// opposed to a mouse/trackpad. A phone or tablet with no keyboard at all
// matches this regardless of its OS, so "Press ⌘C"/"Press Ctrl+C" (both
// wrong -- there is no key to press) is never shown there.
const isCoarsePointer = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/**
 * The message shown after the manual-select fallback (`selectHiddenCitationText()`)
 * runs, when the Clipboard API isn't available or its call failed. Exported
 * as a pure function, independent of the component's rendering, so its
 * device-dependent branching can be unit tested without mounting React or
 * mocking `navigator`/`matchMedia` deeply.
 */
export function copyFallbackMessage({ coarsePointer, mac }: { coarsePointer: boolean; mac: boolean }): string {
  // A coarse (touch) pointer has no keyboard to press a key on -- the
  // citation text is already selected, so point the reader at their
  // platform's own copy action instead of an invented keystroke.
  if (coarsePointer) return 'Citation selected — use your device’s copy action'
  return `Press ${mac ? '⌘C' : 'Ctrl+C'}`
}

/**
 * Copy / BibTeX / RIS actions for a single publication, rendered directly
 * under the citation and DOI lines. Deliberately styled as part of the
 * citation block (font-didot italic, reduced-emphasis black, no borders or
 * background) rather than as buttons -- see PublicationEntry.tsx and the
 * controller's visual-register ruling.
 */
export function CitationActions({ pub }: { pub: CitationInput }) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const hiddenTextRef = useRef<HTMLSpanElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  function showFeedback(message: string) {
    setFeedback(message)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setFeedback(null), 4000)
  }

  function selectHiddenCitationText() {
    const node = hiddenTextRef.current
    if (!node || typeof window === 'undefined') return
    const range = document.createRange()
    range.selectNodeContents(node)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  async function handleCopy() {
    const text = plainCitation(pub)
    // Guard before calling: `await navigator.clipboard?.writeText(x)`
    // resolves to `undefined` (not a rejection) when the Clipboard API is
    // absent, so a bare try/catch around the call never reaches the
    // fallback in that case.
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        showFeedback('Copied')
        return
      } catch {
        // fall through to the manual-select fallback below
      }
    }
    selectHiddenCitationText()
    showFeedback(copyFallbackMessage({ coarsePointer: isCoarsePointer(), mac: isMac() }))
  }

  function handleBibtex() {
    downloadFile(`${fileBase(pub)}.bib`, bibtex(pub), 'application/x-bibtex')
  }

  function handleRis() {
    downloadFile(`${fileBase(pub)}.ris`, ris(pub), 'application/x-research-info-systems')
  }

  return (
    <p data-wix="citation-actions" className="mt-[3px] font-didot text-[12px]/[20px] italic text-black/60 md:text-[14px]/[24px]">
      <button type="button" onClick={handleCopy} className="underline-offset-2 hover:underline focus-visible:underline">
        Copy citation
      </button>
      <span aria-hidden="true"> · </span>
      <button type="button" onClick={handleBibtex} className="underline-offset-2 hover:underline focus-visible:underline">
        BibTeX
      </button>
      <span aria-hidden="true"> · </span>
      <button type="button" onClick={handleRis} className="underline-offset-2 hover:underline focus-visible:underline">
        RIS
      </button>
      {/* Visible feedback (a few seconds) and the screen-reader
          announcement share this one element: text placed inside an
          aria-live="polite" region is announced when it changes, so there's
          no need for a separate visually-hidden live region. */}
      <span role="status" aria-live="polite" className="ml-[6px]">
        {feedback}
      </span>
      {/* Off-screen but selectable (sr-only, not display:none) copy of the
          full plain-text citation, used only as the manual-copy fallback's
          selection target -- selectNodeContents/Range work on a visually
          hidden node, so the reader can still press Cmd/Ctrl+C after a
          failed/unsupported Clipboard API call. */}
      <span ref={hiddenTextRef} className="sr-only">
        {plainCitation(pub)}
      </span>
    </p>
  )
}
