/**
 * The publication row — the load-bearing component of the system.
 * Four-column ledger anatomy on a normalized grid:
 *   64px year | 1fr title·authors·tags | 230px journal | 250px link·cite
 * with 28px column gap, 1px top hairline, whole row is the hover
 * target (background tint; title -> accent; rules never move).
 *
 * Densities (index variant):
 *  - comfortable: 3-line anatomy — title (17.5/600), authors with
 *    the PI's name in 600 ink, mono-caps type·topic line; journal on
 *    two lines; link + COPY CITATION button.
 *  - compact: ONE scanning line — title truncates with ellipsis,
 *    authors and tags yield to the publication page; link ellipsized
 *    (use linkLabelShort), CITE button. ~3x more rows per screen.
 *
 * variant="home": single-line title row for the Home recent-work
 * block — no authors, tags or copy control.
 *
 * NARROW WIDTHS (<720px container): the grid must NOT squeeze —
 * render with `narrow` instead, which stacks the row: (1) mono line
 * "YEAR — JOURNAL REF", (2) title, (3) ellipsized link. Authors,
 * tags and the copy control yield to the publication page.
 *
 * The DOI/URL prints VERBATIM (`hl-identifier`) — never uppercased,
 * link labels may be pre-truncated with a trailing ellipsis but the
 * href always carries the full identifier.
 * @startingPoint section="Publications" subtitle="Four-column ledger row, two densities" viewport="1300x180"
 */
export interface Publication {
  year: string;
  title: string;
  /** author string split around the PI's name for emphasis */
  authorsPre: string;
  authorsPI: string;
  authorsPost: string;
  journal: string;
  /** volume(issue) · pages, e.g. "11(1) · 74" */
  ref: string;
  /** "DOI" when a DOI exists, else "URL" (9 of 19 papers) */
  linkKind: "DOI" | "URL";
  /** display label, printed verbatim (case-sensitive) */
  linkLabel: string;
  /** pre-truncated label for compact rows */
  linkLabelShort?: string;
  linkHref: string;
  type: string;
  topics: string[];
  /** formatted citation for the copy control */
  cite: string;
}
export interface PublicationRowProps {
  pub: Publication;
  density?: "comfortable" | "compact";
  variant?: "index" | "home";
  /** stacked anatomy for <720px containers */
  narrow?: boolean;
  onOpen?: (pub: Publication) => void;
}
export declare function PublicationRow(props: PublicationRowProps): JSX.Element;
