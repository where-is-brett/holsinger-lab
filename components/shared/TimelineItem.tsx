import ImageBox from 'components/shared/ImageBox'
import type { MilestoneItem } from 'types'

export function TimelineItem({
  isLast,
  milestone,
}: {
  isLast: boolean
  milestone: MilestoneItem
}) {
  const { description, duration, image, tags, title } = milestone
  const startYear = duration?.start
    ? new Date(duration.start).getFullYear()
    : undefined
  const endYear = duration?.end ? new Date(duration.end).getFullYear() : 'Now'

  return (
    <div className={`flex min-h-[200px] font-antarctican ${!isLast && 'pb-2'}`}>
      <div className="flex flex-col">
        {/* Thumbnail */}
        <div
          className="relative overflow-hidden"
          style={{ width: '65px', height: '65px' }}
        >
          <ImageBox
            image={image}
            alt={title || 'Timeline item icon'}
            // The box is a fixed 65px square, so declare it in pixels --
            // `10vw` over-declares on a wide viewport and under-declares on
            // a narrow one. `width`/`height` cap what Sanity renders and
            // next/image never upscales past its source, so they are set to
            // 4x the CSS box to cover high-DPR screens; at this size the
            // byte cost is negligible.
            size="65px"
            width={260}
            height={260}
          />
        </div>
        {/* Vertical line */}
        {!isLast && <div className="mt-2 w-px grow self-center bg-rule" />}
      </div>
      <div className="flex-initial pl-4">
        {/* Title */}
        <div className="font-bold text-text">{title}</div>
        {/* Tags */}
        <div className="text-sm text-text-muted ">
          {tags?.map((tag, key) => (
            <span key={key}>
              {tag}
              <span className="mx-1">●</span>
            </span>
          ))}
          {startYear} - {endYear}
        </div>
        {/* Description */}
        <div className="pb-5 pt-3 font-ariana text-text-muted">{description}</div>
      </div>
    </div>
  )
}
