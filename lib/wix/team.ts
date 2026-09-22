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
    // Defensive fallback: `settings.labHead` starts unset in Studio (it is
    // set by hand), and until then the PI's own profile -- typically
    // roleGroup-less and image-less, exactly like every other Lab Alumni or
    // International Interns exclusion here -- would otherwise land in the
    // current-members grid as an empty portrait box. Exclude by role instead
    // whenever labHeadId isn't set. This never runs once labHeadId is set,
    // since that branch above already excludes the PI.
    if (!labHeadId && p.role === 'Lab Head') continue
    if (p.group === 'Lab Alumni') (p.image?.asset ? out.alumniCards : out.alumniRows).push(p)
    else if (p.group === 'International Interns') out.interns.push(p)
    else out.current.push(p)
  }
  return out
}
