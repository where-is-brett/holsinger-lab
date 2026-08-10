import {
  apiVersion,
  dataset,
  previewSecretId,
  projectId,
  readToken,
  useCdn,
} from 'lib/sanity.api'
import { resolveHref } from 'lib/sanity.links'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { createClient } from 'next-sanity'
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
