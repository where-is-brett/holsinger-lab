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
})
