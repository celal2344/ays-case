import { MAX_RECENTLY_VIEWED, type CartItem } from '@ays/validators'

import { fixtureProducts } from './products'

type Reply = { status: number; body?: unknown }

const NOT_FOUND = { code: 'not_found', message: 'Product not found' }
const OUT_OF_STOCK = { code: 'out_of_stock', message: 'This product is out of stock' }

const stockOf = (productId: number) => fixtureProducts.find((p) => p.id === productId)?.stock

/**
 * An in-memory copy of the API's cart, favorites and recently viewed rules, per user, for the MSW
 * handlers and the Playwright mock. Every method takes the signed-in user id: nothing is shared.
 */
export class FakeShopping {
  private carts = new Map<string, CartItem[]>()
  private favorites = new Map<string, number[]>()
  private viewed = new Map<string, number[]>()

  reset() {
    this.carts.clear()
    this.favorites.clear()
    this.viewed.clear()
  }

  /** Test setup: puts lines in a user's cart without going through the API. */
  seedCart(userId: string, lines: { productId: number; quantity: number }[]) {
    this.carts.set(
      userId,
      lines.map((l) => ({ ...l, addedAt: new Date().toISOString() })),
    )
  }

  /** Test setup: product ids, newest first. */
  seedFavorites(userId: string, ids: number[]) {
    this.favorites.set(userId, ids)
  }

  /** Test setup: product ids, newest first. */
  seedViewed(userId: string, ids: number[]) {
    this.viewed.set(userId, ids)
  }

  cartOf(userId: string) {
    return this.carts.get(userId) ?? []
  }

  favoritesOf(userId: string) {
    return this.favorites.get(userId) ?? []
  }

  viewedOf(userId: string) {
    return this.viewed.get(userId) ?? []
  }

  getCart(userId: string): Reply {
    return { status: 200, body: { data: this.cartOf(userId) } }
  }

  addToCart(userId: string, productId: number, quantity: number): Reply {
    const stock = stockOf(productId)
    if (stock === undefined) return { status: 404, body: NOT_FOUND }
    if (stock <= 0) return { status: 409, body: OUT_OF_STOCK }
    const lines = this.cartOf(userId)
    const existing = lines.find((l) => l.productId === productId)
    const next = Math.min((existing?.quantity ?? 0) + quantity, stock)
    if (existing) {
      this.carts.set(
        userId,
        lines.map((l) => (l.productId === productId ? { ...l, quantity: next } : l)),
      )
    } else {
      this.carts.set(userId, [
        { productId, quantity: next, addedAt: new Date().toISOString() },
        ...lines,
      ])
    }
    return {
      status: 200,
      body: { data: this.cartOf(userId).find((l) => l.productId === productId) },
    }
  }

  setCartQuantity(userId: string, productId: number, quantity: number): Reply {
    const stock = stockOf(productId)
    if (stock === undefined) return { status: 404, body: NOT_FOUND }
    if (stock <= 0) return { status: 409, body: OUT_OF_STOCK }
    const clamped = Math.min(Math.max(quantity, 1), stock)
    const lines = this.cartOf(userId)
    this.carts.set(
      userId,
      lines.some((l) => l.productId === productId)
        ? lines.map((l) => (l.productId === productId ? { ...l, quantity: clamped } : l))
        : [{ productId, quantity: clamped, addedAt: new Date().toISOString() }, ...lines],
    )
    return {
      status: 200,
      body: { data: this.cartOf(userId).find((l) => l.productId === productId) },
    }
  }

  removeFromCart(userId: string, productId: number): Reply {
    this.carts.set(
      userId,
      this.cartOf(userId).filter((l) => l.productId !== productId),
    )
    return { status: 204 }
  }

  clearCart(userId: string): Reply {
    this.carts.set(userId, [])
    return { status: 204 }
  }

  getFavorites(userId: string): Reply {
    return { status: 200, body: { data: this.favoritesOf(userId) } }
  }

  addFavorite(userId: string, productId: number): Reply {
    if (stockOf(productId) === undefined) return { status: 404, body: NOT_FOUND }
    const ids = this.favoritesOf(userId)
    if (!ids.includes(productId)) this.favorites.set(userId, [productId, ...ids])
    return { status: 204 }
  }

  removeFavorite(userId: string, productId: number): Reply {
    this.favorites.set(
      userId,
      this.favoritesOf(userId).filter((id) => id !== productId),
    )
    return { status: 204 }
  }

  getViewed(userId: string): Reply {
    return { status: 200, body: { data: this.viewedOf(userId) } }
  }

  recordView(userId: string, productId: number): Reply {
    if (stockOf(productId) === undefined) return { status: 404, body: NOT_FOUND }
    const rest = this.viewedOf(userId).filter((id) => id !== productId)
    this.viewed.set(userId, [productId, ...rest].slice(0, MAX_RECENTLY_VIEWED))
    return { status: 204 }
  }

  clearViewed(userId: string): Reply {
    this.viewed.set(userId, [])
    return { status: 204 }
  }
}
