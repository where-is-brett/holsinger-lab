import { describe, expect, it } from 'vitest'

import { previewRevalidateSeconds } from './preview-revalidate'

describe('previewRevalidateSeconds', () => {
  it('returns 30 on a Vercel preview deployment', () => {
    expect(previewRevalidateSeconds('preview')).toBe(30)
  })

  it('returns the production value (60) on a Vercel production deployment', () => {
    expect(previewRevalidateSeconds('production')).toBe(60)
  })

  it('returns the production value (60) when VERCEL_ENV is undefined (local dev, CI, non-Vercel runs)', () => {
    expect(previewRevalidateSeconds(undefined)).toBe(60)
  })
})
