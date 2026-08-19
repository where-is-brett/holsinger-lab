/**
 * The direction's only button: square-cornered, hairline-bordered
 * mono-caps control (the CopyCitation styling, generalized). No
 * fills, no shadows. Press: scale 0.97, 140ms ease-out. `active`
 * swaps border+text to the accent. Disabled: 45% opacity.
 * Labels are stylistic text — never put an identifier in a button.
 */
export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  /** renders as an anchor */
  href?: string;
  disabled?: boolean;
  /** accent border + text (confirmation states) */
  active?: boolean;
}
export declare function Button(props: ButtonProps): JSX.Element;
