'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useEffect, useId, useState } from 'react'

import { Button } from './Button'
import { activeFilterCount, type FilterOptions, type Filters, NO_FILTERS } from './filterModel'
import { FilterSelects } from './FilterSelects'

export interface FilterBarProps {
  options: FilterOptions
  value: Filters
  onChange: (next: Filters) => void
  resultCount: number
}

const TEXT_BUTTON = 'min-h-11 font-sans text-[15px] font-medium text-link'

export function FilterBar({ options, value, onChange, resultCount }: FilterBarProps) {
  const [open, setOpen] = useState(false)
  const active = activeFilterCount(value)
  const clear = () => onChange(NO_FILTERS)
  const results = `${resultCount} ${resultCount === 1 ? 'result' : 'results'}`
  // Own instance id, not a caller-supplied prefix: any number of FilterBars
  // on one page (e.g. the gallery's live and sparse fixtures) get distinct
  // select ids for free, so a `<label for>` never resolves to the wrong
  // instance's control.
  const uid = useId()

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 48rem)')
    const onChangeMq = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false)
    }
    mq.addEventListener('change', onChangeMq)
    return () => mq.removeEventListener('change', onChangeMq)
  }, [])

  return (
    <div data-testid="filter-bar">
      <p role="status" className="sr-only">
        {results}
      </p>

      <div data-testid="filter-row" className="hidden items-end gap-x-6 md:flex">
        <FilterSelects
          options={options}
          value={value}
          onChange={onChange}
          idPrefix={`${uid}-row`}
          className="grid flex-1 grid-cols-3 gap-x-4"
        />
        {active > 0 && (
          <button type="button" className={TEXT_BUTTON} onClick={clear}>
            Clear
          </button>
        )}
      </div>

      <div className="md:hidden">
        <Button onClick={() => setOpen(true)}>{active > 0 ? `Filter (${active})` : 'Filter'}</Button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        // `fixed inset-0`, not `relative`: DialogPanel is itself `fixed
        // inset-x-0 bottom-0`, out of flow, so a merely `relative` root has
        // no in-flow content and collapses to zero height -- a real box,
        // and a `role="dialog"` element with a zero-size box reads as not
        // visible (Playwright's actionability checks, some AT). Same trap
        // and fix as MobileHeader.tsx's own Dialog root.
        className="fixed inset-0 z-50"
      >
        {/* `--sem-scrim` is pinned dark in both colour schemes, unlike
            `--sem-surface-inverse` (which flips light in dark mode and would
            wash the page out instead of dimming it). No text renders on
            this backdrop, so it doesn't trip the token-role guard's ban on
            pairing `bg-scrim` with inverse text. */}
        <div className="fixed inset-0 bg-scrim opacity-60" aria-hidden="true" />
        <DialogPanel
          data-testid="filter-sheet"
          className="fixed inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto border-t border-rule bg-surface px-(--spacing-gutter) pt-5 pb-8"
        >
          <div className="flex items-center justify-between">
            <DialogTitle className="font-sans text-[17px] font-semibold">Filter publications</DialogTitle>
            <button type="button" className={TEXT_BUTTON} onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          {/* Headless UI marks `main` inert while this sheet is open, which
              silences the outer status line above -- this one is the only
              live announcement of the result count reachable by assistive
              tech on the mobile path, and it unmounts with the sheet. */}
          <p role="status" className="sr-only">
            {results}
          </p>
          <FilterSelects
            options={options}
            value={value}
            onChange={onChange}
            idPrefix={`${uid}-sheet`}
            className="mt-4 grid grid-cols-1 gap-y-4"
          />
          <div className="mt-6 flex items-center justify-between gap-4">
            {active > 0 ? (
              <button type="button" className={TEXT_BUTTON} onClick={clear}>
                Clear
              </button>
            ) : (
              <span />
            )}
            <Button variant="primary" onClick={() => setOpen(false)}>
              Show {results}
            </Button>
          </div>
        </DialogPanel>
      </Dialog>
    </div>
  )
}
