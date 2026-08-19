import type { Metadata } from 'next'

import Gallery from './Gallery'

// Never indexed, never linked from navigation: this route exists purely so
// Playwright (e2e/redesign-components.spec.ts) can render and assert the
// Phase 1 redesign primitives against a real production build. See
// app/sitemap.ts / lib/paths.ts -- neither enumerates filesystem routes
// (sitemap.ts only lists CMS-driven paths plus a small hardcoded
// staticPaths array that doesn't include this route), so no sitemap change
// was needed to keep it out; this metadata is what keeps it out of search.
// The root layout's `generateMetadata` (app/layout.tsx) deliberately sets no
// `title` -- every page supplies its own -- so this route needs an explicit
// one too, or the rendered <title> is empty and axe's document-title check
// fails.
export const metadata: Metadata = {
  title: 'Component gallery (preview) — Holsinger Lab',
  robots: { index: false, follow: false },
}

// Stays a server component so it can export the metadata above -- a Client
// Component cannot export `metadata` (Next.js build-time restriction). All
// the interactive wiring lives in Gallery.tsx instead, same split as
// app/studio/[[...tool]]/page.tsx + StudioClient.tsx.
export default function PreviewComponentsPage() {
  return <Gallery />
}
