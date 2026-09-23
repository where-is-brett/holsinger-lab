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
// Task 3 (spec §1.5, brief step 3): sentence-case Archivo, not uppercase
// mono -- SiteNav.tsx's own comment measures the nav alone at 7 uppercase
// micro-labels, already over the page budget of 6; the footer's own lines
// (typically two: "Designed by ...", "Copyright ...") pushed every route to
// 9 before this fix. This is also CMS text (`settings.footer`), so forcing
// it upper-case ran against constraints.md's "CMS text prints verbatim"
// rule regardless of the budget.
const FOOTER =
  'box-border flex flex-col gap-[5px] border-t border-rule px-(--spacing-gutter) pt-3.5 pb-[18px] font-sans text-[11px] leading-[1.4] text-text-faint md:flex-row md:justify-between md:gap-6 md:px-8 md:pt-5 md:pb-[26px] md:text-[13px] md:leading-none'

export function SiteFooter({ lines }: SiteFooterProps) {
  return (
    <footer className={FOOTER}>
      {lines.map((line, i) => (
        <span key={i}>{line}</span>
      ))}
    </footer>
  )
}
