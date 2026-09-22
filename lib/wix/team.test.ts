import { describe, expect, it } from 'vitest'

import { groupTeam } from './team'
import type { TeamProfile } from './types'

const p = (id: string, group: string | null, image = true): TeamProfile => ({
  _id: id, name: id, role: 'r', roleDetail: null, group, image: image ? ({ asset: { _ref: 'image-x' } } as never) : null,
})

describe('groupTeam', () => {
  const profiles = [
    p('haochen', 'PhD Candidate'),
    p('pi', 'Research Scientist'),
    p('johnny', 'Research Scientist'),
    p('fritz', 'Study Abroad Student'),
    p('jiyoo', null, false),
    p('quy', 'Lab Alumni'),
    p('aria', 'Lab Alumni', false),
    p('mia', 'International Interns', false),
  ]
  const g = groupTeam(profiles, 'pi')

  it('keeps orderRank order within each group', () => {
    expect(g.current.map((x) => x._id)).toEqual(['haochen', 'johnny', 'fritz', 'jiyoo'])
  })
  it('excludes the lab head (Review Focus 1)', () => {
    expect([...g.current, ...g.alumniCards, ...g.alumniRows, ...g.interns].map((x) => x._id)).not.toContain('pi')
  })
  it('puts unknown or missing groups with current members (Review Focus 2)', () => {
    expect(g.current.map((x) => x._id)).toEqual(expect.arrayContaining(['fritz', 'jiyoo']))
  })
  it('splits alumni by photo', () => {
    expect(g.alumniCards.map((x) => x._id)).toEqual(['quy'])
    expect(g.alumniRows.map((x) => x._id)).toEqual(['aria'])
  })
  it('interns are rows', () => expect(g.interns.map((x) => x._id)).toEqual(['mia']))
  it('no lab head set', () => expect(groupTeam(profiles, null).current[1]._id).toBe('pi'))

  it('excludes a "Lab Head" role by role when labHeadId is null (defensive fallback, I1)', () => {
    const withRole: TeamProfile[] = [
      p('haochen', 'PhD Candidate'),
      { ...p('pi2', null), role: 'Lab Head' },
      p('johnny', 'Research Scientist'),
    ]
    const g = groupTeam(withRole, null)
    expect(g.current.map((x) => x._id)).toEqual(['haochen', 'johnny'])
  })

  it('excludes a stega-encoded "Lab Head" role (draft mode encodes string fields, FU1)', () => {
    // Same zero-width characters next-sanity's stega encoding inserts into
    // string fields in draft mode -- see lib/wix/format.test.ts. A raw
    // `p.role === 'Lab Head'` comparison would miss this.
    const stega = '\u200b\u200c\u200d\u2060'
    const withRole: TeamProfile[] = [
      p('haochen', 'PhD Candidate'),
      { ...p('pi2', null), role: `Lab Head${stega}` },
      p('johnny', 'Research Scientist'),
    ]
    const g = groupTeam(withRole, null)
    expect(g.current.map((x) => x._id)).toEqual(['haochen', 'johnny'])
  })

  it('the labHeadId path still wins when both an id and a "Lab Head" role are present', () => {
    const withRole: TeamProfile[] = [
      p('haochen', 'PhD Candidate'),
      { ...p('pi2', null), role: 'Lab Head' },
    ]
    const g = groupTeam(withRole, 'pi2')
    expect(g.current.map((x) => x._id)).toEqual(['haochen'])
  })

  it('a "Lab Head" role is not excluded once labHeadId is set to someone else', () => {
    // The fallback only fires when labHeadId is null -- once Brett sets
    // labHead in Studio, only that exact document is excluded.
    const withRole: TeamProfile[] = [
      { ...p('pi2', null), role: 'Lab Head' },
      p('johnny', 'Research Scientist'),
    ]
    const g = groupTeam(withRole, 'johnny')
    expect(g.current.map((x) => x._id)).toEqual(['pi2'])
  })
})
