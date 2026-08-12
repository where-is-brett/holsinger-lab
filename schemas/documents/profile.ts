import { UserIcon } from '@sanity/icons/User'
import {
  orderRankField,
  orderRankOrdering,
} from '@sanity/orderable-document-list'
import { defineField, defineType } from 'sanity'

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
    }),
  ],
})
