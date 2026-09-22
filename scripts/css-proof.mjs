// scripts/css-proof.mjs
//
// Emits the project's generated stylesheet so a task can grep it for the
// declarations its utilities are supposed to produce.
//
// Phase 1 recorded this as a standing rule: a Tailwind utility that is never
// emitted -- a missing `@theme inline` mapping, a `duration-[--x]` bracket
// trap -- is an inert string that passes both `tsc --noEmit` and ESLint in
// silence. The only guard is reading the CSS Tailwind actually generates.
// See docs/redesign-experiment/phase-1-decisions.md, "Two defect classes that
// no guard in this repo can catch".
//
// `npm run build` proves the same thing, but it also statically renders every
// route and so needs network reach to the Sanity dataset. This runs the same
// Tailwind pipeline that `postcss.config.js` gives Next -- same plugin, same
// entry stylesheet, same source scan -- with no data fetching, so the rule
// stays enforceable in an environment that cannot reach the API. It is a
// complement to `npm run build`, not a replacement: it proves what CSS exists,
// and nothing about what the pages render.
//
// Usage:
//   npm run css:proof                 -- write to the default output path
//   npm run css:proof -- --out FILE   -- write somewhere else
//   npm run css:proof -- --grep TEXT  -- print only matching lines, and exit
//                                        non-zero when there are none

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/postcss'
import postcss from 'postcss'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRY = resolve(root, 'styles/index.css')
const DEFAULT_OUT = resolve(root, 'node_modules/.cache/css-proof/index.css')

function arg(flag) {
  const i = process.argv.indexOf(flag)
  return i === -1 ? undefined : process.argv[i + 1]
}

const out = arg('--out') ? resolve(root, arg('--out')) : DEFAULT_OUT
const needle = arg('--grep')

const css = await postcss([tailwindcss()]).process(
  await readFile(ENTRY, 'utf8'),
  {
    from: ENTRY,
    to: out,
  }
)

await mkdir(dirname(out), { recursive: true })
await writeFile(out, css.css, 'utf8')

if (needle === undefined) {
  console.log(`${out}  (${css.css.length} bytes)`)
  process.exit(0)
}

// Rule bodies are what a grep for a declaration needs to see, and Tailwind
// emits them one declaration per line, so plain line matching is enough.
const hits = css.css.split('\n').filter((line) => line.includes(needle))

if (hits.length === 0) {
  console.error(
    `css-proof: no line of the generated stylesheet contains ${JSON.stringify(
      needle
    )}`
  )
  process.exit(1)
}

for (const hit of hits) console.log(hit.trim())
