import { GetStaticProps } from 'next';
import { ProfilePayload, SettingsPayload } from 'types';
import { getClient } from 'lib/sanity.client';
import {
  homePageTitleQuery,
  settingsQuery,
  profileQuery
} from 'lib/sanity.queries'
import { readToken } from 'lib/sanity.api';
import People from 'components/pages/people/People';

interface PageProps {
  homePageTitle: string | undefined;
  settings: SettingsPayload;
  profiles: ProfilePayload[];
}

export default function PeoplePage({ homePageTitle, settings, profiles }: PageProps) {
  return (
    <People homePageTitle={homePageTitle} settings={settings} profiles={profiles} />
  );
}

export const getStaticProps: GetStaticProps<PageProps> = async (ctx) => {
  const { draftMode = false } = ctx
  const client = getClient(draftMode ? { token: readToken } : undefined)

  const [homePageTitle, settings, profiles] = await Promise.all([
    client.fetch<string | null>(homePageTitleQuery),
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<ProfilePayload[]>(profileQuery),
  ]);

  if (!profiles) {
    return {
      notFound: true,
    }
  }
  if (!settings?.showPeople) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      homePageTitle: homePageTitle ?? undefined,
      settings: settings ?? {},
      profiles: profiles ?? [],
    },
  };
};