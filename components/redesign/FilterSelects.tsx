'use client'

import type { FilterKey, FilterOptions, Filters } from './filterModel'
import { MICRO_LABEL } from './tokens'

const GROUPS: { key: FilterKey; label: string }[] = [
  { key: 'year', label: 'Year' },
  { key: 'type', label: 'Type' },
  { key: 'topic', label: 'Topic' },
]

// 16px: iOS Safari zooms the page when a focused control's text is smaller.
// Native `appearance` keeps the platform picker and its own chevron.
const SELECT =
  'mt-1.5 block min-h-11 w-full min-w-0 border border-rule-strong bg-surface px-3 font-sans text-[16px] leading-[1.25] text-text'

export interface FilterSelectsProps {
  options: FilterOptions
  value: Filters
  onChange: (next: Filters) => void
  /** Prefix for element ids; the desktop row and the sheet each pass their own. */
  idPrefix: string
  /** Grid classes for the wrapper; the row and the sheet lay out differently. */
  className: string
}

export function FilterSelects({ options, value, onChange, idPrefix, className }: FilterSelectsProps) {
  return (
    <div className={className}>
      {GROUPS.filter((g) => options[g.key].length > 0).map((g) => {
        const id = `${idPrefix}-${g.key}`
        return (
          <div key={g.key} className="min-w-0">
            <label htmlFor={id} className={MICRO_LABEL}>
              {g.label}
            </label>
            <select
              id={id}
              className={SELECT}
              value={value[g.key] ?? ''}
              onChange={(e) => onChange({ ...value, [g.key]: e.target.value || null })}
            >
              <option value="">All</option>
              {options[g.key].map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
