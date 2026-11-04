const PLACEHOLDER_ORIGIN = 'http://app.invalid'
const BACKSLASH = String.fromCharCode(92)

const isForbidden = (ch: string) => {
  const code = ch.charCodeAt(0)
  return ch === BACKSLASH || code <= 0x1f || code === 0x7f
}

/**
 * A post-login redirect target is only accepted when it is a path on this site: it starts with a
 * single `/`, has no backslash or control character (browsers read a slash followed by a backslash,
 * or a slash and a tab, as `//`, a host), and resolves to the same origin. Anything else is dropped.
 */
export function safeRedirect(value: string | undefined): string | undefined {
  if (value === undefined || !value.startsWith('/') || value.startsWith('//')) return undefined
  if ([...value].some(isForbidden)) return undefined
  try {
    return new URL(value, PLACEHOLDER_ORIGIN).origin === PLACEHOLDER_ORIGIN ? value : undefined
  } catch {
    return undefined
  }
}
