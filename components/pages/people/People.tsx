import { SiteMeta } from "components/global/SiteMeta";
import Layout from "components/shared/Layout";
import { ProfilePayload } from "types";

import Profile from "./Profile";

export default function People({ homePageTitle, settings, profiles }) {

    return (
        <>
            {/* Metadata */}
            <SiteMeta
                baseTitle={homePageTitle}
                description="Explore profiles of Peoples in the Laboratory of Molecular Neuroscience and Dementia. Learn about their roles, research interests, and more."
                image={settings?.ogImage}
                title="People"
            />

            <Layout settings={settings}>
                <h1 className="text-3xl md:text-5xl mb-6 px-4 md:px-0 font-black">People</h1>
                <div className="grid gap-6 px-4 md:px-0 grid-cols-1 md:grid-cols-3 mb-16">
                    {profiles.map((profile: ProfilePayload) =>
                        <div key={profile._id}>
                            <Profile profile={profile} />
                        </div>
                    )}
                </div>
                <div className="absolute left-0 w-screen border-t" />
            </Layout>
        </>
    )
}