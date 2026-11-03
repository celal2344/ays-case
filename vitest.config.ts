import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: {
    environment: 'jsdom',
    // same origin as the mocked API, so jsdom XHR does no CORS preflight
    environmentOptions: { jsdom: { url: 'https://dummyjson.com' } },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // generous: full runs on a busy machine make a few of the page tests slow, not wrong
    testTimeout: 20_000,
    env: { VITE_API_BASE_URL: 'https://dummyjson.com' },
  },
})
