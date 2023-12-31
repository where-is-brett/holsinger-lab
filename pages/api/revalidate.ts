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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { isValidSignature, body } = await parseBody(
      req,
      process.env.SANITY_WEBHOOK_SECRET
    )
    const { type, slug } = body

    if (!isValidSignature) {
      const message = 'Invalid signature'
      console.warn(message)
      res.status(401).json({ message })
      return
    }

    switch (type) {
      case 'page':
        await res.revalidate(`/${slug}`)
        return res.status(200).json({
          success: true,
          message: `Revalidated homepage`,
        })
      case 'project':
        await res.revalidate(`/projects/${slug}`)
        await res.revalidate(`/`)
        return res.status(200).json({
          success: true,
          message: `Revalidated "${type}" with slug "projects/${slug}. Revalidated homepage."`,
        })
      case 'publication':
        await res.revalidate(`/publications`)
        return res.status(200).json({
          success: true,
          message: `Revalidated "${type}" with slug "publications"`,
        })
      case 'profile':
        await res.revalidate(`/people`)
        return res.status(200).json({
          success: true,
          message: `Revalidated "${type}" with slug "people"`,
        })
      // Fallback - revalidate all pages
      default:
        const paths = await getAllPaths()
        await Promise.all(
          paths.map(async (path) => {
            console.log(`Revalidating '${path}'...`)
            return path && (await res.revalidate(path))
          })
        )
        return res.status(200).json({
          success: true,
          message: `Revalidated all pages.`,
        })
    }
  } catch (err) {
    console.error(err)
    return res
      .status(500)
      .json({ success: false, message: 'Error revalidating' })
  }
}
