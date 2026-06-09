export type ProductForm = {
  id: number | string;
  showcaseId: string;
  title: string;
  description: string;
  price: string;
  originalPrice: string;
  discountPrice: string;
  discountPercent: string;
  imageUrl: string;
  badge: string;
  ctaLabel: string;
  ctaHref: string;
  active: boolean;
  sortOrder: number;
};

export type ShowcaseForm = {
  id: string;
  title: string;
  active: boolean;
  sortOrder: number;
};

export type BannerForm = {
  id: string;
  title: string;
  imageUrls: string[];
  active: boolean;
  sortOrder: number;
};
