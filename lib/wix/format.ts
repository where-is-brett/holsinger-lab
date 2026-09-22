import { stegaClean } from 'next-sanity'

import type { CitationSource } from './types'

const clean = (v: string | null | undefined) => (v ? stegaClean(v).trim() : '')

export function formatCitationLine(p: CitationSource): string {
  const journal = clean(p.journal).replace(/\.$/, '')
  const year = p.date ? p.date.slice(0, 4) : ''
  const head = [journal, year].filter(Boolean).join(' ')
  let tail = p.volume != null ? String(p.volume) : ''
  if (p.issue != null) tail += `(${p.issue})`
  const pages = clean(p.pages)
  if (pages) tail += tail ? `:${pages}` : pages
  if (!head && !tail) return ''
  return tail ? `${head}; ${tail}.` : `${head}.`
}

export function doiHref(doi: string | null | undefined): string | null {
  const d = clean(doi).replace(/[​-‍⁠﻿]/g, '')
  if (!d) return null
  return /^https?:\/\//.test(d) ? d : `https://doi.org/${d}`
}

export function mailtoHref(email: string | null | undefined): string | null {
  const e = clean(email).replace(/[​-‍⁠﻿]/g, '')
  return e ? `mailto:${e}` : null
}

export function telHref(phone: string | null | undefined): string | null {
  const t = clean(phone).replace(/[^\d+]/g, '')
  return t ? `tel:${t}` : null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function formatMediaDate(date: string | null | undefined): string | null {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Recognises a YouTube watch/short/embed URL and returns a privacy-mode
 * (youtube-nocookie.com) embed URL, or null for anything else -- including a
 * non-YouTube URL, a YouTube URL with no (or a malformed) video id, or a
 * value that isn't a URL at all. Accepts "watch?v=", "youtu.be/" and
 * "/embed/" forms, with or without extra query parameters.
 */
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  const cleaned = clean(url)
  if (!cleaned) return null
  let parsed: URL
  try {
    parsed = new URL(cleaned)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
  let id: string | null = null
  if (host === 'youtu.be') {
    id = parsed.pathname.slice(1).split('/')[0]
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') id = parsed.searchParams.get('v')
    else if (parsed.pathname.startsWith('/embed/')) id = parsed.pathname.slice('/embed/'.length).split('/')[0]
  }
  if (!id || !YOUTUBE_ID.test(id)) return null
  return `https://www.youtube-nocookie.com/embed/${id}`
}
