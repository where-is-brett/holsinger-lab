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
