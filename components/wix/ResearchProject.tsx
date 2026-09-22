import { urlForImage } from 'lib/sanity.image'
import type { ResearchProject as P } from 'lib/wix/types'
import Image from 'next/image'
import { stegaClean } from 'next-sanity'

import { InlineText } from './InlineText'

export function ResearchProject({ project }: { project: P }) {
  const img = project.coverImage
  const src = img ? urlForImage(img)?.width(1416).url() : undefined
  const dims = img?.asset?._ref?.match(/-(\d+)x(\d+)-/)
  return (
    <article data-wix="project" className="mt-[50px] md:mt-[54px]">
      <h2 data-wix="project-title" className="font-lato text-[18px]/[26px] font-bold md:text-[22px]/[31px]">
        {project.title}
      </h2>
      <InlineText
        value={project.description}
        className="mt-[8px] font-lato text-[15px]/[24px] font-light md:mt-[3px] md:text-[20px]/[31px]"
      />
      {src && dims ? (
        <figure className="mx-auto mt-[40px] w-fit max-w-full">
          <Image
            src={src}
            alt={stegaClean(img?.alt) ?? ''}
            width={Number(dims[1])}
            height={Number(dims[2])}
            sizes="(min-width: 768px) 708px, 100vw"
            className="h-auto max-w-full md:max-w-[708px]"
          />
        </figure>
      ) : null}
    </article>
  )
}
