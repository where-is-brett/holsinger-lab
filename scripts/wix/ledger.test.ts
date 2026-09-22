import { describe, expect, it } from 'vitest'

import { deserializeLedger, serializeLedger } from './ledger.ts'
import type { Ledger } from './plan.ts'

describe('serializeLedger', () => {
  it('turns a "docId#field" ledger into an array of {_key, docId, field, hash}', () => {
    const ledger: Ledger = {
      'p-jc#name': 'hash-a',
      'drafts.settings#contact': 'hash-b',
    }
    const entries = serializeLedger(ledger)
    expect(entries).toContainEqual(expect.objectContaining({ docId: 'p-jc', field: 'name', hash: 'hash-a' }))
    expect(entries).toContainEqual(expect.objectContaining({ docId: 'drafts.settings', field: 'contact', hash: 'hash-b' }))
    for (const e of entries) expect(e._key).toMatch(/^[a-zA-Z0-9_-]+$/)
  })

  it('is deterministic: same ledger always serializes to the same order', () => {
    const ledger: Ledger = { b: '1', a: '2', c: '3' }
    expect(serializeLedger(ledger)).toEqual(serializeLedger({ c: '3', a: '2', b: '1' }))
  })

  it('sorts entries by _key', () => {
    const entries = serializeLedger({ z: '1', a: '2', m: '3' })
    const keys = entries.map((e) => e._key)
    expect([...keys].sort()).toEqual(keys)
  })
})

describe('deserializeLedger', () => {
  it('tolerates undefined, null, and a non-array value', () => {
    expect(deserializeLedger(undefined)).toEqual({})
    expect(deserializeLedger(null)).toEqual({})
    expect(deserializeLedger('not an array')).toEqual({})
    expect(deserializeLedger({})).toEqual({})
  })

  it('tolerates an empty array', () => {
    expect(deserializeLedger([])).toEqual({})
  })

  it('skips malformed entries', () => {
    expect(deserializeLedger([null, 42, { docId: 'x' }, { docId: 'x', field: 'f', hash: 1 }])).toEqual({})
  })
})

describe('serializeLedger / deserializeLedger round trip', () => {
  it('deserializeLedger(serializeLedger(x)) deep-equals x', () => {
    const ledger: Ledger = {
      'p-jc#name': 'hash-a',
      'p-jc#orderRank': 'hash-b',
      'drafts.settings#contact': 'hash-c',
      'wix-publication-new#doi': 'hash-d',
    }
    expect(deserializeLedger(serializeLedger(ledger))).toEqual(ledger)
  })

  it('round-trips an empty ledger', () => {
    expect(deserializeLedger(serializeLedger({}))).toEqual({})
  })
})
