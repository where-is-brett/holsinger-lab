import Link from 'next/link'

import type { Publication } from './publicationModel'
import { HIT_AREA } from './tokens'

// Same colour-reveal transition as PublicationRow.tsx's title -- this
// title has no `group` row of its own to key off (the lead isn't a hover
// target the way a ledger row is), so it reveals on its own hover/focus
// instead of `group-hover`.
const TITLE_HOVER = 'hover:text-link transition-[color] duration-(--sem-motion-fast) ease-(--sem-ease)'

/**
 * "Recent papers"' lead row: the newest publication, given more visual
 * weight than the four ledger rows beneath it. A lead with no slug (an
 * unimported/incomplete record) still renders -- its title stays plain
 * text rather than a link, and `href` is never passed as `null` to
 * `next/link`.
 */
export function LeadPublication({ pub }: { pub: Publication }) {
  return (
    <article data-testid="home-lead-paper" className="border-t border-rule pt-6 pb-8">
      <div className="font-mono text-[0.8125rem] text-text-muted">
        {pub.year}
        {pub.journal !== '' && (
          <>
            {' · '}
            <span data-cms-verbatim>{pub.journal}</span>
          </>
        )}
      </div>
      <h3 className="mt-3 text-pretty break-words text-heading font-semibold">
        {pub.href ? (
          <Link href={pub.href} className={`${TITLE_HOVER} ${HIT_AREA}`}>
            {pub.title}
          </Link>
        ) : (
          pub.title
        )}
      </h3>
      <p className="mt-3 text-body text-text-muted">
        {pub.authorsPre}
        {pub.authorsPI !== '' && <strong className="font-semibold text-text">{pub.authorsPI}</strong>}
        {pub.authorsPost}
      </p>
      {/* `[data-identifier]` carries only the label (not the "DOI "/"URL "
          kind prefix) -- same split as PublicationRow.tsx's `Identifier`.
          The generic `[data-identifier]` contract
          (`e2e/redesign-components.spec.ts`) asserts the element's own
          text is contained in `href`; a real DOI href ("https://doi.org/
          10.xxx") never contains a "DOI " prefix, so the prefix has to sit
          outside the marked element. */}
      {pub.linkHref !== '' && (
        <div className="mt-4 inline-block font-mono text-[0.8125rem]">
          <span className="text-text-faint">{pub.linkKind} </span>
          <a className="break-all text-link normal-case!" href={pub.linkHref} data-identifier data-cms-verbatim>
            {pub.linkLabel}
          </a>
        </div>
      )}
    </article>
  )
}
