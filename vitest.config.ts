import { loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next', 'e2e'],
    env: loadEnv('test', process.cwd(), ''),
  },
})
