import { NameRow } from 'components/wix/NameRow'
import { PersonGrid } from 'components/wix/PersonGrid'
import { wixFetch } from 'lib/wix/fetch'
import { teamQuery } from 'lib/wix/queries'
import { groupTeam } from 'lib/wix/team'
import type { TeamData } from 'lib/wix/types'

export const revalidate = 60
export const metadata = { title: 'Team' }

export default async function Team() {
  const team = await wixFetch<TeamData>(teamQuery)
  const g = groupTeam(team?.profiles ?? [], team?.labHeadId ?? null)

  return (
    <div className="mx-auto max-w-[1252px] px-[16px] pt-[40px] pb-[80px] md:pt-[84px]">
      <h1 className="text-center font-playfair text-[40px] md:text-[56px]">Our Team</h1>
      {team?.intro ? (
        <p className="mx-auto mt-[21px] max-w-[930px] text-center font-raleway text-[15px]/[28.1px]">
          {team.intro}
        </p>
      ) : null}

      {g.current.length ? (
        <div data-wix="current" className="mt-[48px]">
          <PersonGrid people={g.current} />
        </div>
      ) : null}

      {g.alumniCards.length + g.alumniRows.length > 0 ? (
        <section className="mt-[120px] max-w-[907px] md:ml-[172px]">
          <h2 className="font-playfair text-[32px]/[44px] md:text-[40px]/[54px]">Lab Alumni</h2>
          {team?.alumniSubtitle ? (
            <p className="mt-[6px] font-didot text-[18px]/[30px] italic md:text-[20px]/[33.4px]">
              {team.alumniSubtitle}
            </p>
          ) : null}
        </section>
      ) : null}

      {g.alumniCards.length ? (
        <div data-wix="alumni-cards" className="mt-[36px]">
          <PersonGrid people={g.alumniCards} partialFirst bigGap />
        </div>
      ) : null}

      {g.alumniRows.length ? (
        <ul data-wix="alumni-rows" className="mt-[55px] max-w-[907px] space-y-[6px] md:ml-[172px]">
          {g.alumniRows.map((p) => (
            <NameRow key={p._id} person={p} />
          ))}
        </ul>
      ) : null}

      {g.interns.length ? (
        <section className="mt-[32px] max-w-[907px] md:ml-[172px]">
          <h2 className="font-playfair text-[18px]/[28px] md:text-[22px]/[31px]">International Interns</h2>
          <ul data-wix="interns" className="mt-[16px] space-y-[6px]">
            {g.interns.map((p) => (
              <NameRow key={p._id} person={p} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
