import type { ReactNode } from 'react'

import { ContactForm } from '../ContactForm'
import { type ContactDetails, telHref, UNIVERSITY_NAME, UNIVERSITY_URL } from '../contactModel'
import { PageTitle } from '../PageTitle'
import { Section } from '../Section'
import { MICRO_LABEL } from '../tokens'

// Details left, form right from `lg`; stacked, details first, below it.
// `grid-cols-1` gives the stacked track a zero min-content floor, so a long
// email address can't widen the page. One unprefixed `gap-12` plus one `lg:`
// column-gap override.
const CONTACT_GRID =
  'grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start lg:gap-x-(--spacing-gutter-lg)'
const DETAIL_VALUE = 'mt-1.5 text-body text-text'
const IDENTIFIER_LINK = 'font-mono text-[14px] leading-[1.5] break-all text-link'

function DetailRow({ testId, label, children }: { testId: string; label: string; children: ReactNode }) {
  return (
    <div data-testid={testId}>
      <dt className={MICRO_LABEL}>{label}</dt>
      <dd className={DETAIL_VALUE}>{children}</dd>
    </div>
  )
}

/**
 * `/contact`. No `Section` label: the page title already names the page, and a
 * label here would stack directly above the first detail's own label.
 */
export function Contact({
  details,
  headingLevel,
  formIdPrefix,
}: {
  details: ContactDetails
  /** `'h2'` only in the /preview/components gallery, which has its own `<h1>`. */
  headingLevel?: 'h1' | 'h2'
  formIdPrefix?: string
}) {
  return (
    <div>
      <PageTitle title="Contact" headingLevel={headingLevel} />
      <Section borderTop={false}>
        <div className={CONTACT_GRID}>
          <dl data-testid="contact-details" className="flex min-w-0 flex-col gap-6">
            {details.email && (
              <DetailRow testId="contact-email" label="Email">
                <a href={`mailto:${details.email}`} data-identifier data-cms-verbatim className={IDENTIFIER_LINK}>
                  {details.email}
                </a>
              </DetailRow>
            )}
            {details.phone && (
              <DetailRow testId="contact-phone" label="Phone">
                <a href={telHref(details.phone)} data-identifier data-cms-verbatim className={IDENTIFIER_LINK}>
                  {details.phone}
                </a>
              </DetailRow>
            )}
            {details.address && (
              <div data-testid="contact-address">
                <dt className={MICRO_LABEL}>Address</dt>
                {/* `whitespace-pre-line`: the editor's line breaks are the address's lines. */}
                <dd className={`${DETAIL_VALUE} whitespace-pre-line break-words`} data-cms-verbatim>
                  {details.address}
                </dd>
              </div>
            )}
            <DetailRow testId="contact-university" label="University">
              <a href={UNIVERSITY_URL} className="text-link underline">
                {UNIVERSITY_NAME}
              </a>
            </DetailRow>
          </dl>
          <ContactForm idPrefix={formIdPrefix} />
        </div>
      </Section>
    </div>
  )
}
