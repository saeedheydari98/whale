export type AdminCatalogSection = "products" | "banners" | "showcases" | "categories" | "brands" | "storefront";

export type ProductRelationMode = "category" | "showcase";

export type StorefrontLayoutTab = "home" | "categories" | "products";

export type ProductForm = {
  id: number | string;
  showcaseId: string;
  showcaseIds: string[];
  title: string;
  description: string;
  slug: string;
  price: string;
  originalPrice: string;
  discountPrice: string;
  discountPercent: string;
  imageUrl: string;
  images: string[];
  videoUrl: string;
  badge: string;
  ctaLabel: string;
  ctaHref: string;
  active: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isAvailable: boolean;
  stockQuantity: number;
  stockStatus: string;
  minOrder: number;
  maxOrder: number;
  weight: string;
  length: string;
  width: string;
  height: string;
  salesCount: number;
  views: number;
  wishlistCount: number;
  ratingAverage: string;
  ratingCount: number;
  discountStartAt: string;
  discountEndAt: string;
  categoryId: string;
  categoryIds: string[];
  manufactureYear: string;
  brand: string;
  vendor: string;
  sku: string;
  barcode: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  placement: string;
  publishedAt: string;
  deletedAt: string;
  colorStock: Record<string, number>;
  sortOrder: number;
};

export type ShowcaseForm = {
  id: string;
  title: string;
  active: boolean;
  mode: "manual" | "auto";
  autoSort: string;
  limit: number;
  categoryId: string;
  manualProductIds: Array<number | string>;
  productCount?: number;
  sortOrder: number;
};

export type CategoryForm = {
  id: string;
  groupId: string;
  title: string;
  slug: string;
  imageUrl: string;
  active: boolean;
  productCount?: number;
  sortOrder: number;
  pageSortOrder: number;
};

export type BrandForm = {
  id: string;
  groupId: string;
  title: string;
  slug: string;
  imageUrl: string;
  active: boolean;
  productCount?: number;
  sortOrder: number;
  homeSortOrder: number;
};

export type CatalogLinkGroupForm = {
  id: string;
  title: string;
  active: boolean;
  sortOrder: number;
};

export type BannerForm = {
  id: string;
  title: string;
  showcaseId: string;
  imageUrls: string[];
  active: boolean;
  showOnHome: boolean;
  showOnShowcase: boolean;
  showOnCategories: boolean;
  showOnProducts: boolean;
  intervalSeconds: number;
  heightPercent: number;
  homeSortOrder: number;
  showcaseSortOrder: number;
  categorySortOrder: number;
  productSortOrder: number;
  sortOrder: number;
};

export type StorefrontDisplayEntry =
  | {
      type: "banner";
      item: BannerForm;
      sortOrder: number;
    }
  | {
      type: "showcase";
      item: ShowcaseForm;
      sortOrder: number;
    }
  | {
      type: "categoryGroup" | "brandGroup";
      item: Pick<CatalogLinkGroupForm, "id" | "title" | "sortOrder">;
      sortOrder: number;
    };
