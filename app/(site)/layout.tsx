export default function SiteLayout({ children }: { children: React.ReactNode }) {
  // min-h-px: stub pages (removed in C4-C8) render only a `sr-only` heading,
  // which is position:absolute and out of flow, collapsing `main` to zero
  // height -- and Playwright's toBeVisible() treats a zero-area element as
  // not visible. A 1px floor keeps `main#main` visible without affecting any
  // page that has real (in-flow) content.
  return (
    <main id="main" className="min-h-px">
      {children}
    </main>
  )
}
