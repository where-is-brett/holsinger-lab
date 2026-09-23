'use client'
import { bibtex, type CitationInput, ris } from 'lib/wix/citationExport'

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

/**
 * "Download all (BibTeX)" / "(RIS)", covering every listed publication.
 * Same quiet visual register as the per-entry `CitationActions` -- see the
 * controller's visual-register ruling in PublicationEntry.tsx.
 */
export function PublicationsDownloadAll({ pubs }: { pubs: CitationInput[] }) {
  function handleBibtex() {
    // Each bibtex() entry has no trailing newline of its own, so a blank
    // line between entries needs an explicit "\n\n" join.
    downloadFile('holsinger-lab-publications.bib', pubs.map(bibtex).join('\n\n'), 'application/x-bibtex')
  }

  function handleRis() {
    // Each ris() record already ends with a CRLF, so joining with one more
    // CRLF produces the blank line between entries.
    downloadFile('holsinger-lab-publications.ris', pubs.map(ris).join('\r\n'), 'application/x-research-info-systems')
  }

  if (!pubs.length) return null

  return (
    <p data-wix="publications-download-all" className="font-didot text-[13px]/[22px] italic text-black/60 md:text-[15px]/[26px]">
      Download all{' '}
      <button type="button" onClick={handleBibtex} className="underline-offset-2 hover:underline focus-visible:underline">
        (BibTeX)
      </button>{' '}
      <button type="button" onClick={handleRis} className="underline-offset-2 hover:underline focus-visible:underline">
        (RIS)
      </button>
    </p>
  )
}
