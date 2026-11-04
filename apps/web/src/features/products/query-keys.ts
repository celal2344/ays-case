export const productKeys = {
  all: ['products'] as const,
  catalog: () => [...productKeys.all, 'catalog'] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: number) => [...productKeys.details(), id] as const,
  categories: () => [...productKeys.all, 'categories'] as const,
}
