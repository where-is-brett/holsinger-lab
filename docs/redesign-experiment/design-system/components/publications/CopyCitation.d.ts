/**
 * Copy-citation control. Writes the formatted citation to the
 * clipboard, shows "✓ COPIED" (accent border + text) for 1.8s,
 * then reverts. Press: scale 0.97, 140ms ease-out. `compact`
 * renders the one-line "CITE" variant for compact-density rows.
 * The `cite` string must carry the DOI/URL VERBATIM — never
 * uppercase or truncate it.
 */
export interface CopyCitationProps {
  /** full formatted citation, copied verbatim */
  cite: string;
  /** compact-density variant: "CITE" / "✓" */
  compact?: boolean;
  /** override the copied label, e.g. "✓ COPIED — CITATION ON CLIPBOARD" */
  copiedLabel?: string;
}
export declare function CopyCitation(props: CopyCitationProps): JSX.Element;
