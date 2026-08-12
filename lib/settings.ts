import type { SettingsPayload } from 'types'
import { fallbackSettings } from 'types'

/**
 * Shape of `sanityFetch`'s return value, narrowed to what this module reads.
 * Injected rather than imported so the failure path is testable without env
 * vars or a live Sanity connection.
 */
export type SettingsFetcher = () => Promise<{ data: unknown }>

/**
 * Fetches the settings singleton, returning `fallbackSettings` on any failure
 * instead of propagating.
 *
 * The root layout wraps every route including /studio, so an unguarded throw
 * here would take down the site AND the CMS the lab would use to fix it. This
 * repo is being handed over to a team with no developer, so "a developer can
 * roll it back" is not an available mitigation. The swallow is deliberate.
 */
export async function fetchSettingsSafely(
  fetcher: SettingsFetcher
): Promise<SettingsPayload> {
  try {
    const { data } = await fetcher()
    return (data as SettingsPayload | null) ?? fallbackSettings
  } catch {
    return fallbackSettings
  }
}
