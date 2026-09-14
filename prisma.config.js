import { defineConfig } from 'prisma/config'
import { resolveDatabasePath } from './lib/database/databasePath.js'

export default defineConfig({
  datasource: {
    url: `file:${resolveDatabasePath()}`,
  },
  schema: 'prisma/schema.prisma',
})
