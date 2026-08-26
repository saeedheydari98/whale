import { z } from "zod";
import { isAllowedWebpImageValue, WEBP_ONLY_ERROR } from "@/lib/image-upload";
import {
  EMAIL_PATTERN,
  OTP_CODE_PATTERN,
  PERSIAN_NAME_PATTERN,
  PHONE_PATTERN,
} from "@/lib/validation-patterns";

const webpImageValueSchema = z
  .string()
  .trim()
  .refine(isAllowedWebpImageValue, { message: WEBP_ONLY_ERROR });

const optionalWebpImageValueSchema = z.union([
  z.literal(""),
  webpImageValueSchema,
]);

const optionalNullableWebpImageValueSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((value) => value == null || isAllowedWebpImageValue(value), { message: WEBP_ONLY_ERROR });

const customerProfileSchema = z.object({
  firstName: z.string().trim()
    .min(1, "نام را وارد کنید.")
    .regex(PERSIAN_NAME_PATTERN, "نام باید با حروف فارسی و بین ۲ تا ۱۵ حرف باشد."),
  lastName: z.string().trim()
    .min(1, "نام خانوادگی را وارد کنید.")
    .regex(PERSIAN_NAME_PATTERN, "نام خانوادگی باید با حروف فارسی و بین ۲ تا ۱۵ حرف باشد."),
  phone: z.string().trim()
    .min(1, "شماره موبایل حساب در دسترس نیست؛ دوباره وارد حساب شوید.")
    .regex(PHONE_PATTERN, "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد."),
  email: z.string().trim().toLowerCase().regex(EMAIL_PATTERN).optional().or(z.literal("")).default(""),
  address: z.string().trim()
    .min(1, "آدرس کامل را وارد کنید.")
    .min(5, "آدرس باید حداقل ۵ حرف باشد.")
    .max(200, "آدرس نباید بیشتر از ۲۰۰ حرف باشد."),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const authOtpRequestSchema = z.object({
  phone: z.string().trim().regex(PHONE_PATTERN),
  email: z.string().trim().toLowerCase().regex(EMAIL_PATTERN),
  purpose: z.enum(["login", "admin"]).optional().default("login"),
});

export const authOtpVerifySchema = authOtpRequestSchema.extend({
  code: z.string().trim().regex(OTP_CODE_PATTERN),
});

export const profileSchema = customerProfileSchema.extend({
  email: z.string().trim().toLowerCase()
    .min(1, "ایمیل حساب در دسترس نیست؛ دوباره وارد حساب شوید.")
    .regex(EMAIL_PATTERN, "نشانی ایمیل معتبر نیست."),
  avatarUrl: optionalNullableWebpImageValueSchema,
  isAdminUnlocked: z.boolean().optional(),
});

export const avatarSchema = z.object({
  avatarUrl: webpImageValueSchema.min(1, WEBP_ONLY_ERROR),
});

export const bannerSchema = z.object({
  title: z.string().trim().optional().nullable(),
  showcaseId: z.string().trim().optional().nullable(),
  imageUrls: z.array(webpImageValueSchema).optional(),
  images: z.unknown().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  intervalSeconds: z.coerce.number().int().min(1).optional(),
  heightPercent: z.coerce.number().int().min(10).max(100).optional(),
});

export const showcaseSchema = z.object({
  title: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  imageUrl: optionalNullableWebpImageValueSchema,
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const productSchema = z.object({
  showcaseId: z.string().trim().optional().nullable(),
  showcaseIds: z.array(z.string().trim()).optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  slug: z.string().trim().optional().nullable(),
  price: z.string().trim().min(1),
  originalPrice: z.string().trim().optional().nullable(),
  discountPrice: z.string().trim().optional().nullable(),
  discountPercent: z.coerce.number().int().min(0).optional().nullable(),
  imageUrl: optionalNullableWebpImageValueSchema,
  images: z.array(webpImageValueSchema).optional(),
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
  categoryIds: z.array(z.string().trim()).optional(),
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
  username: z.string().trim().toLowerCase().optional(),
});
