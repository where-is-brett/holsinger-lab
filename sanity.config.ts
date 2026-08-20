import { colorInput } from '@sanity/color-input'
import { apiVersion, dataset, previewSecretId, projectId } from 'lib/sanity.api'
import { doiLookupPlugin } from 'plugins/doiLookupAction'
import { previewDocumentNode } from 'plugins/previewPane'
import { productionUrl } from 'plugins/productionUrl'
import { pageStructure, singletonPlugin } from 'plugins/settings'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { unsplashImageAsset } from 'sanity-plugin-asset-source-unsplash'
import { media } from 'sanity-plugin-media'
import page from 'schemas/documents/page'
import profile from 'schemas/documents/profile'
import project from 'schemas/documents/project'
import publication from 'schemas/documents/publication'
import resource from 'schemas/documents/resource'
import roleGroup from 'schemas/documents/roleGroup'
import duration from 'schemas/objects/duration'
import milestone from 'schemas/objects/milestone'
import timeline from 'schemas/objects/timeline'
import home from 'schemas/singletons/home'
import settings from 'schemas/singletons/settings'

const title = process.env.NEXT_PUBLIC_SANITY_PROJECT_TITLE || 'HOLSINGER LAB'

export const PREVIEWABLE_DOCUMENT_TYPES: string[] = [
  home.name,
  page.name,
  project.name,
  settings.name,
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
      resource,
      profile,
      roleGroup,
    ],
  },
  plugins: [
    structureTool({
      structure: pageStructure([home, settings]),
      defaultDocumentNode: previewDocumentNode({ apiVersion, previewSecretId }),
    }),
    media(),
    colorInput(),
    singletonPlugin([home.name, settings.name]),
    doiLookupPlugin(),
    productionUrl({
      apiVersion,
      previewSecretId,
      types: PREVIEWABLE_DOCUMENT_TYPES,
    }),
    unsplashImageAsset(),
  ],
})
