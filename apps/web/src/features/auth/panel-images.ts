/**
 * The decorative product cards on the login and register brand panels. They are static: the pages
 * need no catalog request, and the images are the shop's own transparent product shots.
 */
export interface PanelCard {
  image: string
  title?: string
  priceCents?: number
  oldPriceCents?: number
  rating?: number
}

const CDN = 'https://cdn.dummyjson.com/product-images'

const image = (path: string) => `${CDN}/${path}/thumbnail.webp`

/** The first card is the big one in the middle. */
export const LOGIN_CARDS: PanelCard[] = [
  {
    image: image('fragrances/chanel-coco-noir-eau-de'),
    title: 'Chanel Coco Noir Eau De',
    priceCents: 10853,
    oldPriceCents: 12999,
  },
  { image: image('smartphones/iphone-x') },
  { image: image('womens-bags/prada-women-bag') },
  { image: image('kitchen-accessories/boxed-blender') },
]

export const REGISTER_CARDS: PanelCard[] = [
  {
    image: image('laptops/apple-macbook-pro-14-inch-space-grey'),
    title: 'Apple MacBook Pro 14 Inch',
    priceCents: 190619,
    rating: 4.7,
  },
  { image: image('beauty/red-lipstick') },
  { image: image('mens-shirts/man-plaid-shirt') },
  { image: image('sports-accessories/tennis-racket') },
  { image: image('groceries/nescafe-coffee') },
]
