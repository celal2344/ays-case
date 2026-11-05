/**
 * The decorative product cards on the login and register brand panels. They are static: the pages
 * need no catalog request, and the images are the shop's own transparent product shots (the URLs the
 * catalog API returns for a phone, a car, makeup and a cologne).
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

/** The first card is the big one in the middle: a cologne, a phone, a car and some makeup. */
export const LOGIN_CARDS: PanelCard[] = [
  {
    image: image('fragrances/chanel-coco-noir-eau-de'),
    title: 'Chanel Coco Noir Eau De',
    priceCents: 10853,
    oldPriceCents: 12999,
  },
  { image: image('smartphones/iphone-x') },
  { image: image('vehicle/300-touring') },
  { image: image('beauty/red-lipstick') },
]

export const REGISTER_CARDS: PanelCard[] = [
  {
    image: image('smartphones/iphone-13-pro'),
    title: 'iPhone 13 Pro',
    priceCents: 99693,
    rating: 4.1,
  },
  { image: image('beauty/eyeshadow-palette-with-mirror') },
  { image: image('vehicle/charger-sxt-rwd') },
  { image: image('fragrances/gucci-bloom-eau-de') },
  { image: image('beauty/red-lipstick') },
]
