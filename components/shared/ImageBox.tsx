import { urlForImage } from 'lib/sanity.image'
import Image from 'next/image'

interface ImageBoxProps {
  image?: { asset?: any } | null
  alt?: string
  width?: number
  height?: number
  size?: string
  classesWrapper?: string
}

export default function ImageBox({
  image,
  alt = 'Cover image',
  width = 3500,
  height = 2000,
  // Callers render this component at widely different widths (a full-bleed
  // project cover vs. a one-third-width profile card). `100vw` is only correct
  // for the full-bleed case and makes every other call site download a far
  // larger candidate than it can display -- a 325px People card was selecting
  // the 3840w image. Pass the real layout.
  size = '100vw',
  classesWrapper,
}: ImageBoxProps) {
  const imageUrl =
    image && urlForImage(image)?.height(height).width(width).fit('crop').url()

  return (
    <div className={`w-full overflow-hidden bg-surface-raised ${classesWrapper}`}>
      {imageUrl && (
        <Image
          className="absolute h-full w-full"
          alt={alt}
          width={width}
          height={height}
          sizes={size}
          src={imageUrl}
        />
      )}
    </div>
  )
}
