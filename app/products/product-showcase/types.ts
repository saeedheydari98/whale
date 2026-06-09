export type Product = {
  id?: number | string;
  showcaseId?: string;
  title: string;
  description: string;
  price: string;
  originalPrice?: string;
  discountPrice?: string;
  discountPercent?: number | string;
  imageUrl?: string;
  badge?: string;
  ctaLabel?: string;
  ctaHref?: string;
  active: boolean;
  sortOrder: number;
};

export type Showcase = {
  id: string;
  title: string;
  active: boolean;
  sortOrder: number;
};

export type Banner = {
  id: string;
  title: string;
  imageUrls: string[];
  active: boolean;
  sortOrder: number;
};
