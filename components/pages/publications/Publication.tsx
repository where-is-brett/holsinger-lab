import { LaunchIcon } from '@sanity/icons'
import { useState } from 'react'

import { Toggle, ToggleContent } from './Toggle'

export default function Publication({ publication }) {
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

  const { title, author, journal, volume, issue, pages, abstract, url, date } =
    publication

  const parsedDate = new Date(Date.parse(date))
  const month = new Intl.DateTimeFormat('en-AU', { month: 'long' }).format(
    parsedDate
  )
  const year = new Intl.DateTimeFormat('en-AU', { year: 'numeric' }).format(
    parsedDate
  )

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
              <LaunchIcon className="shrink-0 relative" />
            </a>
          ) : (
            title
          )}
        </h2>
        <h3 className="font-ariana font-light md:text-base lg:text-lg">
          {author}
        </h3>
        <h4 className="flex gap-4 font-ariana md:text-base lg:text-lg">
          <div>
            {journal}. {`${month} ${year}`}
          </div>
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
        </h4>
      </div>

      {/* CONTENT */}
      {/* Abstract */}
      <ToggleContent show={showCitation}>
        <p className="m-4 lg:text-lg">
          {`${author} (${year}). ${title}. `}
          <em>{journal}</em>
          <em>{volume ? `, ${volume}` : ""}</em>
          {`${issue ? `(${issue})` : ""}${pages ? `, ${pages}` : ""}. `}
          {url && (
            <a href={url} className="text-blue-600 hover:underline">
              {url}
            </a>
          )}
        </p>
      </ToggleContent>
      {/* Citation */}
      <ToggleContent show={showAbstract}>
        <p className="m-4 md:text-base lg:text-lg">{abstract}</p>
      </ToggleContent>
    </div>
  )
}
