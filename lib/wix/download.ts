/**
 * Triggers a client-side file download of `content` as `filename`: builds a
 * `Blob`, a temporary `<a download>` pointed at an object URL, and clicks it.
 * The object URL is revoked in a `finally` so a throw between creating and
 * clicking the anchor (e.g. `document.body.appendChild` or `.click()`
 * failing) can't leak it.
 */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
