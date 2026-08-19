/**
 * Site header: mono-caps wordmark line left, page nav right.
 * The header is NOT sticky in this direction — it scrolls away.
 * Height comes from --nav-height (48px, 52px at >=48rem).
 * @startingPoint section="Navigation" subtitle="Header with mono-caps nav" viewport="1440x120"
 */
export interface SiteNavProps {
  /** id of the current page — that item renders in the accent colour, no underline */
  current?: "home" | "pubs" | "research" | "resources" | "people" | "lab";
  /** override the nav items; defaults to the six agreed-IA sections */
  items?: { id: string; label: string }[];
  /** SPA navigation callback; when set, clicks preventDefault and call this */
  onNavigate?: (id: string) => void;
}
export declare function SiteNav(props: SiteNavProps): JSX.Element;
export declare const NAV_ITEMS: { id: string; label: string }[];
