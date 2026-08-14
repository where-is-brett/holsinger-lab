import { resolveHref } from 'lib/sanity.links'
import Link from 'next/link'
import type { LabHeadPayload } from 'types'

import { PersonBio } from './PersonBio'

export function Spotlight({ labHead }: { labHead: LabHeadPayload }) {
  const href = labHead.hasPage ? resolveHref('profile', labHead.slug) : undefined

  return (
    <section className="mb-12 border-b pb-12">
      <PersonBio person={labHead} layout="spotlight" />
      {href && (
        <Link href={href} className="mt-4 inline-block font-medium hover:underline">
          Full profile →
        </Link>
      )}
    </section>
  )
}
