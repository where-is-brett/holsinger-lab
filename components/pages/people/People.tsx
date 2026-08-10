import Layout from 'components/shared/Layout'
import { ProfilePayload, SettingsPayload } from 'types'

import Profile from './Profile'

export default function People({
  settings,
  profiles,
}: {
  settings?: SettingsPayload
  profiles: ProfilePayload[]
}) {
  return (
    <Layout settings={settings}>
      <h1 className="mb-6 px-4 text-3xl font-black md:px-0 md:text-5xl">
        People
      </h1>
      <div className="mb-16 grid grid-cols-1 gap-6 px-4 md:grid-cols-3 md:px-0">
        {profiles.map((profile: ProfilePayload) => (
          <div key={profile._id}>
            <Profile profile={profile} />
          </div>
        ))}
      </div>
    </Layout>
  )
}
