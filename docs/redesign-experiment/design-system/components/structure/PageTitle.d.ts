/**
 * Page-level section header: 44px title baseline-aligned with a
 * mono-caps meta line on the right (counts, ranges). Sits on the
 * rail grid with an empty rail cell. The meta line is uppercase by
 * style — never put an identifier (DOI/URL) in it.
 */
export interface PageTitleProps {
  title: string;
  /** right-aligned mono-caps meta, e.g. "19 RECORDS · 2020–2025" */
  meta?: string;
  /** meta in accent colour (used for live filter counts) */
  accentMeta?: boolean;
}
export declare function PageTitle(props: PageTitleProps): JSX.Element;
