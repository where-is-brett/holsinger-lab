/**
 * Facet filter chip with a live count. ON state is an ink fill
 * (surface-inverse + text-inverse) — the filter reads as a set
 * instrument switch, not an accent. Click toggles; click again
 * clears (parent owns state). Press feedback: scale 0.97.
 */
export interface FacetChipProps {
  label: string;
  /** live result count shown at 55% opacity; omit to hide */
  count?: number | string;
  /** selected state */
  on?: boolean;
  onClick?: () => void;
}
export declare function FacetChip(props: FacetChipProps): JSX.Element;
