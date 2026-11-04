/**
 * One-off: downloads the full DummyJSON catalog into src/db/seed-data. The result is committed;
 * nothing calls DummyJSON at runtime or in CI. dummyjson.json at the repo root is only an OpenAPI
 * spec and holds no data.
 */
import { writeFile } from 'node:fs/promises'

const base = 'https://dummyjson.com'
const out = new URL('../db/seed-data/', import.meta.url)

async function download(path: string, file: string) {
  const response = await fetch(`${base}${path}`)
  if (!response.ok) throw new Error(`${path} answered ${response.status}`)
  await writeFile(new URL(file, out), `${JSON.stringify(await response.json(), null, 2)}\n`)
}

await download('/products?limit=0', 'products.json')
await download('/products/categories', 'categories.json')
