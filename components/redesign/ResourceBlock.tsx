export interface ResourceBlockMeta {
  label: string
  value: string
  href?: string
}

export interface ResourceBlockProps {
  title: string
  meta?: ResourceBlockMeta[]
  figureLabel?: string
}

// Ported from
// docs/redesign-experiment/design-system/components/content/ResourceBlock.jsx.
// Purely presentational, no state or handlers -- no 'use client'.

// Meta values print VERBATIM -- a DOI is a case-sensitive identifier.
// Labels are uppercased by style; values are not. `normal-case!` is
// Tailwind 4's trailing-bang form, emitting `text-transform: none
// !important` -- reproducing components.css's `.hl-identifier` guard (same
// technique as PublicationRow.tsx's IDENTIFIER constant) so an ambient
// uppercasing context can never mangle an identifier.
const IDENTIFIER = 'normal-case!'

// Task brief decision #2: a static generated background is legitimate as an
// inline style -- see the matching constant/comment in PersonCard.tsx.
const STRIPE_BG =
  'repeating-linear-gradient(45deg, transparent 0 12px, color-mix(in oklab, var(--sem-text) 4.5%, transparent) 12px 13px)'

export function ResourceBlock({ title, meta = [], figureLabel }: ResourceBlockProps) {
  return (
    <div className="grid grid-cols-[1fr_340px] items-start gap-x-(--spacing-gutter-lg)">
      <div>
        {/* `text-heading` carries its own line-height/letter-spacing
            companions from styles/index.css's `@theme inline` block -- left
            unoverridden here so both apply, matching the source's explicit
            `lineHeight`/`letterSpacing` var references. */}
        <div className="max-w-[640px] text-heading font-semibold">{title}</div>
        <div className="mt-[26px] flex flex-col gap-2.5 font-mono text-[12.5px] leading-[1.5]">
          {meta.map((m) => (
            <div key={m.label}>
              <span className="inline-block min-w-16 uppercase text-text-faint">{m.label}</span>
              {m.href ? (
                <a className={`text-link ${IDENTIFIER}`} href={m.href} data-identifier>
                  {m.value}
                </a>
              ) : (
                <span className={IDENTIFIER}>{m.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      {figureLabel && (
        <div
          className="box-border flex h-[200px] items-center justify-center border border-rule px-5"
          style={{ backgroundImage: STRIPE_BG }}
        >
          <span className="text-center font-mono text-[11px] leading-[1.6] text-text-faint">
            {figureLabel}
          </span>
        </div>
      )}
    </div>
  )
}
