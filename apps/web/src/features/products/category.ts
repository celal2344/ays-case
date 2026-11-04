/** `home-decoration` → `Home Decoration` (category slugs to display names). */
export function categoryLabel(slug: string) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
