export default {
  name: 'awardCertificate',
  title: 'Award / Certificate',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title (np. nazwa projektu "Young Multi")',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'category',
      title: 'Category (SOTD / SOTM / OTHER)',
      type: 'string',
      options: {
        list: [
          { title: 'Site Of The Day (SOTD)', value: 'sotd' },
          { title: 'Site Of The Month (SOTM)', value: 'sotm' },
          { title: 'Other / Inne', value: 'other' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'seoTitle',
      title: 'SEO Title (Opcjonalnie: długa nazwa dla Google)',
      type: 'string',
      description: 'Jeśli wypełnisz, Google użyje tej nazwy zamiast krótkiego Title.',
    },
    {
      name: 'seoDescription',
      title: 'SEO Description (Opcjonalnie: długi, niewidzialny opis dla Google)',
      type: 'text',
      description: 'Niewidzialny na stronie, ale doskonały dla SEO. Pełen słów kluczowych kontekst.',
    },
    {
      name: 'certificateImage',
      title: 'Certificate Image (Do okienka HTML)',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'date',
      title: 'Date Obtained',
      type: 'date',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'url',
      title: 'Link (URL do strony z nagrodą)',
      type: 'url',
    },
  ],
};
