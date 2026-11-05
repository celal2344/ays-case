import { getDb } from '../../../db/client'
import { dbError, duplicateField, toConflict } from '../../../utils/db-errors'
import { AppError, appError } from '../../../utils/errors'
import {
  brandRepository,
  categoryRepository,
  returnRepository,
  shippingRepository,
  tagRepository,
  warrantyRepository,
  type LookupRepository,
} from './repository'

/** `Çanta & Çocuk` → `canta-cocuk`; used when a slug is not given. */
export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** A duplicate name, slug or label as the 409 the client gets; anything else via `dbError`. */
function writeError(error: unknown, op: string, what: string, meta: Record<string, unknown>) {
  if (error instanceof AppError) return error
  const conflict = toConflict(error)
  const where = `admin.lookups.${op}`
  if (conflict?.kind === 'duplicate') {
    const field = duplicateField(conflict.constraint)
    const message = `${what} with this ${field} already exists`
    return appError('duplicate', message, where, { ...meta, field })
  }
  if (conflict?.kind === 'in_use') {
    return appError('in_use', `${what} is still used by products`, where, meta)
  }
  return dbError(error, where, meta)
}

/** A lookup kind: its repository plus how request input becomes stored values. */
interface LookupKind<Row, Create, Patch, Values, Set> {
  what: string
  repository: LookupRepository<Row, Values, Set>
  toCreate: (input: Create) => Values
  toSet: (patch: Patch) => Set
}

export function lookupService<Row, Create, Patch, Values, Set>(
  kind: LookupKind<Row, Create, Patch, Values, Set>,
) {
  const { what, repository } = kind
  const missing = (op: string, id: number) =>
    appError('not_found', `${what} not found`, `admin.lookups.${op}`, { what, id })
  return {
    list: () => repository.list(getDb()),
    async create(input: Create): Promise<Row> {
      try {
        return await repository.create(getDb(), kind.toCreate(input))
      } catch (error) {
        throw writeError(error, 'create', what, { what })
      }
    },
    async update(id: number, patch: Patch): Promise<Row> {
      try {
        const row = await repository.update(getDb(), id, kind.toSet(patch))
        if (!row) throw missing('update', id)
        return row
      } catch (error) {
        throw writeError(error, 'update', what, { what, id })
      }
    },
    async remove(id: number): Promise<void> {
      const db = getDb()
      if (await repository.inUse(db, id)) {
        const message = `${what} is still used by products`
        throw appError('in_use', message, 'admin.lookups.remove', { what, id })
      }
      try {
        if (!(await repository.remove(db, id))) throw missing('remove', id)
      } catch (error) {
        throw writeError(error, 'remove', what, { what, id })
      }
    },
  }
}

type SluggedCreate = { name: string; slug?: string | undefined; sortOrder?: number | undefined }
type SluggedPatch = Partial<SluggedCreate>
const slugOf = (input: SluggedPatch) =>
  input.slug ?? (input.name === undefined ? undefined : slugify(input.name))

const slugSet = (patch: SluggedPatch) => ({
  ...(patch.name === undefined ? {} : { name: patch.name }),
  ...(slugOf(patch) === undefined ? {} : { slug: slugOf(patch)! }),
})

export const categoryService = lookupService({
  what: 'Category',
  repository: categoryRepository,
  toCreate: (input: SluggedCreate) => ({
    name: input.name,
    slug: slugOf(input) ?? slugify(input.name),
    sortOrder: input.sortOrder ?? 0,
  }),
  toSet: (patch: SluggedPatch) => ({
    ...slugSet(patch),
    ...(patch.sortOrder === undefined ? {} : { sortOrder: patch.sortOrder }),
  }),
})

const slugged = <Row>(
  what: string,
  repository: LookupRepository<
    Row,
    { name: string; slug: string },
    Partial<{ name: string; slug: string }>
  >,
) =>
  lookupService({
    what,
    repository,
    toCreate: (input: SluggedCreate) => ({
      name: input.name,
      slug: slugOf(input) ?? slugify(input.name),
    }),
    toSet: (patch: SluggedPatch) => slugSet(patch),
  })

export const brandService = slugged('Brand', brandRepository)
export const tagService = slugged('Tag', tagRepository)

const policy = (what: string, repository: typeof warrantyRepository) =>
  lookupService({
    what,
    repository,
    toCreate: (input: { label: string }) => input,
    toSet: (patch: Partial<{ label: string }>) => patch,
  })

export const warrantyService = policy('Warranty policy', warrantyRepository)
export const shippingService = policy('Shipping policy', shippingRepository)
export const returnService = policy('Return policy', returnRepository)
