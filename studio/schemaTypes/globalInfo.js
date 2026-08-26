export default {
  name: 'globalInfo',
  title: 'Global SEO & Info',
  type: 'document',
  fields: [
    {
      name: 'siteTitle',
      title: 'Site Title (Meta Title)',
      type: 'string',
      description: 'The title of your website for search engines (e.g. ITom - Creative Developer)',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'siteDescription',
      title: 'Site Description (Meta Description)',
      type: 'text',
      description: 'Short summary of the site for search results.',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'aboutMe',
      title: 'About Me (SEO Text)',
      type: 'text',
      description: 'A detailed text about who you are, what you do. This will be injected into the hidden HTML for Google to read.',
    },
    {
      name: 'githubUrl',
      title: 'GitHub URL',
      type: 'url',
    },
    {
      name: 'linkedinUrl',
      title: 'LinkedIn URL',
      type: 'url',
    },
    {
      name: 'xUrl',
      title: 'X (Twitter) URL',
      type: 'url',
    },
    {
      name: 'instagramUrl',
      title: 'Instagram URL',
      type: 'url',
    },
    {
      name: 'tiktokUrl',
      title: 'TikTok URL',
      type: 'url',
    },
    {
      name: 'youtubeUrl',
      title: 'YouTube Channel URL',
      type: 'url',
    }
  ],
};
