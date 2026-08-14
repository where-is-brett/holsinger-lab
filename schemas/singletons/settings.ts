import { CogIcon } from '@sanity/icons/Cog'
import { defineArrayMember, defineField, defineType } from 'sanity'

export default defineType({
  name: 'settings',
  title: 'Settings',
  type: 'document',
  icon: CogIcon,
  // Groups render as tabs in Studio. This document is the lab's single
  // site-wide control panel and Phase 4 adds more fields to it, so an
  // ungrouped list would become an unusable wall for a non-technical editor.
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'labHead', title: 'Lab head' },
    { name: 'navigation', title: 'Navigation' },
    { name: 'footer', title: 'Footer' },
  ],
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site name',
      type: 'string',
      group: 'identity',
      description:
        "The full name of the lab, shown in browser tabs, social media share cards and search results. Leave this empty to keep the site's built-in default.",
    }),
    defineField({
      name: 'shortName',
      title: 'Short name',
      type: 'string',
      group: 'identity',
      description:
        'A short version of the name, used where there is little room — the site header and the icon label on a phone home screen. Defaults to the full site name if left empty.',
      validation: (rule) =>
        rule
          .max(20)
          .warning(
            'Longer than 20 characters may not fit in the site header on a phone.'
          ),
    }),
    defineField({
      name: 'ogImage',
      title: 'Open Graph Image',
      type: 'image',
      group: 'identity',
      description: 'Displayed on social cards and search engine results.',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'labHead',
      title: 'Lab head',
      type: 'reference',
      to: [{ type: 'profile' }],
      group: 'labHead',
      description:
        'The lab head, shown in a spotlight at the top of the People page. Leave unset for no spotlight.',
    }),
    defineField({
      name: 'showLabHeadOnHome',
      title: 'Show lab head on the home page',
      type: 'boolean',
      group: 'labHead',
      initialValue: true,
      description:
        'Toggle to show a card about the lab head on the home page, below the research projects. Affects only the home page -- the People page spotlight and the lab head\'s own page (if enabled) are unaffected.',
    }),
    defineField({
      name: 'menuItems',
      title: 'Menu Item list',
      description: 'Links displayed on the header of your site.',
      type: 'array',
      group: 'navigation',
      of: [
        {
          title: 'Reference',
          type: 'reference',
          to: [
            {
              type: 'home',
            },
            {
              type: 'page',
            },
            {
              type: 'project',
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'showPublications',
      title: 'Enable Publications page',
      type: 'boolean',
      group: 'navigation',
      description:
        'Toggle to enable the Publications page in your site. Turning this OFF makes /publications return a 404 — the page disappears from the site entirely, it does not just hide from navigation.',
      initialValue: true,
    }),
    defineField({
      name: 'showPeople',
      title: 'Enable Team page',
      type: 'boolean',
      group: 'navigation',
      description:
        'Toggle to enable the Team page in your site. Turning this OFF makes /people return a 404 — the page disappears from the site entirely, it does not just hide from navigation.',
      initialValue: true,
    }),
    defineField({
      name: 'showContactForm',
      title: 'Enable Contact Us page',
      type: 'boolean',
      group: 'navigation',
      description:
        'Toggle to enable the Contact Us page in your site. Turning this OFF makes /contact return a 404 — the page disappears from the site entirely, it does not just hide from navigation.',
      initialValue: true,
    }),
    defineField({
      name: 'footer',
      description:
        'This is a block of text that will be displayed at the bottom of the page.',
      title: 'Footer Info',
      type: 'array',
      group: 'footer',
      of: [
        defineArrayMember({
          type: 'block',
          marks: {
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'Url',
                  },
                ],
              },
            ],
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      // Was 'Menu Items', which stopped describing this document once it
      // became the site-wide settings singleton.
      return {
        title: 'Settings',
      }
    },
  },
})
