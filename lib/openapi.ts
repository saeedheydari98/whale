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

const offsetParams = [
  queryParam("limit", "Measured page capacity (1–100).", { type: "integer", minimum: 1, maximum: 100 }),
  queryParam("offset", "Number of records already loaded.", { type: "integer", minimum: 0, default: 0 }),
];
const adminFilterParams = [
  queryParam("q", "Search text.", { type: "string", maxLength: 200 }),
  queryParam("view", "Order channel.", { type: "string", enum: ["online", "in_person"] }),
  queryParam("from", "Inclusive start timestamp in milliseconds.", { type: "number", minimum: 0 }),
  queryParam("to", "Inclusive end timestamp in milliseconds.", { type: "number", minimum: 0 }),
];
const adminSortParams = [
  queryParam("sort", "Sort field supported by the collection.", { type: "string", enum: ["name", "role", "createdAt", "orderCount", "orderTotal", "walletBalance", "lastOrderAt", "id", "customer", "status", "items", "total"], default: "createdAt" }),
  queryParam("direction", "Sort direction.", { type: "string", enum: ["asc", "desc"], default: "desc" }),
];
const countSchema = { type: "integer", minimum: 0 };
const countData = { type: "object", properties: { structure: { type: "object", properties: { count: countSchema }, required: ["count"] } }, required: ["structure"] };
const pageFields = { total: countSchema, nextOffset: { type: "integer", minimum: 0, nullable: true } };
const pagedData = (name: string, schema: OpenApiObject) => ({ type: "object", properties: { [name]: { type: "array", items: schema }, ...pageFields }, required: [name, "total", "nextOffset"] });

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
    version: "0.3.0",
    description: "API فروشگاه وال: کاتالوگ و ساختار صفحه، احراز هویت، سفارش آنلاین و حضوری، کیف پول، تخفیف‌ها و مدیریت فروشگاه. برای فهرست‌های پویا ابتدا تعداد را از مسیر structure دریافت کنید، سپس limit اندازه‌گیری‌شده و offset را به مسیر داده بفرستید.",
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
    { name: "Commerce", description: "Wallet, discounts, cashback, and in-person sales." },
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
      CheckoutInput: {
        type: "object",
        properties: {
          shippingMethod: { type: "string", enum: ["post", "pickup"], default: "pickup" },
          discountCode: { type: "string", description: "Optional personal discount code." },
        },
      },
      OrderQuote: {
        type: "object",
        properties: {
          subtotal: { type: "number" }, discountAmount: { type: "number" }, walletAmount: { type: "number" },
          shippingAmount: { type: "number" }, total: { type: "number" }, cashbackEarned: { type: "number" },
          cashbackPercent: { type: "number" }, walletBalance: { type: "number" },
          shippingMethod: { type: "string", enum: ["post", "pickup"], description: "Present on online checkout quotes." },
          discountCode: { type: "string", nullable: true },
          discountType: { type: "string", enum: ["percentage", "free_shipping"], nullable: true },
          discountPercent: { type: "number", nullable: true },
        },
        required: ["subtotal", "discountAmount", "walletAmount", "shippingAmount", "total", "cashbackEarned", "cashbackPercent", "walletBalance", "discountCode", "discountType", "discountPercent"],
      },
      InPersonCustomer: {
        type: "object",
        properties: {
          firstName: { type: "string", pattern: PERSIAN_NAME_PATTERN.source },
          lastName: { type: "string", pattern: PERSIAN_NAME_PATTERN.source },
          phone: { type: "string", pattern: PHONE_PATTERN.source },
          email: { type: "string", pattern: EMAIL_PATTERN.source },
          address: { type: "string", minLength: 5, maxLength: 200 },
        },
        required: ["firstName", "lastName", "phone", "email", "address"],
      },
      InPersonOrderInput: {
        type: "object",
        description: "Each productId may appear only once. Omit customerUserId and newCustomer for a walk-in sale. Product prices and stock are checked on the server.",
        properties: {
          customerUserId: { type: "integer", minimum: 1, nullable: true },
          newCustomer: nullableRef("InPersonCustomer"),
          discountCode: { type: "string" }, useWallet: { type: "boolean", default: false },
          lines: {
            type: "array", minItems: 1,
            items: {
              type: "object",
              properties: {
                productId: { type: "integer", minimum: 1 }, title: { type: "string", minLength: 1 },
                description: { type: "string", default: "" }, price: { type: "string", minLength: 1 },
                originalPrice: { type: "string", nullable: true }, discountPrice: { type: "string", nullable: true },
                discountPercent: { type: "integer", minimum: 0, nullable: true }, imageUrl: { type: "string", nullable: true },
                selectedColor: { type: "string", nullable: true }, quantity: { type: "integer", minimum: 1 },
              },
              required: ["productId", "title", "price", "quantity"],
            },
          },
        },
        required: ["lines"],
      },
      CommerceSettings: {
        type: "object", properties: { cashbackPercent: { type: "integer", minimum: 0, maximum: 100 }, postalShippingFee: { type: "integer" } },
        required: ["cashbackPercent", "postalShippingFee"],
      },
      CashbackInput: {
        type: "object", properties: { cashbackPercent: { type: "integer", minimum: 0, maximum: 100 } }, required: ["cashbackPercent"],
      },
      DiscountCode: {
        type: "object",
        properties: {
          id: { type: "string" }, name: { type: "string" }, code: { type: "string" },
          type: { type: "string", enum: ["percentage", "free_shipping"] }, percent: { type: "integer", nullable: true },
          expiresAt: { type: "string", format: "date-time" }, usedAt: { type: "string", format: "date-time", nullable: true },
        },
        required: ["id", "name", "code", "type", "percent", "expiresAt", "usedAt"],
      },
      DiscountRuleInput: {
        type: "object",
        description: "percent is required for percentage discounts; minimumValue must be positive except for new_users.",
        properties: {
          name: { type: "string", minLength: 1 }, audienceType: { type: "string", enum: ["new_users", "purchase_count", "purchase_amount"] },
          minimumValue: { type: "integer", minimum: 1 }, lookbackDays: { type: "integer", minimum: 1, maximum: 3650 },
          discountType: { type: "string", enum: ["percentage", "free_shipping"], default: "percentage" },
          percent: { type: "integer", minimum: 1, maximum: 100, nullable: true }, validDays: { type: "integer", minimum: 1, maximum: 3650 },
        },
        required: ["name", "audienceType", "lookbackDays", "validDays"],
      },
      DiscountRule: {
        allOf: [ref("DiscountRuleInput"), { type: "object", properties: { id: { type: "string" }, active: { type: "boolean" }, createdAt: { type: "string", format: "date-time" }, _count: { type: "object", properties: { discountCodes: countSchema } } } }],
      },
      ManualDiscountInput: {
        type: "object",
        description: "percent is required for percentage discounts.",
        properties: { name: { type: "string", minLength: 1 }, type: { type: "string", enum: ["percentage", "free_shipping"], default: "percentage" }, percent: { type: "integer", minimum: 1, maximum: 100 }, durationDays: { type: "integer", minimum: 1, maximum: 3650 } },
        required: ["name", "durationDays"],
      },
      WalletTransaction: {
        type: "object",
        properties: { id: { type: "string" }, userId: { type: "integer" }, orderId: { type: "string", nullable: true }, type: { type: "string" }, amount: { type: "integer" }, createdAt: { type: "string", format: "date-time" } },
      },
      AdminUser: {
        type: "object",
        properties: {
          id: { type: "integer" }, name: { type: "string", nullable: true }, username: { type: "string", nullable: true }, email: { type: "string", nullable: true }, role: { type: "string" },
          walletBalance: { type: "integer" }, createdAt: { type: "string", format: "date-time" },
          profiles: { type: "array", items: { type: "object", properties: { firstName: { type: "string" }, lastName: { type: "string" }, phone: { type: "string" }, email: { type: "string", nullable: true } } } },
          orderCount: countSchema, orderTotal: { type: "number" }, lastOrderAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      ApiSuccess: {
        type: "object",
        properties: {
          ok: { type: "boolean", enum: [true] },
          data: {},
          message: { type: "string", description: "Standardized English code for developers." },
          showMessage: { type: "string", description: "Persian message displayed to the user." },
        },
        required: ["ok", "message", "showMessage"],
      },
      ApiError: {
        type: "object",
        properties: {
          ok: { type: "boolean", enum: [false] },
          message: { type: "string", description: "Standardized English error code for developers." },
          showMessage: { type: "string", description: "Persian message displayed to the user." },
          errors: {
            type: "array",
            items: ref("ValidationIssue"),
          },
          data: {},
        },
        required: ["ok", "message", "showMessage"],
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
          items: { type: "array", items: ref("Product") },
          ...pageFields,
        },
        required: ["products", "items", "total", "nextOffset"],
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
          itemCount: { type: "integer" },
          productCount: { type: "integer" },
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
          checkout: ref("OrderCreated"),
        },
        required: ["checkout"],
      },
      OrderCreated: {
        type: "object",
        properties: { orderId: { type: "string" }, quote: ref("OrderQuote"), customerId: { type: "integer", nullable: true, description: "Present on in-person sale results." } },
        required: ["orderId", "quote"],
      },
      Order: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          orderType: { type: "string", enum: ["online", "in_person"] },
          shippingMethod: { type: "string", enum: ["post", "pickup"] },
          subtotal: { type: "string" },
          discountAmount: { type: "string" },
          walletAmount: { type: "string" },
          shippingAmount: { type: "string" },
          cashbackEarned: { type: "integer" },
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
      UserPanelStructure: {
        type: "object",
        properties: {
          orders: { type: "integer" },
          discounts: { type: "integer" },
          unseenDiscounts: { type: "integer" },
          walletTransactions: countSchema,
        },
        required: ["orders", "discounts", "unseenDiscounts", "walletTransactions"],
      },
      AdminPanelStructure: {
        type: "object",
        properties: {
          products: { type: "integer" },
          orders: { type: "integer" },
          inPersonOrders: { type: "integer" },
          discountRules: countSchema,
          accessRequests: { type: "object", properties: { pending: countSchema, approved: countSchema, archived: countSchema }, required: ["pending", "approved", "archived"] },
          users: { type: "integer" },
          banners: { type: "integer" },
          showcases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                count: { type: "integer" },
              },
              required: ["id", "count"],
            },
          },
          categoryGroups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                count: { type: "integer" },
              },
              required: ["id", "count"],
            },
          },
          brandGroups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                count: { type: "integer" },
              },
              required: ["id", "count"],
            },
          },
          storefront: {
            type: "object",
            properties: {
              home: { type: "integer" },
              categories: { type: "integer" },
              products: { type: "integer" },
            },
            required: ["home", "categories", "products"],
          },
        },
        required: ["products", "orders", "inPersonOrders", "users", "banners", "showcases", "categoryGroups", "brandGroups", "storefront", "discountRules", "accessRequests"],
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
    "/api/cart/quote": {
      post: operation({ tags: ["Cart"], summary: "Preview checkout totals", operationId: "quoteCart", body: ref("CheckoutInput"), data: singleData("quote", "OrderQuote"), security: authSecurity, extraResponses: { "409": errorResponse("Discount already used or insufficient stock/balance"), "410": errorResponse("Discount expired") } }),
    },
    "/api/admin/commerce": {
      get: operation({ tags: ["Commerce", "Admin"], summary: "Read cashback and shipping settings", operationId: "getCommerceSettings", data: singleData("settings", "CommerceSettings"), security: authSecurity }),
      patch: operation({ tags: ["Commerce", "Admin"], summary: "Update cashback percentage", operationId: "updateCommerceSettings", body: ref("CashbackInput"), data: singleData("settings", "CommerceSettings"), security: authSecurity }),
    },
    "/api/admin/users": {
      get: operation({ tags: ["Admin"], summary: "List customers and order statistics", operationId: "listAdminUsers", description: "Supply limit for paginated results. Without limit the legacy response contains only users. Fetch the filtered collections/structure count first.", parameters: [...offsetParams, adminFilterParams[0], ...adminSortParams], data: { anyOf: [pagedData("users", ref("AdminUser")), listData("users", "AdminUser")] }, security: authSecurity }),
    },
    "/api/admin/users/{id}/discount": {
      post: operation({ tags: ["Commerce", "Admin"], summary: "Issue a personal discount code", operationId: "issueUserDiscount", parameters: [pathParam("id", "Customer user ID.", true)], body: ref("ManualDiscountInput"), data: singleData("discountCode", "DiscountCode"), security: authSecurity }),
    },
    "/api/admin/discounts": {
      get: operation({
        tags: ["Commerce", "Admin"], summary: "Read discount rules or settings", operationId: "getAdminDiscounts", security: authSecurity,
        description: "scope=settings returns settings only. scope=rules or an explicit limit returns a rules page (default limit 20). With neither, returns settings and all rules.",
        parameters: [...offsetParams, queryParam("scope", "Requested data.", { type: "string", enum: ["settings", "rules"] })],
        data: { anyOf: [singleData("settings", "CommerceSettings"), pagedData("rules", ref("DiscountRule")), { type: "object", properties: { settings: ref("CommerceSettings"), rules: { type: "array", items: ref("DiscountRule") } }, required: ["settings", "rules"] }] },
      }),
      post: operation({
        tags: ["Commerce", "Admin"], summary: "Create a rule, issue a code, or run rules", operationId: "createAdminDiscount", security: authSecurity,
        description: "Omit action to create a rule; issue_manual uses discountType and validDays. run_rules evaluates active rules for eligible users.",
        body: { oneOf: [ref("DiscountRuleInput"), { type: "object", properties: { action: { type: "string", enum: ["run_rules"] } }, required: ["action"] }, { type: "object", properties: { action: { type: "string", enum: ["issue_manual"] }, userId: { type: "integer", minimum: 1 }, name: { type: "string", minLength: 1 }, discountType: { type: "string", enum: ["percentage", "free_shipping"] }, percent: { type: "integer", minimum: 1, maximum: 100 }, validDays: { type: "integer", minimum: 1, maximum: 3650 } }, required: ["action", "userId", "name", "validDays"] }] },
        data: { anyOf: [singleData("rule", "DiscountRule"), { type: "object", properties: { discountCode: ref("DiscountCode"), created: { type: "boolean" } }, required: ["discountCode", "created"] }, { type: "object", properties: { result: { type: "object", additionalProperties: true } }, required: ["result"] }] },
      }),
      patch: operation({
        tags: ["Commerce", "Admin"], summary: "Edit a rule, toggle it, or update cashback", operationId: "updateAdminDiscount", security: authSecurity,
        body: { oneOf: [{ allOf: [ref("CashbackInput"), { type: "object", properties: { action: { type: "string", enum: ["settings"] } }, required: ["action"] }] }, { allOf: [ref("DiscountRuleInput"), { type: "object", properties: { id: { type: "string" }, action: { type: "string", enum: ["update_rule"] } }, required: ["id", "action"] }] }, { type: "object", properties: { id: { type: "string" }, active: { type: "boolean" } }, required: ["id", "active"] }] },
        data: { oneOf: [singleData("settings", "CommerceSettings"), singleData("rule", "DiscountRule")] },
      }),
      delete: operation({ tags: ["Commerce", "Admin"], summary: "Delete a discount rule", operationId: "deleteAdminDiscount", security: authSecurity, body: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }, data: deletedData }),
    },
    "/api/user/wallet": {
      get: operation({
        tags: ["Commerce"], summary: "Read wallet balance, active discounts, or transactions", operationId: "getUserWallet", security: authSecurity,
        description: "scope=summary returns balance. scope=discounts returns active unused codes. scope=transactions returns transaction records. Scoped lists use offset/limit (default limit 1); obtain counts from user/structure first. Without scope the legacy wallet includes all codes and up to 30 transactions.",
        parameters: [...offsetParams, queryParam("scope", "Requested wallet section.", { type: "string", enum: ["summary", "discounts", "transactions"] })],
        data: { anyOf: [{ type: "object", properties: { wallet: { type: "object", properties: { balance: { type: "integer" }, discountCodes: { type: "array", items: ref("DiscountCode") }, transactions: { type: "array", items: ref("WalletTransaction") } }, required: ["balance"] } }, required: ["wallet"] }, pagedData("codes", ref("DiscountCode")), pagedData("transactions", ref("WalletTransaction"))] },
      }),
    },
    "/api/admin/orders/in-person": {
      post: operation({ tags: ["Commerce", "Admin"], summary: "Create an in-person sale", operationId: "createInPersonOrder", security: authSecurity, body: ref("InPersonOrderInput"), data: singleData("order", "OrderCreated"), successStatus: "201", extraResponses: { "409": errorResponse("Stock, wallet, or discount conflict"), "410": errorResponse("Discount expired") } }),
    },
    "/api/admin/orders/in-person/quote": {
      post: operation({ tags: ["Commerce", "Admin"], summary: "Preview an in-person sale", operationId: "quoteInPersonOrder", security: authSecurity, body: ref("InPersonOrderInput"), data: singleData("quote", "OrderQuote"), extraResponses: { "409": errorResponse("Stock, wallet, or discount conflict"), "410": errorResponse("Discount expired") } }),
    },
    "/api/admin/orders/in-person/options": {
      get: operation({ tags: ["Commerce", "Admin"], summary: "Search products or customers for a sale", operationId: "getInPersonOrderOptions", security: authSecurity, parameters: [{ ...queryParam("kind", "Option collection.", { type: "string", enum: ["products", "customers"] }), required: true }, { ...offsetParams[0], required: true }, offsetParams[1], adminFilterParams[0]], data: pagedData("items", { type: "object", description: "Product: id, title, description, prices, imageUrl, stockQuantity, colorStock, active/isActive/isAvailable. Customer: id, name, username, email, role, walletBalance, profiles.", additionalProperties: true }) }),
    },
    "/api/admin/collections/structure": {
      get: operation({ tags: ["Admin"], summary: "Count filtered users or orders before requesting a page", operationId: "getAdminCollectionStructure", security: authSecurity, parameters: [{ ...queryParam("collection", "Collection to count.", { type: "string", enum: ["users", "orders"] }), required: true }, ...adminFilterParams], data: countData }),
    },
    "/api/products/search/structure": {
      get: operation({ tags: ["Products"], summary: "Count products matching search before loading results", operationId: "getProductSearchStructure", parameters: productFilterParams, data: countData }),
    },
    "/api/products/{id}/comments/structure": {
      get: operation({ tags: ["Products"], summary: "Count active comments and rating groups", operationId: "getProductCommentStructure", parameters: [pathParam("id", "Product ID.", true)], description: "count includes unrated text comments; ratings includes only numeric ratings across all active comments, not just the current page.", data: { type: "object", properties: { structure: { type: "object", properties: { count: countSchema, ratings: { type: "array", items: { type: "object", properties: { stars: { type: "integer", minimum: 1, maximum: 5 }, count: countSchema }, required: ["stars", "count"] } } }, required: ["count", "ratings"] } }, required: ["structure"] } }),
    },
    "/api/catalog/section": {
      get: operation({ tags: ["Catalog"], summary: "Load data for a storefront section", operationId: "getCatalogSection", parameters: [{ ...queryParam("type", "Section type.", { type: "string", enum: ["banner", "brands", "categories"] }), required: true }, { ...queryParam("id", "Section identifier."), required: true }, includeInactiveParam], data: { type: "object", properties: { type: { type: "string" }, banner: nullableRef("Banner"), brands: { type: "array", items: ref("Brand") }, categories: { type: "array", items: ref("Category") } }, required: ["type", "banner", "brands", "categories"] } }),
    },
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
        description: "شماره موبایل و ایمیل باید معتبر باشند. کد یک دقیقه اعتبار دارد و ارسال مجدد تا ۶۰ ثانیه محدود است.",
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
    "/api/category-group/{id}/structure": {
      get: operation({
        tags: ["Catalog"],
        summary: "Get category group page structure",
        operationId: "getCategoryGroupStructure",
        parameters: [pathParam("id", "Category group id or title."), ...structureParams],
        data: ref("CatalogStructure"),
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
        parameters: [...productFilterParams.filter((parameter) => parameter.name !== "limit"), ...offsetParams],
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
        parameters: [pathParam("id", "Product id.", true), ...offsetParams],
        description: "With limit, returns a page and total/nextOffset; without limit, returns the legacy comments and viewer rating metadata.",
        data: { anyOf: [pagedData("comments", ref("Comment")), ref("ProductCommentsData")] },
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
        body: ref("CheckoutInput"),
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
    "/api/user/structure": {
      get: operation({
        tags: ["Profile"],
        summary: "Get user account structure counts",
        description: "Tiny count-only payload fetched as soon as the user account page opens. orders and discounts drive skeleton counts; unseenDiscounts is the discount-tab badge until those codes are viewed.",
        operationId: "getUserPanelStructure",
        data: {
          type: "object",
          properties: {
            structure: ref("UserPanelStructure"),
          },
          required: ["structure"],
        },
        security: authSecurity,
      }),
      post: operation({
        tags: ["Profile"],
        summary: "Mark unseen discount codes as seen",
        description: "Set seenDiscounts to true after the user opens the discounts tab. The badge stays at 0 until a new active code is issued.",
        operationId: "updateUserPanelStructure",
        body: {
          type: "object",
          properties: {
            seenDiscounts: { type: "boolean" },
          },
        },
        data: {
          type: "object",
          properties: {
            structure: ref("UserPanelStructure"),
          },
          required: ["structure"],
        },
        security: authSecurity,
      }),
    },
    "/api/user/orders": {
      get: operation({
        tags: ["Profile"],
        summary: "List current user's orders",
        operationId: "listUserOrders",
        parameters: offsetParams,
        description: "Guests receive an empty page. Authenticated requests return their orders; supply limit to page results.",
        data: pagedData("orders", ref("Order")),
      }),
    },
    "/api/admin/catalog/structure": {
      get: operation({
        tags: ["Admin"],
        summary: "Get admin panel structure counts",
        description: "Tiny count-only payload fetched as soon as the admin panel opens. Collections skeleton min(count, viewportFit) from this response.",
        operationId: "getAdminCatalogStructure",
        data: {
          type: "object",
          properties: {
            structure: ref("AdminPanelStructure"),
          },
          required: ["structure"],
        },
        security: authSecurity,
      }),
    },
    "/api/admin/catalog/{section}": {
      get: operation({
        tags: ["Admin"],
        summary: "Get a paged admin catalog section",
        description: "Pass limit and offset from the viewport capacity. Omit them only for product-form and all snapshots used by save/edit flows.",
        operationId: "getAdminCatalogSection",
        parameters: [
          pathParam("section", "Admin catalog section."),
          queryParam("limit", "Viewport-sized page size.", { type: "integer", minimum: 1, maximum: 100 }),
          queryParam("offset", "Number of already loaded items to skip.", { type: "integer", minimum: 0 }),
        ],
        data: {
          type: "object",
          properties: {
            catalog: { type: "object" },
          },
        },
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
        parameters: [...offsetParams, ...adminFilterParams, ...adminSortParams],
        description: "Supply limit for pagination; use the same view, q, from, and to filters when requesting collections/structure. Without limit the legacy response returns all orders.",
        data: { anyOf: [pagedData("orders", ref("Order")), listData("orders", "Order")] },
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
      put: operation({
        tags: ["Theme"],
        summary: "Update theme compatibility route",
        operationId: "putThemeAdmin",
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
