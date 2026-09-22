// The site's primary navigation, owned in code from the agreed IA
// (docs/redesign-experiment/design-system/agreed-ia.md §1) rather than read
// from the CMS. `settings.menuItems` / `showPublications` / `showPeople` /
// `showContactForm` stay in the schema untouched -- a parallel track on the
// same dataset may still read them -- but the redesign chrome does not.
//
// Named navModel, not siteNav: `siteNav.ts` beside `SiteNav.tsx` collides on
// a case-insensitive filesystem (see publicationRow.ts / PublicationRow.tsx).

export type NavId =
  | 'home'
  | 'pubs'
  | 'research'
  | 'resources'
  | 'people'
  | 'lab'
  | 'contact'

export interface NavItem {
  id: NavId
  label: string
  href: string
}

/**
 * IA order. `live: false` items have no route yet and are not rendered; the
 * step that builds each route flips its flag. Contact is Lab's stand-in: the
 * IA puts Contact under Lab, so remove this entry when `lab` goes live.
 */
export const SITE_NAV: readonly (NavItem & { live: boolean })[] = [
  { id: 'home', label: 'Home', href: '/', live: true },
  { id: 'pubs', label: 'Publications', href: '/publications', live: true },
  { id: 'research', label: 'Research', href: '/research', live: false },
  { id: 'resources', label: 'Resources', href: '/resources', live: false },
  { id: 'people', label: 'People', href: '/people', live: true },
  { id: 'lab', label: 'Lab', href: '/lab', live: false },
  { id: 'contact', label: 'Contact', href: '/contact', live: true },
]

export function liveNavItems(): NavItem[] {
  return SITE_NAV.filter((item) => item.live).map(({ id, label, href }) => ({
    id,
    label,
    href,
  }))
}

/**
 * Home matches `/` only; every other item matches its href or anything
 * beneath it, so `/publications/<slug>` marks Publications. `usePathname`
 * can return null, which marks nothing.
 */
export function currentNavId(
  pathname: string | null | undefined,
  items: readonly NavItem[]
): NavId | undefined {
  if (!pathname) return undefined
  const path =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname
  return items.find((item) =>
    item.href === '/'
      ? path === '/'
      : path === item.href || path.startsWith(`${item.href}/`)
  )?.id
}

/** agreed-ia.md §3, Home block 6. Used when `settings.footer` is empty. */
export const FOOTER_FALLBACK: readonly string[] = [
  'Designed by Brett Yang',
  'Copyright 2026 © Holsinger Lab',
]

/**
 * `settings.footer` is portable text. The chrome renders it as plain mono
 * lines, one per block -- marks and links are flattened (the live content
 * has none). Anything unreadable falls back rather than rendering an empty
 * footer.
 */
export function footerLines(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) return [...FOOTER_FALLBACK]
  const lines = blocks
    .filter(
      (b): b is { _type: 'block'; children?: unknown } =>
        typeof b === 'object' && b !== null && (b as { _type?: unknown })._type === 'block'
    )
    .map((b) =>
      (Array.isArray(b.children) ? b.children : [])
        .map((c) =>
          typeof c === 'object' && c !== null && typeof (c as { text?: unknown }).text === 'string'
            ? (c as { text: string }).text
            : ''
        )
        .join('')
        .trim()
    )
    .filter((line) => line.length > 0)
  return lines.length > 0 ? lines : [...FOOTER_FALLBACK]
}
