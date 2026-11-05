import {
  Armchair,
  Bike,
  Car,
  CookingPot,
  Droplets,
  Gem,
  Glasses,
  Handbag,
  Headphones,
  Laptop,
  Lamp,
  Footprints,
  type LucideIcon,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  SprayCan,
  Tablet,
  Tag,
  Watch,
} from 'lucide-react'

import type { GroupId } from '@/features/products/category-groups'

/** One icon per navigation group (category bar, mobile accordion). */
export const GROUP_ICONS: Record<GroupId, LucideIcon> = {
  electronics: Smartphone,
  women: Handbag,
  men: Shirt,
  home: Sofa,
  beauty: Sparkles,
  groceries: ShoppingBasket,
  sports: Bike,
  other: Tag,
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  smartphones: Smartphone,
  laptops: Laptop,
  tablets: Tablet,
  'mobile-accessories': Headphones,
  tops: Shirt,
  'womens-dresses': Shirt,
  'womens-bags': Handbag,
  'womens-jewellery': Gem,
  'womens-shoes': Footprints,
  'womens-watches': Watch,
  'mens-shirts': Shirt,
  'mens-shoes': Footprints,
  'mens-watches': Watch,
  sunglasses: Glasses,
  furniture: Armchair,
  'home-decoration': Lamp,
  'kitchen-accessories': CookingPot,
  beauty: Sparkles,
  fragrances: SprayCan,
  'skin-care': Droplets,
  groceries: ShoppingBasket,
  'sports-accessories': Bike,
  motorcycle: Bike,
  vehicle: Car,
}

/** A category's icon; a category an admin added falls back to a tag. */
export const categoryIcon = (slug: string): LucideIcon => CATEGORY_ICONS[slug] ?? Tag
