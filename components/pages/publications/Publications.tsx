import { PublicationPayload } from 'types'

import Publication from './Publication'

const Publications = ({ publications }) => {
  return (
    <div className="w-full">
      <h1 className="mb-6 text-3xl font-black md:text-5xl">Publications</h1>

      <ul className="mb-14 ml-0 mt-0 list-none space-y-5">
        {publications.map((publication: PublicationPayload, index: number) => {
          return (
            <div key={publication._id}>
              {index === 0 ||
              publications[index - 1].date.slice(0, 4) !==
                publication.date.slice(0, 4) ? (
                <li className="my-5 text-3xl font-bold lg:text-4xl">
                  {publication.date.slice(0, 4)}
                </li>
              ) : null}
              <li>
                <Publication publication={publication} />
              </li>
            </div>
          )
        })}
      </ul>
      <div className="absolute left-0 w-screen border-t" />
    </div>
  )
}

export default Publications
