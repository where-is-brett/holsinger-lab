import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId, useCdn } from 'lib/sanity.api'

/**
 * Read-only Sanity client for e2e tests, so assertions can be derived from
 * the live dataset at test time instead of hardcoded facts about it (counts,
 * "unset" assumptions, specific titles) that drift as content changes. The
 * dataset is publicly readable, so no token is required -- mirrors the
 * dry-run client in scripts/backfill-publication-topics.ts. `projectId` and
 * `dataset` come from `lib/sanity.api.ts`'s NEXT_PUBLIC_* env vars, which
 * `playwright.config.ts` loads from `.env.local` locally (CI sets them
 * directly at the job level).
 */
export const e2eClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn,
})
