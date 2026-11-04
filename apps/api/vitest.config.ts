import { defineConfig } from 'vitest/config'

// DB tests read DATABASE_URL_SESSION from the shell (CI secret) or the local development file.
try {
  process.loadEnvFile('.env.development')
} catch {
  // no local env file: DB tests are skipped unless the variable is already set
}

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'src/**/test/**/*.test.ts'],
    testTimeout: 30_000,
    // each PGlite test file boots an in-memory Postgres and seeds it; several at once are slow
    hookTimeout: 60_000,
  },
})
