import { defineCollection, defineContentConfig } from '@nuxt/content'
import { initiativeSchema } from './shared/schema/initiative'

export default defineContentConfig({
  collections: {
    iniciativas: defineCollection({
      type: 'data',
      source: 'iniciativas/*.yml',
      schema: initiativeSchema,
    }),
    paginas: defineCollection({
      type: 'page',
      source: 'paginas/*.md',
    }),
  },
})
