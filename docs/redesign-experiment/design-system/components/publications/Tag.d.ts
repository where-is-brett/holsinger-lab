/**
 * Topic / type tag: square-cornered, hairline-bordered mono-caps
 * chip. Purely informational unless given href/onClick. The label
 * is uppercased by STYLE — pass content in its natural case, and
 * never put an identifier (DOI/URL) inside a Tag.
 */
export interface TagProps {
  children: React.ReactNode;
  href?: string;
  onClick?: (e: any) => void;
}
export declare function Tag(props: TagProps): JSX.Element;
