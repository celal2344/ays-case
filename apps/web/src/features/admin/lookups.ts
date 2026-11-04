import { z } from 'zod'

/** The admin-managed lookup tables: their route id and the fields their form has. */
export const LOOKUP_KINDS = [
  { id: 'categories', fields: ['name', 'slug', 'sortOrder'] },
  { id: 'brands', fields: ['name', 'slug'] },
  { id: 'tags', fields: ['name', 'slug'] },
  { id: 'warranty-policies', fields: ['label'] },
  { id: 'shipping-policies', fields: ['label'] },
  { id: 'return-policies', fields: ['label'] },
] as const

export type LookupKind = (typeof LOOKUP_KINDS)[number]['id']
export type LookupField = 'name' | 'slug' | 'sortOrder' | 'label'

export const isLookupKind = (value: string): value is LookupKind =>
  LOOKUP_KINDS.some((kind) => kind.id === value)

export const fieldsOf = (kind: LookupKind): readonly LookupField[] =>
  LOOKUP_KINDS.find((k) => k.id === kind)!.fields

/** The open dialog is in the URL: `new=1` to create, `edit=<id>` to edit a row. */
export const lookupSearchSchema = z.object({
  new: z.literal(1).optional().catch(undefined),
  edit: z.coerce.number().int().positive().optional().catch(undefined),
})
