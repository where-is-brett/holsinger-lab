// Sanity document attribute names must match ^\$?[a-zA-Z0-9_-]+$. Nothing in
// the planner's output may violate that -- not a create doc, not a patch
// `set`, and not the stored ledger document. This test runs planImport on
// the real committed snapshot (not a hand-rolled fixture) with realistic
// inputs, and recursively walks every mutation it produces.

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { serializeLedger } from './ledger.ts'
import { LEDGER_ID, planImport } from './plan.ts'
import { ROLE_GROUP_TITLES, type RoleGroupTitle, type WixSnapshot } from './snapshot.ts'

const ATTR_NAME = /^\$?[a-zA-Z0-9_-]+$/
const KEY_VALUE = /^[a-zA-Z0-9_-]+$/

/** Recursively asserts every own object key matches Sanity's attribute-name rule, and
 *  every `_key` value inside an array-item object matches the (stricter, no leading $)
 *  array-key rule. Arrays recurse into their items without checking indices as keys. */
function assertValidAttributeNames(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertValidAttributeNames(item, `${path}[${i}]`))
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      expect(k, `attribute name at ${path}.${k}`).toMatch(ATTR_NAME)
      if (k === '_key') {
        expect(v, `_key value at ${path}.${k}`).toEqual(expect.stringMatching(KEY_VALUE))
      }
      assertValidAttributeNames(v, `${path}.${k}`)
    }
  }
}

function loadSnapshot(): WixSnapshot {
  return JSON.parse(readFileSync(new URL('../../data/wix/snapshot.json', import.meta.url), 'utf8'))
}

function realisticInputs() {
  const snapshot = loadSnapshot()

  const roleGroupIds = Object.fromEntries(
    ROLE_GROUP_TITLES.map((t) => [t, `rg-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`])
  ) as Record<RoleGroupTitle, string>

  const urls = [
    snapshot.siteCopy.hero.imageUrl,
    ...snapshot.media.flatMap((m) => [m.videoUrl, m.posterUrl]),
    ...snapshot.projects.map((p) => p.imageUrl),
    ...snapshot.people.map((p) => p.imageUrl),
  ].filter((u): u is string => Boolean(u))
  const assetIds: Record<string, string> = {}
  urls.forEach((u, i) => { assetIds[u] = `image-asset-${i}` })

  const settingsId = 'settings'
  const drafts = { [`drafts.${settingsId}`]: { _id: `drafts.${settingsId}`, _type: 'settings' } }

  return { snapshot, existing: {}, settingsId, roleGroupIds, assetIds, ledger: {}, drafts, assetsResolved: true }
}

describe('attribute names (Fix round 4: Sanity rejects "#"/"." in object keys)', () => {
  const plan = planImport(realisticInputs())

  it('produces a plan with both create and patch ops (sanity check on the fixture)', () => {
    expect(plan.ops.some((o) => o.kind === 'create')).toBe(true)
    expect(plan.ops.some((o) => o.kind === 'patch')).toBe(true)
    // The drafts.settings path must be exercised too.
    expect(plan.ops.some((o) => o.kind === 'patch' && o.id === 'drafts.settings')).toBe(true)
  })

  it('every create doc has only valid attribute names', () => {
    for (const op of plan.ops) {
      if (op.kind === 'create') assertValidAttributeNames(op.doc, `create(${op.doc._id})`)
    }
  })

  it('every patch set payload has only valid attribute names', () => {
    for (const op of plan.ops) {
      if (op.kind === 'patch') assertValidAttributeNames(op.set, `patch(${op.id}).set`)
    }
  })

  it('the serialized ledger document has only valid attribute names', () => {
    const ledgerDoc = {
      _id: LEDGER_ID,
      _type: 'wixImportLedger',
      entries: serializeLedger(plan.ledger),
      updatedAt: new Date().toISOString(),
    }
    assertValidAttributeNames(ledgerDoc, 'ledgerDoc')
    expect(ledgerDoc.entries.length).toBeGreaterThan(0)
  })
})
