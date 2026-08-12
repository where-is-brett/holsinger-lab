import { describe, expect, it } from 'vitest'

import { fetchSettingsSafely } from './settings'
import { fallbackSettings } from '../types'

describe('fetchSettingsSafely', () => {
  it('returns the fetched settings when the fetch succeeds', async () => {
    const payload = { ...fallbackSettings, siteName: 'Holsinger Lab' }
    const result = await fetchSettingsSafely(async () => ({ data: payload }))
    expect(result).toEqual(payload)
  })

  it('returns the fallback when the query resolves to null', async () => {
    const result = await fetchSettingsSafely(async () => ({ data: null }))
    expect(result).toEqual(fallbackSettings)
  })

  it('returns the fallback when the fetch rejects', async () => {
    const result = await fetchSettingsSafely(async () => {
      throw new Error('Sanity is unreachable')
    })
    expect(result).toEqual(fallbackSettings)
  })

  it('returns the fallback when the fetcher throws synchronously', async () => {
    const result = await fetchSettingsSafely(() => {
      throw new Error('boom')
    })
    expect(result).toEqual(fallbackSettings)
  })

  it('never rejects, whatever the fetcher does', async () => {
    await expect(
      fetchSettingsSafely(async () => {
        throw new Error('Sanity is unreachable')
      })
    ).resolves.toBeDefined()
  })
})
