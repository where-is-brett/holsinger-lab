/**
 * Sticky facet band for the publications index: labelled chip rows
 * (Year · Type · Topic) with live counts, a density toggle, and a
 * helper note. Pins to the viewport top (top: 0 — this direction's
 * header is not sticky; against a sticky header the offset must be
 * var(--nav-height), never a hardcoded px). The band is
 * presentational — the parent owns filter state and computes counts.
 * Chips toggle: click to filter, click again to clear. An untagged
 * paper still appears under year and type facets.
 */
export interface FacetChipSpec {
  label: string;
  count?: number | string;
  on?: boolean;
  onClick?: () => void;
}
export interface FacetBandProps {
  groups: { label: string; chips: FacetChipSpec[] }[];
  /** density toggle row; omit to hide */
  density?: { options: string[]; value: string; onChange: (d: string) => void };
  /** faint mono-caps helper line under the rows */
  note?: string;
  sticky?: boolean;
  /** rail number/label for the band's rail cell */
  num?: string;
  label?: string;
}
export declare function FacetBand(props: FacetBandProps): JSX.Element;
