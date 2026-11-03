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
