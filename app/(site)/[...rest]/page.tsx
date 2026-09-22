import { notFound } from 'next/navigation'

// Catches any path under the site chrome that isn't one of its named routes
// (/research, /news, /publications, /team, /media, /contact, or /). Calling
// notFound() here renders the nearest not-found boundary in the tree --
// app/(site)/not-found.tsx -- so a 404 still shows the header and footer
// (M5), instead of the bare root app/not-found.tsx.
export default function CatchAll() {
  notFound()
}
