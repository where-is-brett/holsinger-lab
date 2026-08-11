'use client'
import { LaunchIcon } from '@sanity/icons/Launch'
import { useState } from 'react'
import type { PublicationPayload } from 'types'

import { formatApaCitation, formatBibtexCitation } from './citation'
import { CopyButton } from './CopyButton'
import { Toggle, ToggleContent } from './Toggle'

export default function Publication({
  publication,
  citeKey,
}: {
  publication: PublicationPayload
  citeKey: string
}) {
  const [showAbstract, setShowAbstract] = useState(false)
  const [showCitation, setShowCitation] = useState(false)
  const handleShowCitation = () => {
    setShowAbstract(false) // Hide abstract
    setShowCitation(!showCitation) // Toggle citation visibility
  }
  const handleShowAbstract = () => {
    setShowCitation(false) // Hide citation
    setShowAbstract(!showAbstract) // Toggle abstract visibility
  }

  const { title, author, journal, volume, issue, pages, abstract, url, doi, date } =
    publication

  const parsedDate = date ? new Date(Date.parse(date)) : null
  const month = parsedDate
    ? new Intl.DateTimeFormat('en-AU', { month: 'long' }).format(parsedDate)
    : ''
  const year = parsedDate
    ? new Intl.DateTimeFormat('en-AU', { year: 'numeric' }).format(parsedDate)
    : ''

  const citationFields = { title, author, journal, volume, issue, pages, date, doi, url }
  const apaCitation = formatApaCitation(citationFields)
  const bibtexCitation = formatBibtexCitation(citationFields, citeKey)

  return (
    <div className="inline-block w-full max-w-3xl text-sm">
      <div className="space-y-2">
        <h2 className="font-ariana text-lg md:text-xl">
          {url ? (
            <a
              href={url}
              target="_blank"
              className="flex items-start justify-between hover:underline"
            >
              {title}
              <LaunchIcon className="relative shrink-0" />
            </a>
          ) : (
            title
          )}
        </h2>
        <h3 className="font-ariana font-light md:text-base lg:text-lg">
          {author}
        </h3>
        <div className="flex flex-wrap items-center gap-4 font-ariana md:text-base lg:text-lg">
          <div>
            {journal}. {`${month} ${year}`}
          </div>
          {doi && (
            <a
              href={`https://doi.org/${doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-link hover:underline"
            >
              DOI: {doi}
            </a>
          )}
          <div>
            {/* Abstract */}
            {abstract && (
              <Toggle
                show={showAbstract}
                callback={handleShowAbstract}
                showMessage="Abstract"
                hideMessage="Abstract"
              />
            )}
            {/* Citation */}
            <Toggle
              show={showCitation}
              callback={handleShowCitation}
              showMessage="Citation"
              hideMessage="Citation"
            />
          </div>
        </div>
      </div>

      {/* CONTENT */}
      {/* Citation */}
      <ToggleContent show={showCitation}>
        <div className="m-4 space-y-2 lg:text-lg">
          <p>{apaCitation}</p>
          <div className="flex gap-4 text-sm">
            <CopyButton label="Copy APA" text={apaCitation} />
            <CopyButton label="Copy BibTeX" text={bibtexCitation} />
          </div>
        </div>
      </ToggleContent>
      {/* Abstract */}
      <ToggleContent show={showAbstract}>
        <p className="m-4 md:text-base lg:text-lg">{abstract}</p>
      </ToggleContent>
    </div>
  )
}
