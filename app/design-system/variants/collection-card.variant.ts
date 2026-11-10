import { cx } from "./shared.variant";

export const collectionCardSizes = {
  userOrder: "h-40 w-80",
  cartLine: "h-24 w-full",
  inPersonLine: "h-32 w-full",
  product: "h-36 w-64",
  discount: "h-28 w-52",
  adminProduct: "h-14 w-60",
  showcaseProduct: "h-14 w-52",
  catalogLink: "h-32 w-36",
  adminBanner: "h-40 w-full",
  review: "h-24 w-full",
  catalogOptionSm: "h-20 w-20",
  catalogOptionMd: "h-24 w-24",
  catalogOptionLg: "h-28 w-28",
} as const;

export type CollectionCardFamily = keyof typeof collectionCardSizes;

/** Geometry belongs to the real card, so loading measures the same final footprint. */
export function collectionCardClasses(family: CollectionCardFamily, className?: string) {
  return cx("min-w-0 max-w-full shrink-0 overflow-hidden", collectionCardSizes[family], className);
}
