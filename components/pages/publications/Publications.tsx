import { PublicationPayload } from 'types'

import { groupByYear } from './groupByYear'
import Publication from './Publication'

const Publications = ({
  publications,
}: {
  publications: PublicationPayload[]
}) => {
  const groups = groupByYear(publications)

  return (
    <>
      <h1 className="mb-8 text-3xl font-black md:text-5xl">Publications</h1>

      <div className="mb-16 space-y-10">
        {groups.map(({ year, publications: yearPublications }) => (
          <section key={year}>
            <h2 className="mb-5 text-3xl font-bold lg:text-4xl">{year}</h2>
            <ul className="ml-0 space-y-6">
              {yearPublications.map((publication) => (
                <li key={publication._id}>
                  <Publication publication={publication} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}

export default Publications
