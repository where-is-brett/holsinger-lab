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
