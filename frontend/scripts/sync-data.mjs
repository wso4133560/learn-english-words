import { readdir, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../../', import.meta.url))
const source = path.join(root, 'data')
const output = path.join(root, 'frontend/public/word-data')
const catalog = { folders: {} }
const collate = (a, b) => a.localeCompare(b, 'zh-CN')
await mkdir(output, { recursive: true })
for (const folder of (await readdir(source, { withFileTypes: true })).filter((item) => item.isDirectory()).sort((a, b) => collate(a.name, b.name))) {
  const files = (await readdir(path.join(source, folder.name))).filter((file) => file.endsWith('.txt')).sort(collate)
  if (!files.length) continue
  catalog.folders[folder.name] = { files }
  await mkdir(path.join(output, folder.name), { recursive: true })
  for (const file of files) await copyFile(path.join(source, folder.name, file), path.join(output, folder.name, file))
}
// Only remove stale files listed by our previous generated catalog, never source data.
let previous = { folders: {} }
try { previous = JSON.parse(await readFile(path.join(output, 'catalog.json'), 'utf8')) } catch {}
for (const [folder, { files }] of Object.entries(previous.folders)) {
  for (const file of files) {
    const candidate = path.resolve(output, folder, file)
    if (!candidate.startsWith(output + path.sep)) throw new Error('Invalid generated catalog path')
    if (!catalog.folders[folder]?.files.includes(file)) await rm(candidate, { force: true })
  }
}
await writeFile(path.join(output, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n')
console.log(`Bundled ${Object.keys(catalog.folders).length} libraries / ${Object.values(catalog.folders).reduce((n, folder) => n + folder.files.length, 0)} decks`)
