import {
  EMAIL_PATTERN,
  OTP_CODE_PATTERN,
  PERSIAN_NAME_MAX_LENGTH,
  PERSIAN_NAME_PATTERN,
  PHONE_PATTERN,
} from "@/lib/validation-patterns";

type OpenApiObject = Record<string, unknown>;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const nullableRef = (name: string) => ({
  allOf: [ref(name)],
  nullable: true,
});

const jsonContent = (schema: OpenApiObject) => ({
  "application/json": {
    schema,
  },
});

const requestBody = (schema: OpenApiObject, description = "JSON payload") => ({
  required: true,
  description,
  content: jsonContent(schema),
});

const successResponse = (data: OpenApiObject, description = "پاسخ موفق") => ({
  description,
  content: jsonContent({
    allOf: [
      ref("ApiSuccess"),
      {
        type: "object",
        properties: { data },
        required: ["data"],
      },
    ],
  }),
});

const errorResponse = (description: string) => ({
  description,
  content: jsonContent(ref("ApiError")),
});

const commonErrorResponses = {
  "400": errorResponse("Bad request"),
  "401": errorResponse("Authentication required"),
  "403": errorResponse("Forbidden"),
  "404": errorResponse("Not found"),
  "422": errorResponse("Validation error"),
  "429": errorResponse("Rate limit exceeded"),
  "500": errorResponse("Server error"),
};

const authSecurity = [
  { bearerAuth: [] },
  { accessTokenCookie: [] },
] as Array<Record<string, string[]>>;

const pathParam = (name: string, description: string, numeric = false) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: numeric ? { type: "integer" } : { type: "string" },
});

const queryParam = (
  name: string,
  description: string,
  schema: OpenApiObject = { type: "string" },
) => ({
  name,
  in: "query",
  required: false,
  description,
  schema,
});

const includeInactiveParam = queryParam(
  "all",
  "Set to 1 to include inactive records. Intended for admin views.",
  { type: "string", enum: ["1"] },
);

const paginationParams = [
  queryParam("page", "Page number, starting at 1.", { type: "integer", minimum: 1 }),
  queryParam("limit", "Page size.", { type: "integer", minimum: 1, maximum: 500 }),
];

const productFilterParams = [
  queryParam("q", "Search text."),
  queryParam("search", "Alternative search text."),
  queryParam("minPrice", "Minimum product price.", { type: "number" }),
  queryParam("maxPrice", "Maximum product price.", { type: "number" }),
  queryParam("priceMin", "Legacy minimum product price.", { type: "number" }),
  queryParam("priceMax", "Legacy maximum product price.", { type: "number" }),
  queryParam("hasDiscount", "Filter discounted products.", { type: "boolean" }),
  queryParam("discounted", "Set to 1 to filter discounted products.", { type: "string", enum: ["1"] }),
  queryParam("inStock", "Filter products with stock.", { type: "boolean" }),
  queryParam("minRating", "Minimum rating average.", { type: "number", minimum: 0, maximum: 5 }),
  queryParam("categoryId", "Category identifier."),
  queryParam("badge", "Badge value."),
  queryParam("isActive", "Filter active status.", { type: "boolean" }),
  queryParam("isFeatured", "Filter featured status.", { type: "boolean" }),
  queryParam("sort", "Sort preset.", {
    type: "string",
    enum: [
      "sortOrder",
      "cheapest",
      "expensive",
      "newest",
      "oldest",
      "bestseller",
      "mostDiscounted",
      "topRated",
      "mostViewed",
      "mostWished",
      "biggestDiscount",
    ],
  }),
  queryParam("sortBy", "Direct sort field.", {
    type: "string",
    enum: [
      "createdAt",
      "updatedAt",
      "price",
      "title",
      "sortOrder",
      "salesCount",
      "discountPercent",
      "ratingAverage",
      "views",
      "wishlistCount",
    ],
  }),
  queryParam("sortOrder", "Direct sort order.", { type: "string", enum: ["asc", "desc"] }),
  queryParam("fields", "Set to full to return full product records.", { type: "string", enum: ["full"] }),
  queryParam("full", "Set to 1 to return full product records.", { type: "string", enum: ["1"] }),
  ...paginationParams,
  includeInactiveParam,
];

const structureParams = [includeInactiveParam];

const operation = ({
  tags,
  summary,
  description,
  operationId,
  parameters,
  body,
  data,
  security,
  successStatus = "200",
  successDescription,
  deprecated,
  extraResponses,
}: {
  tags: string[];
  summary: string;
  description?: string;
  operationId: string;
  parameters?: OpenApiObject[];
  body?: OpenApiObject;
  data: OpenApiObject;
  security?: Array<Record<string, string[]>>;
  successStatus?: string;
  successDescription?: string;
  deprecated?: boolean;
  extraResponses?: Record<string, OpenApiObject>;
}) => ({
  tags,
  summary,
  ...(description ? { description } : {}),
  operationId,
  ...(parameters?.length ? { parameters } : {}),
  ...(body ? { requestBody: requestBody(body) } : {}),
  ...(security ? { security } : {}),
  ...(deprecated ? { deprecated } : {}),
  responses: {
    [successStatus]: successResponse(data, successDescription ?? (successStatus === "201" ? "Created" : "OK")),
    ...commonErrorResponses,
    ...(extraResponses ?? {}),
  },
});

const emptyObject = {
  type: "object",
  additionalProperties: true,
};

const deletedData = {
  type: "object",
  properties: {
    deleted: { type: "boolean" },
  },
  required: ["deleted"],
};

const okFlagData = (name: string) => ({
  type: "object",
  properties: {
    [name]: { type: "boolean" },
  },
  required: [name],
});

const listData = (name: string, itemRef: string) => ({
  type: "object",
  properties: {
    [name]: {
      type: "array",
      items: ref(itemRef),
    },
  },
  required: [name],
});

const singleData = (name: string, itemRef: string, nullable = false) => ({
  type: "object",
  properties: {
    [name]: nullable ? nullableRef(itemRef) : ref(itemRef),
  },
  required: [name],
});

const authResultData = {
  type: "object",
  properties: {
    user: ref("PublicUser"),
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
    profileComplete: { type: "boolean" },
  },
  required: ["user", "accessToken", "refreshToken", "profileComplete"],
};

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Whale Store API",
    version: "0.2.0",
    description: "API فروشگاه وال شامل ورود با کد ایمیلی، پروفایل کاربر، سبد خرید و پرداخت.",
  },
  servers: [
    {
      url: "/",
      description: "Current origin",
    },
  ],
  tags: [
    { name: "Documentation", description: "OpenAPI and Swagger UI endpoints." },
    { name: "App", description: "Global application bootstrap data." },
    { name: "Auth", description: "Authentication, OTP, and session endpoints." },
    { name: "Catalog", description: "Catalog structures and synchronization." },
    { name: "Products", description: "Product list, detail, search, and comments." },
    { name: "Showcases", description: "Showcase and showcase-product endpoints." },
    { name: "Banners", description: "Banner endpoints." },
    { name: "Cart", description: "Cart and checkout endpoints." },
    { name: "Profile", description: "User profile endpoints." },
    { name: "Admin", description: "Admin dashboard and content management endpoints." },
    { name: "Admin Security", description: "Admin access request endpoints." },
    { name: "Theme", description: "Theme configuration endpoints." },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      accessTokenCookie: {
        type: "apiKey",
        in: "cookie",
        name: "accessToken",
      },
    },
    schemas: {
      ApiSuccess: {
        type: "object",
        properties: {
          ok: { type: "boolean", enum: [true] },
          data: {},
          message: { type: "string" },
        },
        required: ["ok"],
      },
      ApiError: {
        type: "object",
        properties: {
          ok: { type: "boolean", enum: [false] },
          message: { type: "string" },
          error: { type: "string" },
          errors: {
            type: "array",
            items: ref("ValidationIssue"),
          },
          data: {},
        },
        required: ["ok"],
      },
      ValidationIssue: {
        type: "object",
        properties: {
          path: { type: "string" },
          message: { type: "string" },
        },
      },
      PublicUser: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email", pattern: EMAIL_PATTERN.source },
          username: { type: "string", pattern: PHONE_PATTERN.source, nullable: true },
          name: { type: "string", nullable: true },
          role: { type: "string", enum: ["user", "admin", "superadmin"] },
          avatarUrl: { type: "string", nullable: true },
          themeMode: { type: "string", enum: ["light", "dark"] },
        },
        required: ["id", "email", "role"],
      },
      AppUser: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email", pattern: EMAIL_PATTERN.source },
          username: { type: "string", pattern: PHONE_PATTERN.source, nullable: true },
          name: { type: "string", nullable: true },
          role: { type: "string", enum: ["user", "admin", "superadmin"] },
          themeMode: { type: "string", enum: ["light", "dark"] },
          profile: nullableRef("AppUserProfile"),
        },
        required: ["id", "role"],
      },
      AppUserProfile: {
        type: "object",
        properties: {
          firstName: { type: "string", pattern: PERSIAN_NAME_PATTERN.source, maxLength: PERSIAN_NAME_MAX_LENGTH },
          lastName: { type: "string", pattern: PERSIAN_NAME_PATTERN.source, maxLength: PERSIAN_NAME_MAX_LENGTH },
          phone: { type: "string", pattern: PHONE_PATTERN.source },
          email: { type: "string", format: "email", pattern: EMAIL_PATTERN.source, nullable: true },
          address: { type: "string" },
          isAdminUnlocked: { type: "boolean" },
        },
        required: ["firstName", "lastName", "phone", "address", "isAdminUnlocked"],
      },
      AppUserProfileInput: {
        type: "object",
        properties: {
          firstName: { type: "string", minLength: 2, maxLength: PERSIAN_NAME_MAX_LENGTH, pattern: PERSIAN_NAME_PATTERN.source },
          lastName: { type: "string", minLength: 2, maxLength: PERSIAN_NAME_MAX_LENGTH, pattern: PERSIAN_NAME_PATTERN.source },
          phone: { type: "string", pattern: PHONE_PATTERN.source },
          email: { type: "string", format: "email", pattern: EMAIL_PATTERN.source },
          address: { type: "string", minLength: 5, maxLength: 200 },
          isAdminUnlocked: { type: "boolean" },
        },
        required: ["firstName", "lastName", "phone", "address"],
      },
      CustomerProfile: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "integer", nullable: true },
          firstName: { type: "string", pattern: PERSIAN_NAME_PATTERN.source, maxLength: PERSIAN_NAME_MAX_LENGTH },
          lastName: { type: "string", pattern: PERSIAN_NAME_PATTERN.source, maxLength: PERSIAN_NAME_MAX_LENGTH },
          phone: { type: "string", pattern: PHONE_PATTERN.source },
          email: { type: "string", format: "email", pattern: EMAIL_PATTERN.source, nullable: true },
          address: { type: "string" },
          avatarUrl: { type: "string", nullable: true },
          isAdminUnlocked: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: ["firstName", "lastName", "phone"],
      },
      CustomerProfileInput: {
        type: "object",
        properties: {
          firstName: { type: "string", minLength: 2, maxLength: PERSIAN_NAME_MAX_LENGTH, pattern: PERSIAN_NAME_PATTERN.source },
          lastName: { type: "string", minLength: 2, maxLength: PERSIAN_NAME_MAX_LENGTH, pattern: PERSIAN_NAME_PATTERN.source },
          phone: { type: "string", pattern: PHONE_PATTERN.source },
          email: { type: "string", format: "email", pattern: EMAIL_PATTERN.source },
          address: { type: "string", minLength: 5, maxLength: 200 },
          avatarUrl: { type: "string", nullable: true },
          isAdminUnlocked: { type: "boolean" },
        },
        required: ["firstName", "lastName", "phone", "address"],
      },
      OtpRequestInput: {
        type: "object",
        properties: {
          phone: { type: "string", pattern: PHONE_PATTERN.source, example: "09123456789" },
          email: { type: "string", format: "email", pattern: EMAIL_PATTERN.source, example: "user@example.com" },
          purpose: { type: "string", enum: ["login", "admin"], default: "login" },
        },
        required: ["phone", "email"],
      },
      OtpVerifyInput: {
        allOf: [
          ref("OtpRequestInput"),
          {
            type: "object",
            properties: {
              code: { type: "string", pattern: OTP_CODE_PATTERN.source, minLength: 6, maxLength: 6, example: "123456" },
            },
            required: ["code"],
          },
        ],
      },
      AvatarInput: {
        type: "object",
        properties: {
          avatarUrl: { type: "string", minLength: 1 },
        },
        required: ["avatarUrl"],
      },
      ThemeConfig: {
        type: "object",
        properties: {
          primary: { type: "string", enum: ["green", "red", "blue", "yellow", "gray", "orange", "purple"] },
          style: { type: "string", enum: ["light", "dark", "fantasy"] },
        },
        required: ["primary", "style"],
      },
      ThemeInput: {
        type: "object",
        properties: {
          primary: { type: "string", enum: ["green", "red", "blue", "yellow", "gray", "orange", "purple"] },
          style: { type: "string", enum: ["light", "dark", "fantasy"] },
        },
      },
      Product: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "integer" },
          showcaseId: { type: "string", nullable: true },
          showcaseIds: { type: "array", items: { type: "string" } },
          title: { type: "string" },
          description: { type: "string" },
          slug: { type: "string", nullable: true },
          price: { type: "string" },
          originalPrice: { type: "string", nullable: true },
          discountPrice: { type: "string", nullable: true },
          discountPercent: { type: "integer", nullable: true },
          imageUrl: { type: "string", nullable: true },
          images: { type: "array", items: { type: "string" } },
          videoUrl: { type: "string", nullable: true },
          badge: { type: "string", nullable: true },
          ctaLabel: { type: "string", nullable: true },
          ctaHref: { type: "string", nullable: true },
          active: { type: "boolean" },
          isActive: { type: "boolean" },
          isFeatured: { type: "boolean" },
          isAvailable: { type: "boolean" },
          stockQuantity: { type: "integer", minimum: 0 },
          stockStatus: { type: "string" },
          minOrder: { type: "integer", minimum: 1 },
          maxOrder: { type: "integer", minimum: 1, nullable: true },
          ratingAverage: { type: "number", minimum: 0, maximum: 5 },
          ratingCount: { type: "integer", minimum: 0 },
          categoryId: { type: "string" },
          categoryIds: { type: "array", items: { type: "string" } },
          brand: { type: "string", nullable: true },
          sortOrder: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: ["title", "price"],
      },
      ProductInput: {
        type: "object",
        properties: {
          showcaseId: { type: "string", nullable: true },
          showcaseIds: { type: "array", items: { type: "string" } },
          title: { type: "string", minLength: 1 },
          description: { type: "string", nullable: true },
          slug: { type: "string", nullable: true },
          price: { type: "string", minLength: 1 },
          originalPrice: { type: "string", nullable: true },
          discountPrice: { type: "string", nullable: true },
          discountPercent: { type: "integer", minimum: 0, nullable: true },
          imageUrl: { type: "string", nullable: true },
          images: { type: "array", items: { type: "string" } },
          videoUrl: { type: "string", nullable: true },
          badge: { type: "string", nullable: true },
          ctaLabel: { type: "string", nullable: true },
          ctaHref: { type: "string", nullable: true },
          active: { type: "boolean" },
          isActive: { type: "boolean" },
          isFeatured: { type: "boolean" },
          isAvailable: { type: "boolean" },
          stockQuantity: { type: "integer", minimum: 0 },
          stockStatus: { type: "string" },
          minOrder: { type: "integer", minimum: 1 },
          maxOrder: { type: "integer", minimum: 1, nullable: true },
          weight: { type: "number", minimum: 0, nullable: true },
          length: { type: "number", minimum: 0, nullable: true },
          width: { type: "number", minimum: 0, nullable: true },
          height: { type: "number", minimum: 0, nullable: true },
          salesCount: { type: "integer", minimum: 0 },
          views: { type: "integer", minimum: 0 },
          wishlistCount: { type: "integer", minimum: 0 },
          ratingAverage: { type: "number", minimum: 0, maximum: 5 },
          ratingCount: { type: "integer", minimum: 0 },
          discountStartAt: { type: "string", format: "date-time", nullable: true },
          discountEndAt: { type: "string", format: "date-time", nullable: true },
          categoryId: { type: "string", minLength: 1 },
          categoryIds: { type: "array", items: { type: "string" } },
          manufactureYear: { type: "integer", minimum: 0, nullable: true },
          brand: { type: "string", nullable: true },
          vendor: { type: "string", nullable: true },
          sku: { type: "string", nullable: true },
          barcode: { type: "string", nullable: true },
          metaTitle: { type: "string", nullable: true },
          metaDescription: { type: "string", nullable: true },
          metaKeywords: { type: "string", nullable: true },
          placement: { type: "string", nullable: true },
          publishedAt: { type: "string", format: "date-time", nullable: true },
          deletedAt: { type: "string", format: "date-time", nullable: true },
          colorStock: { type: "object", additionalProperties: { type: "integer", minimum: 0 } },
          sortOrder: { type: "integer" },
        },
        required: ["title", "price", "categoryId"],
      },
      ProductPatchInput: {
        allOf: [ref("ProductInput")],
        description: "Partial product payload. All fields are optional for PATCH endpoints.",
      },
      ProductPage: {
        type: "object",
        properties: {
          items: { type: "array", items: ref("Product") },
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
        required: ["items", "page", "limit", "total", "totalPages"],
      },
      ProductListData: {
        type: "object",
        properties: {
          products: { type: "array", items: ref("Product") },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
      ProductSearchData: {
        type: "object",
        properties: {
          products: ref("ProductPage"),
        },
        required: ["products"],
      },
      ProductDetailData: {
        type: "object",
        properties: {
          product: ref("Product"),
          comments: { type: "array", items: ref("Comment") },
          recommendations: { type: "array", items: ref("Product") },
          isPurchased: { type: "boolean" },
          hasRated: { type: "boolean" },
          userRating: { type: "integer", minimum: 1, maximum: 5, nullable: true },
        },
        required: ["product"],
      },
      ProductSuggestionsData: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                title: { type: "string" },
                imageUrl: { type: "string", nullable: true },
                price: { type: "string" },
              },
            },
          },
        },
        required: ["suggestions"],
      },
      Showcase: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["showcase"] },
          title: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          imageUrl: { type: "string", nullable: true },
          active: { type: "boolean" },
          mode: { type: "string", enum: ["manual", "auto"] },
          autoSort: { type: "string" },
          limit: { type: "integer" },
          categoryId: { type: "string", nullable: true },
          manualProductIds: { type: "array", items: { type: "string" } },
          sortOrder: { type: "integer" },
          placement: { type: "integer" },
          products: { type: "array", items: ref("Product") },
          banners: { type: "array", items: ref("Banner") },
        },
        required: ["id"],
      },
      ShowcaseInput: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          imageUrl: { type: "string", nullable: true },
          active: { type: "boolean" },
          sortOrder: { type: "integer" },
          products: { type: "array", items: ref("ProductInput") },
          banners: { type: "array", items: ref("BannerInput") },
        },
      },
      Banner: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["banner"] },
          title: { type: "string", nullable: true },
          showcaseId: { type: "string", nullable: true },
          imageUrls: { type: "array", items: { type: "string" } },
          images: { type: "array", items: { type: "object", additionalProperties: true } },
          active: { type: "boolean" },
          showOnHome: { type: "boolean" },
          showOnShowcase: { type: "boolean" },
          showOnCategories: { type: "boolean" },
          showOnProducts: { type: "boolean" },
          intervalSeconds: { type: "integer", minimum: 1 },
          heightPercent: { type: "integer", minimum: 10, maximum: 100 },
          sortOrder: { type: "integer" },
          placement: { type: "integer" },
        },
        required: ["id"],
      },
      BannerInput: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string", nullable: true },
          showcaseId: { type: "string", nullable: true },
          imageUrls: { type: "array", items: { type: "string" } },
          images: {},
          active: { type: "boolean" },
          showOnHome: { type: "boolean" },
          showOnShowcase: { type: "boolean" },
          showOnCategories: { type: "boolean" },
          showOnProducts: { type: "boolean" },
          homeSortOrder: { type: "integer" },
          showcaseSortOrder: { type: "integer" },
          categorySortOrder: { type: "integer" },
          productSortOrder: { type: "integer" },
          sortOrder: { type: "integer" },
          intervalSeconds: { type: "integer", minimum: 1 },
          heightPercent: { type: "integer", minimum: 10, maximum: 100 },
        },
      },
      Category: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          groupId: { type: "string", nullable: true },
          title: { type: "string" },
          slug: { type: "string" },
          imageUrl: { type: "string", nullable: true },
          active: { type: "boolean" },
          sortOrder: { type: "integer" },
          pageSortOrder: { type: "integer" },
          productCount: { type: "integer" },
        },
      },
      Brand: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          groupId: { type: "string", nullable: true },
          title: { type: "string" },
          slug: { type: "string" },
          imageUrl: { type: "string", nullable: true },
          active: { type: "boolean" },
          sortOrder: { type: "integer" },
          homeSortOrder: { type: "integer" },
          productCount: { type: "integer" },
        },
      },
      LinkGroup: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          active: { type: "boolean" },
          sortOrder: { type: "integer" },
          categoryCount: { type: "integer" },
        },
      },
      CatalogStructure: {
        type: "object",
        additionalProperties: true,
        properties: {
          type: { type: "string" },
          placement: { type: "integer" },
          products: { type: "array", items: ref("Product") },
          showcases: { type: "array", items: ref("Showcase") },
          categoryGroups: { type: "array", items: ref("LinkGroup") },
          categories: { type: "array", items: ref("Category") },
          brandGroups: { type: "array", items: ref("LinkGroup") },
          brands: { type: "array", items: ref("Brand") },
          banners: { type: "array", items: ref("Banner") },
        },
      },
      CatalogSyncEvent: {
        type: "object",
        properties: {
          type: { type: "string" },
          version: { type: "integer" },
          at: { type: "string", format: "date-time" },
        },
      },
      Comment: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          productId: { type: "integer" },
          userId: { type: "integer", nullable: true },
          author: { type: "string" },
          content: { type: "string" },
          rating: { type: "integer", minimum: 1, maximum: 5, nullable: true },
          active: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CommentInput: {
        type: "object",
        properties: {
          author: { type: "string" },
          content: { type: "string", minLength: 1 },
          rating: { type: "integer", minimum: 1, maximum: 5 },
          active: { type: "boolean" },
        },
        required: ["content"],
      },
      ProductCommentsData: {
        type: "object",
        properties: {
          comments: { type: "array", items: ref("Comment") },
          isPurchased: { type: "boolean" },
          hasRated: { type: "boolean" },
          userRating: { type: "integer", minimum: 1, maximum: 5, nullable: true },
        },
        required: ["comments", "isPurchased", "hasRated"],
      },
      CartItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          productId: { type: "integer", nullable: true },
          title: { type: "string" },
          description: { type: "string" },
          price: { type: "string" },
          originalPrice: { type: "string", nullable: true },
          discountPrice: { type: "string", nullable: true },
          discountPercent: { type: "integer", nullable: true },
          imageUrl: { type: "string", nullable: true },
          selectedColor: { type: "string", nullable: true },
          selectedColors: { type: "object", additionalProperties: { type: "integer" } },
          quantity: { type: "integer", minimum: 1 },
        },
      },
      CartItemInput: {
        type: "object",
        properties: {
          productId: { type: "integer", minimum: 1 },
          selectedColor: { type: "string", nullable: true },
          quantity: { type: "integer", minimum: 1 },
        },
        required: ["productId"],
      },
      QuantityInput: {
        type: "object",
        properties: {
          quantity: { type: "integer", minimum: 1 },
        },
        required: ["quantity"],
      },
      CartSnapshot: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              profile: nullableRef("CustomerProfile"),
            },
          },
          cart: {
            type: "object",
            properties: {
              items: { type: "array", items: ref("CartItem") },
            },
            required: ["items"],
          },
        },
        required: ["cart"],
      },
      CartSaveInput: {
        type: "object",
        properties: {
          profile: ref("CustomerProfileInput"),
          items: {
            type: "array",
            items: {
              allOf: [
                ref("CartItemInput"),
                {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    price: { type: "string" },
                    selectedColors: { type: "object", additionalProperties: { type: "integer" } },
                  },
                },
              ],
            },
          },
        },
      },
      CheckoutData: {
        type: "object",
        properties: {
          checkedOut: { type: "boolean" },
        },
        required: ["checkedOut"],
      },
      Order: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          status: { type: "string" },
          fulfillmentStatus: { type: "string", enum: ["pending_approval", "processing", "shipped", "delivered"] },
          trackingCode: { type: "string", nullable: true },
          shippedAt: { type: "string", format: "date-time", nullable: true },
          total: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          items: { type: "array", items: ref("CartItem") },
          statusHistory: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                status: { type: "string", enum: ["pending_approval", "processing", "shipped", "delivered"] },
                createdAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
      OrderUpdateInput: {
        type: "object",
        properties: {
          fulfillmentStatus: { type: "string", enum: ["pending_approval", "processing", "shipped", "delivered"] },
          trackingCode: { type: "string" },
        },
      },
      AdminDashboard: {
        type: "object",
        properties: {
          dashboard: {
            type: "object",
            properties: {
              products: { type: "integer" },
              showcases: { type: "integer" },
              banners: { type: "integer" },
              users: { type: "integer" },
              carts: { type: "integer" },
              comments: { type: "integer" },
            },
          },
        },
        required: ["dashboard"],
      },
      AdminAccessRequest: {
        type: "object",
        properties: {
          id: { type: "string" },
          username: { type: "string" },
          phone: { type: "string" },
          status: { type: "string", enum: ["pending", "approved", "rejected", "revoked"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          user: {
            allOf: [ref("PublicUser")],
          },
        },
      },
      AdminAccessReviewInput: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1 },
          action: { type: "string", enum: ["approve", "reject", "revoke"] },
          approved: { type: "boolean" },
        },
        required: ["id"],
      },
      AdminSecurityStatus: {
        type: "object",
        properties: {
          security: {
            type: "object",
            properties: {
              hasCode: { type: "boolean" },
              isPanelLocked: { type: "boolean" },
            },
            required: ["hasCode", "isPanelLocked"],
          },
        },
        required: ["security"],
      },
      AdminSecurityUnlockData: {
        type: "object",
        properties: {
          security: ref("AdminSecurityStatus"),
          access: {
            type: "object",
            properties: {
              isAdminUnlocked: { type: "boolean" },
              status: { type: "string" },
            },
          },
        },
      },
      AppUserData: {
        type: "object",
        properties: {
          user: nullableRef("AppUser"),
          cart: {
            type: "object",
            properties: {
              count: { type: "integer" },
            },
          },
        },
      },
      AppUserProfileSaveData: {
        type: "object",
        properties: {
          user: {
            oneOf: [
              ref("AppUser"),
              {
                type: "object",
                properties: {
                  profile: ref("AppUserProfile"),
                },
                required: ["profile"],
              },
            ],
          },
        },
        required: ["user"],
      },
    },
  },
  paths: {
    "/api/openapi": {
      get: operation({
        tags: ["Documentation"],
        summary: "Get the OpenAPI document",
        operationId: "getOpenApiDocument",
        data: emptyObject,
      }),
    },
    "/swagger": {
      get: {
        tags: ["Documentation"],
        summary: "Open Swagger UI",
        operationId: "getSwaggerUi",
        responses: {
          "200": {
            description: "Swagger UI HTML page",
            content: {
              "text/html": {
                schema: { type: "string" },
              },
            },
          },
        },
      },
    },
    "/api/app/user": {
      get: operation({
        tags: ["App"],
        summary: "Get user, profile, and cart bootstrap data",
        operationId: "getAppUser",
        data: ref("AppUserData"),
      }),
      put: operation({
        tags: ["App"],
        summary: "Replace current user profile",
        operationId: "putAppUserProfile",
        body: ref("AppUserProfileInput"),
        data: ref("AppUserProfileSaveData"),
      }),
      patch: operation({
        tags: ["App"],
        summary: "Update current user profile",
        operationId: "patchAppUserProfile",
        body: ref("AppUserProfileInput"),
        data: ref("AppUserProfileSaveData"),
      }),
    },
    "/api/app/global": {
      get: operation({
        tags: ["App"],
        summary: "Get legacy global bootstrap data",
        operationId: "getLegacyAppUser",
        data: ref("AppUserData"),
        deprecated: true,
      }),
    },
    "/api/auth/me": {
      get: operation({
        tags: ["Auth"],
        summary: "Get current user",
        operationId: "getAuthMe",
        data: singleData("user", "PublicUser", true),
        security: authSecurity,
      }),
    },
    "/api/auth/session": {
      get: operation({
        tags: ["Auth"],
        summary: "Get current session",
        operationId: "getAuthSession",
        data: singleData("user", "PublicUser", true),
        security: authSecurity,
      }),
    },
    "/api/auth/request-otp": {
      post: operation({
        tags: ["Auth"],
        summary: "ارسال کد ورود شش‌رقمی به ایمیل",
        description: "شماره موبایل و ایمیل باید معتبر باشند. کد پنج دقیقه اعتبار دارد و ارسال مجدد تا ۶۰ ثانیه محدود است.",
        operationId: "requestOtp",
        body: ref("OtpRequestInput"),
        data: {
          type: "object",
          properties: {
            sent: { type: "boolean" },
            retryAfterSeconds: { type: "integer" },
            expiresInSeconds: { type: "integer" },
            developmentCode: { type: "string", pattern: OTP_CODE_PATTERN.source, description: "فقط وقتی AUTH_OTP_EXPOSE_CODE فعال باشد." },
          },
          required: ["sent"],
        },
        extraResponses: {
          "429": errorResponse("ارسال مجدد زودتر از زمان مجاز"),
          "503": errorResponse("عدم دسترسی به سرویس ارسال ایمیل"),
        },
      }),
    },
    "/api/auth/verify-otp": {
      post: operation({
        tags: ["Auth"],
        summary: "تأیید کد ورود شش‌رقمی",
        description: "پس از تأیید، حساب ساخته یا بازیابی می‌شود. مقدار profileComplete مشخص می‌کند کاربر باید پیش از پرداخت پروفایل خود را تکمیل کند یا خیر.",
        operationId: "verifyOtp",
        body: ref("OtpVerifyInput"),
        data: authResultData,
      }),
    },
    "/api/auth/logout": {
      post: operation({
        tags: ["Auth"],
        summary: "Log out",
        operationId: "logoutUser",
        data: okFlagData("loggedOut"),
        security: authSecurity,
      }),
    },
    "/api/auth/refresh-token": {
      post: operation({
        tags: ["Auth"],
        summary: "Refresh access and refresh tokens",
        operationId: "refreshToken",
        data: authResultData,
        security: authSecurity,
      }),
    },
    "/api/catalog/structure": {
      get: operation({
        tags: ["Catalog"],
        summary: "Get full catalog structure",
        operationId: "getCatalogStructure",
        parameters: structureParams,
        data: ref("CatalogStructure"),
      }),
    },
    "/api/catalog/sync": {
      get: {
        tags: ["Catalog"],
        summary: "Subscribe to catalog synchronization events",
        operationId: "getCatalogSync",
        responses: {
          "200": {
            description: "Server-sent catalog events",
            content: {
              "text/event-stream": {
                schema: ref("CatalogSyncEvent"),
              },
            },
          },
          ...commonErrorResponses,
        },
      },
    },
    "/api/home/structure": {
      get: operation({
        tags: ["Catalog"],
        summary: "Get home page structure",
        operationId: "getHomeStructure",
        parameters: structureParams,
        data: ref("CatalogStructure"),
      }),
    },
    "/api/categories/structure": {
      get: operation({
        tags: ["Catalog"],
        summary: "Get categories page structure",
        operationId: "getCategoriesStructure",
        parameters: structureParams,
        data: ref("CatalogStructure"),
      }),
    },
    "/api/products/structure": {
      get: operation({
        tags: ["Products"],
        summary: "Get products page structure",
        operationId: "getProductsStructure",
        parameters: structureParams,
        data: ref("CatalogStructure"),
      }),
    },
    "/api/category/{id}/structure": {
      get: operation({
        tags: ["Catalog"],
        summary: "Get category page structure",
        operationId: "getCategoryStructure",
        parameters: [pathParam("id", "Category id, slug, or title."), ...structureParams],
        data: ref("CatalogStructure"),
      }),
    },
    "/api/category/{id}/products": {
      get: operation({
        tags: ["Products"],
        summary: "Get products for a category",
        operationId: "getCategoryProducts",
        parameters: [pathParam("id", "Category id, slug, or title."), ...productFilterParams],
        data: {
          type: "object",
          properties: {
            category: nullableRef("Category"),
            products: ref("ProductPage"),
          },
          required: ["products"],
        },
      }),
    },
    "/api/category-group/{id}/products": {
      get: operation({
        tags: ["Products"],
        summary: "Get products for all categories in a category group",
        operationId: "getCategoryGroupProducts",
        parameters: [pathParam("id", "Category group id or title."), ...productFilterParams],
        data: {
          type: "object",
          properties: {
            categoryGroup: nullableRef("LinkGroup"),
            products: ref("ProductPage"),
          },
          required: ["products"],
        },
      }),
    },
    "/api/brand/{id}/structure": {
      get: operation({
        tags: ["Catalog"],
        summary: "Get brand page structure",
        operationId: "getBrandStructure",
        parameters: [pathParam("id", "Brand id, slug, or title."), ...structureParams],
        data: ref("CatalogStructure"),
      }),
    },
    "/api/brand/{id}/products": {
      get: operation({
        tags: ["Products"],
        summary: "Get products for a brand",
        operationId: "getBrandProducts",
        parameters: [pathParam("id", "Brand id, slug, or title."), ...productFilterParams],
        data: {
          type: "object",
          properties: {
            brand: nullableRef("Brand"),
            products: ref("ProductPage"),
          },
          required: ["products"],
        },
      }),
    },
    "/api/showcase/{id}/structure": {
      get: operation({
        tags: ["Showcases"],
        summary: "Get showcase page structure",
        operationId: "getShowcaseStructure",
        parameters: [pathParam("id", "Showcase id or title."), ...structureParams],
        data: ref("CatalogStructure"),
      }),
    },
    "/api/showcase/{id}/products": {
      get: operation({
        tags: ["Showcases"],
        summary: "Get products for a showcase",
        operationId: "getShowcaseProductsAlias",
        parameters: [pathParam("id", "Showcase id or title."), ...productFilterParams],
        data: {
          allOf: [
            ref("Showcase"),
            {
              type: "object",
              properties: {
                products: ref("ProductPage"),
              },
            },
          ],
        },
      }),
    },
    "/api/showcases/{id}/products": {
      get: operation({
        tags: ["Showcases"],
        summary: "Get products for a showcase",
        operationId: "getShowcaseProducts",
        parameters: [pathParam("id", "Showcase id or title."), ...productFilterParams],
        data: {
          allOf: [
            ref("Showcase"),
            {
              type: "object",
              properties: {
                products: ref("ProductPage"),
              },
            },
          ],
        },
      }),
    },
    "/api/showcases/{id}/products/search": {
      get: operation({
        tags: ["Showcases"],
        summary: "Search products for a showcase",
        operationId: "searchShowcaseProducts",
        parameters: [pathParam("id", "Showcase id or title."), ...productFilterParams],
        data: {
          allOf: [
            ref("Showcase"),
            {
              type: "object",
              properties: {
                products: ref("ProductPage"),
              },
            },
          ],
        },
      }),
    },
    "/api/products": {
      get: operation({
        tags: ["Products"],
        summary: "List products",
        operationId: "listProducts",
        parameters: [
          queryParam("structure", "Set to 1 to return the catalog structure instead of products.", { type: "string", enum: ["1"] }),
          ...productFilterParams,
        ],
        data: ref("ProductListData"),
      }),
      post: operation({
        tags: ["Products"],
        summary: "Replace/synchronize catalog products",
        operationId: "syncProducts",
        body: {
          type: "object",
          additionalProperties: true,
          properties: {
            products: { type: "array", items: ref("ProductInput") },
            showcases: { type: "array", items: ref("ShowcaseInput") },
            banners: { type: "array", items: ref("BannerInput") },
            categories: { type: "array", items: ref("Category") },
            brands: { type: "array", items: ref("Brand") },
            tree: ref("CatalogStructure"),
            catalog: ref("CatalogStructure"),
          },
        },
        data: ref("CatalogStructure"),
      }),
    },
    "/api/products/search": {
      get: operation({
        tags: ["Products"],
        summary: "Search products",
        operationId: "searchProducts",
        parameters: productFilterParams,
        data: ref("ProductSearchData"),
      }),
    },
    "/api/products/suggestions": {
      get: operation({
        tags: ["Products"],
        summary: "Get lightweight product suggestions",
        operationId: "getProductSuggestions",
        parameters: [
          queryParam("q", "Search text."),
          queryParam("limit", "Maximum suggestions.", { type: "integer", minimum: 1, maximum: 20 }),
        ],
        data: ref("ProductSuggestionsData"),
      }),
    },
    "/api/products/recommendations": {
      get: operation({
        tags: ["Products"],
        summary: "Get recommended products",
        operationId: "getProductRecommendations",
        parameters: [
          queryParam("productId", "Optional product id or slug to derive related products."),
          queryParam("limit", "Maximum recommendations.", { type: "integer", minimum: 1, maximum: 24 }),
        ],
        data: listData("products", "Product"),
      }),
    },
    "/api/products/{id}": {
      get: operation({
        tags: ["Products"],
        summary: "Get product detail",
        operationId: "getProduct",
        parameters: [
          pathParam("id", "Product id, slug, or title."),
          queryParam("recommendationsLimit", "Number of recommendations to include.", { type: "integer", minimum: 1 }),
          includeInactiveParam,
        ],
        data: ref("ProductDetailData"),
      }),
      put: operation({
        tags: ["Products"],
        summary: "Replace a product",
        operationId: "replaceProduct",
        parameters: [pathParam("id", "Product id.", true)],
        body: ref("ProductInput"),
        data: singleData("product", "Product"),
        security: authSecurity,
      }),
      patch: operation({
        tags: ["Products"],
        summary: "Update a product",
        operationId: "updateProduct",
        parameters: [pathParam("id", "Product id.", true)],
        body: ref("ProductPatchInput"),
        data: singleData("product", "Product"),
        security: authSecurity,
      }),
      delete: operation({
        tags: ["Products"],
        summary: "Delete a product",
        operationId: "deleteProduct",
        parameters: [pathParam("id", "Product id.", true)],
        data: deletedData,
        security: authSecurity,
      }),
    },
    "/api/products/{id}/structure": {
      get: operation({
        tags: ["Products"],
        summary: "Get product detail page structure",
        operationId: "getProductStructure",
        parameters: [pathParam("id", "Product id, slug, or title."), includeInactiveParam],
        data: ref("CatalogStructure"),
      }),
    },
    "/api/products/{id}/comments": {
      get: operation({
        tags: ["Products"],
        summary: "List product comments",
        operationId: "listProductComments",
        parameters: [pathParam("id", "Product id.", true)],
        data: ref("ProductCommentsData"),
      }),
      post: operation({
        tags: ["Products"],
        summary: "Create a product comment or rating",
        operationId: "createProductComment",
        parameters: [pathParam("id", "Product id.", true)],
        body: ref("CommentInput"),
        data: singleData("comment", "Comment"),
        successStatus: "201",
        security: authSecurity,
      }),
    },
    "/api/comments/{id}": {
      put: operation({
        tags: ["Products"],
        summary: "Replace a comment",
        operationId: "replaceComment",
        parameters: [pathParam("id", "Comment id.")],
        body: ref("CommentInput"),
        data: singleData("comment", "Comment"),
        security: authSecurity,
      }),
      delete: operation({
        tags: ["Products"],
        summary: "Delete a comment",
        operationId: "deleteComment",
        parameters: [pathParam("id", "Comment id.")],
        data: deletedData,
        security: authSecurity,
      }),
    },
    "/api/showcases": {
      get: operation({
        tags: ["Showcases"],
        summary: "List showcases or fetch one by query id",
        operationId: "listShowcases",
        parameters: [
          queryParam("id", "Optional showcase id."),
          includeInactiveParam,
        ],
        data: {
          type: "object",
          properties: {
            showcases: { type: "array", items: ref("Showcase") },
            showcase: nullableRef("Showcase"),
          },
        },
      }),
      post: operation({
        tags: ["Showcases"],
        summary: "Create or upsert a showcase",
        operationId: "upsertShowcase",
        body: {
          oneOf: [
            ref("ShowcaseInput"),
            {
              type: "object",
              properties: {
                showcase: ref("ShowcaseInput"),
              },
            },
          ],
        },
        data: singleData("showcase", "Showcase"),
      }),
    },
    "/api/banners": {
      get: operation({
        tags: ["Banners"],
        summary: "List banners",
        operationId: "listBanners",
        parameters: [includeInactiveParam],
        data: listData("banners", "Banner"),
      }),
      post: operation({
        tags: ["Banners"],
        summary: "Replace banners",
        operationId: "replaceBanners",
        body: {
          type: "object",
          properties: {
            banners: { type: "array", items: ref("BannerInput") },
          },
          required: ["banners"],
        },
        data: listData("banners", "Banner"),
      }),
    },
    "/api/cart": {
      get: operation({
        tags: ["Cart"],
        summary: "Get current cart",
        operationId: "getCart",
        parameters: [queryParam("phone", "Legacy profile phone lookup.")],
        data: ref("CartSnapshot"),
        security: authSecurity,
      }),
      post: operation({
        tags: ["Cart"],
        summary: "Save current cart",
        operationId: "saveCart",
        body: ref("CartSaveInput"),
        data: ref("CartSnapshot"),
        security: authSecurity,
      }),
      patch: operation({
        tags: ["Cart"],
        summary: "پرداخت سبد خرید جاری",
        description: "این مسیر مورد استفاده صفحه سبد خرید است. ورود به حساب و تکمیل پروفایل هر دو الزامی هستند؛ در غیر این صورت پاسخ 401 یا 400 برمی‌گردد.",
        operationId: "checkoutCurrentCart",
        data: ref("CartSnapshot"),
        security: authSecurity,
        extraResponses: {
          "400": errorResponse("پروفایل کاربر کامل نیست"),
          "401": errorResponse("کاربر وارد حساب نشده است"),
          "409": errorResponse("رنگ یا موجودی کالا تغییر کرده است"),
        },
      }),
      delete: operation({
        tags: ["Cart"],
        summary: "Clear current cart",
        operationId: "clearCart",
        body: {
          type: "object",
          properties: {
            profile: ref("CustomerProfileInput"),
          },
        },
        data: ref("CartSnapshot"),
        security: authSecurity,
      }),
    },
    "/api/cart/items": {
      get: operation({
        tags: ["Cart"],
        summary: "List authenticated cart items",
        operationId: "listCartItems",
        data: listData("items", "CartItem"),
        security: authSecurity,
      }),
      post: operation({
        tags: ["Cart"],
        summary: "Add item to authenticated cart",
        operationId: "addCartItem",
        body: ref("CartItemInput"),
        data: singleData("item", "CartItem"),
        successStatus: "201",
        security: authSecurity,
      }),
    },
    "/api/cart/items/{productId}": {
      put: operation({
        tags: ["Cart"],
        summary: "Set cart item quantity",
        operationId: "setCartItemQuantity",
        parameters: [pathParam("productId", "Product id.", true)],
        body: ref("QuantityInput"),
        data: singleData("item", "CartItem"),
        security: authSecurity,
      }),
      delete: operation({
        tags: ["Cart"],
        summary: "Remove item from cart",
        operationId: "deleteCartItem",
        parameters: [pathParam("productId", "Product id.", true)],
        data: deletedData,
        security: authSecurity,
      }),
    },
    "/api/cart/items/{productId}/quantity": {
      patch: operation({
        tags: ["Cart"],
        summary: "Patch cart item quantity",
        operationId: "patchCartItemQuantity",
        parameters: [pathParam("productId", "Product id.", true)],
        body: ref("QuantityInput"),
        data: singleData("item", "CartItem"),
        security: authSecurity,
      }),
    },
    "/api/cart/checkout": {
      post: operation({
        tags: ["Cart"],
        summary: "پرداخت جایگزین سبد احراز هویت‌شده",
        description: "مسیر جایگزین پرداخت برای کلاینت‌هایی که مستقیماً با سبد حساب کاربری کار می‌کنند.",
        operationId: "checkoutCart",
        data: ref("CheckoutData"),
        security: authSecurity,
      }),
    },
    "/api/profile": {
      get: operation({
        tags: ["Profile"],
        summary: "Get legacy profile by phone",
        operationId: "getLegacyProfile",
        parameters: [queryParam("phone", "Profile phone number.", { type: "string", pattern: PHONE_PATTERN.source })],
        data: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                profile: nullableRef("CustomerProfile"),
              },
            },
          },
        },
      }),
      post: operation({
        tags: ["Profile"],
        summary: "Save legacy profile",
        operationId: "saveLegacyProfile",
        body: {
          oneOf: [
            ref("CustomerProfileInput"),
            {
              type: "object",
              properties: {
                profile: ref("CustomerProfileInput"),
              },
            },
          ],
        },
        data: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                profile: ref("CustomerProfile"),
              },
            },
          },
        },
      }),
    },
    "/api/user/profile": {
      get: operation({
        tags: ["Profile"],
        summary: "Get authenticated user profile compatibility route",
        operationId: "getUserProfile",
        data: ref("AppUserData"),
        security: authSecurity,
        deprecated: true,
      }),
      put: operation({
        tags: ["Profile"],
        summary: "Replace user profile compatibility route",
        operationId: "replaceUserProfile",
        body: ref("AppUserProfileInput"),
        data: ref("AppUserProfileSaveData"),
        security: authSecurity,
        deprecated: true,
      }),
      patch: operation({
        tags: ["Profile"],
        summary: "Update user profile compatibility route",
        operationId: "updateUserProfile",
        body: ref("AppUserProfileInput"),
        data: ref("AppUserProfileSaveData"),
        security: authSecurity,
        deprecated: true,
      }),
    },
    "/api/user/profile/avatar": {
      patch: operation({
        tags: ["Profile"],
        summary: "Update user avatar",
        operationId: "updateUserAvatar",
        body: ref("AvatarInput"),
        data: singleData("user", "PublicUser"),
        security: authSecurity,
      }),
    },
    "/api/user/orders": {
      get: operation({
        tags: ["Profile"],
        summary: "List current user's orders",
        operationId: "listUserOrders",
        data: listData("orders", "Order"),
        security: authSecurity,
      }),
    },
    "/api/admin/dashboard": {
      get: operation({
        tags: ["Admin"],
        summary: "Get admin dashboard counts",
        operationId: "getAdminDashboard",
        data: ref("AdminDashboard"),
        security: authSecurity,
      }),
    },
    "/api/admin/orders": {
      get: operation({
        tags: ["Admin"],
        summary: "List all orders for admin",
        operationId: "listAdminOrders",
        data: listData("orders", "Order"),
        security: authSecurity,
      }),
    },
    "/api/admin/orders/{id}": {
      put: operation({
        tags: ["Admin"],
        summary: "Replace order fulfillment status",
        operationId: "replaceAdminOrderFulfillment",
        parameters: [pathParam("id", "Order id.")],
        body: ref("OrderUpdateInput"),
        data: singleData("order", "Order"),
        security: authSecurity,
      }),
      patch: operation({
        tags: ["Admin"],
        summary: "Update order fulfillment status",
        operationId: "updateAdminOrderFulfillment",
        parameters: [pathParam("id", "Order id.")],
        body: ref("OrderUpdateInput"),
        data: singleData("order", "Order"),
        security: authSecurity,
      }),
    },
    "/api/admin/banners": {
      get: operation({
        tags: ["Admin"],
        summary: "List admin banners",
        operationId: "listAdminBanners",
        data: listData("banners", "Banner"),
        security: authSecurity,
      }),
      post: operation({
        tags: ["Admin"],
        summary: "Create admin banner",
        operationId: "createAdminBanner",
        body: ref("BannerInput"),
        data: singleData("banner", "Banner"),
        successStatus: "201",
        security: authSecurity,
      }),
    },
    "/api/admin/banners/{id}": {
      get: operation({
        tags: ["Admin"],
        summary: "Get admin banner",
        operationId: "getAdminBanner",
        parameters: [pathParam("id", "Banner id.")],
        data: singleData("banner", "Banner"),
        security: authSecurity,
      }),
      put: operation({
        tags: ["Admin"],
        summary: "Replace admin banner",
        operationId: "replaceAdminBanner",
        parameters: [pathParam("id", "Banner id.")],
        body: ref("BannerInput"),
        data: singleData("banner", "Banner"),
        security: authSecurity,
      }),
      patch: operation({
        tags: ["Admin"],
        summary: "Update admin banner",
        operationId: "updateAdminBanner",
        parameters: [pathParam("id", "Banner id.")],
        body: ref("BannerInput"),
        data: singleData("banner", "Banner"),
        security: authSecurity,
      }),
      delete: operation({
        tags: ["Admin"],
        summary: "Delete admin banner",
        operationId: "deleteAdminBanner",
        parameters: [pathParam("id", "Banner id.")],
        data: deletedData,
        security: authSecurity,
      }),
    },
    "/api/admin/showcases": {
      get: operation({
        tags: ["Admin"],
        summary: "List admin showcases",
        operationId: "listAdminShowcases",
        data: listData("showcases", "Showcase"),
        security: authSecurity,
      }),
      post: operation({
        tags: ["Admin"],
        summary: "Create admin showcase",
        operationId: "createAdminShowcase",
        body: ref("ShowcaseInput"),
        data: singleData("showcase", "Showcase"),
        successStatus: "201",
        security: authSecurity,
      }),
    },
    "/api/admin/showcases/{id}": {
      get: operation({
        tags: ["Admin"],
        summary: "Get admin showcase",
        operationId: "getAdminShowcase",
        parameters: [pathParam("id", "Showcase id.")],
        data: singleData("showcase", "Showcase"),
        security: authSecurity,
      }),
      put: operation({
        tags: ["Admin"],
        summary: "Replace admin showcase",
        operationId: "replaceAdminShowcase",
        parameters: [pathParam("id", "Showcase id.")],
        body: ref("ShowcaseInput"),
        data: singleData("showcase", "Showcase"),
        security: authSecurity,
      }),
      patch: operation({
        tags: ["Admin"],
        summary: "Update admin showcase",
        operationId: "updateAdminShowcase",
        parameters: [pathParam("id", "Showcase id.")],
        body: ref("ShowcaseInput"),
        data: singleData("showcase", "Showcase"),
        security: authSecurity,
      }),
      delete: operation({
        tags: ["Admin"],
        summary: "Delete admin showcase",
        operationId: "deleteAdminShowcase",
        parameters: [pathParam("id", "Showcase id.")],
        data: deletedData,
        security: authSecurity,
      }),
    },
    "/api/admin/showcases/{id}/products": {
      get: operation({
        tags: ["Admin"],
        summary: "List admin showcase products",
        operationId: "listAdminShowcaseProducts",
        parameters: [pathParam("id", "Showcase id.")],
        data: listData("products", "Product"),
        security: authSecurity,
      }),
      post: operation({
        tags: ["Admin"],
        summary: "Attach a product to a showcase",
        operationId: "attachAdminShowcaseProduct",
        parameters: [pathParam("id", "Showcase id.")],
        body: {
          type: "object",
          properties: {
            productId: { type: "integer" },
          },
          required: ["productId"],
        },
        data: singleData("product", "Product"),
        successStatus: "201",
        security: authSecurity,
      }),
    },
    "/api/admin/showcases/{id}/products/{productId}": {
      delete: operation({
        tags: ["Admin"],
        summary: "Detach a product from a showcase",
        operationId: "detachAdminShowcaseProduct",
        parameters: [
          pathParam("id", "Showcase id."),
          pathParam("productId", "Product id.", true),
        ],
        data: singleData("product", "Product"),
        security: authSecurity,
      }),
    },
    "/api/admin/products": {
      get: operation({
        tags: ["Admin"],
        summary: "List admin products",
        operationId: "listAdminProducts",
        data: listData("products", "Product"),
        security: authSecurity,
      }),
      post: operation({
        tags: ["Admin"],
        summary: "Create admin product",
        operationId: "createAdminProduct",
        body: ref("ProductInput"),
        data: singleData("product", "Product"),
        successStatus: "201",
        security: authSecurity,
      }),
    },
    "/api/admin/products/{id}": {
      get: operation({
        tags: ["Admin"],
        summary: "Get admin product",
        operationId: "getAdminProduct",
        parameters: [pathParam("id", "Product id.", true)],
        data: singleData("product", "Product"),
        security: authSecurity,
      }),
      put: operation({
        tags: ["Admin"],
        summary: "Replace admin product",
        operationId: "replaceAdminProduct",
        parameters: [pathParam("id", "Product id.", true)],
        body: ref("ProductInput"),
        data: singleData("product", "Product"),
        security: authSecurity,
      }),
      patch: operation({
        tags: ["Admin"],
        summary: "Update admin product",
        operationId: "updateAdminProduct",
        parameters: [pathParam("id", "Product id.", true)],
        body: ref("ProductPatchInput"),
        data: singleData("product", "Product"),
        security: authSecurity,
      }),
      delete: operation({
        tags: ["Admin"],
        summary: "Delete admin product",
        operationId: "deleteAdminProduct",
        parameters: [pathParam("id", "Product id.", true)],
        data: deletedData,
        security: authSecurity,
      }),
    },
    "/api/admin/structure": {
      get: operation({
        tags: ["Admin"],
        summary: "Get admin structure",
        operationId: "getAdminStructure",
        data: {
          type: "object",
          properties: {
            structure: ref("CatalogStructure"),
          },
        },
        security: authSecurity,
      }),
      put: operation({
        tags: ["Admin"],
        summary: "Echo/replace admin structure",
        operationId: "replaceAdminStructure",
        body: ref("CatalogStructure"),
        data: {
          type: "object",
          properties: {
            structure: ref("CatalogStructure"),
          },
        },
        security: authSecurity,
      }),
      patch: operation({
        tags: ["Admin"],
        summary: "Echo/update admin structure",
        operationId: "updateAdminStructure",
        body: ref("CatalogStructure"),
        data: {
          type: "object",
          properties: {
            structure: ref("CatalogStructure"),
          },
        },
        security: authSecurity,
      }),
    },
    "/api/admin/security/status": {
      get: operation({
        tags: ["Admin Security"],
        summary: "Get admin security status",
        operationId: "getAdminSecurityStatus",
        data: ref("AdminSecurityStatus"),
      }),
    },
    "/api/admin/security/unlock": {
      post: operation({
        tags: ["Admin Security"],
        summary: "Request admin access unlock",
        operationId: "requestAdminUnlock",
        data: ref("AdminSecurityUnlockData"),
        security: authSecurity,
      }),
    },
    "/api/admin/security/requests": {
      get: operation({
        tags: ["Admin Security"],
        summary: "List admin access requests",
        operationId: "listAdminAccessRequests",
        data: listData("requests", "AdminAccessRequest"),
        security: authSecurity,
      }),
      post: operation({
        tags: ["Admin Security"],
        summary: "Create admin access request",
        operationId: "createAdminAccessRequest",
        data: {
          type: "object",
          properties: {
            request: nullableRef("AdminAccessRequest"),
            access: {
              type: "object",
              properties: {
                isAdminUnlocked: { type: "boolean" },
                status: { type: "string" },
              },
            },
          },
        },
        successStatus: "201",
        security: authSecurity,
      }),
      patch: operation({
        tags: ["Admin Security"],
        summary: "Review admin access request",
        operationId: "reviewAdminAccessRequest",
        body: ref("AdminAccessReviewInput"),
        data: singleData("request", "AdminAccessRequest"),
        security: authSecurity,
      }),
    },
    "/api/admin/security/set-code": {
      post: operation({
        tags: ["Admin Security"],
        summary: "Disabled legacy security code setup",
        operationId: "setAdminSecurityCode",
        data: ref("AdminSecurityStatus"),
        security: authSecurity,
        deprecated: true,
        extraResponses: {
          "410": errorResponse("Legacy security code flow is disabled"),
        },
      }),
    },
    "/api/admin/security/change-code": {
      post: operation({
        tags: ["Admin Security"],
        summary: "Disabled legacy security code change",
        operationId: "changeAdminSecurityCode",
        data: ref("AdminSecurityStatus"),
        security: authSecurity,
        deprecated: true,
        extraResponses: {
          "410": errorResponse("Legacy security code flow is disabled"),
        },
      }),
    },
    "/api/admin/security/remove-code": {
      post: operation({
        tags: ["Admin Security"],
        summary: "Disabled legacy security code removal",
        operationId: "removeAdminSecurityCode",
        data: ref("AdminSecurityStatus"),
        security: authSecurity,
        deprecated: true,
        extraResponses: {
          "410": errorResponse("Legacy security code flow is disabled"),
        },
      }),
    },
    "/api/admin/security/lock": {
      post: operation({
        tags: ["Admin Security"],
        summary: "Disabled legacy admin panel lock",
        operationId: "lockAdminPanel",
        data: ref("AdminSecurityStatus"),
        security: authSecurity,
        deprecated: true,
        extraResponses: {
          "410": errorResponse("Legacy security code flow is disabled"),
        },
      }),
    },
    "/api/theme": {
      get: operation({
        tags: ["Theme"],
        summary: "Get theme",
        operationId: "getTheme",
        data: singleData("theme", "ThemeConfig"),
      }),
      put: operation({
        tags: ["Theme"],
        summary: "Save system theme",
        operationId: "saveTheme",
        body: ref("ThemeInput"),
        data: singleData("theme", "ThemeConfig"),
        security: authSecurity,
      }),
      post: operation({
        tags: ["Theme"],
        summary: "Save system theme",
        operationId: "postTheme",
        body: ref("ThemeInput"),
        data: singleData("theme", "ThemeConfig"),
        security: authSecurity,
      }),
    },
    "/api/theme/admin": {
      get: operation({
        tags: ["Theme"],
        summary: "Get theme compatibility route",
        operationId: "getThemeAdmin",
        data: singleData("theme", "ThemeConfig"),
        deprecated: true,
      }),
      post: operation({
        tags: ["Theme"],
        summary: "Save theme compatibility route",
        operationId: "saveThemeAdmin",
        body: ref("ThemeInput"),
        data: singleData("theme", "ThemeConfig"),
        security: authSecurity,
        deprecated: true,
      }),
    },
    "/api/admin/theme": {
      get: operation({
        tags: ["Theme"],
        summary: "Get admin theme",
        operationId: "getAdminTheme",
        data: singleData("theme", "ThemeConfig"),
      }),
      put: operation({
        tags: ["Theme"],
        summary: "Save admin theme",
        operationId: "putAdminTheme",
        body: ref("ThemeInput"),
        data: singleData("theme", "ThemeConfig"),
        security: authSecurity,
      }),
    },
  },
} satisfies OpenApiObject;
