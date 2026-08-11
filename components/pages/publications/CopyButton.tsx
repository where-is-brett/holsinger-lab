'use client'

import { useState } from 'react'

export function CopyButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      // Stable accessible name even while the visible text flips to
      // "Copied!" -- without this, an e2e test (or a screen reader) that
      // locates the button by its accessible name loses track of it the
      // instant the click succeeds, since the name would otherwise change
      // along with the visible text.
      aria-label={label}
      className="underline hover:cursor-pointer"
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}
