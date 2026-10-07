import { ThemeToggle } from './ThemeToggle'

export interface SiteFooterProps {
  /** From navModel's `footerLines(settings.footer)` -- never empty. */
  lines: readonly string[]
}

// Ported from
// docs/redesign-experiment/design-system/components/navigation/SiteFooter.jsx.
// The source's `compact` variant is now the below-`md` layout and its
// default the `md`-and-up layout, as responsive pairs: each property is set
// once per breakpoint, so no two utilities fight over one property at the
// same width. Content comes from `settings.footer` (spec decision 5).
//
// Sentence-case Archivo, not uppercase mono (spec §1.5): this is CMS text
// (`settings.footer`), and forcing it upper-case would run against
// constraints.md's "CMS text prints verbatim" rule -- it also keeps the
// page's micro-label count under the label budget alongside SiteNav.tsx.
//
// The light/dark switch sits after the lines: under them below `md`, at the
// right-hand end from `md` (the lines keep their own spread between them).
const FOOTER =
  'box-border flex flex-col gap-2 border-t border-rule px-(--spacing-gutter) pt-3.5 pb-[18px] font-sans text-[11px] leading-[1.4] text-text-faint md:flex-row md:items-center md:gap-6 md:px-8 md:pt-5 md:pb-[26px] md:text-[13px] md:leading-none'
const LINES =
  'flex flex-col gap-[5px] md:flex-1 md:flex-row md:justify-between md:gap-6'

export function SiteFooter({ lines }: SiteFooterProps) {
  return (
    <footer className={FOOTER}>
      <div className={LINES}>
        {lines.map((line, i) => (
          <span key={i} data-testid="footer-line">
            {line}
          </span>
        ))}
      </div>
      <ThemeToggle />
    </footer>
  )
}
