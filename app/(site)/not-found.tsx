// The site-chrome not-found boundary (M5): renders the same "Page not
// found" content as the root app/not-found.tsx, but nested inside
// app/(site)/layout.tsx so SiteHeader and SiteFooter still show. Next
// renders this instead of the root one for anything under the (site) route
// group -- reached via the [...rest] catch-all's notFound() call, or a
// notFound() thrown by any page inside this group.
//
// No own <main> here (unlike the root not-found.tsx) -- app/(site)/layout.tsx
// already wraps its children (this component included) in <main id="main">,
// and a second one would duplicate that id.
export default function SiteNotFound() {
  return (
    <div className="wix-col py-[80px] text-center">
      <h1 className="font-playfair text-[40px]/[54px]">Page not found</h1>
    </div>
  )
}
