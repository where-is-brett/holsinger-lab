# Phase 1A — Groundwork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up and strict-type the codebase on the *current* Next 13 / React 18 / Sanity 3 stack — remove 17 dependencies, extract two data-flow helpers out of route files, narrow a wide-open GROQ query, and get to `strict: true` with zero implicit-`any` — so that Phase 1B's App Router migration starts from a smaller, fully-typed codebase instead of carrying this cleanup into a much larger diff.

**Architecture:** Thirteen tasks, each independently buildable and independently committable. Twelve are code-only and touch disjoint files; the last folds together everything that has to happen atomically with the `strict: true` flip (adding `@types/styled-components`, removing the now-unused packages, and the flag itself) because all of it lands in the same `package.json`/`tsconfig.json` pair. Every other task deliberately avoids touching `package.json` so no two tasks can race on the same lockfile.

**Tech Stack:** Next.js 13.4.9 (Pages Router), TypeScript, Sanity v3, Tailwind CSS 3 — unchanged from `main`. This plan makes zero dependency *upgrades*; Phase 1B changes versions.

## Global Constraints

- **No dependency upgrades.** Only removals (Task 11) and one type-only addition (`@types/styled-components`, also Task 11). Every version in `package.json` stays exactly as it is on `main` except for what Task 11 deletes.
- **No test framework exists.** Every task's verification step is a concrete, reproducible command — `npx tsc --noEmit`, `npm run lint`, `npm run build` — matching the methodology in `docs/superpowers/specs/2026-08-07-site-modernisation-design.md` Appendix A and Phase 0's plan.
- **Every task must leave `tsc --noEmit`, `npm run lint`, and `npm run build` green.** Tasks 1–10 make changes that are valid under both `strict: false` (today) and `strict: true` (after Task 11) — they are pure type-tightening or refactors, not behavior changes, so they compile cleanly before Task 11 lands and continue to satisfy Task 11's stricter check afterward.
- **File exclusivity.** No two tasks touch the same file, with one deliberate exception: Task 11 touches both `package.json` and `tsconfig.json` together, because the `strict: true` flip and the dependency changes it requires must land in the same commit (removing `@mui/material` etc. before their last usages are gone would break the build; adding `strict: true` before `@types/styled-components` is installed reintroduces the exact error this plan fixes).
- **Task 11 has a hard dependency on Tasks 1, 2, 5, 6, 7, 8, and 9.** `strict: true` fails immediately if any of those component/schema typing fixes are missing. Tasks 3, 4, 10, 12, and 13 are unrelated to strict-mode fallout and can land in any order, including in parallel with everything else.
- Build verification commands in this plan set `NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production` — both public values already in the client bundle (see `.github/workflows/ci.yml`), not secrets.

---

## Task 1: Replace MUI icons with inline SVG, and type `Profile.tsx` / `People.tsx`

**Files:**
- Modify: `components/pages/people/Profile.tsx`
- Modify: `components/pages/people/People.tsx`

**Interfaces:**
- Consumes: `ProfilePayload`, `SettingsPayload` from `types/index.ts` (unchanged)
- Produces: `Profile` now takes `{ profile: ProfilePayload }`; `People` now takes `{ homePageTitle?: string; settings?: SettingsPayload; profiles: ProfilePayload[] }`. Task 11's `strict: true` flip depends on both being typed.

- [ ] **Step 1: Confirm current implicit-`any` state**

```bash
npx tsc --noEmit --strict 2>&1 | grep -E "Profile.tsx|People.tsx"
```

Expected: one `TS7031` "implicitly has an 'any' type" error on `Profile.tsx`'s `profile` binding and three on `People.tsx`'s `homePageTitle`/`settings`/`profiles` bindings. (`--strict` here is a one-off CLI flag for this check only — it does not persist to `tsconfig.json`, which Task 11 changes for real.)

- [ ] **Step 2: Replace the two MUI icons in `Profile.tsx` with inline SVG, and type its prop**

`components/pages/people/Profile.tsx` currently imports `CallIcon` and `MailOutlineIcon` from `@mui/icons-material` — the only two MUI icon usages anywhere in the codebase. Replace the two imports and the untyped destructured prop:

```tsx
import { Transition } from '@headlessui/react'
import { AddIcon } from '@sanity/icons'
import ImageBox from 'components/shared/ImageBox'
import { useState } from 'react'
import type { ProfilePayload } from 'types'

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.3 0 .7-.2 1L6.6 10.8Z" />
    </svg>
  )
}

const Profile = ({ profile }: { profile: ProfilePayload }) => {
```

This replaces the file's first ten lines (down through the old `const Profile = ({ profile }) => {`). Leave everything from `const [showBio, setShowBio] = useState(false)` onward untouched, except the two render sites:

```tsx
            <MailIcon />
```

replaces `<MailOutlineIcon />`, and:

```tsx
            <PhoneIcon />
```

replaces `<CallIcon />`. No other lines in the file change.

- [ ] **Step 3: Type `People.tsx`'s props**

In `components/pages/people/People.tsx`, change:

```tsx
import { SiteMeta } from 'components/global/SiteMeta'
import Layout from 'components/shared/Layout'
import { ProfilePayload } from 'types'

import Profile from './Profile'

export default function People({ homePageTitle, settings, profiles }) {
```

to:

```tsx
import { SiteMeta } from 'components/global/SiteMeta'
import Layout from 'components/shared/Layout'
import { ProfilePayload, SettingsPayload } from 'types'

import Profile from './Profile'

export default function People({
  homePageTitle,
  settings,
  profiles,
}: {
  homePageTitle?: string
  settings?: SettingsPayload
  profiles: ProfilePayload[]
}) {
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && echo "TYPES OK"
npm run lint
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

Expected: all three succeed. The `/people` route's bundle size drops noticeably in the build output (MUI + Emotion's runtime overhead leaves the page bundle even though the packages aren't removed from `package.json` until Task 11 — tree-shaking drops the now-unused MUI icon imports).

- [ ] **Step 5: Commit**

```bash
git add components/pages/people/Profile.tsx components/pages/people/People.tsx
git commit -m "fix: replace MUI icons with inline SVG and type Profile/People props"
```

---

## Task 2: Replace `axios` with `fetch` in `ContactForm.tsx`

**Files:**
- Modify: `components/pages/contact/ContactForm.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed by other tasks. Removes the codebase's only client-side `axios` usage (Phase 0 already converted the server-side `pages/api/formspree.ts` usage).

- [ ] **Step 1: Confirm this is the only remaining `axios` usage**

```bash
grep -rn "from 'axios'" --include='*.ts' --include='*.tsx' components pages lib
```

Expected: exactly one match, `components/pages/contact/ContactForm.tsx`.

- [ ] **Step 2: Replace the import and the POST call**

Remove the `axios` import:

```tsx
import React, { ChangeEvent, FormEvent, useState } from 'react'
```

(was `import axios from 'axios'` followed by this line — delete the `axios` line only).

Replace the try block's POST call:

```tsx
    try {
      // Make the POST request to the API route
      const response = await fetch('/api/formspree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      })
      if (!response.ok) {
        throw new Error('Formspree request failed')
      }
      handleServerResponse(
        true,
        'Thank you for reaching out to us! Your message has been successfully submitted.'
      )
    } catch (error) {
      handleServerResponse(
        false,
        'Sorry, there was an issue with submitting your message. Please try again later.'
      )
    }
```

`axios.post` throws automatically on a non-2xx response; `fetch` does not, so the explicit `if (!response.ok) throw` preserves the original error-handling behavior — a failed submission still falls into the `catch` block and shows the error dialog.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && echo "TYPES OK"
npm run lint
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

Expected: all three succeed.

- [ ] **Step 4: Manual check against a running server**

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
npm run start &
sleep 2
curl -s -X POST http://localhost:3000/api/formspree \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Test message"}' \
  -o /dev/null -w "%{http_code}\n"
kill %1
```

Expected: an HTTP status is returned (`400`/`403`/`500` are all fine here — `FORMSPREE_ENDPOINT` isn't set locally so a real submission will fail server-side; the point is that the route handler runs and returns JSON, confirming `ContactForm`'s new `fetch` call reaches it with the right method/headers/body shape). What this step is checking is that the request reaches the handler at all, not that a message is delivered.

- [ ] **Step 5: Commit**

```bash
git add components/pages/contact/ContactForm.tsx
git commit -m "fix: replace axios with fetch in ContactForm"
```

---

## Task 3: Move `getAllPaths` out of the revalidate API route

**Files:**
- Create: `lib/paths.ts`
- Modify: `pages/api/revalidate.ts`
- Modify: `pages/sitemap.xml.tsx`

**Interfaces:**
- Consumes: `getClient` from `lib/sanity.client`, `resolveHref` from `lib/sanity.links`, `pagePaths`/`projectPaths` from `lib/sanity.queries` (all unchanged)
- Produces: `getAllPaths` is now exported from `lib/paths.ts`. Phase 1B moves both `pages/api/revalidate.ts` and `pages/sitemap.xml.tsx` to `app/`; this task means neither side has to import from the other's new location when that migration happens.

Today `pages/sitemap.xml.tsx` imports `getAllPaths` from `./api/revalidate` — a page importing from an API route. This task extracts the shared function to a plain `lib/` module so both call sites import from the same neutral place.

- [ ] **Step 1: Confirm the current cross-import**

```bash
grep -n "getAllPaths" pages/sitemap.xml.tsx pages/api/revalidate.ts
```

Expected: `pages/sitemap.xml.tsx` imports it from `./api/revalidate`; `pages/api/revalidate.ts` defines and exports it.

- [ ] **Step 2: Create `lib/paths.ts`**

```ts
import { getClient } from 'lib/sanity.client'
import { resolveHref } from 'lib/sanity.links'
import { pagePaths, projectPaths } from 'lib/sanity.queries'

export const getAllPaths = async (
  staticPaths: string[] = ['/', '/publications', '/contact', '/people']
) => {
  const client = getClient()
  const pages = await client.fetch<string[]>(pagePaths)
  const projects = await client.fetch<string[]>(projectPaths)
  const paths = [
    ...pages.map((slug) => resolveHref('page', slug)),
    ...projects.map((slug) => resolveHref('project', slug)),
  ]
  return [...staticPaths, ...paths]
}
```

This is a verbatim move of the function currently in `pages/api/revalidate.ts` — no logic changes.

- [ ] **Step 3: Update `pages/api/revalidate.ts` to import instead of define**

Replace:

```ts
import { NextApiRequest, NextApiResponse } from 'next'
import { parseBody } from 'next-sanity/webhook'
export { config } from 'next-sanity/webhook'
import { getClient } from 'lib/sanity.client'
import { resolveHref } from 'lib/sanity.links'
import { pagePaths, projectPaths } from 'lib/sanity.queries'

export const getAllPaths = async (
  staticPaths: string[] = ['/', '/publications', '/contact', '/people']
) => {
  const client = getClient()
  const pages = await client.fetch<string[]>(pagePaths)
  const projects = await client.fetch<string[]>(projectPaths)
  const paths = [
    ...pages.map((slug) => resolveHref('page', slug)),
    ...projects.map((slug) => resolveHref('project', slug)),
  ]
  return [...staticPaths, ...paths]
}
```

with:

```ts
import { getAllPaths } from 'lib/paths'
import { NextApiRequest, NextApiResponse } from 'next'
import { parseBody } from 'next-sanity/webhook'
export { config } from 'next-sanity/webhook'
```

The rest of the file (the `handler` function) is unchanged — it already calls `getAllPaths()` in its `default` switch case, and that call now resolves to the imported version.

- [ ] **Step 4: Update `pages/sitemap.xml.tsx`'s import**

Replace:

```tsx
// pages/sitemap.xml.tsx
import { isNoindexPath, siteUrl } from 'lib/site'
import type { GetServerSideProps } from 'next'

import { getAllPaths } from './api/revalidate'
```

with:

```tsx
// pages/sitemap.xml.tsx
import { getAllPaths } from 'lib/paths'
import { isNoindexPath, siteUrl } from 'lib/site'
import type { GetServerSideProps } from 'next'
```

The rest of the file is unchanged.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit && echo "TYPES OK"
npm run lint
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

Expected: all three succeed; `/sitemap.xml` still appears in the build output as a server-rendered route.

- [ ] **Step 6: Confirm sitemap output is unchanged**

```bash
npm run start &
sleep 2
curl -s http://localhost:3000/sitemap.xml | head -20
kill %1
```

Expected: valid XML with `<url>` entries for `/`, `/publications`, `/contact`, `/people`, and the page/project slugs — same shape as before the move.

- [ ] **Step 7: Commit**

```bash
git add lib/paths.ts pages/api/revalidate.ts pages/sitemap.xml.tsx
git commit -m "refactor: move getAllPaths out of the revalidate API route into lib/paths"
```

---

## Task 4: Replace `lib/demo.data.ts` with a `siteName` constant

**Files:**
- Delete: `lib/demo.data.ts`
- Modify: `lib/site.ts`
- Modify: `components/global/SiteMeta.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `siteName` exported from `lib/site.ts`, consumed by `SiteMeta.tsx`.

`lib/demo.data.ts`'s entire content is a single fallback title string. `SiteMeta.tsx` is its only consumer. This task inlines it into `lib/site.ts`, which already owns the other site-wide constant (`siteUrl`) and the noindex-path logic.

- [ ] **Step 1: Confirm `SiteMeta.tsx` is the only consumer**

```bash
grep -rln "demo.data\|from 'lib/demo.data'" --include='*.ts' --include='*.tsx' components pages lib
```

Expected: `components/global/SiteMeta.tsx` and `lib/demo.data.ts` itself.

- [ ] **Step 2: Add `siteName` to `lib/site.ts`**

```ts
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://holsingerlab.vercel.app'
).replace(/\/$/, '')

export const siteName = 'Holsinger Lab'
```

This adds one line (`export const siteName = 'Holsinger Lab'` plus a blank line) directly after the existing `siteUrl` export. Everything below it (the `noindexPaths` set, `normalizePath`, `isNoindexPath`) is unchanged.

- [ ] **Step 3: Update `SiteMeta.tsx`**

Replace the import block:

```tsx
import * as demo from 'lib/demo.data'
import { urlForImage } from 'lib/sanity.image'
import { isNoindexPath, siteUrl } from 'lib/site'
```

with:

```tsx
import { urlForImage } from 'lib/sanity.image'
import { isNoindexPath, siteName, siteUrl } from 'lib/site'
```

Then replace the two usages. First:

```tsx
  const resolvedTitle = metaTitle || siteName
```

(was `demo.title`). Second:

```tsx
      <meta property="og:site_name" content={siteName} />
```

(was `content={demo.title}`). No other lines change.

- [ ] **Step 4: Delete `lib/demo.data.ts`**

```bash
rm lib/demo.data.ts
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit && echo "TYPES OK"
npm run lint
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

Expected: all three succeed.

- [ ] **Step 6: Confirm the title/OG tag output is unchanged**

```bash
npm run start &
sleep 2
curl -s http://localhost:3000/ | grep -oE '<title>[^<]*</title>|og:site_name" content="[^"]*"'
kill %1
```

Expected: `<title>Holsinger Lab</title>` (or a page-specific title suffixed with it) and `og:site_name" content="Holsinger Lab"` — identical output to before this change, since `siteName` carries the exact string `demo.title` held.

- [ ] **Step 7: Commit**

```bash
git add lib/site.ts components/global/SiteMeta.tsx
git rm lib/demo.data.ts
git commit -m "refactor: replace lib/demo.data.ts with a siteName constant in lib/site.ts"
```

---

## Task 5: Narrow `publicationsQuery` and type the publications component tree

**Files:**
- Modify: `lib/sanity.queries.ts`
- Modify: `pages/publications/index.tsx`
- Modify: `components/pages/publications/Publications.tsx`
- Modify: `components/pages/publications/Publication.tsx`
- Modify: `components/pages/publications/Toggle.tsx`

**Interfaces:**
- Consumes: `PublicationPayload` from `types/index.ts` (unchanged)
- Produces: `publicationsQuery` now selects explicit fields instead of `...`; `pages/publications/index.tsx`'s `PageProps.publications` is now `PublicationPayload[]` instead of `Object[]`; `Publications`, `Publication`, `Toggle`, and `ToggleContent` are all typed. Task 11's `strict: true` flip depends on this.

These five files are one task because they're a single data-flow chain: narrowing the query only matters if the type it's supposed to produce (`PublicationPayload`) is actually enforced by every consumer downstream, and typing `Publications.tsx`'s prop as `PublicationPayload[]` only compiles if its caller (`pages/publications/index.tsx`) has already stopped widening the data to `Object[]`.

- [ ] **Step 1: Confirm the current wide-open query and untyped props**

```bash
grep -n "publicationsQuery" lib/sanity.queries.ts
grep -n "publications: Object\[\]" pages/publications/index.tsx
npx tsc --noEmit --strict 2>&1 | grep -E "Publications.tsx|Publication.tsx|Toggle.tsx"
```

Expected: `publicationsQuery` selects `...` (every field); `PageProps.publications` is typed `Object[]`; eight `TS7031` implicit-`any` errors — one on `Publications.tsx`, one on `Publication.tsx`, and six across `Toggle.tsx`'s two exports (four params on `Toggle`, two on `ToggleContent`).

- [ ] **Step 2: Narrow `publicationsQuery`**

In `lib/sanity.queries.ts`, replace:

```ts
export const publicationsQuery = groq`
  *[_type == "publication"] | order(date desc) {
  ...
}`
```

with:

```ts
export const publicationsQuery = groq`
  *[_type == "publication"] | order(date desc) {
    _id,
    title,
    author,
    journal,
    volume,
    issue,
    pages,
    abstract,
    url,
    date,
  }
`
```

These are exactly the fields `PublicationPayload` (in `types/index.ts`) declares — the query now returns precisely what the type promises, no more and no less.

- [ ] **Step 3: Fix `pages/publications/index.tsx`'s widened prop type**

In `pages/publications/index.tsx`, change:

```tsx
interface PageProps {
  settings: SettingsPayload
  homePageTitle?: string
  preview: boolean
  token: string | null
  publications: Object[]
}
```

to:

```tsx
interface PageProps {
  settings: SettingsPayload
  homePageTitle?: string
  preview: boolean
  token: string | null
  publications: PublicationPayload[]
}
```

`PublicationPayload` is already imported at the top of this file (it's used by `getStaticProps`'s `client.fetch<PublicationPayload[] | null>(publicationsQuery)` call), so no import changes are needed.

- [ ] **Step 4: Type `Publications.tsx`**

In `components/pages/publications/Publications.tsx`, change:

```tsx
const Publications = ({ publications }) => {
```

to:

```tsx
const Publications = ({
  publications,
}: {
  publications: PublicationPayload[]
}) => {
```

(`PublicationPayload` is already imported at the top of this file.)

- [ ] **Step 5: Type `Publication.tsx`**

In `components/pages/publications/Publication.tsx`, change:

```tsx
import { LaunchIcon } from '@sanity/icons'
import { useState } from 'react'

import { Toggle, ToggleContent } from './Toggle'

export default function Publication({ publication }) {
```

to:

```tsx
import { LaunchIcon } from '@sanity/icons'
import { useState } from 'react'
import type { PublicationPayload } from 'types'

import { Toggle, ToggleContent } from './Toggle'

export default function Publication({
  publication,
}: {
  publication: PublicationPayload
}) {
```

- [ ] **Step 6: Type `Toggle.tsx`'s two exports**

In `components/pages/publications/Toggle.tsx`, change:

```tsx
import { Transition } from '@headlessui/react'
import { ChevronDownIcon, ChevronUpIcon } from '@sanity/icons'

export function Toggle({ show, callback, showMessage, hideMessage }) {
```

to:

```tsx
import { Transition } from '@headlessui/react'
import { ChevronDownIcon, ChevronUpIcon } from '@sanity/icons'
import type { ReactNode } from 'react'

export function Toggle({
  show,
  callback,
  showMessage,
  hideMessage,
}: {
  show: boolean
  callback: () => void
  showMessage: string
  hideMessage: string
}) {
```

and further down, change:

```tsx
export function ToggleContent({ show, children }) {
```

to:

```tsx
export function ToggleContent({
  show,
  children,
}: {
  show: boolean
  children: ReactNode
}) {
```

- [ ] **Step 7: Verify**

```bash
npx tsc --noEmit && echo "TYPES OK"
npm run lint
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

Expected: all three succeed.

- [ ] **Step 8: Confirm the publications page still renders full data**

```bash
npm run start &
sleep 2
curl -s http://localhost:3000/publications | grep -c "publication" || true
kill %1
```

Expected: the page returns 200 and contains publication content — confirming the narrowed query still returns everything the page needs (nothing beyond the ten fields it renders was ever used).

- [ ] **Step 9: Commit**

```bash
git add lib/sanity.queries.ts pages/publications/index.tsx components/pages/publications/Publications.tsx components/pages/publications/Publication.tsx components/pages/publications/Toggle.tsx
git commit -m "fix: narrow publicationsQuery to explicit fields and type the publications component tree"
```

---

## Task 6: Type the contact component tree

**Files:**
- Modify: `components/pages/contact/Contact.tsx`
- Modify: `components/pages/contact/ErrorDialog.tsx`
- Modify: `components/pages/contact/SuccessScreen.tsx`

**Interfaces:**
- Consumes: `SettingsPayload` from `types/index.ts` (unchanged)
- Produces: `Contact`, `ErrorDialog`, `SuccessScreen` are all typed. Task 11's `strict: true` flip depends on this.

- [ ] **Step 1: Confirm current implicit-`any` state**

```bash
npx tsc --noEmit --strict 2>&1 | grep -E "Contact.tsx|ErrorDialog.tsx|SuccessScreen.tsx"
```

Expected: two `TS7031` errors on `Contact.tsx`, three on `ErrorDialog.tsx`, one on `SuccessScreen.tsx`.

- [ ] **Step 2: Type `Contact.tsx`**

Change:

```tsx
import { SiteMeta } from 'components/global/SiteMeta'
import Layout from 'components/shared/Layout'

import ContactForm from './ContactForm'

const Contact = ({ homePageTitle, settings }) => {
```

to:

```tsx
import { SiteMeta } from 'components/global/SiteMeta'
import Layout from 'components/shared/Layout'
import type { SettingsPayload } from 'types'

import ContactForm from './ContactForm'

const Contact = ({
  homePageTitle,
  settings,
}: {
  homePageTitle?: string
  settings?: SettingsPayload
}) => {
```

- [ ] **Step 3: Type `ErrorDialog.tsx`**

Change:

```tsx
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'

const ErrorDialog = ({ handleDialogClose, showDialog, message }) => {
```

to:

```tsx
import { Dialog, Transition } from '@headlessui/react'
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
```

- [ ] **Step 4: Type `SuccessScreen.tsx`**

Change:

```tsx
const SuccessScreen = ({ message }) => {
```

to:

```tsx
const SuccessScreen = ({ message }: { message: string }) => {
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit && echo "TYPES OK"
npm run lint
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

Expected: all three succeed.

- [ ] **Step 6: Commit**

```bash
git add components/pages/contact/Contact.tsx components/pages/contact/ErrorDialog.tsx components/pages/contact/SuccessScreen.tsx
git commit -m "fix: type Contact, ErrorDialog and SuccessScreen props"
```

---

## Task 7: Type `DesktopNavBar.tsx` and `MobileNavBar.tsx`

**Files:**
- Modify: `components/global/Navbar/DesktopNavBar.tsx`
- Modify: `components/global/Navbar/MobileNavBar.tsx`

**Interfaces:**
- Consumes: `MenuItem` from `types/index.ts` (unchanged)
- Produces: both nav components are typed. Task 11's `strict: true` flip depends on this.

- [ ] **Step 1: Confirm current implicit-`any` state**

```bash
npx tsc --noEmit --strict 2>&1 | grep -E "DesktopNavBar.tsx|MobileNavBar.tsx"
```

Expected: six `TS7031`/`TS7006` errors on `DesktopNavBar.tsx` (four prop bindings plus the `.map` callback's two parameters) and six `TS7031` errors on `MobileNavBar.tsx`'s prop bindings (its own `.map` callback at line 80 is already explicitly typed — `(menuItem: MenuItem, key: number)` — so it isn't in this list).

- [ ] **Step 2: Type `DesktopNavBar.tsx`**

Change:

```tsx
import { resolveHref } from 'lib/sanity.links'
import Link from 'next/link'

const DesktopNavBar = ({
  menuItems,
  showPublications,
  showPeople,
  showContactForm,
}) => {
```

to:

```tsx
import { resolveHref } from 'lib/sanity.links'
import Link from 'next/link'
import type { MenuItem } from 'types'

const DesktopNavBar = ({
  menuItems,
  showPublications,
  showPeople,
  showContactForm,
}: {
  menuItems?: MenuItem[]
  showPublications?: boolean
  showPeople?: boolean
  showContactForm?: boolean
}) => {
```

Further down in the same file, change:

```tsx
      {menuItems &&
        menuItems.map((menuItem, key) => {
```

to:

```tsx
      {menuItems &&
        menuItems.map((menuItem: MenuItem, key: number) => {
```

- [ ] **Step 3: Type `MobileNavBar.tsx`**

Change:

```tsx
const MobileNavBar = ({
  handleMenuClick,
  isMenuOpen,
  menuItems,
  showPublications,
  showPeople,
  showContactForm,
}) => {
```

to:

```tsx
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
```

`MenuItem` is already imported at the top of this file (`import { MenuItem } from 'types'`) — no import change needed.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && echo "TYPES OK"
npm run lint
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

Expected: all three succeed.

- [ ] **Step 5: Commit**

```bash
git add components/global/Navbar/DesktopNavBar.tsx components/global/Navbar/MobileNavBar.tsx
git commit -m "fix: type DesktopNavBar and MobileNavBar props"
```

---

## Task 8: Type `pages/404.tsx`, and fix its `null`/`undefined` inconsistency

**Files:**
- Modify: `pages/404.tsx`

**Interfaces:**
- Consumes: `SettingsPayload` from `types/index.ts` (unchanged)
- Produces: `NotFoundPage` is typed. Task 11's `strict: true` flip depends on this.

`pages/404.tsx` is missing from the parent spec's list of eight implicit-`any` components. It also has a latent bug the type system catches once typed: every other page in the codebase (`pages/contact/index.tsx`, `pages/people/index.tsx`, `pages/index.tsx`, `pages/[slug].tsx`, `pages/publications/index.tsx`) normalizes its Sanity-fetched `homePageTitle` with `?? undefined` before putting it in props, because the query can return `null` but `SiteMeta`'s `baseTitle` prop only accepts `string | undefined`. `pages/404.tsx` is the only page that skips this normalization — harmless today because the prop was untyped, but a real `string | null` vs `string | undefined` mismatch once it's typed.

- [ ] **Step 1: Confirm current state**

```bash
npx tsc --noEmit --strict 2>&1 | grep "404.tsx"
```

Expected: two `TS7031` implicit-`any` errors on the `NotFoundPage` component's `settings`/`homePageTitle` bindings. The file already declares a `PageProps` interface below the component (used by `getStaticProps`) — the component itself just never references it.

- [ ] **Step 2: Type the component using the existing `PageProps` interface**

Change:

```tsx
export default function NotFoundPage({ settings, homePageTitle }) {
```

to:

```tsx
export default function NotFoundPage({ settings, homePageTitle }: PageProps) {
```

(`PageProps` is declared later in the same file — TypeScript type references aren't affected by declaration order, so this compiles even though `PageProps` appears below.)

- [ ] **Step 3: Normalize `homePageTitle` to match every other page**

Change the `PageProps` interface:

```tsx
interface PageProps {
  settings: SettingsPayload | undefined
  homePageTitle: string | null
}
```

to:

```tsx
interface PageProps {
  settings: SettingsPayload | undefined
  homePageTitle: string | undefined
}
```

And in `getStaticProps`, change:

```tsx
  return {
    props: {
      settings: settings ?? {},
      homePageTitle: homePageTitle,
    },
  }
```

to:

```tsx
  return {
    props: {
      settings: settings ?? {},
      homePageTitle: homePageTitle ?? undefined,
    },
  }
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && echo "TYPES OK"
npm run lint
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

Expected: all three succeed. Before Step 3's normalization fix, `tsc --noEmit` fails with `TS2322: Type 'string | null' is not assignable to type 'string | undefined'` at the `<SiteMeta baseTitle={homePageTitle} ...>` call site — confirming the fix is load-bearing, not cosmetic.

- [ ] **Step 5: Commit**

```bash
git add pages/404.tsx
git commit -m "fix: type NotFoundPage props and normalize homePageTitle to string | undefined"
```

---

## Task 9: Fix Studio and schema-layer strict-mode fallout

**Files:**
- Modify: `plugins/settings.tsx`
- Modify: `schemas/objects/timeline.ts`
- Modify: `schemas/documents/page.ts`
- Modify: `schemas/documents/project.ts`
- Modify: `schemas/documents/publication.ts`
- Modify: `pages/studio/[[...index]].tsx`

**Interfaces:**
- Consumes: `NewDocumentOptionsResolver`, `DocumentActionsResolver`, `DocumentDefinition` from `sanity` (existing package, new type imports only); `StructureResolver` from `sanity/desk` (unchanged)
- Produces: all six files typecheck under `strict: true`. Task 11's flip depends on this. **Does not** depend on `@types/styled-components` being installed yet — see Step 6's note.

This is the strict-mode fallout outside `components/` — five distinct causes across six files, found by actually running `tsc --noEmit` with `strict: true` and reading the output rather than guessing.

- [ ] **Step 1: Confirm current state**

```bash
npx tsc --noEmit --strict 2>&1 | grep -E "settings.tsx|timeline.ts|page.ts|project.ts|publication.ts|studio/\[\[" 
```

Expected: six errors in `plugins/settings.tsx` (implicit-`any` on `newDocumentOptions`/`actions` resolver callbacks), one in `schemas/objects/timeline.ts` plus one in `sanity.config.ts` (a type mismatch caused by `timeline.ts`'s preview `prepare` typing — fixing `timeline.ts` resolves the `sanity.config.ts` error too, since nothing in `sanity.config.ts` itself changes), one each in `schemas/documents/page.ts` and `schemas/documents/project.ts` (a `Rule.custom` validator typed too narrowly), two in `schemas/documents/publication.ts` (same pattern, two fields), and two in `pages/studio/[[...index]].tsx`.

- [ ] **Step 2: Fix `plugins/settings.tsx`'s two resolver callbacks**

Sanity's own types define these callbacks as `NewDocumentOptionsResolver` and `DocumentActionsResolver`. Import them and use `satisfies` so the callback parameters are contextually typed from the target type instead of left implicit:

Change:

```tsx
import { apiVersion, previewSecretId } from 'lib/sanity.api'
import { type DocumentDefinition } from 'sanity'
import { type StructureResolver } from 'sanity/desk'
```

to:

```tsx
import { apiVersion, previewSecretId } from 'lib/sanity.api'
import {
  type DocumentActionsResolver,
  type DocumentDefinition,
  type NewDocumentOptionsResolver,
} from 'sanity'
import { type StructureResolver } from 'sanity/desk'
```

Then change:

```tsx
      newDocumentOptions: (prev, { creationContext }) => {
        if (creationContext.type === 'global') {
          return prev.filter(
            (templateItem) => !types.includes(templateItem.templateId)
          )
        }

        return prev
      },
      // Removes the "duplicate" action on the Singletons (such as Home)
      actions: (prev, { schemaType }) => {
        if (types.includes(schemaType)) {
          return prev.filter(({ action }) => action !== 'duplicate')
        }

        return prev
      },
```

to:

```tsx
      newDocumentOptions: ((prev, { creationContext }) => {
        if (creationContext.type === 'global') {
          return prev.filter(
            (templateItem) => !types.includes(templateItem.templateId)
          )
        }

        return prev
      }) satisfies NewDocumentOptionsResolver,
      // Removes the "duplicate" action on the Singletons (such as Home)
      actions: ((prev, { schemaType }) => {
        if (types.includes(schemaType)) {
          return prev.filter(({ action }) => action !== 'duplicate')
        }

        return prev
      }) satisfies DocumentActionsResolver,
```

- [ ] **Step 3: Fix `schemas/objects/timeline.ts`'s two implicit-`any` callbacks**

This file has two `preview.prepare` blocks with structurally identical `.map((x) => x.title)` calls — one for the inner "item" object (selecting `milestones`), one for the outer "timeline" object (selecting `items`). Change the inner one:

```ts
            prepare({ items, title }) {
              const hasItems = items && items.length > 0
              const milestoneNames =
                hasItems && items.map((timeline) => timeline.title).join(', ')
```

to:

```ts
            prepare({ items, title }) {
              const hasItems = items && items.length > 0
              const milestoneNames =
                hasItems &&
                items
                  .map((milestone: { title?: string }) => milestone.title)
                  .join(', ')
```

And change the outer one:

```ts
    prepare({ items }: { items: { title: string }[] }) {
      const hasItems = items && items.length > 0
      const timelineNames =
        hasItems && items.map((timeline) => timeline.title).join(', ')
```

to:

```ts
    prepare({ items }) {
      const hasItems = items && items.length > 0
      const timelineNames =
        hasItems &&
        items.map((timeline: { title: string }) => timeline.title).join(', ')
```

Removing the parameter-level type annotation on the outer `prepare` (rather than fixing it in place) is deliberate: Sanity's own `SchemaTypeDefinition` type expects `preview.prepare`'s parameter to structurally match `Record<string, any>`, and an explicit `{ items: { title: string }[] }` annotation is *narrower* than that — which is exactly what was causing the `sanity.config.ts` type-mismatch error (a `TS2322` at the `types: [...]` array where `timeline` is listed, since `timeline`'s inferred type no longer fit `SchemaTypeDefinition`). Leaving `items` to be contextually typed as `any` there and instead typing it locally inside the `.map()` callback — matching the pattern the inner block already used — resolves both the local implicit-`any` and the outer type-mismatch without narrowing the schema's declared shape.

- [ ] **Step 4: Fix `schemas/documents/publication.ts`'s two `Rule.custom` validators**

Sanity's `CustomValidator<T>` always calls back with `T | undefined` — even for fields with no `required()` validator — so a validator function typed to take a non-optional `number` is subtly wrong (it happens to work at runtime because `undefined <= 0` evaluates to `false` in JavaScript, but it doesn't typecheck under `strict`). Change the `volume` field's validator:

```ts
      validation: (Rule) =>
        Rule.custom((num: number) => {
          if (num <= 0) {
            return 'Volume number must be a positive integer'
          }
          return true
        }),
```

to:

```ts
      validation: (Rule) =>
        Rule.custom((num: number | undefined) => {
          if (num !== undefined && num <= 0) {
            return 'Volume number must be a positive integer'
          }
          return true
        }),
```

And the `issue` field's validator, same pattern:

```ts
      validation: (Rule) =>
        Rule.custom((num: number) => {
          if (num <= 0) {
            return 'Issue number must be a positive integer'
          }
          return true
        }),
```

to:

```ts
      validation: (Rule) =>
        Rule.custom((num: number | undefined) => {
          if (num !== undefined && num <= 0) {
            return 'Issue number must be a positive integer'
          }
          return true
        }),
```

Both fixes preserve the exact current runtime behavior (an unset field always passes validation) while making the type honestly reflect that the field is optional.

- [ ] **Step 5: Fix the same `Rule.custom` pattern in `schemas/documents/page.ts` and `schemas/documents/project.ts`**

Both files have an identical image-caption/alt-text validator. In `schemas/documents/page.ts`, change:

```ts
          validation: (Rule) =>
            Rule.custom(
              (fields: {
                caption: string | undefined
                alt: string | undefined
              }) => {
                const caption = fields?.caption || ''
                const alt = fields?.alt || ''
                if (!caption.trim() && !alt.trim()) {
                  return 'Either caption or alt text must be provided.'
                }
                return true
              }
            ),
```

to:

```ts
          validation: (Rule) =>
            Rule.custom(
              (
                fields:
                  | { caption: string | undefined; alt: string | undefined }
                  | undefined
              ) => {
                const caption = fields?.caption || ''
                const alt = fields?.alt || ''
                if (!caption.trim() && !alt.trim()) {
                  return 'Either caption or alt text must be provided.'
                }
                return true
              }
            ),
```

Apply the identical change to `schemas/documents/project.ts` — its validator is byte-for-byte the same. The function body already handles `fields` being `undefined` via optional chaining (`fields?.caption`), so only the parameter type needs the `| undefined` added.

- [ ] **Step 6: Fix `pages/studio/[[...index]].tsx`'s untyped theme callback**

This one has a two-part cause. First, `styled-components@5` ships no bundled type declarations, so under `noImplicitAny` the import itself errors (`TS7016`) — that half is fixed by Task 11 adding `@types/styled-components` as a devDependency, not by this task. What *this* task fixes is independent of that: once a type declaration for the module exists (whether the real one from `@types/styled-components`, or none at all, in which case the whole call resolves to `any` and isn't checked), the callback parameter still needs an honest type rather than relying on an implicit one. Add a local interface describing exactly the shape this file actually reads:

```tsx
interface StudioThemeProps {
  theme: { sanity: { color: { base: { bg: string } } } }
}

const GlobalStyle = createGlobalStyle(({ theme }: StudioThemeProps) => ({
  html: { backgroundColor: theme.sanity.color.base.bg },
}))
```

replaces:

```tsx
const GlobalStyle = createGlobalStyle(({ theme }) => ({
  html: { backgroundColor: theme.sanity.color.base.bg },
}))
```

This compiles cleanly right now (before Task 11 installs `@types/styled-components`) because `createGlobalStyle` itself is still untyped (`any`), and TypeScript doesn't check arguments passed into an `any`-typed function call — so an explicitly-typed callback parameter is accepted without complaint either way. The payoff comes in Task 11: once `@types/styled-components` is installed and `createGlobalStyle` becomes properly typed, its default `DefaultTheme` type is an empty interface (`{}`), which would otherwise make `theme.sanity` a real type error (`TS2339`) — this local `StudioThemeProps` interface, matching the actual shape Sanity Studio provides via `ThemeProvider` at runtime, prevents that.

- [ ] **Step 7: Verify (schema/plugin files only — the studio file's import-level error persists until Task 11)**

```bash
npx tsc --noEmit --strict 2>&1 | grep -E "settings.tsx|timeline.ts|page.ts|project.ts|publication.ts"
```

Expected: no output — all five non-studio files are clean.

```bash
npx tsc --noEmit && echo "TYPES OK (current, non-strict, tsconfig)"
npm run lint
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

Expected: all three succeed under the *current* `tsconfig.json` (`strict: false`) — this task's changes are valid regardless of strictness, so the existing build stays green even before Task 11 flips the flag.

- [ ] **Step 8: Commit**

```bash
git add plugins/settings.tsx schemas/objects/timeline.ts schemas/documents/page.ts schemas/documents/project.ts schemas/documents/publication.ts "pages/studio/[[...index]].tsx"
git commit -m "fix: type Studio plugin resolvers, schema preview callbacks, and Rule.custom validators"
```

---

## Task 10: Remove template leftovers

**Files:**
- Delete: `netlify.toml`
- Delete: `.github/CODEOWNERS`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed by other tasks

`netlify.toml` is dead — this project deploys to Vercel. `.github/CODEOWNERS` assigns the repo to `@sanity-io/ecosystem`, the upstream template's team, not this repo's owner. Neither is referenced by any build step or CI workflow. Separately, `dist/` is a local build artifact that isn't tracked by git at all — `.gitignore` covers `/studio/dist` but not a root `dist/`, so anyone who generates one gets it flagged by `git status` with no way to silence it short of this entry.

- [ ] **Step 1: Confirm nothing references these files**

```bash
grep -rln "netlify" --include='*.json' --include='*.yml' --include='*.yaml' --include='*.mjs' --include='*.js' . --exclude-dir=node_modules --exclude-dir=.next
grep -n "CODEOWNERS" .github/workflows/ci.yml 2>/dev/null || echo "not referenced in CI"
git ls-tree -r --name-only HEAD | grep '^dist/' || echo "dist/ not tracked"
```

Expected: no references to `netlify.toml` outside itself; `.github/CODEOWNERS` not referenced in CI (GitHub reads `CODEOWNERS` automatically for PR review assignment — it has no build-time effect to break); `dist/` confirmed untracked.

- [ ] **Step 2: Delete the two files**

```bash
git rm netlify.toml .github/CODEOWNERS
```

- [ ] **Step 3: Add `/dist` to `.gitignore`**

In `.gitignore`, add a `/dist` line near the other build-output entries (`/.next/`, `/out/`, `/build`):

```
# next.js
/.next/
/out/

# production
/build
/dist
/studio/dist
```

(The three-line block above shows the existing `# next.js` and `# production` sections with `/dist` inserted as a new line directly after `/build` and before the existing `/studio/dist` — only that one line is new.)

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && echo "TYPES OK"
npm run lint
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

Expected: all three succeed — this task touches no code, only repo hygiene files.

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore: remove netlify.toml and Sanity's CODEOWNERS, ignore a root dist/"
```

---

## Task 11: Enable `strict: true` and finalize dependencies

**Files:**
- Modify: `tsconfig.json`
- Modify: `package.json`
- Modify: `package-lock.json` (regenerated by `npm install`, not hand-edited)

**Interfaces:**
- Consumes: every typing fix from Tasks 1, 2, 5, 6, 7, 8, and 9 — this task fails immediately if any of them are missing.
- Produces: `strict: true` in `tsconfig.json`; 17 dependencies removed; `@types/styled-components` added. This is the last task that touches dependencies in Phase 1A — Phase 1B's version bumps start from here.

**This task must run last among Tasks 1–10.** It folds together three things that all have to land in the same commit: removing packages whose last usages Tasks 1 and 2 already deleted, adding the one devDependency Task 9's studio fix needs to fully typecheck, and flipping the strict flag itself.

- [ ] **Step 1: Confirm zero remaining strict-mode errors**

```bash
npx tsc --noEmit --strict 2>&1 | grep -v "styled-components" | grep "error TS" || echo "CLEAN (excluding the known styled-components gap this task closes)"
```

Expected: `CLEAN` — every error from the original 46-error baseline has been fixed by Tasks 1–9, except the `styled-components` declaration-file error this task's dependency addition resolves.

- [ ] **Step 2: Confirm no other file still imports the packages being removed**

```bash
grep -rlE "@vercel/og|@formspree/react|@fortawesome/react-fontawesome|next-google-fonts|intl-segmenter-polyfill|classnames|date-fns|@sanity/color-input|@sanity/webhook|react-is|@babel/core|@mui|@emotion|from 'axios'|from \"axios\"" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --exclude-dir=node_modules --exclude-dir=.next .
```

Expected: no output. (`@tailwindcss/typography` is deliberately excluded from this check — unlike the other sixteen packages, it's still *referenced* by code, just not by anything that renders. See Step 2a.)

- [ ] **Step 2a: Drop `@tailwindcss/typography`'s usage in `tailwind.config.js`**

```bash
grep -n "prose" tailwind.config.js styles/index.css
grep -rln "className=\"[^\"]*prose" --include='*.tsx' components pages || echo "prose class used nowhere"
```

Expected: `tailwind.config.js` line 36 calls `require('@tailwindcss/typography')` in its `plugins` array — the package is still *loaded*, just producing utility classes (`prose`, `prose-sm`, etc.) that nothing in the codebase applies. Because it's still referenced by code, it can't be removed from `package.json` in Step 3 without first dropping that `plugins` line — do that here, since it's a one-line change and this task already owns the package.json edit:

In `tailwind.config.js`, change:

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

— no change needed to this part. Instead, at the bottom of the file, change:

```js
  plugins: [require('@tailwindcss/typography')],
}
```

to:

```js
  plugins: [],
}
```

- [ ] **Step 3: Remove the 17 dependencies from `package.json`**

In the `dependencies` block, remove these seventeen packages: `@babel/core`, `@emotion/react`, `@emotion/styled`, `@formspree/react`, `@fortawesome/react-fontawesome`, `@mui/icons-material`, `@mui/material`, `@sanity/color-input`, `@sanity/webhook`, `@tailwindcss/typography`, `@vercel/og`, `axios`, `classnames`, `date-fns`, `intl-segmenter-polyfill`, `next-google-fonts`, `react-is`:

```json
  "dependencies": {
    "@headlessui/react": "^1.7.15",
    "@portabletext/react": "3.0.4",
    "@sanity/client": "6.1.7",
    "@sanity/demo": "1.0.2",
    "@sanity/image-url": "^1.0.2",
    "@sanity/orderable-document-list": "^1.1.0",
    "@sanity/vision": "3.14.1",
    "next": "13.4.9",
    "next-sanity": "5.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "sanity": "3.14.1",
    "sanity-plugin-asset-source-unsplash": "1.1.0",
    "sanity-plugin-media": "^2.2.2",
    "styled-components": "5.3.11",
    "suspend-react": "0.1.3"
  },
```

This is the complete replacement for the entire `dependencies` block — sixteen packages remain (down from thirty-three).

- [ ] **Step 4: Add `@types/styled-components` to `devDependencies`**

```json
  "devDependencies": {
    "@types/react": "18.2.14",
    "@types/styled-components": "^5.1.36",
    "autoprefixer": "^10.4.14",
    "eslint": "^8.43.0",
    "eslint-config-next": "13.4.9",
    "eslint-plugin-simple-import-sort": "^10.0.0",
    "postcss": "^8.4.24",
    "prettier": "^2.8.8",
    "prettier-plugin-packagejson": "^2.4.3",
    "prettier-plugin-tailwindcss": "^0.3.0",
    "tailwindcss": "3.3.2",
    "typescript": "^5.1.3"
  }
```

This is the complete replacement for the entire `devDependencies` block — the only change is the new `"@types/styled-components": "^5.1.36"` line.

- [ ] **Step 5: Regenerate the lockfile**

```bash
npm install
```

Expected: npm removes roughly fifty transitive packages along with the seventeen direct ones, and reports a lower `npm audit` vulnerability count than the pre-Task-11 baseline.

- [ ] **Step 6: Record the before/after vulnerability count**

```bash
npm audit 2>&1 | tail -5
```

Compare this against the Phase 1 design doc's recorded baseline (49 vulnerabilities: 2 critical, 21 high, 23 moderate, 3 low, from `npm audit` on `main` at `7c4512e`). Note the new count in the commit message in Step 9 — this is the concrete evidence for the "dependency cleanup reduces vulnerability surface" claim, independent of the version bumps Phase 1B does.

- [ ] **Step 7: Flip `strict: true` in `tsconfig.json`**

Change:

```json
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
```

to:

```json
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
```

(`strictNullChecks: true` is removed as a standalone line, not just changed — `strict: true` already implies it, and leaving both is redundant and slightly misleading about what's actually controlling the setting.)

- [ ] **Step 8: Verify everything together**

```bash
npx tsc --noEmit && echo "STRICT TYPECHECK OK"
npm run lint
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

Expected: all three succeed with zero errors and zero warnings. This is Phase 1A's core exit criterion — if this step fails, something in Tasks 1–9's typing work was incomplete and needs to be fixed in this task rather than by weakening `strict` back to `false`.

- [ ] **Step 9: Commit**

Verified during plan-writing (2026-08-09) that this step drops the count from the Phase 1 design doc's baseline of 49 (2 critical, 21 high, 23 moderate, 3 low) to 46 (2 critical, 19 high, 22 moderate, 3 low) — dependency advisories shift over time, so re-run Step 6 at execution time and use whatever it actually reports rather than assuming these numbers still hold.

```bash
git add package.json package-lock.json tsconfig.json tailwind.config.js
git commit -m "$(cat <<'EOF'
feat: enable strict mode, remove 17 unused dependencies

npm audit dropped from 49 (2 critical, 21 high, 23 moderate, 3 low) to
46 (2 critical, 19 high, 22 moderate, 3 low) as of 2026-08-09 -- confirm
against Step 6's actual output at merge time, since advisories shift.
EOF
)"
```

---

## Task 12: ESLint → `next/core-web-vitals`

**Files:**
- Modify: `.eslintrc.json`

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed by other tasks. Independent of Tasks 1–11; can land at any point in the sequence.

Verified directly rather than assumed: switching to `next/core-web-vitals` does **not** newly enable any `jsx-a11y` rules. It only layers `@next/next`'s web-vitals-specific rules (`no-html-link-for-pages`, `no-sync-scripts`, etc.) on top of the base `next` config, which already ships its own small, fixed set of `jsx-a11y` rules pinned to `warn` — none of which is `anchor-is-valid` (the rule that would catch Phase 2's `<a onClick>`-without-`href` defects in `Profile.tsx` and `Toggle.tsx`). The `<div>`-in-`<ul>` defect in `Publications.tsx` isn't caught by any ESLint rule in either config — it's an HTML-validity issue, not a lint rule. Confirmed by running `next lint` before and after: zero warnings both times.

- [ ] **Step 1: Confirm current lint is clean**

```bash
npm run lint
```

Expected: `✔ No ESLint warnings or errors`.

- [ ] **Step 2: Switch the config**

In `.eslintrc.json`, change:

```json
{
  "root": true,
  "extends": "next",
  "plugins": ["simple-import-sort"],
```

to:

```json
{
  "root": true,
  "extends": "next/core-web-vitals",
  "plugins": ["simple-import-sort"],
```

- [ ] **Step 3: Verify**

```bash
npm run lint
```

Expected: `✔ No ESLint warnings or errors` — identical output to Step 1. If this step surfaces new warnings, do not downgrade rules to suppress them; investigate what changed (a plugin version drift is more likely than a genuine regression, since this was verified clean on the exact `eslint-config-next@13.4.9` this repo pins).

```bash
npx tsc --noEmit && echo "TYPES OK"
NEXT_PUBLIC_SANITY_PROJECT_ID=j3f9z8os NEXT_PUBLIC_SANITY_DATASET=production npm run build
```

Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add .eslintrc.json
git commit -m "chore: switch ESLint config to next/core-web-vitals"
```

---

## Task 13: Reconfigure Renovate for this repo

**Files:**
- Modify: `.github/renovate.json`

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed by other tasks. Independent of Tasks 1–12; can land at any point in the sequence.

`.github/renovate.json` currently extends `sanity-io/renovate-config` and its `studio-v3` variant — presets built for Sanity's own monorepo of Studio plugins, inherited from the upstream template this project was bootstrapped from. This repo is a downstream consumer of Sanity, not part of that ecosystem, so those presets are the wrong starting point (they're tuned for a different release cadence and a different set of packages than this app actually depends on).

- [ ] **Step 1: Confirm the current config**

```bash
cat .github/renovate.json
```

Expected:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "github>sanity-io/renovate-config",
    "github>sanity-io/renovate-config:studio-v3"
  ]
}
```

- [ ] **Step 2: Replace with generic, widely-used community presets**

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended", ":semanticCommitsDisabled"],
  "labels": ["dependencies"],
  "packageRules": [
    {
      "matchPackageNames": ["sanity", "@sanity/**", "next-sanity"],
      "groupName": "Sanity"
    },
    {
      "matchPackageNames": ["next", "react", "react-dom", "eslint-config-next"],
      "groupName": "Next.js"
    }
  ]
}
```

`config:recommended` is Renovate's own general-purpose default (separate rate limits for major/minor/patch, lockfile maintenance, vulnerability alerts prioritized) — the right baseline for a single downstream app rather than a package-publishing monorepo. `:semanticCommitsDisabled` matches this repo's actual commit style (Phase 0's commits are `type: description`, not strict Conventional Commits with scopes). The two `packageRules` groupings keep the Sanity and Next.js ecosystems each bumping together in one PR rather than as a flood of one-package-at-a-time PRs, which is where most of this repo's review noise would otherwise come from once Phase 1B lands on current major versions and Renovate starts proposing routine minor/patch bumps.

- [ ] **Step 3: Verify the JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('.github/renovate.json', 'utf8')); console.log('Valid JSON')"
```

Expected: `Valid JSON`. (Renovate's own schema validation only runs when Renovate itself processes the repo — there's no local CLI check in this project's toolchain, so a JSON-parse check is the practical verification available here.)

- [ ] **Step 4: Commit**

```bash
git add .github/renovate.json
git commit -m "chore: reconfigure Renovate for this repo instead of Sanity's own template presets"
```

---

## Phase 1A exit criteria

- `strict: true` in `tsconfig.json`; `npx tsc --noEmit` passes with zero errors.
- `npm run lint` passes with zero warnings under `next/core-web-vitals`.
- `npm run build` succeeds and every route from the Phase 0 baseline still emits (`/`, `/[slug]`, `/404`, `/contact`, `/people`, `/projects/[slug]`, `/publications`, `/sitemap.xml`, `/studio/[[...index]]`, all four `/api/*` routes).
- `package.json` has 17 fewer dependencies than the Phase 0 baseline (33 → 16 in `dependencies`) plus one new devDependency (`@types/styled-components`).
- `npm audit` vulnerability count is recorded and compared against the Phase 0 baseline (49: 2 critical, 21 high, 23 moderate, 3 low) — expected to drop from dependency removal alone, ahead of Phase 1B's version bumps doing the larger reduction.
- `.eslintrc.json` extends `next/core-web-vitals`; `.github/renovate.json` no longer extends Sanity's own template presets.
- `netlify.toml`, `.github/CODEOWNERS`, and `lib/demo.data.ts` are gone; `dist/` is gitignored.
- No behavioral change to any route — this phase is type-tightening and dependency hygiene only. Phase 1B is where the framework versions and the App Router migration happen.
