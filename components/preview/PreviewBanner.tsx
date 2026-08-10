interface PreviewBannerProps {
  loading?: boolean
}

export function PreviewBanner({ loading }: PreviewBannerProps) {
  return (
    <div
      className={`${
        loading ? 'animate-pulse' : ''
      } bg-black p-3 text-center text-white`}
    >
      {'Previewing draft content. '}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full
        navigation (not client-side routing) is required to hit the
        `/api/disable-draft` route handler and clear the draft-mode cookie;
        the plugin's app-dir URL scanner still flags this href because it
        treats `route.ts` handlers the same as `page.tsx` routes. */}
      <a
        className="underline transition hover:opacity-50"
        href="/api/disable-draft"
      >
        Disable draft mode
      </a>
    </div>
  )
}
