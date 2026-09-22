import { MediaRow } from 'components/wix/MediaRow'
import { wixFetch } from 'lib/wix/fetch'
import { mediaQuery } from 'lib/wix/queries'
import type { MediaItem } from 'lib/wix/types'

export const revalidate = 60
export const metadata = { title: 'Media' }

export default async function Media() {
  const items = (await wixFetch<MediaItem[]>(mediaQuery)) ?? []
  return (
    <div className="wix-col pt-[6px] pb-[80px]">
      <h1 className="sr-only">Media</h1>
      <ul>
        {items.map((m, i) => (
          <MediaRow key={m._id} item={m} isFirst={i === 0} />
        ))}
      </ul>
    </div>
  )
}
