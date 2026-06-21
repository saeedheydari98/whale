import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const authRegisterSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8),
  name: z.string().trim().min(1).optional(),
});

export const authLoginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

export const resetRequestSchema = z.object({
  email: z.email().trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  password: z.string().min(8),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  nationalId: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  avatarUrl: z.string().trim().optional().nullable(),
  isAdminUnlocked: z.boolean().optional(),
});

export const avatarSchema = z.object({
  avatarUrl: z.string().trim().min(1),
});

export const themeSchema = z.object({
  primary: z.string().trim().optional(),
  preferredColor: z.string().trim().optional(),
  style: z.string().trim().optional(),
  tone: z.coerce.number().int().optional(),
  density: z.string().trim().optional(),
  isColorPanelLocked: z.boolean().optional(),
});

export const bannerSchema = z.object({
  title: z.string().trim().optional().nullable(),
  showcaseId: z.string().trim().optional().nullable(),
  imageUrls: z.array(z.string().trim()).optional(),
  images: z.unknown().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const showcaseSchema = z.object({
  title: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const productSchema = z.object({
  showcaseId: z.string().trim().optional().nullable(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  slug: z.string().trim().optional().nullable(),
  price: z.string().trim().min(1),
  originalPrice: z.string().trim().optional().nullable(),
  discountPrice: z.string().trim().optional().nullable(),
  discountPercent: z.coerce.number().int().min(0).optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  images: z.array(z.string().trim()).optional(),
  videoUrl: z.string().trim().optional().nullable(),
  badge: z.string().trim().optional().nullable(),
  ctaLabel: z.string().trim().optional().nullable(),
  ctaHref: z.string().trim().optional().nullable(),
  active: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  stockQuantity: z.coerce.number().int().min(0).optional(),
  stockStatus: z.string().trim().optional(),
  minOrder: z.coerce.number().int().min(1).optional(),
  maxOrder: z.coerce.number().int().min(1).optional().nullable(),
  weight: z.coerce.number().nonnegative().optional().nullable(),
  length: z.coerce.number().nonnegative().optional().nullable(),
  width: z.coerce.number().nonnegative().optional().nullable(),
  height: z.coerce.number().nonnegative().optional().nullable(),
  salesCount: z.coerce.number().int().min(0).optional(),
  views: z.coerce.number().int().min(0).optional(),
  wishlistCount: z.coerce.number().int().min(0).optional(),
  ratingAverage: z.coerce.number().min(0).max(5).optional(),
  ratingCount: z.coerce.number().int().min(0).optional(),
  discountStartAt: z.string().trim().optional().nullable(),
  discountEndAt: z.string().trim().optional().nullable(),
  categoryId: z.string().trim().min(1),
  manufactureYear: z.coerce.number().int().min(0).optional().nullable(),
  brand: z.string().trim().optional().nullable(),
  vendor: z.string().trim().optional().nullable(),
  sku: z.string().trim().optional().nullable(),
  barcode: z.string().trim().optional().nullable(),
  metaTitle: z.string().trim().optional().nullable(),
  metaDescription: z.string().trim().optional().nullable(),
  metaKeywords: z.string().trim().optional().nullable(),
  placement: z.string().trim().optional().nullable(),
  publishedAt: z.string().trim().optional().nullable(),
  deletedAt: z.string().trim().optional().nullable(),
  colorStock: z.unknown().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const productSearchSchema = z.object({
  q: z.string().trim().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  hasDiscount: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  categoryId: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  createdAt: z.string().trim().optional(),
  updatedAt: z.string().trim().optional(),
  createdFrom: z.string().trim().optional(),
  createdTo: z.string().trim().optional(),
  updatedFrom: z.string().trim().optional(),
  updatedTo: z.string().trim().optional(),
  badge: z.string().trim().optional(),
  sort: z.enum(["cheapest", "expensive", "newest", "oldest", "bestseller", "mostDiscounted", "topRated", "mostViewed", "mostWished", "biggestDiscount"]).optional(),
  sortBy: z.enum(["createdAt", "price", "title", "sortOrder", "salesCount", "discountPercent", "ratingAverage", "views", "wishlistCount"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const commentSchema = z.object({
  author: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  active: z.boolean().optional(),
});

export const cartItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  selectedColor: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().int().min(1).optional(),
});

export const quantitySchema = z.object({
  quantity: z.coerce.number().int().min(1),
});

export const adminCodeSchema = z.object({
  code: z.string().min(4),
  confirmCode: z.string().optional(),
  currentCode: z.string().optional(),
});
