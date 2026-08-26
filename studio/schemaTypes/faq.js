export default {
  name: 'faq',
  title: 'Frequently Asked Questions',
  type: 'document',
  fields: [
    {
      name: 'question',
      title: 'Question',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'answer',
      title: 'Answer',
      type: 'text',
      validation: (Rule) => Rule.required(),
    },
  ],
};
