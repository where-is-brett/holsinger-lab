/**
 * Resource block (agreed-IA `resource` type — launches with exactly
 * one item: the ES cell-culture chamber). Heading + mono key-value
 * meta (KIND / SOURCE / DOI) + a labelled figure placeholder.
 * Values print verbatim: labels are uppercased by style, values
 * (DOIs, citations) are never case-transformed.
 */
export interface ResourceMeta {
  label: string;
  value: string;
  /** renders the value as a chromatic identifier link */
  href?: string;
}
export interface ResourceBlockProps {
  title: string;
  meta?: ResourceMeta[];
  /** caption inside the striped figure placeholder, e.g. "[ chamber unit photo ]"; omit to hide */
  figureLabel?: string;
}
export declare function ResourceBlock(props: ResourceBlockProps): JSX.Element;
