export type Language = 'tr' | 'en'

const CURRENCY = 'USD'

function locale(language: Language) {
  return language === 'tr' ? 'tr-TR' : 'en-US'
}

export function formatPrice(amount: number, language: Language) {
  return new Intl.NumberFormat(locale(language), {
    style: 'currency',
    currency: CURRENCY,
  }).format(amount)
}

export function formatDate(value: string | Date, language: Language) {
  return new Intl.DateTimeFormat(locale(language), { dateStyle: 'medium' }).format(
    typeof value === 'string' ? new Date(value) : value,
  )
}

/** Integer cents → localized currency. The one place money is formatted for display. */
export function formatMoney(cents: number, language: Language) {
  return formatPrice(cents / 100, language)
}

/** Grams → kilograms for display. */
export function formatWeight(grams: number, language: Language) {
  return `${new Intl.NumberFormat(locale(language), { maximumFractionDigits: 3 }).format(grams / 1000)} kg`
}

/** Millimetres → centimetres for display: `width × height × depth`. */
export function formatDimensions(
  size: { widthMm: number; heightMm: number; depthMm: number },
  language: Language,
) {
  const cm = new Intl.NumberFormat(locale(language), { maximumFractionDigits: 1 })
  return (
    [size.widthMm, size.heightMm, size.depthMm].map((mm) => cm.format(mm / 10)).join(' × ') + ' cm'
  )
}
