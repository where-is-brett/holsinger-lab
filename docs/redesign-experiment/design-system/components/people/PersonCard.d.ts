/**
 * Person card for the People grid: 4:5 portrait (grayscale at rest,
 * colour on hover, 160ms), name (600, -> accent on hover), mono role.
 * No cards, no shadows — the grid stays a ledger.
 * No-portrait fallback: the slot keeps the exact 4:5 footprint —
 * mono initials on the striped placeholder texture with an honest
 * caption. The grid never re-flows around a missing image.
 */
export interface PersonCardProps {
  name: string;
  /** role string printed verbatim (roles are free text in the CMS) */
  role: string;
  /** portrait URL; omit to render the initials fallback */
  img?: string;
  /** initials for the fallback, e.g. "JC" */
  initials?: string;
}
export declare function PersonCard(props: PersonCardProps): JSX.Element;
