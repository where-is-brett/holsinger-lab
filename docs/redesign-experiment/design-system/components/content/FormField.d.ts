/**
 * Form field (Contact / Support pages): mono-caps label, square
 * transparent input with a --sem-field border (3.98:1 on surface),
 * 44px minimum height. Focus uses the shared site-wide ring
 * (2px accent, 3px offset). Hover darkens the border; disabled
 * fills with surface-raised. Placeholder text is faint — never
 * rely on it as the only label.
 */
export interface FormFieldProps {
  label: string;
  /** faint mono helper line under the input */
  hint?: string;
  type?: string;
  textarea?: boolean;
  rows?: number;
  placeholder?: string;
  value?: string;
  onChange?: (e: any) => void;
  disabled?: boolean;
  name?: string;
}
export declare function FormField(props: FormFieldProps): JSX.Element;
