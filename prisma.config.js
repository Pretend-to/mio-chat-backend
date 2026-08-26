import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    url: 'file:./prisma/data/app.db',
  },
  schema: 'prisma/schema.prisma',
})
