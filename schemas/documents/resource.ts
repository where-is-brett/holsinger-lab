import { CogIcon } from '@sanity/icons/Cog'
import { defineArrayMember, defineField, defineType } from 'sanity'

// Fields per the agreed IA (docs/redesign-experiment/design-system/agreed-ia.md
// section 2): title, kind, summary, linked publication, how to obtain.
//
// The IA is explicit that this type "launches with exactly one item" -- the
// electrical-stimulation cell-culture chamber -- and equally explicit not to pad
// it. So there is deliberately no slug field: the IA gives `publication` its own
// page and says nothing of the sort for `resource`, which appears as a block on
// the Resources page. Phase 3 can add a slug if it decides resources need routes.

export const RESOURCE_KINDS = [
  'hardware',
  'protocol',
  'software',
  'dataset',
] as const

export default defineType({
  type: 'document',
  name: 'resource',
  title: 'Resource',
  icon: CogIcon,
  preview: {
    select: { title: 'title', subtitle: 'kind' },
  },
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description:
        'What the resource is called, e.g. "Electrical-stimulation cell-culture chamber".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      description:
        'What sort of resource this is. Shown as the label on the resource block.',
      options: {
        list: RESOURCE_KINDS.map((kind) => ({ title: kind, value: kind })),
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      description:
        'A short plain-language description -- what it is and what it is for. One or two sentences.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publication',
      title: 'Source paper',
      type: 'reference',
      to: [{ type: 'publication' }],
      description:
        "The publication this resource comes from. This is the only place the resource/publication link is stored -- a publication's resources are read back from here, so there is nothing to keep in sync.",
    }),
    defineField({
      name: 'howToObtain',
      title: 'How to obtain',
      type: 'array',
      description:
        'How someone gets hold of it -- a repository link, a request address, licence terms. Links are supported.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [],
          lists: [],
          marks: {
            decorators: [
              { title: 'Italic', value: 'em' },
              { title: 'Strong', value: 'strong' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [{ name: 'href', type: 'url', title: 'Url' }],
              },
            ],
          },
        }),
      ],
    }),
  ],
})
