// Sanity document attribute names must match ^\$?[a-zA-Z0-9_-]+$ (see
// scripts/wix/plan.test.ts's attribute-name walk). The planner's in-memory
// Ledger is a Record<string,string> keyed "<docId>#<field>" (or
// "drafts.<docId>#<field>") -- convenient to build and diff, but "#" and "."
// both fail that pattern, so it can never be stored as a Sanity object's own
// keys. Stored form is an array of {_key, docId, field, hash} instead; _key
// is derived from the pair so array items stay addressable and deterministic.

import { createHash } from 'node:crypto'

import type { Ledger } from './plan.ts'

export interface LedgerEntry { _key: string; docId: string; field: string; hash: string }

function keyFor(docId: string, field: string): string {
  return createHash('sha1').update(`${docId}#${field}`).digest('hex').slice(0, 20)
}

/** Deterministic: same ledger always serializes to the same array, in the same order. */
export function serializeLedger(ledger: Ledger): LedgerEntry[] {
  const entries = Object.entries(ledger).map(([k, hash]) => {
    const sep = k.indexOf('#')
    const docId = sep === -1 ? k : k.slice(0, sep)
    const field = sep === -1 ? '' : k.slice(sep + 1)
    return { _key: keyFor(docId, field), docId, field, hash }
  })
  return entries.sort((a, b) => (a._key < b._key ? -1 : a._key > b._key ? 1 : 0))
}

/** Tolerates a missing, empty, or malformed value -- a fresh dataset has no ledger yet. */
export function deserializeLedger(entries: unknown): Ledger {
  const ledger: Ledger = {}
  if (!Array.isArray(entries)) return ledger
  for (const e of entries) {
    if (!e || typeof e !== 'object') continue
    const { docId, field, hash } = e as Record<string, unknown>
    if (typeof docId !== 'string' || typeof field !== 'string' || typeof hash !== 'string') continue
    ledger[`${docId}#${field}`] = hash
  }
  return ledger
}
