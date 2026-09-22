import type { TeamProfile } from './types'

export interface TeamGroups { current: TeamProfile[]; alumniCards: TeamProfile[]; alumniRows: TeamProfile[]; interns: TeamProfile[] }

/** Wix's Team page: one grid of current members (any group but the two below,
 *  including none), then Lab Alumni split into photo cards and name rows, then
 *  International Interns as rows. Input is already in orderRank order. The lab
 *  head is not on Wix's Team page. */
export function groupTeam(profiles: TeamProfile[], labHeadId: string | null): TeamGroups {
  const out: TeamGroups = { current: [], alumniCards: [], alumniRows: [], interns: [] }
  for (const p of profiles) {
    if (labHeadId && p._id === labHeadId) continue
    if (p.group === 'Lab Alumni') (p.image?.asset ? out.alumniCards : out.alumniRows).push(p)
    else if (p.group === 'International Interns') out.interns.push(p)
    else out.current.push(p)
  }
  return out
}
