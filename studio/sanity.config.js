import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Portfolio Studio',

  projectId: 'kv5wjjmj',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Global SEO & Info')
              .id('globalInfo')
              .child(
                S.document()
                  .schemaType('globalInfo')
                  .documentId('globalInfo')
              ),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (listItem) => !['globalInfo'].includes(listItem.getId())
            ),
          ]),
    }),
    visionTool()
  ],

  schema: {
    types: schemaTypes,
  },
})
