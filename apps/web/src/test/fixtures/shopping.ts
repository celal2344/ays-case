import {
  MAX_RECENTLY_VIEWED,
  salePriceCents,
  type CartItem,
  type Order,
  type Product,
  type ProductDetail,
  type Review,
  type Shipping,
} from '@ays/validators'

import { fixtureProducts } from './products'
import { fixtureUserList } from './users'

type Reply = { status: number; body?: unknown }

const NOT_FOUND = { code: 'not_found', message: 'Product not found' }
const OUT_OF_STOCK = { code: 'out_of_stock', message: 'This product is out of stock' }

/** The fixture detail's own review (author user-5) has an id ending in 1; it is not owned by a test user. */
const isFixtureReview = (id: number) => id < 900_000

/**
 * An in-memory copy of the API's cart, favorites, recently viewed, orders and reviews rules, per
 * user, for the MSW handlers and the Playwright mock. Every method takes the signed-in user id:
 * nothing is shared between users.
 */
export class FakeShopping {
  private bought = new Map<number, number>() // units taken by checkouts, per product
  private orders = new Map<string, Order[]>()
  private reviews = new Map<number, Review[]>() // created here, per product
  private reviewOwners = new Map<number, { userId: string; productId: number }>()
  private removedReviews = new Set<number>()
  private nextReviewId = 900_000
  private carts = new Map<string, CartItem[]>()
  private favorites = new Map<string, number[]>()
  private viewed = new Map<string, number[]>()

  /** The server's stock for a fixture product: its fixture stock minus what checkouts took. */
  private stockOf(productId: number) {
    const base = fixtureProducts.find((p) => p.id === productId)?.stock
    return base === undefined ? undefined : base - (this.bought.get(productId) ?? 0)
  }

  /** A catalog product as the server would send it now (stock and availability after checkouts). */
  withStock<T extends Product>(product: T): T {
    const stock = this.stockOf(product.id) ?? product.stock
    const availability = stock <= 0 ? 'out' : stock <= product.lowStockThreshold ? 'low' : 'in'
    return { ...product, stock, availability }
  }

  /** A product detail with reviews created or deleted here, and the rating figures recomputed. */
  withReviews(detail: ProductDetail): ProductDetail {
    const kept = detail.reviews.filter((r) => !this.removedReviews.has(r.id))
    const reviews = [...(this.reviews.get(detail.id) ?? []), ...kept]
    const histogram = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    for (const r of reviews) histogram[String(r.rating) as keyof typeof histogram] += 1
    const total = reviews.reduce((sum, r) => sum + r.rating, 0)
    return {
      ...this.withStock(detail),
      reviews,
      reviewCount: reviews.length,
      rating: reviews.length === 0 ? null : Math.round((total / reviews.length) * 10) / 10,
      ratingHistogram: histogram,
    }
  }

  reset() {
    this.bought.clear()
    this.orders.clear()
    this.reviews.clear()
    this.reviewOwners.clear()
    this.removedReviews.clear()
    this.nextReviewId = 900_000
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

  /** Test setup: leaves only `remaining` units on the server (someone else bought the rest). */
  setServerStock(productId: number, remaining: number) {
    const base = fixtureProducts.find((p) => p.id === productId)?.stock ?? 0
    this.bought.set(productId, base - remaining)
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

  ordersOf(userId: string) {
    return this.orders.get(userId) ?? []
  }

  getCart(userId: string): Reply {
    return { status: 200, body: { data: this.cartOf(userId) } }
  }

  addToCart(userId: string, productId: number, quantity: number): Reply {
    const stock = this.stockOf(productId)
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
    const stock = this.stockOf(productId)
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
    if (this.stockOf(productId) === undefined) return { status: 404, body: NOT_FOUND }
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
    if (this.stockOf(productId) === undefined) return { status: 404, body: NOT_FOUND }
    const rest = this.viewedOf(userId).filter((id) => id !== productId)
    this.viewed.set(userId, [productId, ...rest].slice(0, MAX_RECENTLY_VIEWED))
    return { status: 204 }
  }

  clearViewed(userId: string): Reply {
    this.viewed.set(userId, [])
    return { status: 204 }
  }

  placeOrder(userId: string, shipping: Shipping): Reply {
    const cart = this.cartOf(userId)
    if (cart.length === 0) {
      return { status: 422, body: { code: 'cart_empty', message: 'Your cart is empty' } }
    }
    for (const line of cart) {
      const stock = this.stockOf(line.productId)
      const title = fixtureProducts.find((p) => p.id === line.productId)?.title ?? 'A product'
      if (stock === undefined) {
        return {
          status: 409,
          body: { code: 'product_unavailable', message: `${title} is no longer available` },
        }
      }
      if (line.quantity > stock) {
        return {
          status: 409,
          body: { code: 'insufficient_stock', message: `Not enough stock for ${title}` },
        }
      }
    }
    const lines = cart.map((line) => {
      const product = fixtureProducts.find((p) => p.id === line.productId)!
      return {
        productId: product.id,
        title: product.title,
        thumbnail: product.thumbnail,
        listCents: product.priceCents,
        unitCents: salePriceCents(product),
        discountPercentage: product.discountPercentage,
        quantity: line.quantity,
      }
    })
    const subtotalCents = lines.reduce((sum, l) => sum + l.listCents * l.quantity, 0)
    const totalCents = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0)
    const order: Order = {
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
      lines,
      totals: { subtotalCents, discountCents: subtotalCents - totalCents, totalCents },
      shipping,
    }
    for (const line of cart) {
      this.bought.set(line.productId, (this.bought.get(line.productId) ?? 0) + line.quantity)
    }
    this.orders.set(userId, [order, ...this.ordersOf(userId)])
    this.carts.set(userId, [])
    return { status: 201, body: { data: order } }
  }

  getOrders(userId: string): Reply {
    return { status: 200, body: { data: this.ordersOf(userId) } }
  }

  getOrder(userId: string, id: string): Reply {
    const order = this.ordersOf(userId).find((o) => o.id === id)
    return order
      ? { status: 200, body: { data: order } }
      : { status: 404, body: { code: 'not_found', message: 'Order not found' } }
  }

  myReviewedIds(userId: string): Reply {
    const ids = [...this.reviews]
      .filter(([, list]) => list.some((r) => r.author.id === userId))
      .map(([productId]) => productId)
    return { status: 200, body: { data: ids } }
  }

  private isVerified(userId: string, productId: number) {
    return this.ordersOf(userId).some((o) => o.lines.some((l) => l.productId === productId))
  }

  createReview(
    userId: string,
    productId: number,
    body: { rating: number; comment: string },
  ): Reply {
    if (this.stockOf(productId) === undefined) return { status: 404, body: NOT_FOUND }
    const taken = (this.reviews.get(productId) ?? []).some((r) => r.author.id === userId)
    if (taken) {
      return {
        status: 409,
        body: { code: 'review_exists', message: 'You already reviewed this product' },
      }
    }
    const author = fixtureUserList.find((u) => u.id === userId)
    const now = new Date().toISOString()
    const review: Review = {
      id: this.nextReviewId++,
      rating: body.rating,
      comment: body.comment,
      createdAt: now,
      updatedAt: now,
      author: { id: userId, name: `${author?.firstName} ${author?.lastName}` },
      verifiedBuyer: this.isVerified(userId, productId),
    }
    this.reviews.set(productId, [review, ...(this.reviews.get(productId) ?? [])])
    this.reviewOwners.set(review.id, { userId, productId })
    return { status: 201, body: { data: review } }
  }

  patchReview(userId: string, id: number, body: { rating?: number; comment?: string }): Reply {
    const owner = this.reviewOwners.get(id)
    if (!owner) return { status: 404, body: { code: 'not_found', message: 'Review not found' } }
    if (owner.userId !== userId) {
      return { status: 403, body: { code: 'forbidden', message: 'This is not your review' } }
    }
    const next = (this.reviews.get(owner.productId) ?? []).map((r) =>
      r.id === id ? { ...r, ...body, updatedAt: new Date().toISOString() } : r,
    )
    this.reviews.set(owner.productId, next)
    return { status: 200, body: { data: next.find((r) => r.id === id) } }
  }

  deleteReview(userId: string, isAdmin: boolean, id: number): Reply {
    const owner = this.reviewOwners.get(id)
    if (!owner && !isFixtureReview(id)) {
      return { status: 404, body: { code: 'not_found', message: 'Review not found' } }
    }
    if (owner?.userId !== userId && !isAdmin) {
      return { status: 403, body: { code: 'forbidden', message: 'This is not your review' } }
    }
    this.removedReviews.add(id)
    if (owner) {
      this.reviews.set(
        owner.productId,
        (this.reviews.get(owner.productId) ?? []).filter((r) => r.id !== id),
      )
    }
    return { status: 204 }
  }
}
