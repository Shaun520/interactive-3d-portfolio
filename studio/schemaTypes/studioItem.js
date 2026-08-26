export default {
  name: 'studioItem',
  title: 'Studio Monitor Content',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'device',
      title: 'Device (Gdzie ma się wyświetlać?)',
      type: 'string',
      options: {
        list: [
          { title: 'Telefon (Pionowe: TikTok, IG, YT Shorts)', value: 'phone' },
          { title: 'Telewizor (Poziome wideo: długi YT, filmy)', value: 'tv' },
          { title: 'Monitor (Tekst/Posty: LinkedIn, X, Blogi, Codrops)', value: 'monitor' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'platform',
      title: 'Platform',
      type: 'string',
      options: {
        list: [
          { title: 'YouTube', value: 'youtube' },
          { title: 'TikTok', value: 'tiktok' },
          { title: 'Instagram', value: 'instagram' },
          { title: 'X (Twitter)', value: 'x' },
          { title: 'LinkedIn', value: 'linkedin' },
          { title: 'Codrops / Forum', value: 'codrops' },
          { title: 'Blog / Artykuł', value: 'blog' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'url',
      title: 'URL',
      type: 'url',
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
      name: 'frontTexture',
      title: 'Front Texture (Unpainted)',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'paintedFrontTexture',
      title: 'Painted Front Texture',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: (Rule) => Rule.required(),
    },
    // Opcjonalne statystyki w zależności od platformy
    {
      name: 'views',
      title: 'Views (e.g. "1.2K")',
      type: 'string',
      hidden: ({ document }) => document?.platform === 'blog',
    },
    {
      name: 'likes',
      title: 'Likes (e.g. "1.2K")',
      type: 'string',
      hidden: ({ document }) => document?.platform !== 'tiktok',
    },
    {
      name: 'duration',
      title: 'Duration (e.g. "15:32")',
      type: 'string',
      hidden: ({ document }) => document?.platform !== 'youtube',
    },
    {
      name: 'readTime',
      title: 'Read Time (e.g. "5 min")',
      type: 'string',
      hidden: ({ document }) => document?.platform !== 'blog',
    },
  ],
};
