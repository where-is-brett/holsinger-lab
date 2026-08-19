/**
 * 390-wide header with MENU/CLOSE toggle. Open state renders a
 * full-width sheet under the header: numbered 56px rows, same
 * state grammar as the desktop nav (current = accent, no underline).
 * Every target >= 44px.
 */
export interface MobileHeaderProps {
  /** whether the menu sheet is open */
  open?: boolean;
  /** MENU/CLOSE click handler — parent owns the open state */
  onToggle?: () => void;
  /** id of the current page */
  current?: string;
  items?: { id: string; label: string }[];
  onNavigate?: (id: string) => void;
}
export declare function MobileHeader(props: MobileHeaderProps): JSX.Element;
