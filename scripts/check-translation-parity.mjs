// Fails when en.ts and tr.ts do not have exactly the same keys.
// Node strips the TypeScript types on import (Node >= 24).
const { en } = await import('../src/i18n/locales/en.ts')
const { tr } = await import('../src/i18n/locales/tr.ts')

function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, v]) =>
    typeof v === 'object' && v !== null ? flatten(v, `${prefix}${key}.`) : [`${prefix}${key}`],
  )
}

const enKeys = new Set(flatten(en))
const trKeys = new Set(flatten(tr))
const missingInTr = [...enKeys].filter((k) => !trKeys.has(k))
const extraInTr = [...trKeys].filter((k) => !enKeys.has(k))

if (missingInTr.length || extraInTr.length) {
  if (missingInTr.length) console.error('Missing in tr.ts:', missingInTr.join(', '))
  if (extraInTr.length) console.error('Only in tr.ts:', extraInTr.join(', '))
  process.exit(1)
}
console.log(`check:translations: ${enKeys.size} keys, en and tr match`)
