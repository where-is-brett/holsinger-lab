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
    { name: 'branding', title: 'Branding' },
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
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'branding',
      // No `hotspot`: the logo is rendered whole at a fixed height, never
      // cropped to a box, so a crop UI would only offer a way to break it.
      description:
        'Shown in the site header. Any shape works — the site scales it to fit the header and works out the width itself. Leave empty to show the site’s short name in a box instead.',
    }),
    defineField({
      name: 'logoDark',
      title: 'Logo (dark mode)',
      type: 'image',
      group: 'branding',
      description:
        'Optional. Used instead of Logo when the visitor’s device is set to dark mode — useful if your logo is dark-coloured and would disappear. Leave empty to use the same logo in both.',
    }),
    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'image',
      group: 'branding',
      // No `hotspot`: rendered as a small square (browser tab, phone home
      // screen) at several fixed sizes, the same reasoning as `logo` having
      // none.
      description:
        'A square image for browser tabs and when the site is saved to a phone home screen. Leave empty to use the site’s built-in icon.',
    }),
    defineField({
      name: 'brandColor',
      title: 'Brand colour',
      type: 'color',
      group: 'branding',
      // No alpha: a semi-transparent token has no defined contrast against a
      // surface, which is the one property this whole feature guarantees.
      options: { disableAlpha: true },
      description:
        'Your lab’s main colour, used for links and small accents. The site works out readable shades of it automatically for both light and dark mode, so any colour you pick here stays legible. Leave empty to keep the site’s built-in colours.',
    }),
    defineField({
      name: 'theme',
      title: 'Background tone',
      type: 'string',
      group: 'branding',
      initialValue: 'default',
      options: {
        list: [
          { title: 'Default — cool grey', value: 'default' },
          { title: 'Warm — cream and ink', value: 'warm' },
        ],
        layout: 'radio',
      },
      description:
        'The overall page tone. This changes only the greys — your brand colour is unaffected.',
    }),
    defineField({
      name: 'labHead',
      title: 'Lab head',
      type: 'reference',
      to: [{ type: 'profile' }],
      group: 'labHead',
      description:
        'The lab head, shown in a spotlight at the top of the People page and optionally on the home page (toggles below). Leave unset for no spotlight anywhere.',
    }),
    defineField({
      name: 'showLabHeadOnPeople',
      title: 'Show lab head spotlight on the People page',
      type: 'boolean',
      group: 'labHead',
      initialValue: true,
      description:
        'Toggle to show the lab head spotlight at the top of the People page. Turning this off removes them from the People page entirely -- they won\'t appear in the regular grid either. Affects only the People page -- the home page card and the lab head\'s own page (if enabled) are unaffected.',
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
