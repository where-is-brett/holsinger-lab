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

    const { type } = body ?? { type: undefined }

    const paths = await getAllPaths()
    paths.forEach((path) => revalidatePath(path))
    return NextResponse.json({
      success: true,
      message: `Revalidated ${paths.length} pages (type "${type}").`,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { success: false, message: 'Error revalidating' },
      { status: 500 }
    )
  }
}
