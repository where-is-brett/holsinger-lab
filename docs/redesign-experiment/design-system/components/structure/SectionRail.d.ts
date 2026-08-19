/**
 * The numbered section rail — the direction's structural signature.
 * A grid of [88px rail | content]: accent number on top, vertical
 * mono-caps label below, 1px rule on the rail's right edge. Blocks
 * stack vertically, separated by hairlines (or a background change
 * for inverse bands — inverse bands carry no top rule).
 * At 390 the rail narrows to --spacing-rail-sm (38px); set
 * `--spacing-rail: var(--spacing-rail-sm)` on a mobile container.
 */
export interface SectionRailProps {
  /** two-digit block number, e.g. "01" — accent colour */
  num?: string;
  /** vertical mono-caps label, e.g. "Recent work" */
  label?: string;
  /** dark band (MAESTRO, enquiries): surface-inverse bg, inverse text/rules */
  inverse?: boolean;
  /** hairline above the block; default true (ignored when inverse) */
  borderTop?: boolean;
  /** apply the standard content padding (stack / gutter-lg / stack-lg / gutter-md); default true */
  pad?: boolean;
  /** rail padding-top, aligns the number with the block's first line */
  padTop?: string;
  children?: React.ReactNode;
}
export declare function SectionRail(props: SectionRailProps): JSX.Element;
