import { defineField, defineType } from 'sanity';
import { UserIcon } from '@sanity/icons'
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list';

export default defineType({
    type: 'document',
    name: 'profile',
    title: 'People',
    icon: UserIcon,
    orderings: [orderRankOrdering],
    fields: [
        
        orderRankField({ 
            type: 'profile'
        }),
        
        defineField({
            name: 'image',
            title: 'Image',
            type: 'image',
            description: 'Upload a profile picture',
            options: {
                hotspot: true,
            }
        }),
        defineField({
            name: 'name',
            title: 'Name',
            type: 'string',
            description: "Enter the full name",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'role',
            title: 'Role',
            type: 'string',
            description: 'Short description of role in lab',
            validation: (Rule) => Rule.required(),
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
});
