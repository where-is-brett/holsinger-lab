import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/*.test.ts'],
    // Bare 'node_modules' only matches a top-level directory of that name.
    // This repo creates git worktrees under .claude/worktrees/, each with its
    // own node_modules and its own copy of every test file, so an unqualified
    // pattern silently pulls another branch's suite into this one's results.
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.claude/**',
      'e2e/**',
    ],
  },
})
