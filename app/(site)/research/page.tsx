import { PageStrip } from 'components/wix/PageStrip'
import { ResearchProject } from 'components/wix/ResearchProject'
import { wixFetch } from 'lib/wix/fetch'
import { researchQuery } from 'lib/wix/queries'
import type { ResearchProject as P } from 'lib/wix/types'

export const revalidate = 60
export const metadata = { title: 'Research' }

export default async function Research() {
  const projects = (await wixFetch<P[]>(researchQuery)) ?? []
  return (
    <PageStrip heading="RESEARCH PROJECTS" topClass="pt-[62px] md:pt-[122px]">
      {projects.map((p) => (
        <ResearchProject key={p._id} project={p} />
      ))}
    </PageStrip>
  )
}
