// The three publication types from the agreed IA section 2. Stored as the
// displayed string, matching `topics` -- see schemas/lib/topics.ts for why.
//
// Lives here (rather than inline in schemas/documents/publication.ts) so it
// can be imported by scripts run directly with plain `node` (e.g.
// scripts/import-wix.ts) without pulling in the Sanity Studio schema's own
// dependencies (`sanity`, `@sanity/icons`, `lib/doi`'s baseUrl-relative
// import), which plain node can't resolve.
export const PUBLICATION_TYPES = ['Article', 'Review', 'Case report'] as const
export type PublicationType = (typeof PUBLICATION_TYPES)[number]
