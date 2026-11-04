import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useCatalog } from '@/features/products/hooks/use-catalog'

import { buildCartItems, cartTotals } from '../selectors'
import { useCart } from './use-cart'

/**
 * The cart joined with the merged catalog (admin price/stock edits show up immediately).
 * Lines whose product was deleted are dropped, and the user is told once.
 */
export function useCartView() {
  const cart = useCart()
  const { t } = useTranslation()
  const catalog = useCatalog()
  const { products } = catalog

  const { items, missing } = useMemo(
    () => (products ? buildCartItems(cart.lines, products) : { items: [], missing: [] }),
    [cart.lines, products],
  )
  const totals = useMemo(() => cartTotals(items), [items])

  const missingKey = missing.join(',')
  const { remove } = cart
  useEffect(() => {
    if (!missingKey) return
    for (const id of missingKey.split(',')) remove(Number(id))
    toast.warning(t('cart.removedMissing'))
  }, [missingKey, remove, t])

  return {
    items,
    totals,
    count: cart.count,
    isPending: catalog.isPending || cart.isPending,
    isError: catalog.isError || cart.isError,
    refetch: () => {
      void catalog.refetch()
      void cart.refetch()
    },
    hasUnavailable: items.some((i) => !i.available),
    setQuantity: cart.setQuantity,
    remove: cart.remove,
    clear: cart.clear,
  }
}
