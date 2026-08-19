export interface SiteFooterProps {
  compact?: boolean
}

// Ported from
// docs/redesign-experiment/design-system/components/navigation/SiteFooter.jsx.
// Purely presentational, no state or handlers -- no 'use client'.

// Task brief decision #6: this footer is page chrome sitting outside
// Layout's content column, so it owns its own horizontal padding rather
// than deferring to Layout's gutters. `px-8` (2rem, non-compact variant)
// matches none of --spacing-gutter (1.125rem), -md (3rem) or -lg (3.5rem)
// -- that inconsistency belongs to the vendored source and is intentionally
// not "fixed" here with an invented replacement value.
//
// Two fully-formed strings, not one shared base plus a same-property
// override (flex-direction/gap/padding/font-size all differ between
// variants) -- see tokens.ts's PRESS comment for why that separation
// matters whenever variants could collide on one property.
const FOOTER_DEFAULT =
  'flex flex-row justify-between gap-6 box-border border-t border-rule pt-5 px-8 pb-[26px] font-mono text-[11px] leading-none tracking-[0.08em] uppercase text-text-faint'
const FOOTER_COMPACT =
  'flex flex-col justify-between gap-[5px] box-border border-t border-rule pt-3.5 px-(--spacing-gutter) pb-[18px] font-mono text-[8.5px] leading-[1.4] tracking-[0.08em] uppercase text-text-faint'

export function SiteFooter({ compact = false }: SiteFooterProps) {
  return (
    <footer className={compact ? FOOTER_COMPACT : FOOTER_DEFAULT}>
      <span>Designed by Brett Yang</span>
      {/* Copyright year is hardcoded in the vendored source, kept verbatim
          per the task brief -- flagged in the task report as something that
          will go stale and need a follow-up (e.g. new Date().getFullYear())
          outside this task's scope. */}
      <span>Copyright 2026 © Holsinger Lab</span>
    </footer>
  )
}
