# SEO And Security

Use this file with the project skill. Keep body copy and chrome in `div`/`span`. Page/section/item titles use `AppHeading` (`app/design-system/components/ui/text.tsx`). Do not use `p` or raw unstyled `h1`–`h6`. Keep the loading and theme-boot contracts unchanged.

## SEO

### Architecture

- Pages that only display content should be Server Components. Keep `"use client"` on interactive islands (tabs, cart, galleries, loaders).
- Prefer a server `layout.tsx` for `metadata` / `generateMetadata` and JSON-LD next to a client `page.tsx`.
- Catalog reads already go through `withCatalogCache`. Do not switch those to `fetch` `force-cache` by default. Auth, cart, panel, and user structure stay `no-store` / `force-dynamic`.

### Metadata

Every public route needs:

- `title` (root uses `template: '%s | فروشگاه وال'`)
- `description` between 150 and 160 characters (`seoDescription` in `lib/seo.ts`)
- `robots` (`index`/`follow` for public catalog; `noindex` for `/panel`, `/cart`, `/search`)
- `alternates.canonical`
- `openGraph` and `twitter`
- at most 10 `keywords`

Helpers: `pageMetadata`, `lib/site.ts`, `lib/seo-catalog.ts`. Use product `metaTitle` / `metaDescription` / `metaKeywords` when present.

### Headings

- Import `AppHeading`. Never invent a second heading helper or write raw `h1`–`h6`.
- One `level={1}` per page. `level={2}` major sections. `level={3}` repeated item titles. Nested titles under an item heading may use `level={4}`.
- Keep the existing visual classes (`text-*`, `font-*`). Appearance must not change.
- Do not turn prices, counts, buttons, tabs, OTP, wallet balance, empty states, or header/footer chrome into headings.
- Never put a heading inside a `button` or `a` (invalid HTML). Accordion page titles belong in the `heading` slot, which is a sibling of the toggle button.
- `CustomModal` titles are `h2` and label the dialog with `aria-labelledby`.

### JSON-LD

- Home / root: `Organization` and `WebSite` with `SearchAction` (`/search?q={search_term_string}`)
- All catalog pages: `BreadcrumbList`
- Product pages: `Product` + `Offer`
- Render with `<JsonLd>` and `jsonLdScript` so `<` becomes `\u003c`
- Do not inject user HTML into JSON-LD

### Images and URLs

- `AppImage` only; never a raw `<img>`
- Required: `alt`, `width`, `height`
- `priority` on the LCP product/banner image
- WebP/AVIF via Next image formats; uploads remain WebP (`lib/image-upload.ts`)
- Public paths use descriptive slugs and hyphens: `/products/[slug]`, `/categories/[slug]`, `/brand/[slug]`, `/showcase/[slug]`
- Internal navigation uses `next/link` (including `CustomButton` `href`)

### Required files

- `app/sitemap.ts` — static catalog routes plus active products/categories/brands/showcases
- `app/robots.ts` — allow public pages; disallow `/panel/`, `/api/`, `/cart`, `/swagger`
- `app/manifest.ts` — PWA name for فروشگاه وال
- `app/not-found.tsx` and `app/error.tsx` — user-facing copy only, no stack traces

## Security (ASVS, adapted to this repo)

### Input and output

- Validate `params`, `searchParams`, and bodies with Zod (`lib/api/schemas.ts`, `parseJsonBody`, `slugParamSchema`)
- Encode/sanitize user HTML with `lib/sanitize-html.ts`. React text nodes are already encoded. `dangerouslySetInnerHTML` is allowed only for trusted static CSS/JSON-LD we own (theme boot CSS, `JsonLd`)
- Never render Prisma/internal errors. `apiFail` / `apiServerError` stay generic

### Headers and auth

- Set CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and production HSTS in `lib/security-headers.ts`
- Apply them from `proxy.ts` (Next.js 16 file convention; do not add `middleware.ts`) and `next.config.ts` `headers()`
- Keep the existing OTP cookie auth. Do not add NextAuth, Clerk, or Supabase Auth
- Cookies: `httpOnly: true`, `sameSite: 'lax'`, `secure` in production, bounded `maxAge`. `JWT_SECRET` is required in production (`lib/env.ts`)
- CSRF: same-origin `fetch` + `sameSite` cookies. Do not invent a second CSRF token layer for JSON APIs
- SQL: Prisma only. Rate limit: `lib/api/rate-limit.ts` on API routes. Redis REST is already used for catalog cache when configured; do not add `@upstash/ratelimit` unless replacing that cache on purpose

### API and env

- Private APIs: `requireUser` / `requireAdmin`
- CORS stays same-origin; do not send `Access-Control-Allow-Origin: *`
- Secrets stay in `.env` / `.env.local`. `NEXT_PUBLIC_` only for non-sensitive values (`NEXT_PUBLIC_SITE_URL`, websocket URL)
- Validate env in `lib/env.ts` on boot

### Loading and CLS

SEO work must not bypass the loading contract: whale until structure, then skeletons sized from structure counts. `AppImage` width/height exist to keep CLS under 0.1. Do not add page-local spinners. Headings go through `AppHeading` so skeleton measurement still treats them as last-layer text.
