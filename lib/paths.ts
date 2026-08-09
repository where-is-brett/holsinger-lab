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
