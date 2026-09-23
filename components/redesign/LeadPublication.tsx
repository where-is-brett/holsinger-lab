import Link from 'next/link'

import type { Publication } from './publicationModel'
import { IDENTIFIER } from './PublicationRow'
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
  const hasAuthors = pub.authorsPre !== '' || pub.authorsPI !== '' || pub.authorsPost !== ''
  return (
    // No top rule/padding of its own -- `Section`'s own top rule already
    // separates this block from the one above, and a second rule here
    // would misalign the "Recent papers" label (which sits level with the
    // Section's top edge) from the lead's own first line. `pb-8` still
    // separates the lead from the ledger head/first row below it; the
    // first row's own `border-t` (PublicationRow.tsx's `ROW`) supplies the
    // rule between the two.
    <article data-testid="home-lead-paper" className="pb-8">
      {/* Only the non-empty parts, joined by " · " -- an unset `year` or
          `journal` (both can be blank on the live dataset) must never
          leave a stray leading/trailing separator, matching
          PublicationRow.tsx's `tagLine` "empty segments dropped" rule. */}
      {(pub.year !== '' || pub.journal !== '') && (
        <div className="font-mono text-[0.8125rem] text-text-muted">
          {pub.year}
          {pub.year !== '' && pub.journal !== '' && ' · '}
          {pub.journal !== '' && <span data-cms-verbatim>{pub.journal}</span>}
        </div>
      )}
      <h3 className="mt-3 text-pretty break-words text-heading font-semibold">
        {pub.href ? (
          <Link href={pub.href} className={`${TITLE_HOVER} ${HIT_AREA}`}>
            {pub.title}
          </Link>
        ) : (
          pub.title
        )}
      </h3>
      {/* `mb-0!`: same unlayered base rule (`styles/index.css`'s
          `p:not(:last-child) { margin-bottom: 0.875rem }`) Section.tsx's
          own `LABEL_CLASS` comment documents -- without it, this `<p>`'s
          14px base margin stacks with the identifier's `mt-4` below,
          leaving a 30px gap instead of the intended 16px. `mt-3` still
          sets the gap above (title -> authors). */}
      {hasAuthors && (
        <p className="mt-3 mb-0! text-body text-text-muted">
          {pub.authorsPre}
          {pub.authorsPI !== '' && <strong className="font-semibold text-text">{pub.authorsPI}</strong>}
          {pub.authorsPost}
        </p>
      )}
      {/* `[data-identifier]` carries only the label (not the "DOI "/"URL "
          kind prefix) -- same split as PublicationRow.tsx's `Identifier`.
          The generic `[data-identifier]` contract
          (`e2e/redesign-components.spec.ts`) asserts the element's own
          text is contained in `href`; a real DOI href ("https://doi.org/
          10.xxx") never contains a "DOI " prefix, so the prefix has to sit
          outside the marked element. `IDENTIFIER` is PublicationRow.tsx's
          own token, shared here rather than re-spelled. */}
      {pub.linkHref !== '' && (
        <div className="mt-4 inline-block font-mono text-[0.8125rem]">
          <span className="text-text-faint">{pub.linkKind} </span>
          <a className={IDENTIFIER} href={pub.linkHref} data-identifier data-cms-verbatim>
            {pub.linkLabel}
          </a>
        </div>
      )}
    </article>
  )
}
