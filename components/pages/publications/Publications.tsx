import { PublicationPayload } from 'types'

import Publication from './Publication'

const Publications = ({ publications }) => {
  return (
    <>
      <h1 className="mb-8 text-3xl font-black md:text-5xl">Publications</h1>

      <ul className="mb-16 ml-0 space-y-6">
        {publications.map((publication: PublicationPayload, index: number) => {
          const prevYear = index && publications[index - 1].date.slice(0, 4)
          const currentYear = publication.date.slice(0, 4)
          return (
            <div key={publication._id}>
              {(index === 0 || prevYear !== currentYear) && (
                <li className="my-5 text-3xl font-bold lg:text-4xl">
                  {publication.date.slice(0, 4)}
                </li>
              )}
              <li>
                <Publication publication={publication} />
              </li>
            </div>
          )
        })}
      </ul>
    </>
  )
}

export default Publications
