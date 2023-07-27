import { PublicationPayload } from 'types';
import Publication from './Publication';

const Publications = ({ publications }) => {

  

  return (
    <div className='w-full'>
      <h1 className="mb-6 text-5xl font-black">Publications</h1>
      
      <ul className="ml-0 mt-0 list-none space-y-5">
        {publications.map((publication: PublicationPayload, index: number) => {

          return (
            <div key={publication._id}>
              {index === 0 || publications[index - 1].date.slice(0,4) !== publication.date.slice(0,4) ? (
                <li className="text-3xl lg:text-4xl font-bold my-5">{publication.date.slice(0,4)}</li>
              ) : null}
              <li>
                <Publication publication={publication} />
              </li>
            </div>
          );
        })}
      </ul>
    </div>
  );
};


export default Publications;