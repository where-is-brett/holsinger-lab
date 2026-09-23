'use client'
import { bibtex, type CitationInput, plainCitation, ris } from 'lib/wix/citationExport'
import { useEffect, useRef, useState } from 'react'

/** `<slug>.<ext>`, falling back to `_id` when the entry has no slug. */
function fileBase(pub: CitationInput): string {
  return pub.slug || pub._id
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? navigator.userAgent)

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
    showFeedback(`Press ${isMac() ? '⌘C' : 'Ctrl+C'}`)
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
