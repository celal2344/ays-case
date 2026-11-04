import { PRODUCT_SECTIONS, productFormSchema, type ProductFormValues } from './schemas'

export { PRODUCT_SECTIONS }
export type ProductSection = (typeof PRODUCT_SECTIONS)[number]
/** Creating adds a last `review` step. */
export const CREATE_STEPS = [...PRODUCT_SECTIONS, 'review'] as const
export type CreateStep = (typeof CREATE_STEPS)[number]

type FieldName = keyof ProductFormValues

/** Which section each form field lives in (used to validate a step and to flag a section in the menu). */
export const SECTION_FIELDS: Record<ProductSection, readonly FieldName[]> = {
  general: ['title', 'description', 'sku', 'barcode', 'categoryId', 'brandId'],
  pricing: ['price', 'discountPercentage', 'stock', 'lowStockThreshold', 'minimumOrderQuantity'],
  size: [
    'weightKg',
    'widthCm',
    'heightCm',
    'depthCm',
    'warrantyPolicyId',
    'shippingPolicyId',
    'returnPolicyId',
  ],
  tags: ['tagIds'],
  images: ['images', 'primaryImage'],
}

/** Messages (i18n keys) per top-level field; an image error is reported under `images`. */
export type FieldIssues = Partial<Record<FieldName, string[]>>

export function validateProductForm(values: ProductFormValues): {
  issues: FieldIssues
  /** The image rows with a problem, so the message can sit under the right input. */
  imageRows: Record<number, string>
} {
  const result = productFormSchema.safeParse(values)
  const issues: FieldIssues = {}
  const imageRows: Record<number, string> = {}
  if (result.success) return { issues, imageRows }
  for (const issue of result.error.issues) {
    const field = issue.path[0] as FieldName
    ;(issues[field] ??= []).push(issue.message)
    if (field === 'images' && typeof issue.path[1] === 'number') {
      imageRows[issue.path[1]] = issue.message
    }
  }
  return { issues, imageRows }
}

/** The sections that contain at least one of the invalid fields, in menu order. */
export function sectionsWithIssues(issues: FieldIssues): ProductSection[] {
  return PRODUCT_SECTIONS.filter((section) =>
    SECTION_FIELDS[section].some((field) => (issues[field]?.length ?? 0) > 0),
  )
}

export const hasIssues = (issues: FieldIssues, section: ProductSection) =>
  SECTION_FIELDS[section].some((field) => (issues[field]?.length ?? 0) > 0)
