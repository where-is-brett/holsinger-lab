/**
 * Truncates at the last whitespace boundary at or before `maxLength`, so a
 * meta description never ends mid-word. Falls back to a hard cut when no
 * boundary exists (a single word longer than `maxLength`).
 */
export function truncateAtWordBoundary(text: string, maxLength: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) {
    return trimmed
  }
  const sliced = trimmed.slice(0, maxLength)
  const lastSpace = sliced.lastIndexOf(' ')
  const cut = lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced
  return `${cut.trimEnd()}…`
}
