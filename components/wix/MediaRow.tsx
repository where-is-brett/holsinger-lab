import { urlForImage } from 'lib/sanity.image'
import { formatMediaDate, youtubeEmbedUrl } from 'lib/wix/format'
import type { MediaItem } from 'lib/wix/types'
import { stegaClean } from 'next-sanity'

// Wix styles the first (video-bearing) item's title at 30px and every other
// item at 22px. The fixture's first media item currently has no video (its
// source mp4 is 403-blocked on Wix, see Ruling R14), so the "large" title is
// tied to "has a video, or is the first item in the list" rather than to the
// presence of a video alone -- that keeps the 30px size correct once Damian
// adds the real video in Studio, and correct today while it's still missing.
export function MediaRow({ item, isFirst }: { item: MediaItem; isFirst?: boolean }) {
  const date = formatMediaDate(item.date)
  const large = isFirst || Boolean(item.videoUrl)
  const titleClass = large
    ? 'font-playfair text-[22px]/[30px] md:text-[30px]/[41px]'
    : 'font-playfair text-[22px]/[30px]'
  const poster = item.poster ? urlForImage(item.poster)?.width(1280).url() : undefined

  if (item.videoUrl) {
    const src = stegaClean(item.videoUrl)
    return (
      <li data-wix="media" className="mt-[40px] first:mt-0">
        <h2 className={titleClass}>
          {item.title} - <em>{item.outlet}</em>
        </h2>
        <video
          src={src}
          poster={poster}
          controls
          preload="metadata"
          className="mx-auto mt-[20px] aspect-[640/365] w-full md:w-[640px]"
        />
        {date ? <p className="mt-0 font-playfair text-[18px]/[24px] md:text-[22px]/[30px]">{date}</p> : null}
      </li>
    )
  }

  const embedUrl = youtubeEmbedUrl(item.url)
  if (embedUrl) {
    return (
      <li data-wix="media" className="mt-[40px] first:mt-0">
        <h2 className={titleClass}>
          {item.title} - <em>{item.outlet}</em>
        </h2>
        <iframe
          src={embedUrl}
          title={`${stegaClean(item.title)} – ${stegaClean(item.outlet)}`}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          // 640x365 (not the requested 640x360) to match the self-hosted
          // <video> branch above exactly, rather than introduce a second,
          // very-slightly-different aspect ratio for the same row shape.
          className="mx-auto mt-[20px] aspect-[640/365] w-full border-0 md:w-[640px]"
        />
        {date ? <p className="mt-0 font-playfair text-[18px]/[24px] md:text-[22px]/[30px]">{date}</p> : null}
      </li>
    )
  }

  const href = item.url ? stegaClean(item.url) : null

  return (
    <li data-wix="media" className="mt-[40px] first:mt-0">
      {href ? (
        // On Wix, the <a> wraps only the title (with an underline); the
        // " - outlet" suffix follows as plain, unlinked, un-underlined text.
        <span className={titleClass}>
          <a href={href} target="_blank" rel="noreferrer" className="underline">
            {item.title}
          </a>
          {' - '}
          <em>{item.outlet}</em>
        </span>
      ) : (
        <span className={titleClass}>
          {item.title} - <em>{item.outlet}</em>
        </span>
      )}
      {date ? <p className="mt-0 font-playfair text-[18px]/[24px] md:text-[22px]/[30px]">{date}</p> : null}
    </li>
  )
}
