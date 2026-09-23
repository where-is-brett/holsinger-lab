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
        if (!slug) {
          return NextResponse.json(
            { success: false, message: 'Missing "slug" in webhook payload' },
            { status: 400 }
          )
        }
        revalidatePath(`/${slug}`)
        // Task 3 (Home): a `page` can be the Support link's target
        // (`support-our-research`), which Home reads on every render --
        // any `page` edit revalidates `/` too, not just its own route.
        revalidatePath(`/`)
        return NextResponse.json({
          success: true,
          message: `Revalidated "/${slug}"`,
        })
      case 'project':
        if (!slug) {
          return NextResponse.json(
            { success: false, message: 'Missing "slug" in webhook payload' },
            { status: 400 }
          )
        }
        revalidatePath(`/projects/${slug}`)
        revalidatePath(`/`)
        // Task 3 (Home): /research lists every `defined(researchOrder)`
        // project, and the `maestro` project feeds Home's Outreach block --
        // a `project` edit can be either, so both revalidate on every
        // `project` webhook rather than trying to tell them apart here.
        revalidatePath(`/research`)
        return NextResponse.json({
          success: true,
          message: `Revalidated "${type}" with slug "projects/${slug}. Revalidated homepage."`,
        })
      case 'publication':
        revalidatePath(`/publications`)
        revalidatePath('/publications/[slug]', 'page')
        // Task 3 (Home): Home renders the five most recent publications and
        // the "All N publications ->" count -- a `publication` edit
        // revalidates `/` too, not just /publications and its own page.
        revalidatePath(`/`)
        return NextResponse.json({
          success: true,
          message: `Revalidated "${type}" with slug "publications"`,
        })
      case 'profile':
        revalidatePath(`/people`)
        // Task 3 (Home): Home's member count and PI panel both depend on
        // `profile` documents (currentMemberCount, the lab head's own
        // profile) -- a `profile` edit revalidates `/` too.
        revalidatePath(`/`)
        return NextResponse.json({
          success: true,
          message: `Revalidated "${type}" with slug "people"`,
        })
      case 'roleGroup':
        // Task 3 (Home): role groups drive /people's grouping and Home's
        // `currentMemberCount` (which alumni group to exclude) -- both
        // revalidate on a roleGroup edit.
        revalidatePath(`/people`)
        revalidatePath(`/`)
        return NextResponse.json({
          success: true,
          message: `Revalidated "${type}" with slug "people"`,
        })
      case 'siteCopy':
        // Home's hero statement and research fallback read siteCopy.
        revalidatePath(`/`)
        return NextResponse.json({
          success: true,
          message: `Revalidated "${type}" with slug "home"`,
        })
      case 'resource':
        // Task 3: `/resources` lists every resource, Home shows the first
        // one, and a linked publication's page renders that resource's own
        // `ResourceBlock` -- all three revalidate on any `resource` edit.
        // `revalidatePath('/publications/[slug]', 'page')`, not a specific
        // slug: a `resource` document doesn't carry its own linked
        // publication's slug in this webhook payload (only `type`/`slug`,
        // and `resource` has no `slug` field at all -- spec §2 ruling 1),
        // so every publication page revalidates, matching the existing
        // `publication` case's own blanket-page-type call one case above.
        revalidatePath(`/resources`)
        revalidatePath(`/`)
        revalidatePath('/publications/[slug]', 'page')
        return NextResponse.json({
          success: true,
          message: `Revalidated "${type}" with slug "resources"`,
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
