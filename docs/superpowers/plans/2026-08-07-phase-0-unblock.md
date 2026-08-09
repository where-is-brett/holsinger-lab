# Phase 0 — Unblock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site's existing content reachable and correct, on the current Next 13 / Sanity 3 stack, with zero dependency changes.

**Architecture:** Eleven independent-where-possible fixes against the existing Pages Router codebase: two content-gate bugs (guards + live data), two config inversions (Tailwind, Next.js build errors), an SEO baseline (metadata + sitemap), a heading-hierarchy fix, ISR restoration, slug hygiene (schema + live data + redirects), and hardening of the one public write endpoint (`/api/formspree`).

**Tech Stack:** Next.js 13.4.9 (Pages Router), TypeScript, Sanity v3 (Content Lake HTTP API for data mutations), Tailwind CSS 3.

## Global Constraints

- No new npm dependencies. This phase stays on the current `package.json` — the upgrade is Phase 1.
- No test framework exists yet (Vitest/Playwright land in Phase 2). Every task's "test" step is therefore a concrete, reproducible command — `npm run build`, `next start` + `curl`, a live Sanity query, or a `grep` against build output — not a unit test file. This mirrors the verification methodology already used in `docs/superpowers/specs/2026-08-07-site-modernisation-design.md` Appendix A.
- Sanity mutations use the HTTP API directly (`fetch` against `https://{projectId}.api.sanity.io/v2023-06-21/data/mutate/{dataset}`), authenticated with `SANITY_API_WRITE_TOKEN` from `.env.local`, exactly as used earlier in this project to delete stale drafts. These are **not** git commits — call this out explicitly in each such step.
- Production site URL: no custom domain is attached to this Vercel project (confirmed via `vercel domains ls` / `vercel project ls` — only `sojourne.co` and `brettyang.au` exist on the account, neither linked here). The project's own domain is `https://holsingerlab.vercel.app`. This is the default baked into `lib/site.ts`; if a custom domain is attached later, update `NEXT_PUBLIC_SITE_URL` in Vercel's project settings and `public/robots.txt`.
- Existing `VERCEL_ENV === 'production'` gating pattern (already used in `next.config.mjs`) is reused for the formspree origin check, for consistency with the rest of the codebase.
- Revalidate interval: `60` seconds everywhere — this matches the value already present (commented out) in every `getStaticProps` in the repo today.

---

## Task 1: Fix Tailwind content globs

**Files:**
- Modify: `tailwind.config.js:5-9`

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Reproduce the bug**

Build the site and confirm classes used only in `pages/` are missing from the compiled CSS:

```bash
npm run build
CSS=$(ls .next/static/css/*.css | head -1)
grep -c 'w-80' "$CSS"
grep -c 'max-w-md' "$CSS"
```

Expected: both `grep -c` calls print `0`. `w-80` and `max-w-md` are used in `pages/404.tsx`, which Tailwind never scans.

- [ ] **Step 2: Fix the content globs**

`tailwind.config.js` currently scans `./app/**`, `./components/**`, and `./intro-template/**` — the first and third directories don't exist in this repo, and `./pages/**` (which does exist and does contain Tailwind classes) is missing entirely.

```js
const { theme } = require('@sanity/demo/tailwind')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
```

(Only the `content` array changes — everything from `theme: {` onward stays exactly as it is.)

- [ ] **Step 3: Verify the fix**

```bash
npm run build
CSS=$(ls .next/static/css/*.css | head -1)
grep -c 'w-80' "$CSS"
grep -c 'max-w-md' "$CSS"
```

Expected: both now print a number `>= 1`.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js
git commit -m "fix: scan pages/ directory for Tailwind classes"
```

---

## Task 2: Un-invert Next.js build-error suppression

**Files:**
- Modify: `next.config.mjs:9-16`

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Confirm the current (inverted) behavior**

```bash
grep -A2 'ignoreBuildErrors\|ignoreDuringBuilds' next.config.mjs
```

Expected output shows both conditions as `process.env.VERCEL_ENV === 'production'` — meaning type and lint errors are ignored **in production** and enforced everywhere else. This is backwards: a broken production build should never ship.

- [ ] **Step 2: Fix it**

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
  eslint: {
    ignoreDuringBuilds: false,
  },
}

export default config
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && echo "TYPES OK"
npx next lint && echo "LINT OK"
npm run build
```

Expected: all three succeed. (They already pass today — this step confirms the config change didn't break anything, since the codebase currently has zero type/lint errors.)

- [ ] **Step 4: Commit**

```bash
git add next.config.mjs
git commit -m "fix: enforce type and lint checks in every build, not just non-production"
```

---

## Task 3: Restore the three gated sections

The `settings` singleton has `showPeople`, `showPublications`, and `showContactForm` all set to `false` in the live dataset, and each page's `getStaticProps` treats a falsy value as "hide this page." Behind these gates: 19 published profiles and 19 published publications, none reachable. Two independent fixes are both required — the guard fix alone does nothing today because the flags are literally `false`, not `undefined`.

**Files:**
- Modify: `pages/people/index.tsx:47`
- Modify: `pages/publications/index.tsx:25-27,39,62`
- Modify: `pages/contact/index.tsx:26`
- Modify: `schemas/singletons/settings.ts:36-55`
- Data: `settings` singleton in the live Sanity dataset

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Confirm the current broken state**

```bash
npm run build
find .next/server/pages -iname 'people.html' -o -iname 'publications.html' -o -iname 'contact.html'
```

Expected: no output. `next build` only emits static HTML for statically-generated pages that don't return `notFound: true`; none of these three do.

- [ ] **Step 2: Flip the three flags in the live dataset**

This is a data mutation against the Sanity Content Lake, not a code change — no git commit for this step.

```bash
node -e "
const fs=require('fs');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^\"|\"\$/g,'')]}));
const pid=env.NEXT_PUBLIC_SANITY_PROJECT_ID, ds=env.NEXT_PUBLIC_SANITY_DATASET, tok=env.SANITY_API_WRITE_TOKEN;
fetch('https://'+pid+'.api.sanity.io/v2023-06-21/data/mutate/'+ds+'?returnIds=true',{
  method:'POST',
  headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},
  body:JSON.stringify({mutations:[{
    patch:{
      query: '*[_type==\"settings\"]',
      set: { showPeople: true, showPublications: true, showContactForm: true }
    }
  }]})
}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d,null,2)));
"
```

Expected: a JSON response with a `transactionId` and one `results` entry with `\"operation\": \"update\"`.

- [ ] **Step 3: Verify the data change**

```bash
node -e "
const fs=require('fs');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^\"|\"\$/g,'')]}));
const pid=env.NEXT_PUBLIC_SANITY_PROJECT_ID, ds=env.NEXT_PUBLIC_SANITY_DATASET, tok=env.SANITY_API_READ_TOKEN;
fetch('https://'+pid+'.api.sanity.io/v2023-06-21/data/query/'+ds+'?query='+encodeURIComponent('*[_type==\"settings\"][0]{showPeople,showPublications,showContactForm}'),{headers:{Authorization:'Bearer '+tok}}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d.result)));
"
```

Expected: `{"showPeople":true,"showPublications":true,"showContactForm":true}`

- [ ] **Step 4: Fix the guards to fail open**

Currently every guard reads `if (!settings?.showX)`, which treats both `false` and `undefined` as "hide the page." Change each to only hide the page when the flag is explicitly `false`, so a singleton that's never had the field set (as happened here) defaults to visible.

`pages/people/index.tsx:47`:

```ts
  if (settings?.showPeople === false) {
    return {
      notFound: true,
    }
  }
```

`pages/publications/index.tsx:62`:

```ts
  if (settings?.showPublications === false) {
    return {
      notFound: true,
    }
  }
```

`pages/contact/index.tsx:26`:

```ts
  if (settings?.showContactForm === false) {
    return {
      notFound: true,
    }
  }
```

- [ ] **Step 5: Fix the adjacent Publications preview crash**

`pages/publications/index.tsx:22-27` currently returns `undefined` from the component when `preview` is true, which throws — this route would crash the moment an editor opens draft mode on the page this task is unblocking. It's in the same file, same function, as Step 4's fix. Remove the early return, and pass `preview` through to `Layout` (every other page in the codebase does this; `Publications.tsx` was just missing it):

Before:

```tsx
export default function PublicationsPage(props: PageProps) {
  const { homePageTitle, settings, preview, publications } = props

  if (preview) {
    return
  }

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
      <Layout settings={settings}>
        <Publications publications={publications} />
      </Layout>
    </>
  )
}
```

After:

```tsx
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
```

- [ ] **Step 6: Make the Studio state legible**

Add a plain-language warning to each toggle's description so an editor can't repeat this silently. `schemas/singletons/settings.ts:35-55`:

```ts
    defineField({
      name: 'showPublications',
      title: 'Enable Publications page',
      type: 'boolean',
      description:
        'Toggle to enable the Publications page in your site. Turning this OFF makes /publications return a 404 — the page disappears from the site entirely, it does not just hide from navigation.',
      initialValue: true,
    }),
    defineField({
      name: 'showPeople',
      title: 'Enable Team page',
      type: 'boolean',
      description:
        'Toggle to enable the Team page in your site. Turning this OFF makes /people return a 404 — the page disappears from the site entirely, it does not just hide from navigation.',
      initialValue: true,
    }),
    defineField({
      name: 'showContactForm',
      title: 'Enable Contact Us page',
      type: 'boolean',
      description:
        'Toggle to enable the Contact Us page in your site. Turning this OFF makes /contact return a 404 — the page disappears from the site entirely, it does not just hide from navigation.',
      initialValue: true,
    }),
```

- [ ] **Step 7: Verify everything together**

```bash
npm run build
find .next/server/pages -iname 'people.html' -o -iname 'publications.html' -o -iname 'contact.html'
npx tsc --noEmit
```

Expected: all three HTML files now listed; `tsc` reports no errors.

- [ ] **Step 8: Commit**

```bash
git add pages/people/index.tsx pages/publications/index.tsx pages/contact/index.tsx schemas/singletons/settings.ts
git commit -m "fix: restore People, Publications, and Contact pages

Guards treated unset and explicitly-false identically, hiding pages
whenever the settings singleton's boolean fields had never been
initialised. Live settings singleton flags flipped to true separately."
```

---

## Task 4: Add a site URL constant

Needed by Task 5 (canonical/OG URLs) and Task 11 (formspree origin check). No page in the codebase currently has an absolute-URL constant — everything that needs one today derives it client-side from `location.origin`, which doesn't exist during `getStaticProps`/SSG.

**Files:**
- Create: `lib/site.ts`
- Modify: `.env.local` (local dev only, not committed)
- Modify: `.env.local.example`

**Interfaces:**
- Consumes: nothing
- Produces: `siteUrl: string` (no trailing slash) from `lib/site.ts`, consumed by Task 5 and Task 11

- [ ] **Step 1: Create the constant**

```ts
// lib/site.ts
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://holsingerlab.vercel.app'
).replace(/\/$/, '')
```

- [ ] **Step 2: Document the env var**

Add to `.env.local.example` (after the existing `NEXT_PUBLIC_SANITY_PROJECT_TITLE` line):

```
# The canonical production URL. Used for canonical tags, Open Graph/Twitter
# URLs, the sitemap, and the contact form's same-origin check. Defaults to
# this project's Vercel domain if unset.
NEXT_PUBLIC_SITE_URL="https://holsingerlab.vercel.app"
```

- [ ] **Step 3: Set it in local `.env.local` so the next tasks' verification steps reflect real behavior**

Append the same line to `.env.local` (this file is gitignored — confirm with `git check-ignore .env.local` before editing, expect it to print the filename).

```bash
git check-ignore .env.local
echo 'NEXT_PUBLIC_SITE_URL="https://holsingerlab.vercel.app"' >> .env.local
```

- [ ] **Step 4: Verify**

```bash
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.NEXT_PUBLIC_SITE_URL)" 2>/dev/null || grep NEXT_PUBLIC_SITE_URL .env.local
```

Expected: prints `https://holsingerlab.vercel.app`.

- [ ] **Step 5: Commit**

`.env.local` is gitignored and must not be staged — only the two tracked files:

```bash
git add lib/site.ts .env.local.example
git commit -m "feat: add siteUrl constant for absolute-URL generation"
```

---

## Task 5: SEO baseline — Open Graph, Twitter Card, canonical URL

**Files:**
- Modify: `components/global/SiteMeta.tsx`
- Modify: `pages/404.tsx:15-22`

**Interfaces:**
- Consumes: `siteUrl` from `lib/site.ts` (Task 4)
- Produces: a `noindex?: boolean` prop on `SiteMeta`, used by this task's own Step 3

- [ ] **Step 1: Confirm the current gap**

```bash
npm run build
grep -oE '<meta property="og:[^"]*"' .next/server/pages/index.html
grep -oE '<link rel="canonical"' .next/server/pages/index.html
```

Expected: no output from either command. The homepage currently emits zero Open Graph tags and no canonical link.

- [ ] **Step 2: Rewrite `SiteMeta.tsx`**

```tsx
import * as demo from 'lib/demo.data'
import { urlForImage } from 'lib/sanity.image'
import { siteUrl } from 'lib/site'
import Head from 'next/head'
import { useRouter } from 'next/router'
import type { Image } from 'sanity'

/**
 * All the shared stuff that goes into <head> on `(personal)` routes, can be be imported by `head.tsx` files in the /app dir or wrapped in a <Head> component in the /pages dir.
 */
export function SiteMeta({
  baseTitle,
  description,
  image,
  title,
  noindex = false,
}: {
  baseTitle?: string
  description?: string
  image?: Image
  title?: string
  noindex?: boolean
}) {
  const router = useRouter()
  const metaTitle = [
    ...(title ? [title] : []),
    ...(baseTitle ? [baseTitle] : []),
  ].join(' | ')
  const resolvedTitle = metaTitle || demo.title

  const imageUrl =
    image && urlForImage(image)?.width(1200).height(627).fit('crop').url()

  const canonicalUrl = `${siteUrl}${router.asPath.split('?')[0]}`

  return (
    <Head>
      <title>{resolvedTitle}</title>
      <meta name="viewport" content="width=device-width,initial-scale=1.0" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/favicon/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon/favicon-16x16.png"
      />
      <link rel="manifest" href="/favicon/site.webmanifest" />
      <link rel="shortcut icon" href="/favicon/favicon.ico" />
      <meta name="msapplication-TileColor" content="#000000" />
      <meta name="msapplication-config" content="/favicon/browserconfig.xml" />
      <meta name="theme-color" content="#F8F8F8" />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex" />}
      {description && (
        <meta key="description" name="description" content={description} />
      )}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={demo.title} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:url" content={canonicalUrl} />
      {description && (
        <meta property="og:description" content={description} />
      )}
      {imageUrl && <meta property="og:image" content={imageUrl} />}

      {/* Twitter */}
      <meta
        name="twitter:card"
        content={imageUrl ? 'summary_large_image' : 'summary'}
      />
      <meta name="twitter:title" content={resolvedTitle} />
      {description && (
        <meta name="twitter:description" content={description} />
      )}
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
    </Head>
  )
}
```

- [ ] **Step 3: Mark the 404 page as noindex**

`pages/404.tsx:15-22` — add the `noindex` prop:

```tsx
      <SiteMeta
        baseTitle={homePageTitle}
        description={
          'The page you are looking for cannot be found. It may have been moved, deleted, or the URL might be misspelled. Please check the URL or return to our homepage to explore more of our content and services.'
        }
        image={settings?.ogImage}
        title={'Page Not Found'}
        noindex
      />
```

- [ ] **Step 4: Verify**

```bash
npm run build
grep -oE '<meta property="og:[a-z_]*" content="[^"]*"' .next/server/pages/index.html
grep -oE '<link rel="canonical" href="[^"]*"' .next/server/pages/index.html
grep -oE '<meta name="robots" content="noindex"' .next/server/pages/404.html
```

Expected: the first command lists `og:type`, `og:site_name`, `og:title`, `og:url`, `og:description` (no `og:image` — `settings.ogImage` is currently unset in the dataset, which is correctly conditional); the second shows `https://holsingerlab.vercel.app/`; the third matches on the 404 page only.

- [ ] **Step 5: Commit**

```bash
git add components/global/SiteMeta.tsx pages/404.tsx
git commit -m "feat: emit Open Graph, Twitter Card, and canonical tags"
```

---

## Task 6: Fix heading hierarchy

The homepage's only `<h1>` reads "Our Research Projects"; the actual page title (the lab name) renders as a `<div>`. Page and Project routes have the same underlying component (`Header`) and currently emit **zero** `<h1>` at all.

**Files:**
- Modify: `components/shared/Header.tsx:19-24`
- Modify: `components/pages/home/HomePage.tsx:38-40`

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Confirm the current state**

```bash
npm run build
grep -oE '<h1[^>]*>[^<]*' .next/server/pages/index.html
grep -c '<h1' ".next/server/pages/lab-alumni.html"
```

Expected: the first command prints `Our Research Projects`; the second prints `0` — the page route has no `<h1>` at all today.

- [ ] **Step 2: Make `Header`'s title a real `<h1>`**

`components/shared/Header.tsx:19-24`:

```tsx
      {/* Title */}
      {title && (
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight md:text-5xl">
          {title}
        </h1>
      )}
```

- [ ] **Step 3: Demote "Our Research Projects" to `<h2>`**

`components/pages/home/HomePage.tsx:38-40` — this text is a section heading under the page's real `<h1>` (the lab name, rendered by `Header` above it), not the page title itself:

```tsx
          <h2 className="text-center text-xl font-[600] md:text-left md:text-2xl">
            Our Research Projects
          </h2>
```

- [ ] **Step 4: Verify**

```bash
npm run build
grep -c '<h1' .next/server/pages/index.html
grep -oE '<h1[^>]*>[^<]*' .next/server/pages/index.html
grep -c '<h1' ".next/server/pages/lab-alumni.html"
```

Expected: home page has exactly one `<h1>`, containing the lab name (not "Our Research Projects"); `lab-alumni.html` (a Page route) now has exactly one `<h1>` too, where it had zero before.

- [ ] **Step 5: Commit**

```bash
git add components/shared/Header.tsx components/pages/home/HomePage.tsx
git commit -m "fix: correct heading hierarchy — page title is h1, not a div"
```

---

## Task 7: robots.txt and sitemap.xml

**Files:**
- Create: `public/robots.txt`
- Create: `pages/sitemap.xml.tsx`

**Interfaces:**
- Consumes: `siteUrl` from `lib/site.ts` (Task 4); `getAllPaths` already exported from `pages/api/revalidate.ts`
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Confirm neither exists today**

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/robots.txt
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/sitemap.xml
```

(Run `npm run dev` in another terminal first if nothing is running.) Expected: both print `404`.

- [ ] **Step 2: Add `robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://holsingerlab.vercel.app/sitemap.xml
```

- [ ] **Step 3: Add the sitemap route, reusing the existing path-collection logic**

`pages/api/revalidate.ts` already exports `getAllPaths`, which returns every static route plus every published page and project slug. Reuse it rather than re-querying Sanity a second way.

```tsx
// pages/sitemap.xml.tsx
import type { GetServerSideProps } from 'next'

import { siteUrl } from 'lib/site'

import { getAllPaths } from './api/revalidate'

function generateSitemapXml(paths: (string | undefined)[]): string {
  const urls = paths
    .filter((path): path is string => Boolean(path))
    .map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const paths = await getAllPaths()
  const xml = generateSitemapXml(paths)

  res.setHeader('Content-Type', 'application/xml')
  res.write(xml)
  res.end()

  return { props: {} }
}

export default function SitemapXml() {
  return null
}
```

- [ ] **Step 4: Verify**

```bash
npm run build && npm run start &
sleep 3
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/robots.txt
curl -s http://localhost:3000/sitemap.xml | head -5
curl -s http://localhost:3000/sitemap.xml | grep -c '<url>'
kill %1
```

Expected: `robots.txt` returns `200`; the sitemap starts with a valid `<?xml ...?>` declaration; the `<url>` count is at least 10 (4 static routes + published pages + published projects as of this writing).

- [ ] **Step 5: Commit**

```bash
git add public/robots.txt pages/sitemap.xml.tsx
git commit -m "feat: add robots.txt and a generated sitemap.xml"
```

---

## Task 8: Re-enable ISR

Every `getStaticProps` in the repo has `revalidate` commented out, and both dynamic routes use `fallback: false`. Together this means a newly published Sanity document is unreachable until the next full redeploy.

**Files:**
- Modify: `pages/index.tsx:52`
- Modify: `pages/[slug].tsx:69,79`
- Modify: `pages/projects/[slug].tsx:75,85`
- Modify: `pages/people/index.tsx:59`
- Modify: `pages/publications/index.tsx:76`
- Modify: `pages/contact/index.tsx:37`

**Interfaces:**
- Consumes: nothing
- Produces: `fallback: 'blocking'` behavior on `pages/[slug].tsx` and `pages/projects/[slug].tsx`, required by Task 10's legacy-slug redirects (a path not present in `getStaticPaths`'s list only invokes `getStaticProps` at request time when fallback is `'blocking'` or `true` — not when it's `false`).

- [ ] **Step 1: Confirm the current behavior**

```bash
grep -n 'revalidate: 60' pages/index.tsx pages/\[slug\].tsx pages/projects/\[slug\].tsx pages/people/index.tsx pages/publications/index.tsx pages/contact/index.tsx
grep -n "fallback: false" "pages/[slug].tsx" "pages/projects/[slug].tsx"
```

Expected: no matches for the first `grep` (all commented out); two matches for the second.

- [ ] **Step 2: Uncomment `revalidate` in all six routes**

In each of the six files, change:

```ts
    // revalidate: 60,
```

to:

```ts
    revalidate: 60,
```

(This is the only change in `pages/index.tsx`, `pages/people/index.tsx`, `pages/publications/index.tsx`, and `pages/contact/index.tsx`.)

- [ ] **Step 3: Switch both dynamic routes to blocking fallback**

`pages/[slug].tsx:73-81`:

```ts
export const getStaticPaths = async () => {
  const client = getClient()
  const paths = await client.fetch<string[]>(pagePaths)

  return {
    paths: paths?.map((slug) => resolveHref('page', slug)) || [],
    fallback: 'blocking',
  }
}
```

`pages/projects/[slug].tsx:79-87`:

```ts
export const getStaticPaths = async () => {
  const client = getClient()
  const paths = await client.fetch<string[]>(projectPaths)

  return {
    paths: paths?.map((slug) => resolveHref('project', slug)) || [],
    fallback: 'blocking',
  }
}
```

- [ ] **Step 4: Verify**

```bash
npm run build
grep -n 'revalidate: 60,' pages/index.tsx pages/\[slug\].tsx pages/projects/\[slug\].tsx pages/people/index.tsx pages/publications/index.tsx pages/contact/index.tsx
grep -n "fallback: 'blocking'" "pages/[slug].tsx" "pages/projects/[slug].tsx"
```

Expected: `revalidate: 60,` (uncommented) in all six files; `fallback: 'blocking'` in both dynamic routes. Build succeeds — `fallback: 'blocking'` requires no component changes (unlike `fallback: true`, it never renders a loading state; the router waits server-side).

- [ ] **Step 5: Commit**

```bash
git add pages/index.tsx "pages/[slug].tsx" "pages/projects/[slug].tsx" pages/people/index.tsx pages/publications/index.tsx pages/contact/index.tsx
git commit -m "fix: re-enable ISR and blocking fallback so new content is reachable without a redeploy"
```

---

## Task 9: Slug format validation in the schema

Three live slugs currently contain spaces and uppercase letters (`/Miscellaneous`, `/projects/MAESTRO`, `/projects/Publication highlights`) because the slug field enforces no format, only a `source: 'title'` suggestion an editor can freely override. This task fixes the schema (prevents recurrence); Task 10 fixes the three existing bad slugs (the data) and adds redirects.

**Files:**
- Create: `schemas/lib/slug.ts`
- Modify: `schemas/documents/page.ts:16-37,184-186`
- Modify: `schemas/documents/project.ts:19-29`

**Interfaces:**
- Consumes: nothing
- Produces: `slugify(input: string): string` and `validateSlugFormat(slug: { current?: string } | undefined): true | string`, consumed by `page.ts` and `project.ts` in this same task

- [ ] **Step 1: Confirm the current gap**

```bash
node -e "
const fs=require('fs');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^\"|\"\$/g,'')]}));
const pid=env.NEXT_PUBLIC_SANITY_PROJECT_ID, ds=env.NEXT_PUBLIC_SANITY_DATASET, tok=env.SANITY_API_READ_TOKEN;
fetch('https://'+pid+'.api.sanity.io/v2023-06-21/data/query/'+ds+'?query='+encodeURIComponent('*[defined(slug.current) && slug.current match \"* *\"]{_type,\"s\":slug.current}'),{headers:{Authorization:'Bearer '+tok}}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d.result)));
"
```

Expected: at least the three known offenders are listed (page "Miscellaneous", project "MAESTRO", project "Publication highlights" — note "MAESTRO" itself doesn't contain a space, so it won't appear in this particular query since it's matching on capitals separately — see Step 2 for the full check).

```bash
node -e "
const fs=require('fs');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^\"|\"\$/g,'')]}));
const pid=env.NEXT_PUBLIC_SANITY_PROJECT_ID, ds=env.NEXT_PUBLIC_SANITY_DATASET, tok=env.SANITY_API_READ_TOKEN;
fetch('https://'+pid+'.api.sanity.io/v2023-06-21/data/query/'+ds+'?query='+encodeURIComponent('*[defined(slug.current) && (slug.current match \"* *\" || slug.current != lower(slug.current))]{_type,\"s\":slug.current}'),{headers:{Authorization:'Bearer '+tok}}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d.result)));
"
```

Expected: all three offenders listed together.

- [ ] **Step 2: Create the shared slug helper**

```ts
// schemas/lib/slug.ts
const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

export function validateSlugFormat(
  slug: { current?: string } | undefined
): true | string {
  if (!slug?.current) return true
  if (!SLUG_FORMAT.test(slug.current)) {
    return 'Slug must contain only lowercase letters, numbers, and hyphens (e.g. "my-page-title"). No spaces or capital letters.'
  }
  return true
}
```

- [ ] **Step 3: Wire it into `page.ts`, and delete the dead `slugify()`**

`schemas/documents/page.ts:1-2` — add the import:

```ts
import { DocumentIcon, ImageIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { slugify, validateSlugFormat } from 'schemas/lib/slug'
```

`schemas/documents/page.ts:16-37` — add `slugify` to `options` and chain the new validator:

```ts
    defineField({
      type: 'slug',
      name: 'slug',
      title: 'Slug',
      options: {
        source: 'title',
        slugify,
      },
      validation: (Rule) =>
        Rule.required()
          .custom((slug) => {
            if (typeof slug === 'undefined') return true

            if (
              slug.current !== 'publications' &&
              slug.current !== 'people' &&
              slug.current !== 'contact'
            ) {
              return true
            } else {
              return `Slug '${slug.current}' is not available` // Error message goes here
            }
          })
          .custom(validateSlugFormat),
    }),
```

`schemas/documents/page.ts:184-186` (end of file) — delete the dead function entirely. It only ever throws, and its name would now collide with the imported `slugify`:

```ts
function slugify(arg0: any) {
  throw new Error('Function not implemented.')
}
```

Delete that block.

- [ ] **Step 4: Wire it into `project.ts`**

`schemas/documents/project.ts:1-2` — add the import:

```ts
import { DocumentIcon, ImageIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { slugify, validateSlugFormat } from 'schemas/lib/slug'
```

`schemas/documents/project.ts:19-29`:

```ts
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
        slugify,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required().custom(validateSlugFormat),
    }),
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npm run build
```

Expected: both succeed with no errors (this only affects the Studio schema, not the Next.js site's own build output, but `tsc` type-checks the whole repo including `schemas/`).

- [ ] **Step 6: Commit**

```bash
git add schemas/lib/slug.ts schemas/documents/page.ts schemas/documents/project.ts
git commit -m "feat: enforce kebab-case slugs in the Studio schema

Also removes a dead slugify() stub in page.ts that only threw
'Function not implemented' — its name would have collided with the
real slugify import."
```

---

## Task 10: Fix the three live bad slugs and add legacy redirects

**Depends on Task 8** — the redirect mechanism below relies on `fallback: 'blocking'`, which makes Next.js invoke `getStaticProps` for a path that isn't in the static paths list. With `fallback: false` (the pre-Task-8 behavior), Next never calls the page function for an unlisted path at all, so there would be nothing to redirect from.

**Files:**
- Data: `page` and `project` documents in the live Sanity dataset
- Modify: `pages/[slug].tsx:43-53`
- Modify: `pages/projects/[slug].tsx:49-59`

**Interfaces:**
- Consumes: `fallback: 'blocking'` behavior from Task 8
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Rename the three slugs in the live dataset**

Not a code change — no git commit for this step. References elsewhere in the dataset (menu items, internal links) point at documents by `_id`, not by slug, so this rename is safe and requires no other data fixes.

```bash
node -e "
const fs=require('fs');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^\"|\"\$/g,'')]}));
const pid=env.NEXT_PUBLIC_SANITY_PROJECT_ID, ds=env.NEXT_PUBLIC_SANITY_DATASET, tok=env.SANITY_API_WRITE_TOKEN;
fetch('https://'+pid+'.api.sanity.io/v2023-06-21/data/mutate/'+ds+'?returnIds=true',{
  method:'POST',
  headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},
  body:JSON.stringify({mutations:[
    { patch: { query: '*[_type==\"page\" && slug.current==\"Miscellaneous\"]', set: { 'slug.current': 'miscellaneous' } } },
    { patch: { query: '*[_type==\"project\" && slug.current==\"MAESTRO\"]', set: { 'slug.current': 'maestro' } } },
    { patch: { query: '*[_type==\"project\" && slug.current==\"Publication highlights\"]', set: { 'slug.current': 'publication-highlights' } } }
  ]})
}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d,null,2)));
"
```

Expected: three `results` entries, each `\"operation\": \"update\"`.

- [ ] **Step 2: Verify the rename**

```bash
node -e "
const fs=require('fs');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^\"|\"\$/g,'')]}));
const pid=env.NEXT_PUBLIC_SANITY_PROJECT_ID, ds=env.NEXT_PUBLIC_SANITY_DATASET, tok=env.SANITY_API_READ_TOKEN;
fetch('https://'+pid+'.api.sanity.io/v2023-06-21/data/query/'+ds+'?query='+encodeURIComponent('{\"oldCount\":count(*[slug.current in [\"Miscellaneous\",\"MAESTRO\",\"Publication highlights\"]]),\"newSlugs\":*[slug.current in [\"miscellaneous\",\"maestro\",\"publication-highlights\"]]{_type,\"s\":slug.current}}'),{headers:{Authorization:'Bearer '+tok}}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d.result,null,1)));
"
```

Expected: `oldCount: 0`; `newSlugs` lists all three new values.

- [ ] **Step 3: Add a legacy-slug redirect map to the Page route**

`pages/[slug].tsx:43-53` — insert the redirect check as the first thing `getStaticProps` does:

```ts
const legacyPageSlugs: Record<string, string> = {
  Miscellaneous: 'miscellaneous',
}

export const getStaticProps: GetStaticProps<PageProps, Query> = async (ctx) => {
  const { draftMode = false, params = {} } = ctx
  const requestedSlug = params.slug as string | undefined

  if (requestedSlug && legacyPageSlugs[requestedSlug]) {
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
    }
  }

  return {
    props: {
      page,
      settings: settings ?? {},
      homePageTitle: homePageTitle ?? undefined,
      preview: draftMode,
      token: draftMode ? readToken : null,
    },
    revalidate: 60,
  }
}
```

- [ ] **Step 4: Add the same to the Project route**

`pages/projects/[slug].tsx:49-59`:

```ts
const legacyProjectSlugs: Record<string, string> = {
  MAESTRO: 'maestro',
  'Publication highlights': 'publication-highlights',
}

export const getStaticProps: GetStaticProps<PageProps, Query> = async (ctx) => {
  const { draftMode = false, params = {} } = ctx
  const requestedSlug = params.slug as string | undefined

  if (requestedSlug && legacyProjectSlugs[requestedSlug]) {
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
    }
  }

  return {
    props: {
      project,
      settings: settings ?? {},
      homePageTitle: homePageTitle ?? undefined,
      preview: draftMode,
      token: draftMode ? readToken : null,
    },
    revalidate: 60,
  }
}
```

- [ ] **Step 5: Verify against a running production server**

```bash
npm run build && npm run start &
sleep 3
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/Miscellaneous
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/projects/MAESTRO
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "http://localhost:3000/projects/Publication%20highlights"
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/miscellaneous
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/projects/maestro
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/projects/publication-highlights
kill %1
```

Expected: the first three each print `308` with a `Location` resolving to the new slug; the last three each print `200`.

- [ ] **Step 6: Commit**

```bash
git add "pages/[slug].tsx" "pages/projects/[slug].tsx"
git commit -m "fix: redirect the three legacy slugs with spaces/capitals to their kebab-case replacements"
```

---

## Task 11: Harden `/api/formspree`

Today this endpoint has no auth, no rate limit, no origin check, and no spam filtering — it forwards any POST body from anyone to the lab's Formspree account.

**Files:**
- Modify: `pages/api/formspree.ts`
- Modify: `components/pages/contact/ContactForm.tsx:13-30,53-67,106-108`

**Interfaces:**
- Consumes: `siteUrl` from `lib/site.ts` (Task 4)
- Produces: nothing consumed by other tasks

- [ ] **Step 1: Confirm the current exposure**

```bash
curl -s -X POST http://localhost:3000/api/formspree \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://evil.example.com' \
  -d '{"name":"x","email":"x@x.com","message":"spam"}' \
  -o /dev/null -w '%{http_code}\n'
```

(Requires `npm run dev` running in another terminal, and a real `FORMSPREE_ENDPOINT` in `.env.local` — if none is set, this will 500 on the outbound Formspree call, but the point is it doesn't get rejected for having a hostile Origin, which is the actual gap.) Expected today: `200` regardless of origin.

- [ ] **Step 2: Add a honeypot field to the contact form**

`components/pages/contact/ContactForm.tsx:13-17` — add `_gotcha` to the shape:

```ts
interface Inputs {
  name: string
  email: string
  message: string
  _gotcha: string
}
```

`components/pages/contact/ContactForm.tsx:26-30` — initial state:

```ts
  const [inputs, setInputs] = useState<Inputs>({
    name: '',
    email: '',
    message: '',
    _gotcha: '',
  })
```

`components/pages/contact/ContactForm.tsx:40-44` — reset-on-success:

```ts
      setInputs({
        name: '',
        email: '',
        message: '',
        _gotcha: '',
      })
```

`components/pages/contact/ContactForm.tsx:106-108` — add the hidden field as the first child of the `<form>`, right after the opening tag:

```tsx
          <form
            onSubmit={handleOnSubmit}
            className="flex w-full max-w-xl flex-col space-y-4 md:w-3/4"
          >
            <input
              type="text"
              name="_gotcha"
              id="_gotcha"
              tabIndex={-1}
              autoComplete="off"
              value={inputs._gotcha}
              onChange={handleOnChange}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '-9999px',
                width: '1px',
                height: '1px',
                opacity: 0,
              }}
            />
```

- [ ] **Step 3: Rewrite the API route**

The existing handler uses `axios`, which carries known CSRF/SSRF advisories (`npm audit`) for exactly the kind of server-side outbound POST this file makes. Since every line of this function is being touched to add the security checks below anyway, switch this one call to Node's built-in `fetch` (available globally since Node 18; this repo runs Node 22) rather than leaving a flagged dependency in the one file most exposed to abuse. This is the only `axios` usage removed in this phase — `ContactForm.tsx`'s client-side call is unaffected; the general dependency cleanup is Phase 1's job.

```ts
import { NextApiRequest, NextApiResponse } from 'next'

import { siteUrl } from 'lib/site'

const endpoint = process.env.FORMSPREE_ENDPOINT

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 5

const requestLog = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress || 'unknown'
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

function isTrustedOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin
  if (!origin) return true // same-origin form posts and non-browser tools may omit Origin
  if (process.env.VERCEL_ENV !== 'production') return true // don't block preview/dev deployments
  const trusted = [siteUrl, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`].filter(
    Boolean
  )
  return trusted.includes(origin)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' })
  }

  if (!isTrustedOrigin(req)) {
    return res.status(403).json({ success: false, message: 'Forbidden.' })
  }

  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Too many submissions. Please try again later.',
    })
  }

  // Honeypot: bots fill every field, real visitors never see this one.
  if (req.body?._gotcha) {
    return res.status(200).json({ success: true, message: 'Thank you.' })
  }

  try {
    const response = await fetch(`https://formspree.io/f/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error('Formspree request failed')
    }
    res.status(200).json({ success: true, message: data })
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        'Sorry, there was an issue with submitting your message. Please try again later.',
    })
  }
}
```

- [ ] **Step 4: Document `FORMSPREE_ENDPOINT`**

It's read by `pages/api/formspree.ts` but was never listed in `.env.local.example`. Add it:

```
# Formspree form ID (the part after https://formspree.io/f/ in your form's endpoint)
FORMSPREE_ENDPOINT=
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npm run dev &
sleep 3
# Honeypot: filled -> silently accepted, never reaches Formspree
curl -s -X POST http://localhost:3000/api/formspree \
  -H 'Content-Type: application/json' \
  -d '{"name":"x","email":"x@x.com","message":"spam","_gotcha":"filled"}' \
  -w '\n%{http_code}\n'
# Rate limit: 6th request in the window is rejected
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -X POST http://localhost:3000/api/formspree \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"x$i\",\"email\":\"x@x.com\",\"message\":\"test\",\"_gotcha\":\"\"}" \
    -w "request $i: %{http_code}\n"
done
kill %1
```

Expected: the honeypot request returns `200` with `{"success":true,...}` immediately (no Formspree round-trip); of the six rate-limit requests, the first five return whatever the real Formspree call returns (`200` or `500` depending on whether `FORMSPREE_ENDPOINT` is configured), and the sixth returns `429`.

- [ ] **Step 6: Commit**

```bash
git add pages/api/formspree.ts components/pages/contact/ContactForm.tsx .env.local.example
git commit -m "fix: harden /api/formspree with a honeypot, rate limit, and origin check

Also switches this handler from axios to native fetch — axios carries
CSRF/SSRF advisories directly relevant to a server-side outbound POST,
and every line of this function was already being touched."
```

---

## Phase 0 exit criteria (from the spec)

After all eleven tasks:

```bash
npm run build
find .next/server/pages -iname 'people.html' -o -iname 'publications.html' -o -iname 'contact.html'  # 3 files
CSS=$(ls .next/static/css/*.css | head -1); grep -c 'w-80' "$CSS"                                      # >= 1
grep -oE '<meta property="og:[a-z_]*"' .next/server/pages/index.html | sort -u                          # 5 distinct og: tags
npx tsc --noEmit && npx next lint                                                                       # both clean
```

Then, separately, publish a trivial test edit in Sanity Studio (e.g. append a character to the home page overview) and confirm it appears on the live site within ~60 seconds without a redeploy — this is the actual behavioral proof that ISR (Task 8) works, and can't be verified by a local build alone.
