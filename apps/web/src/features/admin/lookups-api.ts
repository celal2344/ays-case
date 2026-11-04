import { api, call, callNoContent } from '@/lib/api'

/** One row of any lookup table; the fields a kind does not have are absent. */
export interface LookupRow {
  id: number
  name?: string
  slug?: string
  sortOrder?: number
  label?: string
}

export interface LookupInput {
  name?: string
  slug?: string
  sortOrder?: number
  label?: string
}

export interface LookupApi {
  list: () => Promise<LookupRow[]>
  create: (input: LookupInput) => Promise<LookupRow>
  update: (id: number, input: LookupInput) => Promise<LookupRow>
  remove: (id: number) => Promise<void>
}

const name = (input: LookupInput) => input.name ?? ''
const label = (input: LookupInput) => input.label ?? ''
const withSlug = (input: LookupInput) => (input.slug ? { slug: input.slug } : {})

type Sluggable = typeof api.admin.brands
// the `$path` literal differs per table; the calls below do not use it
type SluggedClient = Pick<Sluggable, '$get' | '$post'> & {
  ':id': Pick<Sluggable[':id'], '$patch' | '$delete'>
}

function sluggedApi(client: SluggedClient): LookupApi {
  return {
    list: async () => (await call(client.$get())).data,
    create: async (input) =>
      (await call(client.$post({ json: { name: name(input), ...withSlug(input) } }), 201)).data,
    update: async (id, input) =>
      (
        await call(
          client[':id'].$patch({
            param: { id: String(id) },
            json: { name: input.name, ...withSlug(input) },
          }),
        )
      ).data,
    remove: (id) => callNoContent(client[':id'].$delete({ param: { id: String(id) } })),
  }
}

type Policy = (typeof api.admin)['warranty-policies']
type PolicyClient = Pick<Policy, '$get' | '$post'> & { ':id': Pick<Policy[':id'], '$patch' | '$delete'> }

function policyApi(client: PolicyClient): LookupApi {
  return {
    list: async () => (await call(client.$get())).data,
    create: async (input) =>
      (await call(client.$post({ json: { label: label(input) } }), 201)).data,
    update: async (id, input) =>
      (
        await call(
          client[':id'].$patch({ param: { id: String(id) }, json: { label: input.label } }),
        )
      ).data,
    remove: (id) => callNoContent(client[':id'].$delete({ param: { id: String(id) } })),
  }
}

const categories: LookupApi = {
  list: async () => (await call(api.admin.categories.$get())).data,
  create: async (input) =>
    (
      await call(
        api.admin.categories.$post({
          json: { name: name(input), ...withSlug(input), sortOrder: input.sortOrder },
        }),
        201,
      )
    ).data,
  update: async (id, input) =>
    (
      await call(
        api.admin.categories[':id'].$patch({
          param: { id: String(id) },
          json: { name: input.name, ...withSlug(input), sortOrder: input.sortOrder },
        }),
      )
    ).data,
  remove: (id) => callNoContent(api.admin.categories[':id'].$delete({ param: { id: String(id) } })),
}

export const lookupApis = {
  categories,
  brands: sluggedApi(api.admin.brands),
  tags: sluggedApi(api.admin.tags),
  'warranty-policies': policyApi(api.admin['warranty-policies']),
  'shipping-policies': policyApi(api.admin['shipping-policies']),
  'return-policies': policyApi(api.admin['return-policies']),
} satisfies Record<string, LookupApi>
