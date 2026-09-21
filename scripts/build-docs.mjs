// Assemble the documentation site into ./site :
//   site/            <- everything from docs/
//   site/dist/       <- the freshly built library bundle
// Cross-platform (used both locally on Windows and in CI on Linux).
import { rm, mkdir, cp, access } from 'node:fs/promises'

const OUT = 'site'

try {
  await access('dist')
} catch {
  console.error('dist/ not found — run "npm run build" first.')
  process.exit(1)
}

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })
await cp('docs', OUT, { recursive: true })
await cp('dist', `${OUT}/dist`, { recursive: true })

console.log(`Docs assembled in ./${OUT} (docs/ + dist/).`)
