'use client'
import { bibtex, type CitationInput, ris } from 'lib/wix/citationExport'
import { downloadFile } from 'lib/wix/download'

/**
 * The full contents of the "download all" BibTeX file: every publication's
 * `bibtex()` entry, blank-line separated, with a trailing newline (each
 * `bibtex()` entry has no trailing newline of its own, so both the join and
 * the file's own final newline need to be added explicitly).
 */
export function allBibtex(pubs: CitationInput[]): string {
  return pubs.map(bibtex).join('\n\n') + '\n'
}

/**
 * The full contents of the "download all" RIS file: every publication's
 * `ris()` record, in order. Each `ris()` record already ends with a CRLF,
 * so joining with one more CRLF produces a blank line between entries and
 * a trailing newline for free -- no extra `+ '\n'` needed here, unlike
 * `allBibtex`.
 */
export function allRis(pubs: CitationInput[]): string {
  return pubs.map(ris).join('\r\n')
}

/**
 * "Download all (BibTeX)" / "(RIS)", covering every listed publication.
 * Same quiet visual register as the per-entry `CitationActions` -- see the
 * controller's visual-register ruling in PublicationEntry.tsx.
 */
export function PublicationsDownloadAll({ pubs }: { pubs: CitationInput[] }) {
  function handleBibtex() {
    downloadFile('holsinger-lab-publications.bib', allBibtex(pubs), 'application/x-bibtex')
  }

  function handleRis() {
    downloadFile('holsinger-lab-publications.ris', allRis(pubs), 'application/x-research-info-systems')
  }

  if (!pubs.length) return null

  return (
    <p data-wix="publications-download-all" className="font-didot text-[13px]/[22px] italic text-black/60 md:text-[15px]/[26px]">
      Download all{' '}
      <button
        type="button"
        onClick={handleBibtex}
        aria-label="Download all publications as BibTeX"
        className="underline-offset-2 hover:underline focus-visible:underline"
      >
        (BibTeX)
      </button>{' '}
      <button
        type="button"
        onClick={handleRis}
        aria-label="Download all publications as RIS"
        className="underline-offset-2 hover:underline focus-visible:underline"
      >
        (RIS)
      </button>
    </p>
  )
}
