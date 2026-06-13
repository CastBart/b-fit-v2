import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Mirror the "@/*" -> "src/*" path alias from tsconfig.json.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Allow describe/it/expect/beforeEach without explicit imports.
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
