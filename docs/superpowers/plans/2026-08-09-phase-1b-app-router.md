# Phase 1B — Upgrade and App Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bump Next 13→16, React 18→19, Sanity 3→6, next-sanity 5→13 and their peers; migrate all seven routes plus `not-found` from the Pages Router to the App Router; port API routes to route handlers; rebuild Sanity Studio preview on `next-sanity/live` + `VisualEditing`; and generate typed GROQ via Sanity TypeGen — landing on a fully-typed, `pages/`-free codebase with no Sanity read token ever reaching the client.

**Architecture:** Eight sequential tasks, each leaving `tsc --noEmit`, `eslint .`, and `next build` green, and each an independently reviewable commit. Unlike Phase 1A's 13 file-disjoint tasks, these are large and touch overlapping surface area by necessity — every route touches the App Router conventions, the Sanity client, and the metadata approach at once. The sequencing rule is: **get the old router green on the new versions first** (Task 1), **then migrate routing** (Tasks 2–4), **then verify SEO parity** (Task 5) **before** touching the two remaining novel surfaces — TypeGen (Task 6) and Studio (Task 7) — **and restore preview last** (Task 8), once every route it touches is stable and typed.

**Tech Stack:** Next.js 16.3.0 (App Router), React 19.2.8, Sanity 6.9.1, next-sanity 13.3.1, `@sanity/client` 7.26.2, styled-components 6.5.1, `@headlessui/react` 2.2.10, `@portabletext/react` 7.0.1, `@sanity/image-url` 2.1.1, TypeScript (unchanged `^5.1.3` — already satisfies Next 16's `>=5.1.0` floor; not in the design doc's bump list so not touched), ESLint 9+ flat config.

## Global Constraints

- **Every task ends with `npx tsc --noEmit`, `npx eslint .`, and `npm run build` green**, run with `NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production` (public values, not secrets — see `.github/workflows/ci.yml`). `npm run build` needs real network access to `*.api.sanity.io`; if sandboxed, disable the sandbox for that one command.
- **No behavioural change beyond what each task states.** Where this plan intentionally changes behaviour (e.g. dropping `token` from page props, fixing the revalidate webhook's wrong "Revalidated homepage" message, tightening `robots` output), it is called out explicitly — nothing else should differ.
- **`pages/` and `app/` coexist during migration**, but never for the same URL: a task that creates `app/X/page.tsx` deletes the `pages/` file(s) serving that same route in the same task, so there is never a route conflict.
- **Package versions are pinned to the exact patch versions verified live against the npm registry on 2026-08-09** (Task 1's table). Do not `npm install <pkg>@latest` — install the exact versions given, so a later `npm audit`/Dependabot run is the only source of further version drift.
- **The `SanityQueries` type-augmentation contract**: once Task 6 (TypeGen) lands, any `groq`-tagged query literal passed to `sanityFetch` or `client.fetch` gets its result type inferred automatically via `sanity.types.ts`'s module augmentation of `@sanity/client`'s `SanityQueries` interface — no explicit `<T>` generic needed at those call sites. Task 8 relies on this; if `tsc` shows `data: unknown` there instead of the expected payload type, see Task 8 Step 1's fallback.
- **`components/preview/PreviewBanner.tsx` is the only preview-era file that survives untouched** through every task until Task 8, where it is finally wired to real `draftMode()` state instead of deleted — it never depended on the old `next-sanity/preview` API in the first place.

---

## Task 1: Bump dependencies, strip the old preview system, migrate ESLint to flat config — get the Pages Router green on Next 16

This is the largest single task because the design doc requires it: every one of these changes has to land together, since removing `@mui/*`-style leftovers before their last usage is gone breaks the build, and Next 16 requires the `eslint` key to be gone from `next.config.mjs` in the same commit that removes `.eslintrc.json`. Routing itself does not change in this task — every route still lives in `pages/`.

**Verified 2026-08-09 against the live npm registry** (not the design doc's numbers copied blind — re-checked, and they still match exactly):

| Package | From | To |
|---|---|---|
| `next` | 13.4.9 | **16.3.0** |
| `react` / `react-dom` | 18.2.0 | **19.2.8** |
| `sanity` / `@sanity/vision` | 3.14.1 | **6.9.1** |
| `next-sanity` | 5.1.0 | **13.3.1** |
| `@sanity/client` | 6.1.7 | **7.26.2** |
| `styled-components` | 5.3.11 | **6.5.1** |
| `@headlessui/react` | 1.7.15 | **2.2.10** |
| `@portabletext/react` | 3.0.4 | **7.0.1** |
| `@sanity/image-url` | 1.0.2 | **2.1.1** |
| `sanity-plugin-media` | 2.2.2 | **6.1.1** |
| `sanity-plugin-asset-source-unsplash` | 1.1.0 | **7.0.21** |
| `@sanity/orderable-document-list` | 1.1.0 | **2.0.18** |
| `eslint` | 8.43.0 | **10.8.1** |
| `eslint-config-next` | 13.4.9 | **16.3.0** |
| `@types/react` | 18.2.14 | **19.2.18** |
| `@types/react-dom` | (none) | **19.2.4** |

`typescript`, `@types/styled-components`, `autoprefixer`, `postcss`, `prettier*`, `tailwindcss`, `@sanity/demo`, `eslint-plugin-simple-import-sort` are untouched here (Tailwind 4 is Phase 1C).

**Three verified findings that change what "bump the version" means beyond a `package.json` edit** (each checked against the actual package tarball on npm, not documentation prose):

1. **`@headlessui/react` 2 removes `Dialog.Overlay` entirely** — not deprecated-but-present like `Dialog.Panel`/`Dialog.Title`/`Transition.Root`/`Transition.Child` (which keep working via deprecated aliases). `components/pages/contact/ErrorDialog.tsx:30` uses `<Dialog.Overlay>`, which will be `undefined` at runtime and crash. This is a required code change, not an optional modernization.
2. **`sanity/desk` still exists in Sanity 6** (deprecated compat shim exporting `deskTool`), but the design doc's `deskTool` → `structureTool` move is still correct and cheap: `sanity/structure` exports the identical `StructureResolver`, `DefaultDocumentNodeResolver`, and `UserViewComponent` type names this codebase already imports, so the four files using `sanity/desk` (`sanity.config.ts`, `plugins/settings.tsx`, `plugins/previewPane/index.tsx`, `plugins/previewPane/PreviewPane.tsx`) get a clean subpath-and-name swap with zero other code changes.
3. **`@sanity/client` 7 deprecates the `'previewDrafts'` perspective value in favour of `'drafts'`** (still accepted, but the newer name is what the rest of the v13 ecosystem — including `defineLive` in Task 8 — expects). `lib/sanity.client.ts:20` sets `perspective: 'previewDrafts'`.

**Files:**
- Modify: `package.json`
- Modify: `next.config.mjs`
- Delete: `.eslintrc.json`
- Create: `eslint.config.mjs`
- Delete: `components/preview/PreviewProvider.tsx`
- Delete: `components/pages/home/HomePagePreview.tsx`
- Delete: `components/pages/page/PagePreview.tsx`
- Delete: `components/pages/project/ProjectPreview.tsx`
- Delete: `components/global/PreviewNavbar.tsx`
- Modify: `components/shared/Layout.tsx`
- Modify: `pages/index.tsx`
- Modify: `pages/[slug].tsx`
- Modify: `pages/projects/[slug].tsx`
- Modify: `pages/publications/index.tsx`
- Modify: `sanity.config.ts`
- Modify: `plugins/settings.tsx`
- Modify: `plugins/previewPane/index.tsx`
- Modify: `plugins/previewPane/PreviewPane.tsx`
- Modify: `lib/sanity.client.ts`
- Modify: `lib/sanity.image.ts`
- Modify: `components/pages/contact/ErrorDialog.tsx`
- Modify: `components/pages/contact/ContactForm.tsx`
- Modify: `components/pages/people/Profile.tsx`
- Modify: `components/pages/publications/Publication.tsx`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: nothing from earlier tasks (this is Task 1).
- Produces: `getClient()` unchanged in signature (`lib/sanity.client.ts`'s `getClient(preview?: { token: string }): SanityClient`) — Task 2 onward keeps calling it exactly as today. `Layout`'s props shrink to `{ children, settings, childrenStyles? }` (no more `preview`/`loading` params feeding `PreviewNavbar` — the branch that rendered it is gone; `PreviewBanner`'s own optional `preview`/`loading`-driven render is untouched, just currently unreachable since nothing passes `preview: true` until Task 8).

- [ ] **Step 1: Update `package.json`**

Replace the `dependencies` and `devDependencies` blocks:

```json
{
  "name": "holsinger-lab",
  "private": true,
  "scripts": {
    "build": "next build",
    "dev": "next dev",
    "format": "npx prettier --write . --ignore-path .gitignore",
    "lint": "eslint .",
    "lint:fix": "npm run format && npm run lint -- --fix",
    "start": "next start",
    "type-check": "tsc --noEmit"
  },
  "prettier": {
    "semi": false,
    "singleQuote": true
  },
  "dependencies": {
    "@headlessui/react": "2.2.10",
    "@portabletext/react": "7.0.1",
    "@sanity/client": "7.26.2",
    "@sanity/demo": "1.0.2",
    "@sanity/image-url": "2.1.1",
    "@sanity/orderable-document-list": "2.0.18",
    "next": "16.3.0",
    "next-sanity": "13.3.1",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "sanity": "6.9.1",
    "sanity-plugin-asset-source-unsplash": "7.0.21",
    "sanity-plugin-media": "6.1.1",
    "styled-components": "6.5.1",
    "suspend-react": "0.1.3"
  },
  "devDependencies": {
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "@types/styled-components": "^5.1.36",
    "autoprefixer": "^10.4.14",
    "eslint": "10.8.1",
    "eslint-config-next": "16.3.0",
    "eslint-plugin-simple-import-sort": "^10.0.0",
    "postcss": "^8.4.24",
    "prettier": "^2.8.8",
    "prettier-plugin-packagejson": "^2.4.3",
    "prettier-plugin-tailwindcss": "^0.3.0",
    "tailwindcss": "3.3.2",
    "typescript": "^5.1.3"
  }
}
```

Note two script changes beyond the version bumps: `"dev": "next dev"` (was bare `"next"` — cosmetic, `next` alone already meant dev, this is just explicit) and `"lint": "eslint ."` (was `"next lint -- --ignore-path .gitignore"` — Next 16 removes `next lint` entirely; `--ignore-path` isn't needed since flat-config `eslint.config.mjs`'s own `ignores` array, added in Step 3, covers it).

- [ ] **Step 2: Install and confirm the resolved tree**

```bash
npm install
```

Expected: installs cleanly with no `ERESOLVE` peer-conflict errors — every version in the table above was chosen specifically because Next 16.3.0/React 19.2.8/Sanity 6.9.1/next-sanity 13.3.1's peer ranges all resolve against each other (verified in the design doc's own dependency-graph check).

- [ ] **Step 3: Remove `eslint` config key from `next.config.mjs`, migrate to flat ESLint config**

Next 16 removes the `eslint` config-file key entirely (`next build` no longer lints). `next.config.mjs` becomes:

```js
/** @type {import('next').NextConfig} */
const config = {
  images: {
    remotePatterns: [
      { hostname: 'cdn.sanity.io' },
      { hostname: 'source.unsplash.com' },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default config
```

Delete `.eslintrc.json`. Create `eslint.config.mjs`:

```js
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

const config = [
  ...nextCoreWebVitals,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
]

export default config
```

(`eslint-config-next/core-web-vitals`'s default export is already a `Linter.Config[]` array with its own `ignores` block for `.next/**` etc. — the extra `ignores` entry here is redundant but harmless; keeping it makes the file self-documenting if the upstream default ever changes.)

- [ ] **Step 4: Update the CI lint step**

In `.github/workflows/ci.yml`, the `Lint` step's `run:` line changes from `npm run lint` (unchanged — the script itself now calls `eslint .` per Step 1) — no change needed to the workflow file itself, since it already just calls `npm run lint`. Skip this step; it was already correct. (Left here as an explicit checkpoint so the change isn't silently missed: confirm `.github/workflows/ci.yml`'s lint step still reads `run: npm run lint` with no other edits needed.)

- [ ] **Step 5: Delete the old preview system**

```bash
rm components/preview/PreviewProvider.tsx
rm components/pages/home/HomePagePreview.tsx
rm components/pages/page/PagePreview.tsx
rm components/pages/project/ProjectPreview.tsx
rm components/global/PreviewNavbar.tsx
```

- [ ] **Step 6: Simplify `components/shared/Layout.tsx`**

`PreviewNavbar` is gone, so the branch selecting between it and `Navbar` collapses to always rendering `Navbar`. `preview`/`loading` still exist only to drive `PreviewBanner`, which stays unreachable until Task 8:

```tsx
import { Footer } from 'components/global/Footer'
import { Navbar } from 'components/global/Navbar/Navbar'
import { PreviewBanner } from 'components/preview/PreviewBanner'
import { SettingsPayload } from 'types'

const fallbackSettings: SettingsPayload = {
  menuItems: [],
  showPublications: false,
  showPeople: false,
  showContactForm: false,
  footer: [],
}

export interface LayoutProps {
  children: React.ReactNode
  settings: SettingsPayload | undefined
  preview?: boolean
  loading?: boolean
  childrenStyles?: string
}

export default function Layout({
  children,
  settings = fallbackSettings,
  preview,
  loading,
  childrenStyles = 'px-6',
}: LayoutProps) {
  return (
    <div className={`flex min-h-screen flex-col bg-background text-black`}>
      {preview && <PreviewBanner loading={loading} />}

      <Navbar
        menuItems={settings?.menuItems}
        showPublications={settings?.showPublications}
        showPeople={settings?.showPeople}
        showContactForm={settings?.showContactForm}
      />

      <div
        className={`mt-32 flex-grow md:mt-16 md:px-16 lg:px-32 ${childrenStyles}`}
      >
        {children}
      </div>

      <Footer footer={settings?.footer} />
    </div>
  )
}
```

- [ ] **Step 7: Drop `token` from page props and remove the `preview` branches, in `pages/index.tsx`**

```tsx
import { HomePage } from 'components/pages/home/HomePage'
import { getClient } from 'lib/sanity.client'
import { homePageQuery, settingsQuery } from 'lib/sanity.queries'
import { GetStaticProps } from 'next'
import { HomePagePayload, SettingsPayload } from 'types'

interface PageProps {
  page: HomePagePayload
  settings: SettingsPayload
  preview: boolean
}

interface Query {
  [key: string]: string
}

export default function IndexPage(props: PageProps) {
  const { page, settings, preview } = props

  return <HomePage page={page} settings={settings} preview={preview} />
}

const fallbackPage: HomePagePayload = {
  title: '',
  overview: [],
  showcaseProjects: [],
}

export const getStaticProps: GetStaticProps<PageProps, Query> = async (ctx) => {
  const { draftMode = false } = ctx
  const client = getClient(draftMode ? { token: readToken } : undefined)

  const [settings, page] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<HomePagePayload | null>(homePageQuery),
  ])

  return {
    props: {
      page: page ?? fallbackPage,
      settings: settings ?? {},
      preview: draftMode,
    },
    revalidate: 60,
  }
}
```

Wait — `readToken` needs importing still for the `getClient(draftMode ? {token: readToken} : undefined)` call. Add `import { readToken } from 'lib/sanity.api'` back in (only `token` in the *props* is dropped — the server-side fetch still needs the token to read drafts when `draftMode` is on; that's unrelated to and doesn't reintroduce the leak, since it never reaches the client). Full corrected top of file:

```tsx
import { HomePage } from 'components/pages/home/HomePage'
import { readToken } from 'lib/sanity.api'
import { getClient } from 'lib/sanity.client'
import { homePageQuery, settingsQuery } from 'lib/sanity.queries'
import { GetStaticProps } from 'next'
import { HomePagePayload, SettingsPayload } from 'types'
```

- [ ] **Step 8: Same treatment for `pages/[slug].tsx`**

```tsx
import { Page } from 'components/pages/page/Page'
import { readToken } from 'lib/sanity.api'
import { getClient } from 'lib/sanity.client'
import { resolveHref } from 'lib/sanity.links'
import {
  homePageTitleQuery,
  pagePaths,
  pagesBySlugQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import { GetStaticProps } from 'next'
import { PagePayload, SettingsPayload } from 'types'

interface PageProps {
  page: PagePayload
  settings: SettingsPayload
  homePageTitle?: string
  preview: boolean
}

interface Query {
  [key: string]: string
}

export default function ProjectSlugRoute(props: PageProps) {
  const { homePageTitle, settings, page, preview } = props

  return <Page homePageTitle={homePageTitle} page={page} settings={settings} preview={preview} />
}

const legacyPageSlugs: Record<string, string> = {
  Miscellaneous: 'miscellaneous',
}

export const getStaticProps: GetStaticProps<PageProps, Query> = async (ctx) => {
  const { draftMode = false, params = {} } = ctx
  const requestedSlug = params.slug as string | undefined

  if (
    requestedSlug &&
    Object.prototype.hasOwnProperty.call(legacyPageSlugs, requestedSlug)
  ) {
    return {
      redirect: {
        destination: `/${legacyPageSlugs[requestedSlug]}`,
        permanent: true,
      },
    }
  }

  const client = getClient(draftMode ? { token: readToken } : undefined)

  const [settings, page, homePageTitle] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<PagePayload | null>(pagesBySlugQuery, {
      slug: params.slug,
    }),
    client.fetch<string | null>(homePageTitleQuery),
  ])

  if (!page) {
    return {
      notFound: true,
      revalidate: 60,
    }
  }

  return {
    props: {
      page,
      settings: settings ?? {},
      homePageTitle: homePageTitle ?? undefined,
      preview: draftMode,
    },
    revalidate: 60,
  }
}

export const getStaticPaths = async () => {
  const client = getClient()
  const paths = await client.fetch<string[]>(pagePaths)

  return {
    paths: paths?.map((slug) => resolveHref('page', slug)) || [],
    fallback: 'blocking',
  }
}
```

- [ ] **Step 9: Same treatment for `pages/projects/[slug].tsx`**

```tsx
import { ProjectPage } from 'components/pages/project/ProjectPage'
import { readToken } from 'lib/sanity.api'
import { getClient } from 'lib/sanity.client'
import { resolveHref } from 'lib/sanity.links'
import {
  homePageTitleQuery,
  projectBySlugQuery,
  projectPaths,
  settingsQuery,
} from 'lib/sanity.queries'
import { GetStaticProps } from 'next'
import { ProjectPayload, SettingsPayload } from 'types'

interface PageProps {
  project: ProjectPayload
  settings: SettingsPayload
  homePageTitle?: string
  preview: boolean
}

interface Query {
  [key: string]: string
}

export default function ProjectSlugRoute(props: PageProps) {
  const { homePageTitle, settings, project, preview } = props

  return (
    <ProjectPage
      homePageTitle={homePageTitle}
      project={project}
      settings={settings}
      preview={preview}
    />
  )
}

const legacyProjectSlugs: Record<string, string> = {
  MAESTRO: 'maestro',
  'Publication highlights': 'publication-highlights',
}

export const getStaticProps: GetStaticProps<PageProps, Query> = async (ctx) => {
  const { draftMode = false, params = {} } = ctx
  const requestedSlug = params.slug as string | undefined

  if (
    requestedSlug &&
    Object.prototype.hasOwnProperty.call(legacyProjectSlugs, requestedSlug)
  ) {
    return {
      redirect: {
        destination: `/projects/${legacyProjectSlugs[requestedSlug]}`,
        permanent: true,
      },
    }
  }

  const client = getClient(draftMode ? { token: readToken } : undefined)

  const [settings, project, homePageTitle] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<ProjectPayload | null>(projectBySlugQuery, {
      slug: params.slug,
    }),
    client.fetch<string | null>(homePageTitleQuery),
  ])

  if (!project) {
    return {
      notFound: true,
      revalidate: 60,
    }
  }

  return {
    props: {
      project,
      settings: settings ?? {},
      homePageTitle: homePageTitle ?? undefined,
      preview: draftMode,
    },
    revalidate: 60,
  }
}

export const getStaticPaths = async () => {
  const client = getClient()
  const paths = await client.fetch<string[]>(projectPaths)

  return {
    paths: paths?.map((slug) => resolveHref('project', slug)) || [],
    fallback: 'blocking',
  }
}
```

- [ ] **Step 10: Drop `token` from `pages/publications/index.tsx`** (no preview branch ever existed here — `Publications.tsx` has no live-preview variant)

```tsx
import { SiteMeta } from 'components/global/SiteMeta'
import Publications from 'components/pages/publications/Publications'
import Layout from 'components/shared/Layout'
import { readToken } from 'lib/sanity.api'
import { getClient } from 'lib/sanity.client'
import {
  homePageTitleQuery,
  publicationsQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import { GetStaticProps } from 'next'
import { PublicationPayload, SettingsPayload } from 'types'

interface PageProps {
  settings: SettingsPayload
  homePageTitle?: string
  preview: boolean
  publications: PublicationPayload[]
}

export default function PublicationsPage(props: PageProps) {
  const { homePageTitle, settings, preview, publications } = props

  return (
    <>
      <SiteMeta
        baseTitle={homePageTitle}
        description={
          'Explore the publications by the Laboratory of Molecular Neuroscience and Dementia. Discover the latest advancements and insights in neuroscience, molecular biology, and dementia research, authored by our esteemed team of scientists and researchers.'
        }
        image={settings?.ogImage}
        title={'Publications'}
      />
      <Layout settings={settings} preview={preview}>
        <Publications publications={publications} />
      </Layout>
    </>
  )
}

export const getStaticProps: GetStaticProps<PageProps> = async (ctx) => {
  const { draftMode = false, params = {} } = ctx
  const client = getClient(draftMode ? { token: readToken } : undefined)

  const [settings, homePageTitle, publications] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<string | null>(homePageTitleQuery),
    client.fetch<PublicationPayload[] | null>(publicationsQuery),
  ])

  if (!publications) {
    return {
      notFound: true,
    }
  }

  if (settings?.showPublications === false) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      settings: settings ?? {},
      homePageTitle: homePageTitle ?? undefined,
      preview: draftMode,
      publications: publications,
    },
    revalidate: 60,
  }
}
```

- [ ] **Step 11: `sanity.config.ts` — `sanity/desk` → `sanity/structure`, `deskTool` → `structureTool`**

```tsx
import { apiVersion, dataset, previewSecretId, projectId } from 'lib/sanity.api'
import { previewDocumentNode } from 'plugins/previewPane'
import { productionUrl } from 'plugins/productionUrl'
import { pageStructure, singletonPlugin } from 'plugins/settings'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { unsplashImageAsset } from 'sanity-plugin-asset-source-unsplash'
import { media } from 'sanity-plugin-media'
import page from 'schemas/documents/page'
import project from 'schemas/documents/project'
import duration from 'schemas/objects/duration'
import milestone from 'schemas/objects/milestone'
import timeline from 'schemas/objects/timeline'
import home from 'schemas/singletons/home'
import settings from 'schemas/singletons/settings'
import publication from 'schemas/documents/publication'
import profile from 'schemas/documents/profile'

const title = process.env.NEXT_PUBLIC_SANITY_PROJECT_TITLE || 'HOLSINGER LAB'

export const PREVIEWABLE_DOCUMENT_TYPES: string[] = [
  home.name,
  page.name,
  project.name,
]

export default defineConfig({
  basePath: '/studio',
  projectId: projectId || '',
  dataset: dataset || '',
  title,

  schema: {
    types: [
      home,
      settings,
      duration,
      page,
      project,
      milestone,
      timeline,
      publication,
      profile,
    ],
  },
  plugins: [
    structureTool({
      structure: pageStructure([home, settings]),
      defaultDocumentNode: previewDocumentNode({ apiVersion, previewSecretId }),
    }),
    media(),
    singletonPlugin([home.name, settings.name]),
    productionUrl({
      apiVersion,
      previewSecretId,
      types: PREVIEWABLE_DOCUMENT_TYPES,
    }),
    unsplashImageAsset(),
  ],
})
```

- [ ] **Step 12: `plugins/settings.tsx`, `plugins/previewPane/index.tsx`, `plugins/previewPane/PreviewPane.tsx` — same subpath swap, no other changes**

In each file, change the import line from `sanity/desk` to `sanity/structure`:

`plugins/settings.tsx:11`: `import { type StructureResolver } from 'sanity/structure'`

`plugins/previewPane/index.tsx:7`: `import { DefaultDocumentNodeResolver } from 'sanity/structure'`

`plugins/previewPane/PreviewPane.tsx:7`: `import { UserViewComponent } from 'sanity/structure'`

No other lines in any of the three files change — `structureTool` itself isn't referenced in these three files (only in `sanity.config.ts`, already handled in Step 11).

- [ ] **Step 13: `lib/sanity.client.ts` — `'previewDrafts'` → `'drafts'`**

```ts
import { apiVersion, dataset, projectId, useCdn } from 'lib/sanity.api'
import { createClient, type SanityClient } from 'next-sanity'

export function getClient(preview?: { token: string }): SanityClient {
  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn,
    perspective: 'published',
  })
  if (preview) {
    if (!preview.token) {
      throw new Error('You must provide a token to preview drafts')
    }
    return client.withConfig({
      token: preview.token,
      useCdn: false,
      ignoreBrowserTokenWarning: true,
      perspective: 'drafts',
    })
  }
  return client
}
```

- [ ] **Step 14: `lib/sanity.image.ts` — use the named `createImageUrlBuilder` export** (`@sanity/image-url` 2 deprecates the default export)

```ts
import { createImageUrlBuilder } from '@sanity/image-url'
import { dataset, projectId } from 'lib/sanity.api'
import type { Image } from 'sanity'

const imageBuilder = createImageUrlBuilder({
  projectId: projectId || '',
  dataset: dataset || '',
})

export const urlForImage = (source: Image) => {
  if (!source?.asset?._ref) {
    return undefined
  }

  return imageBuilder?.image(source).auto('format').fit('max')
}
```

- [ ] **Step 15: Fix `components/pages/contact/ErrorDialog.tsx`'s Headless UI 2 breakage, and add `'use client'`**

`Dialog.Overlay` is gone; the current replacement is `DialogBackdrop` (a top-level export, not a compound property). While here, replace the other deprecated compound-property usages (`Transition.Root`, `Transition.Child`, `Dialog.Title`) with their non-deprecated top-level equivalents (`Transition`/`TransitionChild` per current Headless UI naming — `Transition` itself now plays the role `Transition.Root` used to) — these still work as deprecated aliases, but since the file is already being touched for the load-bearing `Overlay` fix, modernizing the rest in the same pass avoids a second future touch of this file for a cosmetic-only change:

```tsx
'use client'
import {
  Dialog,
  DialogBackdrop,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react'
import { Fragment } from 'react'

const ErrorDialog = ({
  handleDialogClose,
  showDialog,
  message,
}: {
  handleDialogClose: () => void
  showDialog: boolean
  message: string
}) => {
  return (
    <Transition show={showDialog} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={handleDialogClose}
      >
        <div className="flex min-h-screen items-center justify-center">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <DialogBackdrop className="fixed inset-0 bg-black opacity-60" />
          </TransitionChild>

          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="mx-auto max-w-md space-y-5 bg-background p-4 text-center">
              <DialogTitle as="h3" className="mb-2 text-lg font-semibold">
                Submission Failed
              </DialogTitle>
              <p className="px-4 text-justify text-gray-800">{message}</p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleDialogClose}
                  className="bg-gray-900 px-4 py-2 text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

export default ErrorDialog
```

- [ ] **Step 16: Add `'use client'` to the three remaining components that use hooks but currently lack the directive**

These files use `useState` (directly, or via `Transition`'s internal state) and were never previously marked, since the Pages Router doesn't need the directive. They must be marked now so they compile correctly once the App Router (Task 2 onward) starts importing them into server-component trees. Add a single `'use client'` line as the very first line of each file (before the existing first import):

`components/pages/contact/ContactForm.tsx` — add `'use client'` as line 1.

`components/pages/people/Profile.tsx` — add `'use client'` as line 1.

`components/pages/publications/Publication.tsx` — add `'use client'` as line 1.

No other lines in these three files change in this task.

- [ ] **Step 17: Run verification**

```bash
npx tsc --noEmit
```
Expected: zero errors.

```bash
npx eslint .
```
Expected: zero errors (warnings from `simple-import-sort` are pre-existing and fine — confirm the count doesn't increase versus `main`).

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```
Expected: succeeds, still serving from `pages/` (no `app/` directory exists yet). If it fails on network access to `j3f9z8os.api.sanity.io`, re-run with the sandbox disabled for this one command.

- [ ] **Step 18: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: bump to Next 16 / React 19 / Sanity 6 / next-sanity 13, strip old preview system, migrate ESLint to flat config

Dropping `token` from every page's props here (not just the preview
branches) is the actual security fix: it stops being serialized into
__NEXT_DATA__, closing the client-exposed Sanity read-token leak.
Pages Router unchanged otherwise — routing migration starts next task.
EOF
)"
```

---

## Task 2: Root layout, and Home/Page/Project routes → App Router

`app/layout.tsx` absorbs `_app.tsx`'s font loading and `_document.tsx`'s `<body>` classes. This task also fixes `MobileNavBar.tsx`'s dependency on the Pages-Router-only `next/router` default export (a real blocker, not a style choice — that import doesn't exist in the App Router at all) and deletes `ScrollUp.tsx`, whose entire purpose was working around [vercel/next.js#42492](https://github.com/vercel/next.js/issues/42492), a Next-13-era Pages Router bug the App Router's own navigation model doesn't have.

**A design decision worth stating up front, reused by every route task from here on:** `SiteMeta.tsx` and its three `*Head.tsx` wrapper components (`HomePageHead`, `PageHead`, `ProjectPageHead`) are being replaced by a single shared `lib/metadata.ts` helper called from each route's `generateMetadata` export — not ported 1:1. This is what the design doc means by "converting `getStaticProps` + `SiteMeta` into a server component with `generateMetadata`": metadata becomes a separate export, not a rendered component, so `SiteMeta` itself and its callers are deleted as each route migrates (this task deletes `HomePageHead.tsx`/`PageHead.tsx`/`ProjectPageHead.tsx`; `SiteMeta.tsx` itself is deleted in Task 3 once its last two callers — `People`/`Publications`/`Contact`/`404` — are gone).

A second consequence: every presentation component (`HomePage`, `Page`, `ProjectPage`, and in Task 3 `People`/`Contact`) currently takes a `homePageTitle` prop whose *only* consumer was the now-deleted `*Head` component's `baseTitle`. Nothing else in any of these components reads it (verified by reading each component fully — `Header`'s title always comes from the document's own `title` field, never `homePageTitle`). This task (and Task 3) drops `homePageTitle` from each component's own prop signature; the owning route's `generateMetadata` still fetches it, just doesn't forward it into the rendered tree.

**Files:**
- Create: `app/layout.tsx`
- Create: `lib/metadata.ts`
- Create: `app/page.tsx`
- Modify: `components/pages/home/HomePage.tsx`
- Delete: `components/pages/home/HomePageHead.tsx`
- Create: `app/[slug]/page.tsx`
- Modify: `components/pages/page/Page.tsx`
- Delete: `components/pages/page/PageHead.tsx`
- Create: `app/projects/[slug]/page.tsx`
- Modify: `components/pages/project/ProjectPage.tsx`
- Delete: `components/pages/project/ProjectPageHead.tsx`
- Delete: `components/shared/ScrollUp.tsx`
- Modify: `components/global/Navbar/MobileNavBar.tsx`
- Modify: `styles/index.css`
- Modify: `tailwind.config.js`
- Delete: `pages/index.tsx`
- Delete: `pages/[slug].tsx`
- Delete: `pages/projects/[slug].tsx`

**Interfaces:**
- Consumes: `getClient()` from `lib/sanity.client.ts` (unchanged, Task 1); `siteName`/`siteUrl`/`isNoindexPath` from `lib/site.ts` (unchanged, Phase 1A).
- Produces: `buildMetadata(opts): Metadata` in `lib/metadata.ts` — signature `{ path: string; baseTitle?: string; title?: string; description?: string; image?: Image; noindex?: boolean }`. Every route task from here (Tasks 3, 8) calls this. `HomePage`/`Page`/`ProjectPage` no longer accept `homePageTitle`; `HomePageProps`/`PageProps` (in `Page.tsx`)/`ProjectPageProps` shrink accordingly — Task 8 (preview restoration) is the next task to touch these props, and must read this new shape rather than the one in the design doc's original sketch.

- [ ] **Step 1: Add the `--font-sans` alias to `styles/index.css`**

The current `_app.tsx` sets `--font-sans` to `antarcticanMono`'s font-family (not Inter's, despite an unused `sans = Inter(...)` object existing in the file) via an inline `<style jsx global>` block. `next/font`'s `.variable` className mechanism replaces that block in Step 2 below, but a `.variable` className can only ever set the CSS variable *it was configured with* (`antarcticanMono.variable` sets `--font-antarctican-mono`, not `--font-sans`). To preserve the exact existing (if slightly odd) mapping with zero visual diff, add a static alias to `styles/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sans: var(--font-antarctican-mono);
}

html,
body {
  height: 100%;
}
```

(Also drops the `#__next` selector from the old `html, body, #__next { height: 100% }` rule — `#__next` was the Pages Router's root wrapper id, which doesn't exist in the App Router. `html, body` alone already covers the intended effect.) Everything below this in the file (the `body`/`html` font-smoothing rules, `p`/`ol`/`ul` resets, input resets) is unchanged.

- [ ] **Step 2: Create `app/layout.tsx`**

```tsx
import 'styles/index.css'

import { IBM_Plex_Mono, PT_Serif } from 'next/font/google'
import localFont from 'next/font/local'
import { siteName, siteUrl } from 'lib/site'
import type { Metadata } from 'next'

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['500', '700'],
})

const serif = PT_Serif({
  variable: '--font-serif',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  weight: ['400', '700'],
})

const antarcticanMono = localFont({
  src: [
    {
      path: '../fonts/antarctican-mono/AntarcticanMono-Medium.woff2',
      weight: '500',
    },
    {
      path: '../fonts/antarctican-mono/AntarcticanMono-SemiBold.woff2',
      weight: '600',
    },
    {
      path: '../fonts/antarctican-mono/AntarcticanMono-Book.woff2',
      weight: 'normal',
    },
    {
      path: '../fonts/antarctican-mono/AntarcticanMono-Bold.woff2',
      weight: 'bold',
    },
  ],
  variable: '--font-antarctican-mono',
})

const arianaPro = localFont({
  src: [
    {
      path: '../fonts/ariana-pro/ArianaPro-Book.woff2',
      weight: '300',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Black.woff2',
      weight: '900',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Medium.woff2',
      weight: '500',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Bold.woff2',
      weight: '700',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Regular.woff2',
      weight: '400',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Thin.woff2',
      weight: '100',
    },
  ],
  variable: '--font-ariana-pro',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  icons: {
    icon: [
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon/favicon.ico',
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
  other: {
    'msapplication-TileColor': '#000000',
    'msapplication-config': '/favicon/browserconfig.xml',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${mono.variable} ${antarcticanMono.variable} ${serif.variable} ${arianaPro.variable}`}
    >
      <body className="bg-background text-black dark:bg-black dark:text-white">
        {children}
      </body>
    </html>
  )
}
```

Note the favicon/theme-color/manifest tags move from being repeated on every `SiteMeta` call to living once here — Next's metadata merging inherits these into every route automatically unless a route's own `generateMetadata` overrides the same key (none will). `viewport`'s default (`width=device-width, initial-scale=1`) already matches the old hand-written `<meta name="viewport" content="width=device-width,initial-scale=1.0">` closely enough (cosmetic `1` vs `1.0`) that no explicit `viewport` export is needed.

- [ ] **Step 3: Create `lib/metadata.ts`**

```ts
import { urlForImage } from 'lib/sanity.image'
import { isNoindexPath, siteName, siteUrl } from 'lib/site'
import type { Metadata } from 'next'
import type { Image } from 'sanity'

export function buildMetadata({
  path,
  baseTitle,
  title,
  description,
  image,
  noindex = false,
}: {
  path: string
  baseTitle?: string
  title?: string
  description?: string
  image?: Image
  noindex?: boolean
}): Metadata {
  const metaTitle = [
    ...(title ? [title] : []),
    ...(baseTitle ? [baseTitle] : []),
  ].join(' | ')
  const resolvedTitle = metaTitle || siteName

  const imageUrl =
    image && urlForImage(image)?.width(1200).height(627).fit('crop').url()

  const canonicalUrl = `${siteUrl}${path}`
  const shouldNoindex = noindex || isNoindexPath(path)

  return {
    title: resolvedTitle,
    description,
    alternates: { canonical: canonicalUrl },
    robots: shouldNoindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      siteName,
      title: resolvedTitle,
      url: canonicalUrl,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: resolvedTitle,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  }
}
```

This directly ports `SiteMeta.tsx`'s logic (title-joining, image URL construction, canonical/noindex derivation) but computed at request/build time from a `path` argument instead of `useRouter().asPath` — the `robots: { index: false, follow: true }` shape is a best-effort guess at matching the existing bare `<meta name="robots" content="noindex">` output; **Task 5 verifies this against the captured baseline and corrects it here if the rendered output differs** (e.g. if Next actually emits `content="noindex, follow"` where the original had bare `"noindex"`, drop the `follow: true` key).

- [ ] **Step 4: Create `app/page.tsx`** (home route)

```tsx
import { HomePage } from 'components/pages/home/HomePage'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import { homePageQuery, settingsQuery } from 'lib/sanity.queries'
import { toPlainText } from '@portabletext/react'
import type { Metadata } from 'next'
import { cache } from 'react'
import type { HomePagePayload, SettingsPayload } from 'types'

export const revalidate = 60

const fallbackPage: HomePagePayload = {
  title: '',
  overview: [],
  showcaseProjects: [],
}

const getData = cache(async () => {
  const client = getClient()
  const [settings, page] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<HomePagePayload | null>(homePageQuery),
  ])
  return { settings: settings ?? {}, page: page ?? fallbackPage }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, page } = await getData()
  return buildMetadata({
    path: '/',
    title: page.title,
    description: page.overview ? toPlainText(page.overview) : '',
    image: settings.ogImage,
  })
}

export default async function Page() {
  const { settings, page } = await getData()
  return <HomePage page={page} settings={settings} />
}
```

`cache()` from `react` guarantees `getData()` runs once per request even though both `generateMetadata` and `Page` call it — Next's own automatic `fetch` memoization would likely already dedupe the underlying `@sanity/client` HTTP calls, but wrapping explicitly is the documented fallback ("React `cache` can be used if `fetch` is unavailable") and makes the single-execution guarantee explicit rather than incidental.

- [ ] **Step 5: Simplify `components/pages/home/HomePage.tsx`** — drop `HomePageHead` render, drop `ScrollUp`, drop unused `homePageTitle`-style thinking (it was never a prop here — only `preview`/`loading` remain, both still valid for Task 8)

```tsx
import { ProjectListItem } from 'components/pages/home/ProjectListItem'
import { Header } from 'components/shared/Header'
import Layout from 'components/shared/Layout'
import { resolveHref } from 'lib/sanity.links'
import Link from 'next/link'
import type { HomePagePayload } from 'types'
import { SettingsPayload } from 'types'

export interface HomePageProps {
  settings: SettingsPayload
  page: HomePagePayload
  preview?: boolean
  loading?: boolean
}

export function HomePage({ page, settings, preview, loading }: HomePageProps) {
  const { overview, showcaseProjects, title = 'Personal website' } = page ?? {}

  return (
    <Layout
      settings={settings}
      preview={preview}
      loading={loading}
      childrenStyles={`px-0`}
    >
      <div className="mb-16 space-y-8">
        {/* Header */}
        {title && <Header centered title={title} description={overview} />}

        {/* Showcase projects */}
        <h2 className="text-center text-xl font-[600] md:text-left md:text-2xl">
          Our Research Projects
        </h2>

        {showcaseProjects && showcaseProjects.length > 0 && (
          <div className="mx-auto max-w-[100rem] border-y md:border">
            {showcaseProjects.map((project, key) => {
              const href = resolveHref(project._type, project.slug)
              if (!href) {
                return null
              }
              return (
                <Link key={key} href={href}>
                  <ProjectListItem project={project} odd={key % 2} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
```

```bash
rm components/pages/home/HomePageHead.tsx
```

- [ ] **Step 6: Delete `pages/index.tsx`**

```bash
rm pages/index.tsx
```

- [ ] **Step 7: Delete `components/shared/ScrollUp.tsx` and its three usages**

```bash
rm components/shared/ScrollUp.tsx
```

Already removed from `HomePage.tsx` in Step 5. Remove the `import ScrollUp from 'components/shared/ScrollUp'` line and the `<ScrollUp />` render (with its preceding `{/* Workaround: scroll to top on route change */}` comment) from `components/pages/page/Page.tsx` and `components/pages/project/ProjectPage.tsx` in Steps 9 and 11 below.

- [ ] **Step 8: Create `app/[slug]/page.tsx`**

```tsx
import { Page as PageComponent } from 'components/pages/page/Page'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import {
  homePageTitleQuery,
  pagePaths,
  pagesBySlugQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import { toPlainText } from '@portabletext/react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import type { PagePayload, SettingsPayload } from 'types'

export const revalidate = 60

const legacyPageSlugs: Record<string, string> = {
  Miscellaneous: 'miscellaneous',
}

const getData = cache(async (slug: string) => {
  const client = getClient()
  const [settings, page, homePageTitle] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<PagePayload | null>(pagesBySlugQuery, { slug }),
    client.fetch<string | null>(homePageTitleQuery),
  ])
  return {
    settings: settings ?? {},
    page,
    homePageTitle: homePageTitle ?? undefined,
  }
})

export async function generateStaticParams() {
  const client = getClient()
  const slugs = await client.fetch<string[]>(pagePaths)
  return slugs.map((slug) => ({ slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (Object.prototype.hasOwnProperty.call(legacyPageSlugs, slug)) {
    return {}
  }
  const { settings, page, homePageTitle } = await getData(slug)
  if (!page) {
    return {}
  }
  return buildMetadata({
    path: `/${slug}`,
    baseTitle: homePageTitle,
    title: page.title,
    description: page.overview ? toPlainText(page.overview) : '',
    image: settings.ogImage,
  })
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params

  if (Object.prototype.hasOwnProperty.call(legacyPageSlugs, slug)) {
    permanentRedirect(`/${legacyPageSlugs[slug]}`)
  }

  const { settings, page } = await getData(slug)

  if (!page) {
    notFound()
  }

  return <PageComponent page={page} settings={settings} />
}
```

`generateStaticParams` replaces `getStaticPaths`; leaving `dynamicParams` at its default (`true`) means slugs not in the pre-generated set are rendered on-demand on first request — the exact behaviour `fallback: 'blocking'` provided. `permanentRedirect` (not `redirect`) matches the original `permanent: true` (308, not 307).

- [ ] **Step 9: Simplify `components/pages/page/Page.tsx`**

```tsx
import { CustomPortableText } from 'components/shared/CustomPortableText'
import { Header } from 'components/shared/Header'
import Layout from 'components/shared/Layout'
import type { PagePayload, SettingsPayload } from 'types'

export interface PageProps {
  page: PagePayload
  settings: SettingsPayload | undefined
  preview?: boolean
  loading?: boolean
}

export function Page({ page, settings, preview, loading }: PageProps) {
  // Default to an empty object to allow previews on non-existent documents
  const { body, overview, title } = page || {}

  return (
    <Layout settings={settings} preview={preview} loading={loading}>
      <div className="mb-14">
        {/* Header */}
        <Header title={title} description={overview} />

        {/* Body */}
        {body && (
          <CustomPortableText
            paragraphClasses="font-ariana max-w-4xl text-gray-900 text-base md:text-lg"
            value={body}
          />
        )}
      </div>
    </Layout>
  )
}
```

```bash
rm components/pages/page/PageHead.tsx
```

- [ ] **Step 10: Delete `pages/[slug].tsx`**

```bash
rm 'pages/[slug].tsx'
```

- [ ] **Step 11: Create `app/projects/[slug]/page.tsx`**

```tsx
import { ProjectPage as ProjectPageComponent } from 'components/pages/project/ProjectPage'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import {
  homePageTitleQuery,
  projectBySlugQuery,
  projectPaths,
  settingsQuery,
} from 'lib/sanity.queries'
import { toPlainText } from '@portabletext/react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import type { ProjectPayload, SettingsPayload } from 'types'

export const revalidate = 60

const legacyProjectSlugs: Record<string, string> = {
  MAESTRO: 'maestro',
  'Publication highlights': 'publication-highlights',
}

const getData = cache(async (slug: string) => {
  const client = getClient()
  const [settings, project, homePageTitle] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<ProjectPayload | null>(projectBySlugQuery, { slug }),
    client.fetch<string | null>(homePageTitleQuery),
  ])
  return {
    settings: settings ?? {},
    project,
    homePageTitle: homePageTitle ?? undefined,
  }
})

export async function generateStaticParams() {
  const client = getClient()
  const slugs = await client.fetch<string[]>(projectPaths)
  return slugs.map((slug) => ({ slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (Object.prototype.hasOwnProperty.call(legacyProjectSlugs, slug)) {
    return {}
  }
  const { project, homePageTitle } = await getData(slug)
  if (!project) {
    return {}
  }
  return buildMetadata({
    path: `/projects/${slug}`,
    baseTitle: homePageTitle,
    title: project.title,
    description: project.overview ? toPlainText(project.overview) : '',
    image: project.coverImage,
  })
}

export default async function ProjectSlugPage({ params }: Props) {
  const { slug } = await params

  if (Object.prototype.hasOwnProperty.call(legacyProjectSlugs, slug)) {
    permanentRedirect(`/projects/${legacyProjectSlugs[slug]}`)
  }

  const { settings, project } = await getData(slug)

  if (!project) {
    notFound()
  }

  return <ProjectPageComponent project={project} settings={settings} />
}
```

- [ ] **Step 12: Simplify `components/pages/project/ProjectPage.tsx`**

```tsx
import { CustomPortableText } from 'components/shared/CustomPortableText'
import { Header } from 'components/shared/Header'
import ImageBox from 'components/shared/ImageBox'
import Link from 'next/link'
import type { ProjectPayload, SettingsPayload } from 'types'

import Layout from '../../shared/Layout'

export interface ProjectPageProps {
  project: ProjectPayload
  settings: SettingsPayload | undefined
  preview?: boolean
  loading?: boolean
}

export function ProjectPage({
  project,
  settings,
  preview,
  loading,
}: ProjectPageProps) {
  // Default to an empty object to allow previews on non-existent documents
  const {
    category,
    coverImage,
    description,
    duration,
    overview,
    site,
    tags,
    title,
  } = project || {}

  const startYear = new Date(duration?.start!).getFullYear()
  const endYear = duration?.end ? new Date(duration?.end).getFullYear() : 'Now'

  return (
    <Layout settings={settings} preview={preview} loading={loading}>
      <div>
        <div className="mb-20 space-y-6">
          {/* Header */}
          <Header title={title} description={overview} />

          <div className="border">
            {/* Image  */}
            <ImageBox
              image={coverImage}
              alt={`Cover image for ${title}`}
              classesWrapper="relative aspect-[16/9]"
            />

            <div className="divide-inherit grid grid-cols-1 divide-y border-t lg:grid-cols-4 lg:divide-x lg:divide-y-0">
              {/* Duration */}
              {!!(startYear && endYear) && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Duration</div>
                  <div className="text-md md:text-lg">{`${startYear} -  ${endYear}`}</div>
                </div>
              )}

              {/* Category */}
              {category && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Category</div>
                  <div className="text-md md:text-lg">{category}</div>
                </div>
              )}

              {/* Site */}
              {site && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Site</div>
                  {site && (
                    <Link
                      target="_blank"
                      className="text-md break-words hover:underline md:text-lg"
                      href={site}
                    >
                      {site}
                    </Link>
                  )}
                </div>
              )}

              {/* Tags */}
              <div className="p-3 lg:p-4">
                <div className="text-xs md:text-sm">Tags</div>
                <div className="text-md flex flex-row flex-wrap md:text-lg">
                  {tags?.map((tag, key) => (
                    <div key={key} className="mr-1 break-words">
                      #{tag}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {description && (
            <CustomPortableText
              paragraphClasses="font-ariana max-w-3xl text-xl"
              value={description}
            />
          )}
        </div>
      </div>
    </Layout>
  )
}
```

```bash
rm components/pages/project/ProjectPageHead.tsx
```

- [ ] **Step 13: Delete `pages/projects/[slug].tsx`**

```bash
rm 'pages/projects/[slug].tsx'
```

- [ ] **Step 14: Fix `components/global/Navbar/MobileNavBar.tsx`'s `next/router` usage**

`next/router`'s default export doesn't exist in the App Router. Replace with `useRouter` from `next/navigation` (a hook, called inside the component), and drop the fragile deep-internal `Url` type import in favour of `string` (every call site already passes a plain string from `resolveHref`):

```tsx
'use client'
import { Transition } from '@headlessui/react'
import { resolveHref } from 'lib/sanity.links'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import logo from 'public/logo.svg'
import { MenuItem } from 'types'

const hamburgerLine = `h-[2px] w-6 my-[6px] bg-black transition ease transform duration-500`

const MobileNavBar = ({
  handleMenuClick,
  isMenuOpen,
  menuItems,
  showPublications,
  showPeople,
  showContactForm,
}: {
  handleMenuClick: () => void
  isMenuOpen: boolean
  menuItems?: MenuItem[]
  showPublications?: boolean
  showPeople?: boolean
  showContactForm?: boolean
}) => {
  const router = useRouter()

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    href: string
  ) => {
    e.preventDefault()
    handleMenuClick()
    setTimeout(() => {
      router.push(href)
    }, 500)
  }

  return (
    <>
      <div className={`uppercase`}>
        <div className="fixed bottom-auto left-0 right-0 top-0 z-50 h-16 border-y border-primary bg-background">
          <Link href="/">
            <Image
              src={logo}
              width={120}
              alt="logo"
              className="absolute left-4 my-4 h-[50%]"
            />
          </Link>

          <button
            type="button"
            aria-label="button"
            className="absolute right-6 border-0 bg-transparent py-4"
            onClick={handleMenuClick}
          >
            <div
              className={`${hamburgerLine} ${
                isMenuOpen && 'translate-y-2 rotate-45'
              }`}
            />
            <div
              className={`${hamburgerLine} ${
                isMenuOpen ? 'opacity-0' : 'group-hover:opacity-100'
              }`}
            />
            <div
              className={`${hamburgerLine} ${
                isMenuOpen && '-translate-y-2 -rotate-45'
              }`}
            />
          </button>
        </div>
        <Transition
          show={isMenuOpen}
          enter="transition ease-out duration-500"
          enterFrom="transform translate-x-full"
          enterTo="transform translate-x-0"
          leave="transition duration-500"
          leaveFrom="transform ease-in translate-x-0"
          leaveTo="transform translate-x-full"
          className="fixed z-20 flex h-[100lvh]
                    w-full flex-col items-center justify-center gap-8
                    bg-background text-center text-2xl font-[400] text-black"
        >
          {menuItems &&
            menuItems.map((menuItem: MenuItem, key: number) => {
              const href = resolveHref(menuItem?._type, menuItem?.slug)
              if (!href) {
                return null
              }
              return (
                <Link
                  key={key}
                  onClick={(e) => {
                    handleLinkClick(e, href)
                  }}
                  className={`hover:text-gray-600`}
                  href={href}
                >
                  {href === '/' ? 'Home' : menuItem.title}
                </Link>
              )
            })}
          {showPublications && (
            <Link
              onClick={(e) => {
                handleLinkClick(e, '/publications')
              }}
              className="hover:text-gray-600"
              href={'/publications'}
            >
              Publications
            </Link>
          )}
          {showPeople && (
            <Link
              onClick={(e) => {
                handleLinkClick(e, '/people')
              }}
              className="hover:text-gray-600"
              href={'/people'}
            >
              People
            </Link>
          )}
          {showContactForm && (
            <Link
              onClick={(e) => {
                handleLinkClick(e, '/contact')
              }}
              className="hover:text-gray-600"
              href={'/contact'}
            >
              Contact
            </Link>
          )}
        </Transition>
      </div>
    </>
  )
}

export default MobileNavBar
```

- [ ] **Step 15: Update `tailwind.config.js`'s content globs to include `app/`**

Tailwind 3's JIT scanner only generates utility classes for files matched by `content`. Once routes and their JSX live in `app/`, omitting it here means every class used only inside `app/*.tsx` files (there aren't many yet, but this must land before Task 3 adds more) gets silently purged from the compiled CSS:

```js
const { theme } = require('@sanity/demo/tailwind')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    ...theme,
    fontFamily: {
      mono: 'var(--font-mono)',
      sans: 'var(--font-sans)',
      serif: 'var(--font-serif)',
      antarctican: 'var(--font-antarctican-mono)',
      ariana: 'var(--font-ariana-pro)',
    },
    extend: {
      colors: {
        primary: '#2D6A4F',
        secondary: '#FFC857',
        background: '#F8F8F8',
        dark: '#333333',
        light: '#FFC857',
      },
      screens: {
        tall: { raw: '(min-height: 800px)' },
      },
      borderColor: {
        DEFAULT: '#2D6A4F',
      },
    },
  },
  plugins: [],
}
```

(`./pages/**` stays in the array — `pages/api/*`, `pages/studio/*`, and `pages/publications`, `pages/people`, `pages/contact`, `pages/404.tsx` still exist until Task 3/4/7 retire them.)

- [ ] **Step 16: Run verification**

```bash
npx tsc --noEmit
```
Expected: zero errors.

```bash
npx eslint .
```
Expected: zero errors.

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```
Expected: succeeds. Output should show both `Route (app)` entries (`/`, `/[slug]`, `/projects/[slug]`) and remaining `Route (pages)` entries (`/people`, `/publications`, `/contact`, `/404`, `/api/*`, `/studio/*`, `/sitemap.xml`) — both routers coexisting is expected and correct at this point.

- [ ] **Step 17: Manual smoke test**

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npx next start -p 3111
```

In another terminal:
```bash
curl -s http://localhost:3111/ | grep -o '<title>[^<]*</title>'
curl -s http://localhost:3111/miscellaneous | grep -o '<title>[^<]*</title>'
curl -s http://localhost:3111/projects/maestro | grep -o '<title>[^<]*</title>'
```
Expected: same titles as the Task-1 baseline (`Laboratory of Molecular Neuroscience and Dementia`, `Miscellaneous | Laboratory of Molecular Neuroscience and Dementia`, `Join our new endevor - MAESTRO - dreaMers And doErs: the Scientists of TomorROw | Laboratory of Molecular Neuroscience and Dementia`). Stop the server afterward.

- [ ] **Step 18: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: migrate root layout, home, page, and project routes to the App Router

Root layout absorbs _app.tsx's font loading (via next/font's own
.variable className mechanism, replacing the old inline <style jsx
global> block) and _document.tsx's body classes. SiteMeta.tsx's logic
moves into lib/metadata.ts, called from each route's generateMetadata.
ScrollUp.tsx is deleted — the Next 13 App Router scroll bug it worked
around doesn't apply here. MobileNavBar's next/router usage (which
doesn't exist in the App Router) is ported to next/navigation.
EOF
)"
```

---

## Task 3: People, Publications, Contact, and not-found routes → App Router (`pages/` retired for all content routes)

Two of these five components self-wrap `<Layout>` internally (`People`, `Contact`); `Publications` does not (the old `pages/publications/index.tsx` wrapped it at the page level) — this task preserves each component's existing wrapping behaviour exactly rather than normalizing them, since normalizing is out of scope here.

**Files:**
- Create: `app/people/page.tsx`
- Modify: `components/pages/people/People.tsx`
- Create: `app/publications/page.tsx`
- Create: `app/contact/page.tsx`
- Modify: `components/pages/contact/Contact.tsx`
- Create: `app/not-found.tsx`
- Delete: `components/global/SiteMeta.tsx`
- Delete: `pages/people/index.tsx`
- Delete: `pages/publications/index.tsx`
- Delete: `pages/contact/index.tsx`
- Delete: `pages/404.tsx`
- Delete: `pages/_app.tsx`
- Delete: `pages/_document.tsx`
- Modify: `tailwind.config.js`

**Interfaces:**
- Consumes: `buildMetadata` (Task 2), `getClient` (Task 1).
- Produces: `People`/`Contact` drop `homePageTitle` from their props (same reasoning as Task 2's `HomePage`/`Page`/`ProjectPage`). `Publications.tsx` itself is untouched (it never took `homePageTitle` or rendered `SiteMeta`).

- [ ] **Step 1: Create `app/people/page.tsx`**

```tsx
import People from 'components/pages/people/People'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import {
  homePageTitleQuery,
  profileQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { ProfilePayload, SettingsPayload } from 'types'

export const revalidate = 60

const description =
  'Explore profiles of Peoples in the Laboratory of Molecular Neuroscience and Dementia. Learn about their roles, research interests, and more.'

const getData = cache(async () => {
  const client = getClient()
  const [homePageTitle, settings, profiles] = await Promise.all([
    client.fetch<string | null>(homePageTitleQuery),
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<ProfilePayload[]>(profileQuery),
  ])
  return {
    homePageTitle: homePageTitle ?? undefined,
    settings: settings ?? {},
    profiles: profiles ?? [],
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  return buildMetadata({
    path: '/people',
    baseTitle: homePageTitle,
    title: 'People',
    description,
    image: settings.ogImage,
  })
}

export default async function PeoplePage() {
  const { settings, profiles } = await getData()

  if (settings.showPeople === false) {
    notFound()
  }

  return <People settings={settings} profiles={profiles} />
}
```

- [ ] **Step 2: Simplify `components/pages/people/People.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `app/publications/page.tsx`**

Unlike Home/Page/Project (Task 2), which keep threading `preview`/`loading` through to `Layout` until Task 8 centralizes the banner into the root layout, this route drops the `preview` prop from its `Layout` call immediately. That's a deliberate asymmetry, not an oversight: `Publications` never had a `*Preview.tsx` live-query variant even before Task 1, so its `preview` prop only ever fed `PreviewBanner` — exactly the piece Task 8 moves to the root layout — and no data-fetching branch depends on it either way. Home/Page/Project keep the plumbing a little longer only because their components' prop signatures were already being touched in Task 2 for other reasons (dropping `homePageTitle`); simplifying `Layout`'s call here too would have meant threading a `preview` value this route was never going to use.

```tsx
import Publications from 'components/pages/publications/Publications'
import Layout from 'components/shared/Layout'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import {
  homePageTitleQuery,
  publicationsQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { PublicationPayload, SettingsPayload } from 'types'

export const revalidate = 60

const description =
  'Explore the publications by the Laboratory of Molecular Neuroscience and Dementia. Discover the latest advancements and insights in neuroscience, molecular biology, and dementia research, authored by our esteemed team of scientists and researchers.'

const getData = cache(async () => {
  const client = getClient()
  const [settings, homePageTitle, publications] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<string | null>(homePageTitleQuery),
    client.fetch<PublicationPayload[] | null>(publicationsQuery),
  ])
  return {
    settings: settings ?? {},
    homePageTitle: homePageTitle ?? undefined,
    publications,
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  return buildMetadata({
    path: '/publications',
    baseTitle: homePageTitle,
    title: 'Publications',
    description,
    image: settings.ogImage,
  })
}

export default async function PublicationsPage() {
  const { settings, publications } = await getData()

  if (!publications || settings.showPublications === false) {
    notFound()
  }

  return (
    <Layout settings={settings}>
      <Publications publications={publications} />
    </Layout>
  )
}
```

- [ ] **Step 4: Create `app/contact/page.tsx`**

```tsx
import Contact from 'components/pages/contact/Contact'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import { homePageTitleQuery, settingsQuery } from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { SettingsPayload } from 'types'

export const revalidate = 60

const description =
  'Get in touch with us using the contact form below. We would love to hear from you!'

const getData = cache(async () => {
  const client = getClient()
  const [homePageTitle, settings] = await Promise.all([
    client.fetch<string | null>(homePageTitleQuery),
    client.fetch<SettingsPayload | null>(settingsQuery),
  ])
  return { homePageTitle: homePageTitle ?? undefined, settings: settings ?? {} }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  return buildMetadata({
    path: '/contact',
    baseTitle: homePageTitle,
    title: 'Contact',
    description,
    image: settings.ogImage,
  })
}

export default async function ContactPage() {
  const { settings } = await getData()

  if (settings.showContactForm === false) {
    notFound()
  }

  return <Contact settings={settings} />
}
```

- [ ] **Step 5: Simplify `components/pages/contact/Contact.tsx`**

```tsx
import Layout from 'components/shared/Layout'
import type { SettingsPayload } from 'types'

import ContactForm from './ContactForm'

const Contact = ({ settings }: { settings?: SettingsPayload }) => {
  return (
    <Layout settings={settings}>
      <ContactForm />
    </Layout>
  )
}

export default Contact
```

- [ ] **Step 6: Create `app/not-found.tsx`**

The original `pages/404.tsx`'s canonical URL resolved to `/404` even when the *requested* path differed (verified against the running Task-1-baseline server: hitting a nonexistent `/nope-404` still produced `<link rel="canonical" href=".../404">`) — Next's Pages Router 404 handling always serves the literal `/404` page internally regardless of the requested URL. Match that exactly:

```tsx
import Layout from 'components/shared/Layout'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import { homePageTitleQuery, settingsQuery } from 'lib/sanity.queries'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import notFoundSVG from 'public/404.svg'
import { cache } from 'react'
import type { SettingsPayload } from 'types'

const getData = cache(async () => {
  const client = getClient()
  const [settings, homePageTitle] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<string | null>(homePageTitleQuery),
  ])
  return { settings: settings ?? {}, homePageTitle: homePageTitle ?? undefined }
})

export async function generateMetadata(): Promise<Metadata> {
  const { homePageTitle } = await getData()
  return buildMetadata({
    path: '/404',
    baseTitle: homePageTitle,
    title: 'Page Not Found',
    description:
      'The page you are looking for cannot be found. It may have been moved, deleted, or the URL might be misspelled. Please check the URL or return to our homepage to explore more of our content and services.',
    noindex: true,
  })
}

export default async function NotFound() {
  const { settings } = await getData()

  return (
    <Layout settings={settings}>
      <div className="mx-auto mb-16 w-80 max-w-md space-y-6 md:w-[40vw]">
        <Image
          src={notFoundSVG}
          alt={'Page Not Found - Web illustrations by Storyset'}
          className=""
        />
        <p>
          {`We couldn't find the page you were looking for. Perhaps the`}
          <Link
            href={'/'}
            className="text-black underline hover:text-gray-600"
          >
            home page
          </Link>
          ?
        </p>
      </div>
    </Layout>
  )
}
```

- [ ] **Step 7: Delete now-fully-superseded files**

```bash
rm components/global/SiteMeta.tsx
rm pages/people/index.tsx
rm pages/publications/index.tsx
rm pages/contact/index.tsx
rm pages/404.tsx
rm pages/_app.tsx
rm pages/_document.tsx
```

- [ ] **Step 8: Drop `./pages/**` from `tailwind.config.js`'s content globs**

`pages/` now contains only `pages/api/*` and `pages/studio/*` (no JSX, no Tailwind classes) — leaving the glob costs nothing functionally, but removing it documents that no route-level JSX lives there anymore:

```js
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
```

- [ ] **Step 9: Run verification**

```bash
npx tsc --noEmit
```
Expected: zero errors.

```bash
npx eslint .
```
Expected: zero errors.

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```
Expected: succeeds. `Route (pages)` should now list only `/api/*`, `/studio/[[...index]]`, and `/sitemap.xml` — every content route is served from `Route (app)`.

- [ ] **Step 10: Manual smoke test**

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npx next start -p 3111
```
```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3111/people
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3111/publications
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3111/contact
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3111/this-route-does-not-exist
```
Expected: `200`, `200`, `200`, `404`. Stop the server afterward.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: migrate people, publications, contact, and not-found routes to the App Router

pages/ now holds only API routes and the Studio mount — every content
route is served from app/. _app.tsx and _document.tsx are deleted with
the last Pages Router route that needed them.
EOF
)"
```

---

## Task 4: API routes → route handlers, and `sitemap.xml` → `app/sitemap.ts`

Route Handlers use the Web-standard `Request`/`Response` (via `NextRequest`/`NextResponse`), not `NextApiRequest`/`NextApiResponse`. `revalidatePath` (from `next/cache`) replaces `res.revalidate()` — it's synchronous (no `await`, no return value), unlike the Pages Router's async `res.revalidate()`. `next-sanity/webhook`'s `parseBody` now takes a `NextRequest` in its type signature (verified directly against the installed package's `.d.ts`), so no other change is needed there beyond the request type.

Draft-mode enable/disable (`pages/api/draft.ts`, `pages/api/disable-draft.ts`) are **not** touched here — they're tightly coupled to the preview-secret scheme Task 8 redesigns, so moving them now would mean touching the same two files twice. They stay in `pages/api/` until Task 8.

**Files:**
- Create: `app/api/formspree/route.ts`
- Create: `app/api/revalidate/route.ts`
- Create: `app/sitemap.ts`
- Delete: `pages/api/formspree.ts`
- Delete: `pages/api/revalidate.ts`
- Delete: `pages/sitemap.xml.tsx`

**Interfaces:**
- Consumes: `siteUrl` (`lib/site.ts`), `getAllPaths` (`lib/paths.ts`), `isNoindexPath` (`lib/site.ts`) — all unchanged from Phase 1A.
- Produces: nothing new consumed by later tasks (Task 8 adds its own `app/api/draft/route.ts`, independent of these).

- [ ] **Step 1: Create `app/api/formspree/route.ts`**

`getClientIp` drops the `req.socket.remoteAddress` fallback — Route Handlers' `Request` object has no `socket` property (that was a Node-`http`-specific escape hatch); on Vercel, `x-forwarded-for` is always present in production, so the fallback was already dead in the deployed environment, only reachable in local dev without a proxy in front:

```ts
import { siteUrl } from 'lib/site'
import { NextRequest, NextResponse } from 'next/server'

const endpoint = process.env.FORMSPREE_ENDPOINT

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 5

const requestLog = new Map<string, { count: number; resetAt: number }>()

/**
 * Only these fields reach Formspree. Everything else in the request body is
 * dropped — this endpoint accepts contact-form submissions, not arbitrary JSON
 * forwarded on the lab's Formspree account.
 */
const FIELD_MAX_LENGTH = {
  name: 200,
  email: 320,
  message: 5000,
} as const

type AllowedField = keyof typeof FIELD_MAX_LENGTH
const ALLOWED_FIELDS = Object.keys(FIELD_MAX_LENGTH) as AllowedField[]

function buildPayload(
  body: unknown
): { payload: Record<AllowedField, string> } | { error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'Expected a JSON object.' }
  }

  const source = body as Record<string, unknown>
  const payload = {} as Record<AllowedField, string>

  for (const field of ALLOWED_FIELDS) {
    const value = source[field]
    if (typeof value !== 'string' || value.trim() === '') {
      return { error: `Missing required field: ${field}.` }
    }
    if (value.length > FIELD_MAX_LENGTH[field]) {
      return { error: `Field too long: ${field}.` }
    }
    payload[field] = value.trim()
  }

  return { payload }
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return 'unknown'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = requestLog.get(ip)
  if (!entry || now > entry.resetAt) {
    requestLog.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT_MAX_REQUESTS
}

function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  if (process.env.VERCEL_ENV !== 'production') return true
  const trusted = [
    siteUrl,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  ].filter(Boolean)
  return trusted.includes(origin)
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, message: 'Expected a JSON object.' },
      { status: 400 }
    )
  }

  // Honeypot: bots fill every field, real visitors never see this one.
  if (
    body &&
    typeof body === 'object' &&
    (body as Record<string, unknown>)._gotcha
  ) {
    return NextResponse.json({ success: true, message: 'Thank you.' })
  }

  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      { success: false, message: 'Forbidden.' },
      { status: 403 }
    )
  }

  const ip = getClientIp(request)
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, message: 'Too many submissions. Please try again later.' },
      { status: 429 }
    )
  }

  const result = buildPayload(body)
  if ('error' in result) {
    return NextResponse.json(
      { success: false, message: result.error },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(`https://formspree.io/f/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(result.payload),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error('Formspree request failed')
    }
    return NextResponse.json({ success: true, message: data })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Sorry, there was an issue with submitting your message. Please try again later.',
      },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Create `app/api/revalidate/route.ts`**

This also fixes a pre-existing bug flagged in the parent spec (§4.3): the `'page'` case's response always said `"Revalidated homepage"` regardless of which page was actually revalidated. Since this line is being rewritten anyway for the Route Handler port, the message is corrected to name the actual path — a one-line string fix bundled into an already-necessary rewrite, not a separate feature:

```ts
import { getAllPaths } from 'lib/paths'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { parseBody } from 'next-sanity/webhook'

export async function POST(request: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody<{
      type: string
      slug: string
    }>(request, process.env.SANITY_WEBHOOK_SECRET)

    if (!isValidSignature) {
      const message = 'Invalid signature'
      console.warn(message)
      return NextResponse.json({ message }, { status: 401 })
    }

    const { type, slug } = body ?? { type: undefined, slug: undefined }

    switch (type) {
      case 'page':
        revalidatePath(`/${slug}`)
        return NextResponse.json({
          success: true,
          message: `Revalidated "/${slug}"`,
        })
      case 'project':
        revalidatePath(`/projects/${slug}`)
        revalidatePath(`/`)
        return NextResponse.json({
          success: true,
          message: `Revalidated "${type}" with slug "projects/${slug}. Revalidated homepage."`,
        })
      case 'publication':
        revalidatePath(`/publications`)
        return NextResponse.json({
          success: true,
          message: `Revalidated "${type}" with slug "publications"`,
        })
      case 'profile':
        revalidatePath(`/people`)
        return NextResponse.json({
          success: true,
          message: `Revalidated "${type}" with slug "people"`,
        })
      default: {
        const paths = await getAllPaths()
        paths.forEach((path) => {
          if (path) {
            console.log(`Revalidating '${path}'...`)
            revalidatePath(path)
          }
        })
        return NextResponse.json({
          success: true,
          message: `Revalidated all pages.`,
        })
      }
    }
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { success: false, message: 'Error revalidating' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Create `app/sitemap.ts`**

Next's built-in sitemap convention replaces the hand-rolled XML string builder entirely — Next serves this at `/sitemap.xml` automatically with the correct `Content-Type`:

```ts
import { getAllPaths } from 'lib/paths'
import { isNoindexPath, siteUrl } from 'lib/site'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = await getAllPaths()
  return paths
    .filter((path): path is string => Boolean(path))
    .filter((path) => !isNoindexPath(path))
    .map((path) => ({ url: `${siteUrl}${path}` }))
}
```

- [ ] **Step 4: Delete the superseded Pages Router files**

```bash
rm pages/api/formspree.ts
rm pages/api/revalidate.ts
rm pages/sitemap.xml.tsx
```

- [ ] **Step 5: Run verification**

```bash
npx tsc --noEmit
```
Expected: zero errors.

```bash
npx eslint .
```
Expected: zero errors.

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```
Expected: succeeds. `pages/` should now list only `api/disable-draft.ts`, `api/draft.ts`, and `studio/[[...index]].tsx`.

- [ ] **Step 6: Manual smoke test**

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npx next start -p 3111
```

Sitemap content and shape:
```bash
curl -s http://localhost:3111/sitemap.xml
```
Expected: same URL set as the Task-1 baseline capture (`/`, `/publications`, `/contact`, `/people`, `/lab-alumni`, `/miscellaneous`, `/support-our-research`, plus the five `/projects/*` slugs) — `/tutorial` still absent (its `isNoindexPath` exclusion is unchanged). The XML shape will differ cosmetically (Next's sitemap builder emits its own well-formed XML, not the hand-written string) — only the URL *set* must match.

Formspree honeypot behaviour preserved:
```bash
curl -s -X POST http://localhost:3111/api/formspree \
  -H 'Content-Type: application/json' \
  -d '{"name":"bot","email":"a@b.com","message":"x","_gotcha":"filled"}'
```
Expected: `{"success":true,"message":"Thank you."}` (silently accepted, never reaches Formspree).

Formspree missing-field rejection:
```bash
curl -s -X POST http://localhost:3111/api/formspree \
  -H 'Content-Type: application/json' -d '{"name":"","email":"","message":""}'
```
Expected: `{"success":false,"message":"Missing required field: name."}`.

Stop the server afterward.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: port formspree and revalidate API routes to route handlers, sitemap.xml to app/sitemap.ts

Also fixes the revalidate webhook's 'page' case, which always reported
"Revalidated homepage" regardless of which path was actually
revalidated — a pre-existing bug (parent spec §4.3), corrected here
since this exact line was already being rewritten for the port.
EOF
)"
```

---

## Task 5: SEO re-verification against a running server

**This is a dedicated verification task, not a side effect of Tasks 2–4.** Phase 0's canonical/OG/noindex work moved from runtime `useRouter().asPath` derivation to build-time `generateMetadata` across three tasks; this task is where that move gets checked against reality rather than assumed correct because `tsc`/`eslint`/`next build` were green.

**Files:**
- Possibly modify: `lib/metadata.ts` (only if Step 2's diff surfaces a mismatch — most likely candidate: the `robots` tag's exact token set).

**Interfaces:**
- Consumes: `lib/metadata.ts`'s `buildMetadata` (Task 2).
- Produces: nothing new — this task either confirms Task 2–4's output matches the baseline or corrects `buildMetadata` until it does.

- [ ] **Step 1: Regenerate the SEO baseline capture against the migrated build**

A pre-migration baseline was captured on the Phase-1A-merged commit (`5f2041a0629334cd2425f9a6b2864478c3dafd41`) before this plan's work began, saved at (session-scoped, re-run if unavailable) `/private/tmp/claude-501/-Users-brett-Documents-GitHub-LMND-nosync/99256a12-5157-40d4-ab77-842c1f382250/scratchpad/seo-baseline.txt`. If that path no longer exists (a new session, a different machine), regenerate it first by checking out `5f2041a` into a scratch worktree, running `npm install && NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npx next build && npx next start -p 3111`, and capturing with the script below before returning to this branch.

Capture script (already exists at `/private/tmp/claude-501/-Users-brett-Documents-GitHub-LMND-nosync/99256a12-5157-40d4-ab77-842c1f382250/scratchpad/capture-seo.sh`; recreate if missing):

```bash
#!/bin/bash
# Usage: capture-seo.sh <port> <output-file>
PORT="${1:-3111}"
OUT="${2:-/tmp/seo-baseline.txt}"
: > "$OUT"
for p in / /people /publications /contact /tutorial /miscellaneous /projects/maestro /nope-404; do
  echo "===== $p =====" >> "$OUT"
  curl -s "http://localhost:$PORT$p" \
    | grep -oE '<title>[^<]*</title>|<link rel="canonical" href="[^"]*"|<meta name="robots" content="[^"]*"|<meta property="og:[a-z_]*" content="[^"]*"|<meta name="twitter:card" content="[^"]*"' \
    >> "$OUT"
done
echo "===== SITEMAP =====" >> "$OUT"
curl -s "http://localhost:$PORT/sitemap.xml" >> "$OUT"
cat "$OUT"
```

On the migrated branch (this plan's HEAD after Task 4):

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npx next start -p 3112
```

```bash
bash /path/to/capture-seo.sh 3112 /tmp/seo-baseline-migrated.txt
```

- [ ] **Step 2: Diff against the pre-migration baseline**

```bash
diff /private/tmp/claude-501/-Users-brett-Documents-GitHub-LMND-nosync/99256a12-5157-40d4-ab77-842c1f382250/scratchpad/seo-baseline.txt /tmp/seo-baseline-migrated.txt
```

Expected differences, all acceptable:
- `/nope-404`'s canonical: baseline showed `href="https://holsingerlab.vercel.app/404"` — this must still match exactly (Step 6 of Task 3 replicated it deliberately).
- The sitemap's exact XML formatting may differ (Next's built-in `sitemap.ts` emits its own well-formed XML) — the **URL set** must be identical; a line-for-line diff on the sitemap section is not the bar, url-for-url is.

Any other difference is a real regression and must be fixed before proceeding — most likely candidate is the `robots` meta tag: if the migrated output shows `content="noindex, follow"` where the baseline shows bare `content="noindex"`, open `lib/metadata.ts` and change `robots: shouldNoindex ? { index: false, follow: true } : undefined` to `robots: shouldNoindex ? { index: false } : undefined`, rebuild, and re-diff.

- [ ] **Step 3: Confirm `/tutorial` specifically**

```bash
curl -s http://localhost:3112/tutorial | grep -o '<meta name="robots" content="[^"]*"'
curl -s http://localhost:3112/sitemap.xml | grep -c tutorial
```
Expected: `<meta name="robots" content="noindex">` (or whatever exact token set Step 2 settled on) present, and `0` (tutorial absent from the sitemap). Stop both servers (`3111` if still running from Task 4, `3112`) afterward.

- [ ] **Step 4: Commit** (only if Step 2 required a `lib/metadata.ts` change; otherwise this task produces no diff and is a verification-only checkpoint — note that in the plan-tracking tool rather than committing an empty change)

```bash
git add lib/metadata.ts
git commit -m "$(cat <<'EOF'
fix: correct robots meta tag output in buildMetadata to match Phase 0 baseline

Verified against a live server diff, not assumed from documentation —
Next's generated <meta name="robots"> token set didn't match the
original SiteMeta.tsx output on the first attempt.
EOF
)"
```

---

## Task 6: Sanity TypeGen

Moved earlier than the design doc's original step 6 ordering: TypeGen has no dependency on Studio's mount location (it operates on schema files and query-string literals, both already stable at this point), and Task 8 (preview restoration) benefits from having `sanity.types.ts` in place before it introduces `next-sanity/live`'s `sanityFetch` — `sanityFetch`'s return type is inferred via the same `SanityQueries` module-augmentation mechanism TypeGen sets up, so generating types now means Task 8's new fetch calls are correctly typed from the moment they're written, not retrofitted afterward.

**Files:**
- Modify: `sanity.cli.ts`
- Modify: `package.json`
- Create: `sanity.types.ts` (generated, committed)
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: a global `SanityQueries` augmentation (via `declare module '@sanity/client'`) consumed implicitly by every `client.fetch()` call already in the codebase (additive — existing explicit `<T>()` generics are unaffected) and by Task 8's new `sanityFetch()` calls (which rely on it for inference, having no explicit-generic mechanism of their own).

- [ ] **Step 1: Add TypeGen config to `sanity.cli.ts`**

```ts
import { loadEnvConfig } from '@next/env'
import { defineCliConfig } from 'sanity/cli'

const dev = process.env.NODE_ENV !== 'production'
loadEnvConfig(__dirname, dev, { info: () => null, error: console.error })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

export default defineCliConfig({
  api: { projectId, dataset },
  typegen: {
    path: ['./lib/**/*.ts', './app/**/*.{ts,tsx}'],
    schema: 'schema.json',
    generates: './sanity.types.ts',
    overloadClientMethods: true,
  },
})
```

`path` is scoped to `lib/` and `app/` deliberately — every `groq`-tagged query literal in this codebase lives in `lib/sanity.queries.ts`, and `app/` is where they're consumed. Scoping narrower than the default `./src/**/*` (which wouldn't match anything in this repo — there is no `src/` directory) avoids scanning `node_modules`-adjacent noise or Studio schema files that contain no query literals.

- [ ] **Step 2: Add `typegen` npm scripts**

In `package.json`'s `scripts` block, add two entries (alongside the existing ones from Task 1):

```json
"typegen": "sanity schema extract && sanity typegen generate",
```

Full `scripts` block after this addition:

```json
"scripts": {
  "build": "next build",
  "dev": "next dev",
  "format": "npx prettier --write . --ignore-path .gitignore",
  "lint": "eslint .",
  "lint:fix": "npm run format && npm run lint -- --fix",
  "start": "next start",
  "type-check": "tsc --noEmit",
  "typegen": "sanity schema extract && sanity typegen generate"
},
```

- [ ] **Step 3: Run TypeGen and commit its output**

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run typegen
```

Expected: creates `schema.json` (add to `.gitignore` — it's a build artifact, regenerated by the command above, not meant to be reviewed as source) and `sanity.types.ts` (this one **is** committed — it's the whole point of the CI freshness check in Step 5).

Add to `.gitignore`:
```
# Sanity TypeGen intermediate artifact (schema.json regenerates every run;
# sanity.types.ts is the committed, reviewable output)
/schema.json
```

- [ ] **Step 4: Verify the generated types actually type-check against existing usage**

```bash
npx tsc --noEmit
```

Expected: zero errors. If `sanity.types.ts` introduces a naming collision with anything in `types/index.ts` (unlikely, since `sanity.types.ts`'s generated names follow Sanity's own `<QueryName>Result`/`<SchemaTypeName>` conventions, not this repo's hand-written `XPayload` names), resolve by renaming the colliding import at its call site — `types/index.ts`'s hand-written payload types stay as the source of truth for component props; `sanity.types.ts` only affects the *inferred return type of `.fetch()` calls*, which already get assigned to `XPayload`-typed variables via explicit generics everywhere in this codebase, so no collision is actually expected.

- [ ] **Step 5: Add a CI freshness check**

Modify `.github/workflows/ci.yml` to assert `sanity.types.ts` is current — regenerate it in CI and fail if the working tree becomes dirty:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      # Public values, already shipped in the client bundle by design
      # (see lib/sanity.api.ts) — the dataset is publicly readable, so no
      # token is needed to build. Not secrets.
      NEXT_PUBLIC_SANITY_PROJECT_ID: j3f9z8os
      NEXT_PUBLIC_SANITY_DATASET: production
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Sanity TypeGen freshness
        run: |
          npm run typegen
          if ! git diff --exit-code sanity.types.ts; then
            echo "::error::sanity.types.ts is out of date — run 'npm run typegen' and commit the result."
            exit 1
          fi

      - name: Build
        run: npm run build
```

The freshness check runs after typecheck/lint (cheap, catches stale schema drift early) and before `build` (which itself doesn't need fresh types to succeed, just correct ones already committed — putting the check first fails faster on the common case of "someone changed a schema and forgot to regenerate").

- [ ] **Step 6: Run full verification**

```bash
npx tsc --noEmit && npx eslint . && NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```
Expected: all green.

```bash
git diff --exit-code sanity.types.ts
```
Expected: exit `0` (no diff — confirms Step 3's committed output is exactly what a regeneration produces, i.e. the CI check in Step 5 will pass).

- [ ] **Step 7: Commit**

```bash
git add sanity.cli.ts package.json sanity.types.ts .gitignore .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
feat: add Sanity TypeGen, commit sanity.types.ts, assert freshness in CI

Ordered before the Studio and preview tasks even though the design
doc's original step numbering put it last: TypeGen has no dependency
on where Studio is mounted, and the next task's new sanityFetch calls
benefit from the SanityQueries type augmentation existing before
they're written, not retrofitted after.
EOF
)"
```

---

## Task 7: Studio → `app/studio/[[...tool]]/page.tsx`

The current `pages/studio/[[...index]].tsx` nests `StudioProvider`/`StudioLayout` *inside* `NextStudio`, which already renders them internally — a redundant double-mount that happens to work but isn't the supported pattern. It also wraps a styled-components `createGlobalStyle` purely to set the Studio's background color from its own theme, and imports `NextStudioHead` from `next-sanity/studio/head` — **verified against the installed `next-sanity@13.3.1` package: this subpath does not exist.** `next-sanity/studio`'s root export already provides `metadata`/`viewport` objects designed to be re-exported directly from a Studio route's `page.tsx`.

**Files:**
- Create: `app/studio/[[...tool]]/page.tsx`
- Delete: `pages/studio/[[...index]].tsx`

**Interfaces:**
- Consumes: `sanity.config` (Task 1's `sanity.config.ts`, unchanged in this task).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Create `app/studio/[[...tool]]/page.tsx`**

```tsx
export { metadata, viewport } from 'next-sanity/studio'

import { NextStudio } from 'next-sanity/studio'
import config from 'sanity.config'

export default function StudioPage() {
  return <NextStudio config={config} />
}
```

No `'use client'` directive needed on this file — `NextStudio` is a client component internally (it's built on `next-sanity/studio/client-component`), and Next allows a Server Component file to directly render an imported Client Component without needing its own directive; the boundary is established by the imported module, not the importing file. This exactly mirrors how `app/page.tsx` (Task 2) renders `<HomePage>` without itself needing `'use client'`.

Two accepted, minor behaviour changes versus the old route, both consequences of "collapses to the supported form" rather than oversights:
- The Studio's background-color `createGlobalStyle` override is dropped — `next-sanity/studio`'s own styling handles this correctly without a manual override (this was a workaround the redundant nesting needed, not an independent feature).
- `NextStudioHead favicons={false}` (suppressing the app's own favicon tags on Studio pages) has no direct replacement since the subpath it came from doesn't exist in v13 — `next-sanity/studio`'s re-exported `metadata` doesn't set `icons`, so the root layout's favicon `metadata` (Task 2) applies to `/studio` too. This is a cosmetic-only regression (the site's favicon appears in the Studio browser tab instead of no favicon) with no functional impact, accepted rather than engineering a replacement for a `favicons={false}` prop that has no equivalent to port.

- [ ] **Step 2: Delete the superseded Pages Router route**

```bash
rm 'pages/studio/[[...index]].tsx'
```

- [ ] **Step 3: Run verification**

```bash
npx tsc --noEmit
```
Expected: zero errors.

```bash
npx eslint .
```
Expected: zero errors.

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```
Expected: succeeds. `pages/` should now list only `api/disable-draft.ts` and `api/draft.ts` — everything else has migrated.

- [ ] **Step 4: Manual smoke test**

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npx next start -p 3111
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3111/studio
```
Expected: `200`. Open `http://localhost:3111/studio` in a browser and confirm the Studio UI loads, the document list renders, and clicking into the "Home" singleton opens its editor. Stop the server afterward.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: migrate Sanity Studio to app/studio/[[...tool]]/page.tsx

Collapses to next-sanity/studio's supported single-NextStudio form —
the old route nested StudioProvider/StudioLayout inside NextStudio,
which already renders them. Verified next-sanity/studio/head does not
exist in next-sanity 13; re-exporting next-sanity/studio's own
metadata/viewport replaces it.
EOF
)"
```

---

## Task 8: Restore preview — `defineLive`, draft-mode route handlers, `VisualEditing`

The largest remaining task, and deliberately last: it's the one piece of this migration with no direct API equivalent (`next-sanity` 13 has no `./preview` subpath at all — verified against the package's export map — so this is a rewrite, not a rename), and it touches every route created in Tasks 2–3 plus the root layout.

**A design decision that departs from the design doc's literal API list, with the reasoning stated up front so it isn't mistaken for an oversight during review:** the design doc names `defineEnableDraftMode` from `next-sanity/draft-mode` as the tool for the enable endpoint. Reading its actual implementation (`next-sanity@13.3.1`'s installed `.d.ts`/`.js`) shows it internally calls `validatePreviewUrl` from `@sanity/preview-url-secret`, which validates secrets against a `sanity.previewUrlSecret` document type and `createPreviewSecret()` helper — a **different schema and generation scheme** than this codebase's existing one (`lib/sanity.api.ts`'s `previewSecretId = 'preview.secret'` singleton, generated and read via `plugins/productionUrl/utils.ts`'s hand-rolled `getSecret()`). Adopting `defineEnableDraftMode` as-is would require also adopting `@sanity/preview-url-secret`'s document type and secret-generation flow — a schema migration nowhere in this plan's scope or the design doc's stated deliverables. Instead, this task keeps the existing secret scheme exactly as it is (`previewSecretId`, `getSecret`, `productionUrl` plugin, `previewPane` Studio tab all untouched) and ports only the *mechanism* that has no working equivalent otherwise: `pages/api/draft.ts`'s body (validate the existing secret, call `draftMode().enable()`, redirect) becomes a Route Handler using Next's own `draftMode()` and `redirect()` — both of which **are** exactly what `defineEnableDraftMode` uses under the hood, just without the secret-scheme swap bundled in. `defineLive` and `VisualEditing` — the two APIs with no scheme dependency — are adopted exactly as named.

**Files:**
- Create: `lib/sanity.live.ts`
- Create: `app/api/draft/route.ts`
- Create: `app/api/disable-draft/route.ts`
- Delete: `pages/api/draft.ts`
- Delete: `pages/api/disable-draft.ts`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `components/pages/home/HomePage.tsx`
- Modify: `app/[slug]/page.tsx`
- Modify: `components/pages/page/Page.tsx`
- Modify: `app/projects/[slug]/page.tsx`
- Modify: `components/pages/project/ProjectPage.tsx`
- Modify: `app/people/page.tsx`
- Modify: `components/pages/people/People.tsx`
- Modify: `app/publications/page.tsx`
- Modify: `app/contact/page.tsx`
- Modify: `components/pages/contact/Contact.tsx`
- Modify: `components/shared/Layout.tsx`

**Interfaces:**
- Consumes: `sanity.types.ts`'s `SanityQueries` augmentation (Task 6) for `sanityFetch`'s inferred return types; `getClient()` (Task 1, still used for `generateStaticParams`/webhook-adjacent one-off fetches that don't need live/draft awareness).
- Produces: `sanityFetch`/`SanityLive` exported from `lib/sanity.live.ts` — the terminal task of this plan; nothing downstream consumes these further within Phase 1B.

- [ ] **Step 1: Create `lib/sanity.live.ts`**

```ts
import { readToken } from 'lib/sanity.api'
import { getClient } from 'lib/sanity.client'
import { defineLive } from 'next-sanity/live'

export const { sanityFetch, SanityLive } = defineLive({
  client: getClient(),
  serverToken: readToken || false,
  browserToken: false,
})
```

`browserToken: false` is a deliberate security choice, not an oversight: it means the live-reconnection socket never receives a Sanity token client-side, preserving the exact property Task 1's `token`-removal established (no read token in any client-visible payload) as a hard exit criterion for the whole phase. Draft content still previews correctly — `sanityFetch` resolves `perspective`/`stega` from the `draftMode()` cookie server-side using `serverToken`, on every request — the only capability given up is auto-refreshing an already-open preview tab without a manual reload while a draft is being actively edited, which is an acceptable trade for not shipping a token to the browser.

- [ ] **Step 2: Create `app/api/draft/route.ts`**

Ports `pages/api/draft.ts`'s existing secret-validation logic (unchanged scheme, per this task's header) to a Route Handler:

```ts
import {
  apiVersion,
  dataset,
  previewSecretId,
  projectId,
  readToken,
  useCdn,
} from 'lib/sanity.api'
import { resolveHref } from 'lib/sanity.links'
import { createClient } from 'next-sanity'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { getSecret } from 'plugins/productionUrl/utils'

const _client = createClient({ projectId, dataset, apiVersion, useCdn })

export async function GET(request: NextRequest) {
  const secretParam = request.nextUrl.searchParams.get('secret')
  if (!secretParam) {
    return new Response('Invalid secret', { status: 401 })
  }

  const token = readToken
  if (!token) {
    throw new Error(
      'A secret is provided but there is no `SANITY_API_READ_TOKEN` environment variable setup.'
    )
  }
  const client = _client.withConfig({ useCdn: false, token })
  const secret = await getSecret(client, previewSecretId)
  if (secretParam !== secret) {
    return new Response('Invalid secret', { status: 401 })
  }

  const href = resolveHref(
    request.nextUrl.searchParams.get('documentType') ?? undefined,
    request.nextUrl.searchParams.get('slug') ?? undefined
  )

  if (!href) {
    return new Response(
      'Unable to resolve preview URL based on the current document type and slug',
      { status: 400 }
    )
  }

  const draft = await draftMode()
  draft.enable()
  redirect(href)
}
```

- [ ] **Step 3: Create `app/api/disable-draft/route.ts`**

```ts
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET() {
  const draft = await draftMode()
  draft.disable()
  redirect('/')
}
```

- [ ] **Step 4: Delete the superseded Pages Router API routes**

```bash
rm pages/api/draft.ts
rm pages/api/disable-draft.ts
```

- [ ] **Step 5: Wire `SanityLive`, `VisualEditing`, and `PreviewBanner` into `app/layout.tsx`**

```tsx
import 'styles/index.css'

import { IBM_Plex_Mono, PT_Serif } from 'next/font/google'
import localFont from 'next/font/local'
import { PreviewBanner } from 'components/preview/PreviewBanner'
import { siteName, siteUrl } from 'lib/site'
import { SanityLive } from 'lib/sanity.live'
import { VisualEditing } from 'next-sanity/visual-editing'
import { draftMode } from 'next/headers'
import type { Metadata } from 'next'

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['500', '700'],
})

const serif = PT_Serif({
  variable: '--font-serif',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  weight: ['400', '700'],
})

const antarcticanMono = localFont({
  src: [
    {
      path: '../fonts/antarctican-mono/AntarcticanMono-Medium.woff2',
      weight: '500',
    },
    {
      path: '../fonts/antarctican-mono/AntarcticanMono-SemiBold.woff2',
      weight: '600',
    },
    {
      path: '../fonts/antarctican-mono/AntarcticanMono-Book.woff2',
      weight: 'normal',
    },
    {
      path: '../fonts/antarctican-mono/AntarcticanMono-Bold.woff2',
      weight: 'bold',
    },
  ],
  variable: '--font-antarctican-mono',
})

const arianaPro = localFont({
  src: [
    {
      path: '../fonts/ariana-pro/ArianaPro-Book.woff2',
      weight: '300',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Black.woff2',
      weight: '900',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Medium.woff2',
      weight: '500',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Bold.woff2',
      weight: '700',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Regular.woff2',
      weight: '400',
    },
    {
      path: '../fonts/ariana-pro/ArianaPro-Thin.woff2',
      weight: '100',
    },
  ],
  variable: '--font-ariana-pro',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  icons: {
    icon: [
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon/favicon.ico',
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
  other: {
    'msapplication-TileColor': '#000000',
    'msapplication-config': '/favicon/browserconfig.xml',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isEnabled: isDraftMode } = await draftMode()

  return (
    <html
      lang="en"
      className={`${mono.variable} ${antarcticanMono.variable} ${serif.variable} ${arianaPro.variable}`}
    >
      <body className="bg-background text-black dark:bg-black dark:text-white">
        {isDraftMode && <PreviewBanner />}
        {children}
        <SanityLive />
        {isDraftMode && <VisualEditing />}
      </body>
    </html>
  )
}
```

`PreviewBanner` moves from being rendered per-page (via `Layout`, threading `preview`/`loading` props through every component) to being rendered once, globally, here — eliminating the prop-drilling Steps 6–12 below clean up. `PreviewBanner.tsx` itself is unchanged (its `loading` prop, tied to the old `useLiveQuery`'s loading state, simply isn't passed anymore — it's already optional).

- [ ] **Step 6: Simplify `components/shared/Layout.tsx`** — drop `preview`/`loading`, now handled globally in the root layout

```tsx
import { Footer } from 'components/global/Footer'
import { Navbar } from 'components/global/Navbar/Navbar'
import { SettingsPayload } from 'types'

const fallbackSettings: SettingsPayload = {
  menuItems: [],
  showPublications: false,
  showPeople: false,
  showContactForm: false,
  footer: [],
}

export interface LayoutProps {
  children: React.ReactNode
  settings: SettingsPayload | undefined
  childrenStyles?: string
}

export default function Layout({
  children,
  settings = fallbackSettings,
  childrenStyles = 'px-6',
}: LayoutProps) {
  return (
    <div className={`flex min-h-screen flex-col bg-background text-black`}>
      <Navbar
        menuItems={settings?.menuItems}
        showPublications={settings?.showPublications}
        showPeople={settings?.showPeople}
        showContactForm={settings?.showContactForm}
      />

      <div
        className={`mt-32 flex-grow md:mt-16 md:px-16 lg:px-32 ${childrenStyles}`}
      >
        {children}
      </div>

      <Footer footer={settings?.footer} />
    </div>
  )
}
```

- [ ] **Step 7: Rewire `app/page.tsx` and `components/pages/home/HomePage.tsx` to `sanityFetch`**

```tsx
import { HomePage } from 'components/pages/home/HomePage'
import { buildMetadata } from 'lib/metadata'
import { homePageQuery, settingsQuery } from 'lib/sanity.queries'
import { sanityFetch } from 'lib/sanity.live'
import { toPlainText } from '@portabletext/react'
import type { Metadata } from 'next'
import { cache } from 'react'
import type { HomePagePayload } from 'types'

export const revalidate = 60

const fallbackPage: HomePagePayload = {
  title: '',
  overview: [],
  showcaseProjects: [],
}

const getData = cache(async () => {
  const [{ data: settings }, { data: page }] = await Promise.all([
    sanityFetch({ query: settingsQuery, stega: false }),
    sanityFetch({ query: homePageQuery, stega: false }),
  ])
  return { settings: settings ?? {}, page: page ?? fallbackPage }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, page } = await getData()
  return buildMetadata({
    path: '/',
    title: page.title,
    description: page.overview ? toPlainText(page.overview) : '',
    image: settings.ogImage,
  })
}

export default async function Page() {
  const { settings, page } = await getData()
  return <HomePage page={page} settings={settings} />
}
```

`sanityFetch`'s `data` is typed via `sanity.types.ts`'s `SanityQueries` module augmentation (Task 6) — no explicit `<T>` generic is passed or needed. **Verify this actually holds** in Step 15 below; if `tsc` shows `data: unknown` instead of the expected payload shape, fall back to an explicit cast at each call site (e.g. `const settings = (data as SettingsPayload | null) ?? {}`) and note it as a follow-up for the whole-branch review rather than blocking this task.

`HomePage.tsx` drops its `preview`/`loading` props (no longer threaded from anywhere — the banner is global now):

```tsx
import { ProjectListItem } from 'components/pages/home/ProjectListItem'
import { Header } from 'components/shared/Header'
import Layout from 'components/shared/Layout'
import { resolveHref } from 'lib/sanity.links'
import Link from 'next/link'
import type { HomePagePayload } from 'types'
import { SettingsPayload } from 'types'

export interface HomePageProps {
  settings: SettingsPayload
  page: HomePagePayload
}

export function HomePage({ page, settings }: HomePageProps) {
  const { overview, showcaseProjects, title = 'Personal website' } = page ?? {}

  return (
    <Layout settings={settings} childrenStyles={`px-0`}>
      <div className="mb-16 space-y-8">
        {/* Header */}
        {title && <Header centered title={title} description={overview} />}

        {/* Showcase projects */}
        <h2 className="text-center text-xl font-[600] md:text-left md:text-2xl">
          Our Research Projects
        </h2>

        {showcaseProjects && showcaseProjects.length > 0 && (
          <div className="mx-auto max-w-[100rem] border-y md:border">
            {showcaseProjects.map((project, key) => {
              const href = resolveHref(project._type, project.slug)
              if (!href) {
                return null
              }
              return (
                <Link key={key} href={href}>
                  <ProjectListItem project={project} odd={key % 2} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
```

- [ ] **Step 8: Rewire `app/[slug]/page.tsx` and `components/pages/page/Page.tsx`**

```tsx
import { Page as PageComponent } from 'components/pages/page/Page'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import {
  homePageTitleQuery,
  pagePaths,
  pagesBySlugQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import { sanityFetch } from 'lib/sanity.live'
import { toPlainText } from '@portabletext/react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'

export const revalidate = 60

const legacyPageSlugs: Record<string, string> = {
  Miscellaneous: 'miscellaneous',
}

const getData = cache(async (slug: string) => {
  const [{ data: settings }, { data: page }, { data: homePageTitle }] =
    await Promise.all([
      sanityFetch({ query: settingsQuery, stega: false }),
      sanityFetch({ query: pagesBySlugQuery, params: { slug }, stega: false }),
      sanityFetch({ query: homePageTitleQuery, stega: false }),
    ])
  return {
    settings: settings ?? {},
    page,
    homePageTitle: homePageTitle ?? undefined,
  }
})

export async function generateStaticParams() {
  const client = getClient()
  const slugs = await client.fetch<string[]>(pagePaths)
  return slugs.map((slug) => ({ slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (Object.prototype.hasOwnProperty.call(legacyPageSlugs, slug)) {
    return {}
  }
  const { settings, page, homePageTitle } = await getData(slug)
  if (!page) {
    return {}
  }
  return buildMetadata({
    path: `/${slug}`,
    baseTitle: homePageTitle,
    title: page.title,
    description: page.overview ? toPlainText(page.overview) : '',
    image: settings.ogImage,
  })
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params

  if (Object.prototype.hasOwnProperty.call(legacyPageSlugs, slug)) {
    permanentRedirect(`/${legacyPageSlugs[slug]}`)
  }

  const { settings, page } = await getData(slug)

  if (!page) {
    notFound()
  }

  return <PageComponent page={page} settings={settings} />
}
```

`generateStaticParams` keeps using plain `getClient()` — build-time path enumeration has no draft-mode concept, so there's nothing for `sanityFetch` to add here.

`Page.tsx` is unchanged from Task 2 (it never took `preview`/`loading` as props feeding anything other than `Layout`, and `Layout` no longer accepts them per Step 6) — drop `preview`/`loading` from its own props too:

```tsx
import { CustomPortableText } from 'components/shared/CustomPortableText'
import { Header } from 'components/shared/Header'
import Layout from 'components/shared/Layout'
import type { PagePayload, SettingsPayload } from 'types'

export interface PageProps {
  page: PagePayload
  settings: SettingsPayload | undefined
}

export function Page({ page, settings }: PageProps) {
  const { body, overview, title } = page || {}

  return (
    <Layout settings={settings}>
      <div className="mb-14">
        <Header title={title} description={overview} />

        {body && (
          <CustomPortableText
            paragraphClasses="font-ariana max-w-4xl text-gray-900 text-base md:text-lg"
            value={body}
          />
        )}
      </div>
    </Layout>
  )
}
```

- [ ] **Step 9: Rewire `app/projects/[slug]/page.tsx` and `components/pages/project/ProjectPage.tsx`**

```tsx
import { ProjectPage as ProjectPageComponent } from 'components/pages/project/ProjectPage'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import {
  homePageTitleQuery,
  projectBySlugQuery,
  projectPaths,
  settingsQuery,
} from 'lib/sanity.queries'
import { sanityFetch } from 'lib/sanity.live'
import { toPlainText } from '@portabletext/react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'

export const revalidate = 60

const legacyProjectSlugs: Record<string, string> = {
  MAESTRO: 'maestro',
  'Publication highlights': 'publication-highlights',
}

const getData = cache(async (slug: string) => {
  const [{ data: settings }, { data: project }, { data: homePageTitle }] =
    await Promise.all([
      sanityFetch({ query: settingsQuery, stega: false }),
      sanityFetch({
        query: projectBySlugQuery,
        params: { slug },
        stega: false,
      }),
      sanityFetch({ query: homePageTitleQuery, stega: false }),
    ])
  return {
    settings: settings ?? {},
    project,
    homePageTitle: homePageTitle ?? undefined,
  }
})

export async function generateStaticParams() {
  const client = getClient()
  const slugs = await client.fetch<string[]>(projectPaths)
  return slugs.map((slug) => ({ slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (Object.prototype.hasOwnProperty.call(legacyProjectSlugs, slug)) {
    return {}
  }
  const { project, homePageTitle } = await getData(slug)
  if (!project) {
    return {}
  }
  return buildMetadata({
    path: `/projects/${slug}`,
    baseTitle: homePageTitle,
    title: project.title,
    description: project.overview ? toPlainText(project.overview) : '',
    image: project.coverImage,
  })
}

export default async function ProjectSlugPage({ params }: Props) {
  const { slug } = await params

  if (Object.prototype.hasOwnProperty.call(legacyProjectSlugs, slug)) {
    permanentRedirect(`/projects/${legacyProjectSlugs[slug]}`)
  }

  const { settings, project } = await getData(slug)

  if (!project) {
    notFound()
  }

  return <ProjectPageComponent project={project} settings={settings} />
}
```

`ProjectPage.tsx` drops `preview`/`loading`:

```tsx
import { CustomPortableText } from 'components/shared/CustomPortableText'
import { Header } from 'components/shared/Header'
import ImageBox from 'components/shared/ImageBox'
import Link from 'next/link'
import type { ProjectPayload, SettingsPayload } from 'types'

import Layout from '../../shared/Layout'

export interface ProjectPageProps {
  project: ProjectPayload
  settings: SettingsPayload | undefined
}

export function ProjectPage({ project, settings }: ProjectPageProps) {
  const {
    category,
    coverImage,
    description,
    duration,
    overview,
    site,
    tags,
    title,
  } = project || {}

  const startYear = new Date(duration?.start!).getFullYear()
  const endYear = duration?.end ? new Date(duration?.end).getFullYear() : 'Now'

  return (
    <Layout settings={settings}>
      <div>
        <div className="mb-20 space-y-6">
          <Header title={title} description={overview} />

          <div className="border">
            <ImageBox
              image={coverImage}
              alt={`Cover image for ${title}`}
              classesWrapper="relative aspect-[16/9]"
            />

            <div className="divide-inherit grid grid-cols-1 divide-y border-t lg:grid-cols-4 lg:divide-x lg:divide-y-0">
              {!!(startYear && endYear) && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Duration</div>
                  <div className="text-md md:text-lg">{`${startYear} -  ${endYear}`}</div>
                </div>
              )}

              {category && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Category</div>
                  <div className="text-md md:text-lg">{category}</div>
                </div>
              )}

              {site && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Site</div>
                  {site && (
                    <Link
                      target="_blank"
                      className="text-md break-words hover:underline md:text-lg"
                      href={site}
                    >
                      {site}
                    </Link>
                  )}
                </div>
              )}

              <div className="p-3 lg:p-4">
                <div className="text-xs md:text-sm">Tags</div>
                <div className="text-md flex flex-row flex-wrap md:text-lg">
                  {tags?.map((tag, key) => (
                    <div key={key} className="mr-1 break-words">
                      #{tag}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {description && (
            <CustomPortableText
              paragraphClasses="font-ariana max-w-3xl text-xl"
              value={description}
            />
          )}
        </div>
      </div>
    </Layout>
  )
}
```

- [ ] **Step 10: Rewire `app/people/page.tsx` and `components/pages/people/People.tsx`**

```tsx
import People from 'components/pages/people/People'
import { buildMetadata } from 'lib/metadata'
import {
  homePageTitleQuery,
  profileQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import { sanityFetch } from 'lib/sanity.live'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

export const revalidate = 60

const description =
  'Explore profiles of Peoples in the Laboratory of Molecular Neuroscience and Dementia. Learn about their roles, research interests, and more.'

const getData = cache(async () => {
  const [{ data: homePageTitle }, { data: settings }, { data: profiles }] =
    await Promise.all([
      sanityFetch({ query: homePageTitleQuery, stega: false }),
      sanityFetch({ query: settingsQuery, stega: false }),
      sanityFetch({ query: profileQuery, stega: false }),
    ])
  return {
    homePageTitle: homePageTitle ?? undefined,
    settings: settings ?? {},
    profiles: profiles ?? [],
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  return buildMetadata({
    path: '/people',
    baseTitle: homePageTitle,
    title: 'People',
    description,
    image: settings.ogImage,
  })
}

export default async function PeoplePage() {
  const { settings, profiles } = await getData()

  if (settings.showPeople === false) {
    notFound()
  }

  return <People settings={settings} profiles={profiles} />
}
```

`People.tsx` is unchanged from Task 3 (it already dropped `homePageTitle` there, and never took `preview`/`loading`) — no edit needed.

- [ ] **Step 11: Rewire `app/publications/page.tsx`**

```tsx
import Publications from 'components/pages/publications/Publications'
import Layout from 'components/shared/Layout'
import { buildMetadata } from 'lib/metadata'
import {
  homePageTitleQuery,
  publicationsQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import { sanityFetch } from 'lib/sanity.live'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

export const revalidate = 60

const description =
  'Explore the publications by the Laboratory of Molecular Neuroscience and Dementia. Discover the latest advancements and insights in neuroscience, molecular biology, and dementia research, authored by our esteemed team of scientists and researchers.'

const getData = cache(async () => {
  const [{ data: settings }, { data: homePageTitle }, { data: publications }] =
    await Promise.all([
      sanityFetch({ query: settingsQuery, stega: false }),
      sanityFetch({ query: homePageTitleQuery, stega: false }),
      sanityFetch({ query: publicationsQuery, stega: false }),
    ])
  return {
    settings: settings ?? {},
    homePageTitle: homePageTitle ?? undefined,
    publications,
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  return buildMetadata({
    path: '/publications',
    baseTitle: homePageTitle,
    title: 'Publications',
    description,
    image: settings.ogImage,
  })
}

export default async function PublicationsPage() {
  const { settings, publications } = await getData()

  if (!publications || settings.showPublications === false) {
    notFound()
  }

  return (
    <Layout settings={settings}>
      <Publications publications={publications} />
    </Layout>
  )
}
```

- [ ] **Step 12: Rewire `app/contact/page.tsx` and `components/pages/contact/Contact.tsx`**

```tsx
import Contact from 'components/pages/contact/Contact'
import { buildMetadata } from 'lib/metadata'
import { homePageTitleQuery, settingsQuery } from 'lib/sanity.queries'
import { sanityFetch } from 'lib/sanity.live'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

export const revalidate = 60

const description =
  'Get in touch with us using the contact form below. We would love to hear from you!'

const getData = cache(async () => {
  const [{ data: homePageTitle }, { data: settings }] = await Promise.all([
    sanityFetch({ query: homePageTitleQuery, stega: false }),
    sanityFetch({ query: settingsQuery, stega: false }),
  ])
  return { homePageTitle: homePageTitle ?? undefined, settings: settings ?? {} }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  return buildMetadata({
    path: '/contact',
    baseTitle: homePageTitle,
    title: 'Contact',
    description,
    image: settings.ogImage,
  })
}

export default async function ContactPage() {
  const { settings } = await getData()

  if (settings.showContactForm === false) {
    notFound()
  }

  return <Contact settings={settings} />
}
```

`Contact.tsx` is unchanged from Task 3 — no edit needed.

- [ ] **Step 13: Add `previewUrl` awareness to `sanity.config.ts`'s Studio-side "Open Preview" flow — confirm it's already correct**

No change needed: `plugins/productionUrl/index.ts` (Task 1, unmodified since) already builds the `/api/draft` URL with `secret`/`slug`/`documentType` query params using this codebase's own `getSecret` scheme — the exact scheme Step 2 above ports to `app/api/draft/route.ts`. Confirm by reading `plugins/productionUrl/index.ts` and `plugins/previewPane/PreviewPane.tsx` (both from Phase 1A, both already point at `/api/draft`) — both continue working against the new Route Handler unchanged, since the URL shape and secret validation are identical to what `pages/api/draft.ts` did before. This step is a verification checkpoint, not a code change.

- [ ] **Step 14: Delete `app/not-found.tsx`'s now-redundant separate fetch — leave as-is**

`app/not-found.tsx` (Task 3) still uses plain `getClient()` rather than `sanityFetch` — intentionally left alone. The 404 page has no meaningful "draft preview" concept (there's no draft document being previewed), so there's nothing for the live/draft-aware fetch mechanism to add here. No change needed; this step is a documented decision, not an oversight.

- [ ] **Step 15: Run verification**

```bash
npx tsc --noEmit
```
Expected: zero errors. **Specifically check** that none of the `sanityFetch` call sites added in Steps 7–12 produce a `data: unknown`-shaped inference — if `tsc` accepts the code without error but you suspect weak inference, run:

```bash
npx tsc --noEmit --pretty false 2>&1 | grep -i "sanity.live\|app/page.tsx\|app/\[slug\]\|app/projects\|app/people\|app/publications\|app/contact"
```

Expected: no output (no errors in any of these files). If inference genuinely produced `unknown` (visible as a downstream type error where `settings.ogImage` etc. is accessed), apply the fallback noted in Step 7: explicit casts at each `sanityFetch` call site, e.g. `const settings = (data as SettingsPayload | null) ?? {}`.

```bash
npx eslint .
```
Expected: zero errors.

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```
Expected: succeeds. `pages/` should now be **completely gone** except `pages/api` — wait, `pages/api/formspree.ts`, `revalidate.ts`, `draft.ts`, `disable-draft.ts` are all deleted by this point (Tasks 4 and 8) — confirm the `pages/` directory contains nothing at all after this task:

```bash
find pages -type f
```
Expected: no output. If `pages/` is now fully empty, remove the directory itself:
```bash
rmdir pages 2>/dev/null || true
```

- [ ] **Step 16: Manual draft-mode smoke test**

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production SANITY_API_READ_TOKEN=<a real read token> npx next start -p 3111
```

Trigger draft mode without a valid secret (should fail closed):
```bash
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3111/api/draft?documentType=home&slug=/'
```
Expected: `401` (no `secret` param).

Confirm no Sanity token appears anywhere in a normal (non-draft) page's HTML:
```bash
curl -s http://localhost:3111/ | grep -c "$SANITY_API_READ_TOKEN"
```
Expected: `0`.

Confirm disable-draft clears the cookie and redirects:
```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3111/api/disable-draft
```
Expected: `307` (or `308`) redirecting to `/`.

Stop the server afterward.

- [ ] **Step 17: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: restore preview via next-sanity/live, VisualEditing, and draft-mode route handlers

Deliberately does not adopt defineEnableDraftMode from next-sanity/
draft-mode as literally named in the design doc: its actual
implementation requires @sanity/preview-url-secret's own schema and
secret-generation scheme, which this codebase doesn't use and which
migrating to is out of this plan's scope. Ports the existing secret
scheme's validation logic to a Route Handler instead, using Next's own
draftMode()/redirect() directly — the same primitives
defineEnableDraftMode itself calls, without the scheme swap bundled in.

browserToken is deliberately false in defineLive's config: draft
content still previews correctly (serverToken resolves it per-request
from the draftMode() cookie), but no token is ever shipped to the
browser, preserving Task 1's "no read token in any client payload"
property as a hard exit criterion for the whole phase.

pages/ is now fully empty and removed — every route in this app is
served from app/.
EOF
)"
```

---

## Final whole-branch review

Same discipline as Phase 0 and Phase 1A: **before merging, review the whole branch's diff as a unit, not task-by-task.** Phase 1A's own final review caught a types/schema mismatch spanning two files (`types/index.ts` and the Sanity schemas) that no individual task's review would have flagged, precisely because each task only sees its own diff. This phase has far more cross-cutting coupling than 1A — every route touches the App Router conventions, the Sanity client, and the metadata approach at once — so a whole-branch review is more likely to matter here, not less.

Things worth specifically re-checking across the whole diff, not just within each task:

- **Every `generateMetadata` export returns the same shape** — spot-check that `buildMetadata`'s `path` argument is correct for every route (easy to get wrong for the dynamic `[slug]` routes, where it's easy to accidentally pass the wrong prefix).
- **No route regressed to fetching via `getClient()` when it should use `sanityFetch`, or vice versa** — `generateStaticParams` calls should stay on `getClient()` (no draft concept at build time); every other data fetch inside a route component/`generateMetadata` should be on `sanityFetch` after Task 8.
- **`homePageTitle` prop-dropping was applied consistently** — `HomePage`, `Page`, `ProjectPage`, `People`, `Contact` should all have had it removed from their own prop signatures (Tasks 2, 3, and 8's Step 7–12 edits) — grep for `homePageTitle` across `components/` and confirm every remaining occurrence is inside a `app/*/page.tsx` route file (where it's fetched for `generateMetadata`) or `lib/metadata.ts` (where it's consumed as `baseTitle`), never inside a `components/pages/*` presentation component.
- **No leftover `next/router`, `next/head`, `next/document`, `next/app`, `NextApiRequest`/`NextApiResponse`, `getStaticProps`/`getStaticPaths`/`getServerSideProps` anywhere in the tree** — these are all Pages-Router-only and none should compile if genuinely gone, but `grep -rn` across `app/ components/ lib/` as an explicit final check costs nothing and catches anything a stale import slipped past.
- **`npm audit` and Dependabot counts, recorded before and after** (per parent spec §1.6 methodology) — compare against Phase 1A's recorded 46-vulnerability baseline.
- **Full route-by-route SEO re-check** (repeat Task 5's diff) **one more time against the final branch state**, not just after Task 4 — Task 8's rewiring of every route's data fetching is exactly the kind of change that could silently perturb `generateMetadata`'s inputs without any task-local test catching it.
- CI green on the branch's own PR check, not just local `npm run build`.

Verification commands to run against the final branch state (all from `docs/superpowers/plans/2026-08-07-phase-0-unblock.md` and this plan's own per-task steps, repeated here as the final gate):

```bash
npx tsc --noEmit
npx eslint .
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
npm audit
git diff --exit-code sanity.types.ts  # after `npm run typegen`
find pages -type f  # expect no output — pages/ is gone
```
