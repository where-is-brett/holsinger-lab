import Layout from 'components/shared/Layout'
import { ProfilePayload, RoleGroupPayload, SettingsPayload } from 'types'

import { groupByRoleGroup } from './groupByRoleGroup'
import Profile from './Profile'

export default function People({
  settings,
  profiles,
  roleGroups,
}: {
  settings?: SettingsPayload
  profiles: ProfilePayload[]
  roleGroups: RoleGroupPayload[]
}) {
  const sections = groupByRoleGroup(profiles, roleGroups)

  return (
    <Layout settings={settings}>
      <h1 className="mb-6 text-3xl font-black md:text-5xl">People</h1>
      <div className="mb-16 space-y-12">
        {sections.map((section) => (
          <section key={section.id}>
            <h2 className="mb-4 text-2xl font-bold">{section.title}</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {section.profiles.map((profile) => (
                <div key={profile._id}>
                  <Profile profile={profile} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Layout>
  )
}
