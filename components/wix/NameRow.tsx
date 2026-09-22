import type { TeamProfile } from 'lib/wix/types'

export function NameRow({ person }: { person: TeamProfile }) {
  return (
    <li className="text-center font-playfair text-[18px]/[28px] md:text-[22px]/[31px]">
      {person.name}
      {person.role ? (
        <>
          {' '}
          <span className="text-[14px] italic md:text-[16px]">{person.role}</span>
        </>
      ) : null}
    </li>
  )
}
