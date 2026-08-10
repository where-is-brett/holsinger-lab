import { getClient } from 'lib/sanity.client'
import { resolveHref } from 'lib/sanity.links'
import { pagePaths, projectPaths } from 'lib/sanity.queries'
import type { PagePathsResult, ProjectPathsResult } from 'sanity.types'

export const getAllPaths = async (
  staticPaths: string[] = ['/', '/publications', '/contact', '/people']
) => {
  const client = getClient()
  const pages = await client.fetch<PagePathsResult>(pagePaths)
  const projects = await client.fetch<ProjectPathsResult>(projectPaths)
  const paths = [
    ...pages
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => resolveHref('page', slug)),
    ...projects
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => resolveHref('project', slug)),
  ]
  return [...staticPaths, ...paths]
}
