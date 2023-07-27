import Layout from 'components/shared/Layout';
import { readToken } from 'lib/sanity.api';
import { getClient } from 'lib/sanity.client';
import { homePageTitleQuery, settingsQuery } from 'lib/sanity.queries';
import { GetStaticProps } from 'next';
import { SettingsPayload } from 'types';
import { SiteMeta } from 'components/global/SiteMeta';
import NotFound from 'components/pages/404/404';


export default function NotFoundPage({ settings, homePageTitle }) {
    return (
        <>
            <SiteMeta
                baseTitle={homePageTitle}
                description={'The page you are looking for cannot be found. It may have been moved, deleted, or the URL might be misspelled. Please check the URL or return to our homepage to explore more of our content and services.'}
                image={settings?.ogImage}
                title={'Page Not Found'}
            />
            <Layout settings={settings}>
                
                    <NotFound />

            </Layout>
        </>
    );
};


interface PageProps {
    settings: SettingsPayload | undefined
    homePageTitle: string | null
}

export const getStaticProps: GetStaticProps<PageProps> = async (ctx) => {
    const { draftMode = false } = ctx
    const client = getClient(draftMode ? { token: readToken } : undefined)

    const [settings, homePageTitle] = await Promise.all([
        client.fetch<SettingsPayload | null>(settingsQuery),
        client.fetch<string | null>(homePageTitleQuery),
    ])

    return {
        props: {
            settings: settings ?? {},
            homePageTitle: homePageTitle
        },
    }
}