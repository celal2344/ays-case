import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const restrict = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
})

const dbClient = {
  regex: '(^|/)db/client$',
  message: 'Only service.ts and repository.ts may touch the database client.',
}
const dbSchema = {
  regex: '(^|/)db/schema(/.*)?$',
  message: 'Table definitions belong in repository.ts.',
}
const drizzle = {
  regex: '^drizzle-orm(/.*)?$',
  message: 'Query building belongs in repository.ts.',
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
    },
  },
  // API layers: routes -> service -> repository (see AGENTS.md, "API layers").
  {
    files: ['**/routes.ts'],
    rules: restrict([
      { ...dbClient, message: 'Routes are HTTP only: call a service function instead.' },
      { ...dbSchema, message: 'Routes are HTTP only: call a service function instead.' },
      { ...drizzle, message: 'Routes are HTTP only: call a service function instead.' },
      { regex: '(^|/)repository$', message: 'Routes call the service, never a repository.' },
    ]),
  },
  {
    files: ['**/service.ts'],
    rules: restrict([
      { ...dbSchema, message: 'Services do not know tables: put the query in repository.ts.' },
      { ...drizzle, message: 'Services do not build queries: put the query in repository.ts.' },
    ]),
  },
  {
    files: ['**/repository.ts'],
    rules: restrict([
      { regex: '^hono(/.*)?$', message: 'Repositories have no HTTP knowledge.' },
      { regex: '(^|/)routes$', message: 'Repositories never import routes.' },
    ]),
  },
])
