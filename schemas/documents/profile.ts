import { UserIcon } from '@sanity/icons/User'
import {
  orderRankField,
  orderRankOrdering,
} from '@sanity/orderable-document-list'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { slugify, validateSlugFormat } from 'schemas/lib/slug'

export default defineType({
  type: 'document',
  name: 'profile',
  title: 'People',
  icon: UserIcon,
  orderings: [orderRankOrdering],
  preview: {
    select: { title: 'name', subtitle: 'role', media: 'image' },
  },
  fields: [
    orderRankField({
      type: 'profile',
    }),

    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      description: 'Upload a profile picture',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Enter the full name',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description:
        'Short free-text description shown on this person\'s card, e.g. "Honours Student (BioMedEng)". Does not affect grouping on the People page -- set Role Group below for that.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'roleGroup',
      title: 'Role Group',
      type: 'reference',
      to: [{ type: 'roleGroup' }],
      description:
        'Groups this person on the public People page. Manage the list of groups (add, rename, reorder, delete) from the "Role Groups" entry in the Studio sidebar. Leave unset to show under "Other".',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'email',
      description: 'Optional: enter an email address',
    }),
    defineField({
      name: 'phone',
      title: 'Contact Number',
      type: 'string',
      description: 'Optional: enter a contact number',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      description:
        'Short blurb, one or two sentences. Shown on this person\'s card on the People page (behind the "+" button), and as the body text if they are the Lab Head\'s home-page card. For a long-form biography, use Full biography below.',
    }),
    defineField({
      name: 'fullBio',
      title: 'Full biography',
      type: 'array',
      description:
        'Long-form biography. Shown on this person\'s own page, and in the spotlight if they are set as the Lab Head in Settings.',
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
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'Used in this person\'s page URL: /people/<slug>. Required once "Give this person their own page" below is turned on.',
      options: {
        source: 'name',
        maxLength: 96,
        slugify,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) =>
        rule.custom((slug, context) => {
          const formatResult = validateSlugFormat(slug)
          if (formatResult !== true) {
            return formatResult
          }
          const hasPage = (
            context.parent as { hasPage?: boolean } | undefined
          )?.hasPage
          if (hasPage && !slug?.current) {
            return 'A slug is required when "Give this person their own page" is enabled.'
          }
          return true
        }),
    }),
    defineField({
      name: 'hasPage',
      title: 'Give this person their own page',
      type: 'boolean',
      initialValue: false,
      description:
        'When on, this person gets their own page at /people/<slug>, using the slug above.',
    }),
  ],
})
