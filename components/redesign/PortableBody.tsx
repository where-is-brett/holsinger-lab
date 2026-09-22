import { PortableText, type PortableTextComponents } from '@portabletext/react'
import type { ArbitraryTypedObject, PortableTextBlock } from '@portabletext/types'

// Extracted from components/redesign/screens/People.tsx's inline
// BIO_COMPONENTS/BIO_PARAGRAPH/BIO_LINK (Task 2) so PersonPage.tsx (Task 3)
// can share the exact same bio rendering rather than re-declaring it. Both
// screens render a portable-text bio -- the lab-head spotlight's short bio
// on /people, and a full profile's `fullBio` on /people/[slug] -- through
// the same component map, so the two never drift apart.

// Bio paragraphs: ui_kit's muted body style (font-size/line-height come from
// the paired `--text-body`/`--text-body--line-height` theme tokens, same as
// PageTitle's `text-title` companion pairing), capped at the ui_kit's 720px
// measure, wrapping naturally. `break-words` (`overflow-wrap`) alongside
// `text-pretty` (`text-wrap`) -- different properties, so additive, not a
// same-property collision (constraints.md) -- same fix as
// PublicationPage.tsx's AbstractBlock: a real bio can contain a single
// unbreakable long token (Damian Holsinger's live `fullBio` inlines his
// email as plain text, "damian.holsinger@sydney.edu.au", inside a
// paragraph rather than the dedicated `email` field), which `text-pretty`
// alone doesn't stop from overflowing a narrow phone viewport.
const BIO_PARAGRAPH = 'mt-4 max-w-[720px] text-pretty break-words text-body text-text-muted'
// hl-link-style underlined link (this repo never ported the docs design
// system's literal `.hl-link` class into styles/index.css -- see
// PublicationPage.tsx's own IDENTIFIER constant for the same "reproduce the
// intent with Tailwind utilities" approach elsewhere in this direction).
const BIO_LINK = 'text-link underline'

const BIO_COMPONENTS: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className={BIO_PARAGRAPH}>{children}</p>,
  },
  marks: {
    link: ({ children, value }) => (
      <a href={value?.href} className={BIO_LINK} rel="noreferrer noopener">
        {children}
      </a>
    ),
  },
}

/**
 * Renders a portable-text bio through the shared component map, or a plain
 * paragraph for a CMS record that only has the legacy `bio` string field.
 * Renders nothing when neither is set.
 */
export function PortableBody({
  blocks,
  bio,
}: {
  blocks?: (PortableTextBlock | ArbitraryTypedObject)[] | null
  bio?: string | null
}) {
  if (blocks && blocks.length > 0) {
    return <PortableText value={blocks} components={BIO_COMPONENTS} />
  }
  if (bio) {
    return <p className={BIO_PARAGRAPH}>{bio}</p>
  }
  return null
}
