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
const BIO_PARAGRAPH_BODY = 'mt-4 max-w-[720px] text-pretty break-words text-body text-text-muted'
// PR C fix round 1, IMPORTANT 1: Research's project overview is `--text-lead`
// (larger) at body colour (not muted) per the brief and
// `ui_kits/site/Research.jsx`'s own `Narrative` body paragraph (`fontSize:
// "var(--text-lead)"`, no colour override -- the ui_kit's default text
// colour is body, not the muted tone `BIO_PARAGRAPH_BODY` uses for a
// secondary bio). A second, entirely separate class string -- not
// `BIO_PARAGRAPH_BODY` plus an appended override -- so `text-body`/
// `text-lead` (font-size) and `text-text-muted`/`text-text` (color) never
// collide on the same element at the same breakpoint (constraints.md); the
// 680px measure is the ui_kit's own `maxWidth: 680` for this paragraph,
// distinct from the bio's 720px.
//
// Fix round 2 minor 1: `mt-[22px]`, not `mt-4` (16px) -- the ui_kit's own
// `Narrative` body paragraph is `margin: "22px 0 0"`, a value with no
// existing Tailwind step (`mt-4`=16px, `mt-5`=20px, `mt-6`=24px), so this
// stays an arbitrary value like the file's other exact-pixel measures.
// This is one whole class string, still applied uniformly to every
// "normal" block by `components()` below (unchanged) -- every project's
// `overview` here and in every fixture is a single paragraph, so this is
// never exercised as a "first vs. later paragraph" question yet, and nothing
// here would introduce a same-property collision if it later is: any
// future first/later split would still have to pick between two whole
// `margin-top` values (a `first:`-style structural variant, not a second
// unconditional utility competing with this one), the same "whole string,
// not a bolted-on override" rule as everywhere else in this file.
const BIO_PARAGRAPH_LEAD = 'mt-[22px] max-w-[680px] text-pretty break-words text-lead text-text'
// hl-link-style underlined link (this repo never ported the docs design
// system's literal `.hl-link` class into styles/index.css -- see
// PublicationPage.tsx's own IDENTIFIER constant for the same "reproduce the
// intent with Tailwind utilities" approach elsewhere in this direction).
const BIO_LINK = 'text-link underline'

function components(paragraphClass: string): PortableTextComponents {
  return {
    block: {
      normal: ({ children }) => <p className={paragraphClass}>{children}</p>,
    },
    marks: {
      link: ({ children, value }) => (
        <a href={value?.href} className={BIO_LINK} rel="noreferrer noopener">
          {children}
        </a>
      ),
    },
  }
}

const BIO_COMPONENTS = components(BIO_PARAGRAPH_BODY)
const LEAD_COMPONENTS = components(BIO_PARAGRAPH_LEAD)

/**
 * Renders a portable-text bio through the shared component map, or a plain
 * paragraph for a CMS record that only has the legacy `bio` string field.
 * Renders nothing when neither is set.
 *
 * `size`: `'body'` (default) is the muted bio style every existing caller
 * (People's spotlight, PersonPage's full profile) already renders at --
 * unchanged. `'lead'` is Research's project overview -- a whole separate
 * paragraph class string picked by the ternary below, per this file's own
 * same-property-collision reasoning, never `BIO_PARAGRAPH_BODY` with a
 * `'lead'` override bolted on.
 */
export function PortableBody({
  blocks,
  bio,
  size = 'body',
}: {
  blocks?: (PortableTextBlock | ArbitraryTypedObject)[] | null
  bio?: string | null
  size?: 'body' | 'lead'
}) {
  const paragraphClass = size === 'lead' ? BIO_PARAGRAPH_LEAD : BIO_PARAGRAPH_BODY
  const bioComponents = size === 'lead' ? LEAD_COMPONENTS : BIO_COMPONENTS

  if (blocks && blocks.length > 0) {
    return <PortableText value={blocks} components={bioComponents} />
  }
  if (bio) {
    return <p className={paragraphClass}>{bio}</p>
  }
  return null
}
