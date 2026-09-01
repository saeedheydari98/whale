---
name: next-project-guidelines
description: Project-specific rules for this Next.js 16 app. Use when editing, reviewing, or generating code in this repository, especially UI, Docker, Prisma, API routes, admin panel, design-system, loading, SEO, metadata, JSON-LD, security headers, or validation work. Applies alongside installed Vercel React, web design, view transition, and writing skills.
---

# Next Project Guidelines

## First Steps

- Read `AGENTS.md` before changing code.
- Before using Next.js APIs, read the relevant guide in `node_modules/next/dist/docs/`; this project uses Next.js 16 and may differ from older assumptions.
- Prefer existing local patterns in `app/design-system`, `app/panel`, `lib`, and `prisma` before adding new abstractions.
- Keep changes scoped. Do not rewrite unrelated files or undo user changes.

## UI Rules

- Render every visible text node inside `div` or `span` only. Do not use `p` or `h1`-`h6` in project UI.
- Control typography with Tailwind `text-*` and `font-*` classes, such as `text-sm`, `text-base`, `text-2xl`, `font-medium`, or `font-bold`.
- Use flexbox and `gap-*` for layout spacing. Avoid CSS grid unless a real two-dimensional layout is unavoidable.
- Preserve visual parity when refactoring existing UI. Do not remove or replace spacing, sizing, grid, or positioning classes if doing so changes the rendered appearance.
- Prefer avoiding left/right margin and padding utilities (`ml-*`, `mr-*`, `mx-*`, `pl-*`, `pr-*`, `px-*`) in new code, but keep them when they are required for the existing appearance or component ergonomics.
- Prefer avoiding `position`, `absolute`, and `relative` in new code, but keep them when required for overlays, badges, icons inside inputs, modals, floating controls, or the existing appearance.
- Keep cards simple: no card-inside-card layouts. Use cards only for repeated items, modals, and framed tools.
- Use Tailwind classes plus existing custom project components for styling. Prefer `CustomButton`, `CustomInput`, `CustomModal`, `CustomSwitch`, and related `app/design-system` primitives before creating raw controls or new UI primitives.

## Next.js And React

- Keep client components narrow. Add `"use client"` only where state, effects, event handlers, browser APIs, or design-system client components require it.
- Avoid derived state in effects; compute derived values during render or with focused memoization when expensive.
- Start independent async work early and await together with `Promise.all` when possible.
- For API routes, validate inputs with Zod via `lib/api/validation.ts` and `lib/api/schemas.ts`. Keep response shapes stable, and never leak internal errors to the client.

## SEO And Security

Follow [seo-and-security.md](seo-and-security.md) whenever adding pages, metadata, JSON-LD, images, headers, env, or API validation.

- Public pages need `metadata` / `generateMetadata` (`title`, `description` 150–160 chars, `robots`, `alternates.canonical`, Open Graph, Twitter). Put it on Server layouts; do not export metadata from `"use client"` pages.
- Root layout owns `Organization` + `WebSite` JSON-LD. Product/category/brand/showcase layouts add `BreadcrumbList` and `Product` where relevant. Serialize with `jsonLdScript` (escape `<` as `\u003c`).
- Visible UI text stays in `div`/`span`. Do not add `h1`–`h6` for SEO. Document title and JSON-LD carry heading semantics.
- Use `AppImage` (`next/image`) instead of `<img>`. Require `alt` plus `width`/`height`. `priority` only for LCP images.
- Internal links go through `next/link` (`CustomButton` href already does). Public catalog URLs stay slug-based, hyphenated, without extra query noise.
- Security headers live in `proxy.ts` (Next.js 16; `middleware.ts` is deprecated) and `next.config.ts`. Keep cookies `httpOnly`, `sameSite: 'lax'`, `secure` in production. Validate env in `lib/env.ts`. Sanitize any HTML with `lib/sanitize-html.ts`. Rate-limit APIs with `lib/api/rate-limit.ts`; do not add NextAuth, Upstash Ratelimit, or a second auth stack.

## Theme Boot (do not change)

Theme (`GET /api/theme`) is the first API of the app. It owns every product color token. The default SSR palette is gray. If the whale paints before theme colors are on `:root`, it flashes gray and then recolors. That flash is a bug.

Keep this pipeline exactly. Do not simplify the two HTML flags into one, do not show the whale by default, and do not soft-timeout the first theme fetch to the gray fallback.

1. **SSR** paints `html` with gray CSS variables, `data-theme-color-ready="false"`, and `data-theme-ready="false"`. The HTML whale (`[data-theme-boot-loader]`) and `.whale-loader-surface` stay `visibility: hidden`. `[data-app-shell]` stays hidden.
2. **Cached refresh** (fresh `app-theme:v1` plus `theme-css-vars:v1` within `APP_THEME_CACHE_TTL_MS`): the `beforeInteractive` script in `app/layout.tsx` applies cached CSS variables and sets only `data-theme-color-ready="true"`. The whale may paint immediately in cached theme colors. Do **not** set `data-theme-ready` in that script, or the shell flashes under the loader before React mounts.
3. **First run / expired cache**: keep the whale hidden. Do not apply the gray fallback palette to `:root`. `AppThemeProvider` must call `fetchAppTheme({ force: true, timeoutMs: 0 })` and only then set `ThemeProvider` `applyToDocument`. `timeoutMs: 0` waits for the real theme; never reveal a gray whale after `APP_THEME_SOFT_TIMEOUT_MS`, and never resolve/cache gray when `/api/theme` fails or omits `data.theme`. If there is no cache, keep waiting/retrying instead of applying fallback gray. After `ThemeProvider` writes the real CSS variables, `onDocumentApplied` sets `data-theme-color-ready` and `data-theme-ready`.
4. **After colors are on `:root`**, the whale is allowed to show. `data-theme-ready="true"` hides the HTML boot whale (`display: none`) and reveals the app shell. `RouteLoadingController` then keeps the themed whale until page structure is ready. A blocking `<style>` in `app/layout.tsx` must keep the whale and page background hidden until `data-theme-color-ready="true"` so CSS load order cannot flash gray.
5. **Files that encode this contract:** `app/layout.tsx` (inline hide style, bootstrap script, HTML whale), `app/globals.css`, `lib/app-theme-provider.tsx`, `app/design-system/theme/provider.tsx` (`applyToDocument`), `lib/app-theme-client.ts`. Subsequent visits must use that cache so a refresh does not wait on `/api/theme` before painting the whale. Never apply fallback gray to the document, never persist gray CSS vars before the first real/cached theme, and never show `[data-theme-boot-loader]` or `.whale-loader-surface` while `data-theme-color-ready="false"`.

## Dynamic Loading Contract

All loads follow one pipeline: theme colors → whale until structure → real subtree with skeletons until data. Use `app/design-system/components/loading/loading.tsx` as the only loading subsystem. Wrap content with `<Loading isLoading={dataLoading}>`. Collection item counts from the page structure belong on `DynamicLoadingCollection` as `totalCount` / `structure={{ count }}` only — never as a pixel, `vh`, or Tailwind size. Standard Next.js `loading.tsx` files are allowed only when they render that central component. Do not add page-local loading helpers, Skeleton components/files, placeholder-count utilities, cached loading hints, or local `IntersectionObserver` implementations.
- Show the whale loader for application startup, a full browser refresh, and every route navigation — but only after theme colors are applied (see Theme Boot). Keep it visible until the lightweight page structure is ready (`useStructureRouteLoading`). Implement it only through route-segment `loading.tsx` files plus the central `RouteLoadingController`; programmatic `router.push`/`replace` calls must start that controller before navigation. Never show the whale for a tab change, ordinary client-side data fetch after structure is ready, authentication/access resolution inside the current route, collection measurement, or mutation that stays on the same route. Never paint the whale in the gray SSR fallback.
- Separate structure loading from data loading. `isStructureLoading` / `useStructureRouteLoading` covers the structure request. `isLoading` on `Loading` covers content data. After structure arrives, render the real final subtree immediately and skeletonize it while data loads.
- Every unresolved content load inside the current route—including the first visit to a data-backed tab, authentication/access resolution, search results, and panel detail refreshes—must use the central dynamic skeleton. Keep the destination tab subtree mounted and skeletonize that subtree; never leave the tab blank while its request is pending.
- For detail panels, forms, profiles, cards, and other compound UI, use the central `skeleton-structure` variant around the real final subtree. Skeleton layers are only the visual holder of the next layer (section/card) and the last layer (button, input/textarea/select or its glass wrapper, image, or a text block). Do not skeletonize anything inside a last layer: button labels, input labels/legends/icons, spans inside a text `div`, or layout-only wrappers. Stop after the central depth limit. Do not reduce compound UI to either one outer block or a cloud of tiny text-line blocks.
- Do not render generic content-loading indicators such as spinners, dots, progress text, «در حال دریافت»، «در حال بررسی»، or «در حال جست‌وجو». Spinner/dots and optional loading text are allowed only inside the specific button or control that initiated a submit, save, delete, payment, logout, or similar mutation. Data-fetching and tab content always use skeletons.
- A skeleton must occupy the final element's own rendered position and measured dimensions. Render the same final component with an `isLoading` state, not a separate approximation. Never give the loading layer (`Loading`, `LazyViewport`) manual `h-*`, `w-*`, `min-*`, `max-*`, `aspect-*`, pixel/rem/`vh` values, inline width/height, `heightPercent`, or a guessed placeholder count. Dynamic sizes such as banner `heightPercent` come from the structure/API and must be applied on the real element. Frontend layout sizes (`w-full`, `min-h-40`, `h-12`) stay on the real component; the central loading layer measures that DOM automatically.
- Structural skeleton layers must be generated centrally from containment and computed geometry, not declared separately in pages. Preserve nested visual layers so holders sit behind last-layer controls. Limit measurement to the current viewport; offscreen content is handled by the central lazy-loading contract.
- Treat button, input, textarea, select, and a text-bearing block as terminal skeleton elements. Do not create separate skeleton blocks for their label, legend, fieldset, placeholder, icon, helper, or inner `span` descendants. Small-element filtering must derive from each element's computed font size and line height; never introduce fixed skeleton widths, heights, breakpoints, or pixel thresholds.
- Render collections through the central `DynamicLoadingCollection`. Placeholder count is `min(knownTotal, viewportFit)` with no hardcoded 8/30/page-size defaults. `viewportFit` comes from one detached probe of the real item. Keep that probe out of document flow (`data-loading-probe`, absolutely clipped `h-0 overflow-hidden`) so it cannot add empty height or stretch the first row. For wrapping collections, wrap each item in `self-start w-max` so `w-full max-w-*` cards keep their intrinsic size as count/height grows; do not let leftover viewport height stretch cards or wrap one card per row. Then confirm against laid-out items before paint: shrink any placeholders that wrap past the first row (unknown non-paginated lists) or past the remaining visible height of `[data-app-scroll-container]` (paginated lists only). Never fill leftover viewport with extra empty rows. If the real items are taller than the remaining viewport, it is OK to scroll just enough for those items.
- When `totalCount` / structure `count` is known, use that exact count and do not invent extra skeletons to fill leftover viewport height. When the total is unknown and the collection is not paginated (`onCapacityChange` / `hasMore` / `onLoadMore` absent), measure one row (wrap/horizontal) or one item (column) only. On entering `/panel/admin`, immediately fetch `GET /api/admin/catalog/structure`. That payload is count-only: `products`, `orders`, `users`, `banners`, plus `{ id, count }[]` for showcases, category groups, and brand groups. On entering `/panel/user` after login, immediately fetch `GET /api/user/structure`. That payload is count-only: `orders`, `discounts`, and `unseenDiscounts`. Order and discount tab skeletons use `min(count, viewportFit)`. The discounts tab badge shows `unseenDiscounts` only; opening that tab POSTs `{ seenDiscounts: true }` so the badge stays at 0 until a new active code is issued. Do not put titles, sort orders, layouts, or records in these structure APIs. Do not wrap the whole tab in an extra `skeleton-structure` around the collection. Pass `onCapacityChange` only after structure counts exist. A `totalCount` of `0` must mark the section loaded and show the empty state.
- Feed `DynamicLoadingCollection.onCapacityChange` into the query/API limit only for paginated collections. Keep the query disabled while capacity is zero, include capacity in the query key when it changes the response, fetch the first viewport-sized batch only, then use the central sentinel to request one further viewport-sized batch as scrolling reaches it. Do not render the load-more sentinel when the list is not paginated.
- Defer offscreen sections with the central `LazyViewport`. Offscreen fallback is the same final component (or one invisible probe of it) so size comes from that element's CSS/API dimensions, not from a sized wrapper or `structure` on `LazyViewport`. Revealing content only replaces pixels and does not move, resize, insert, or remove surrounding layout.
- Loading completion must produce zero layout shift: the same outer layout, gaps, wrapping, and item footprint must exist before and after data arrives. Keep invisible sizing DOM non-interactive and non-focusable. Define empty, error, and `totalCount = 0` transitions under the whale/structure boundary so an empty state does not replace visible skeletons with a different footprint. Treat any visible position or size change as a loading bug.
- During review, search for and reject page/fullscreen loading outside route `loading.tsx` files, generic loading text/spinners outside mutation controls, data-backed tabs without a skeleton boundary, new `*Skeleton*`, `createLoading*`, `resolve*Loading*`, manual placeholder arrays/counts, fixed list limits, wrapping an entire admin tab in `skeleton-structure` around a `DynamicLoadingCollection`, one-block skeletons around compound UI, inner skeletons on button text / input labels / spans inside a last-layer control, component-local viewport observers outside the central loading subsystem, `[data-theme-boot-loader]` or `.whale-loader-surface` visible before `data-theme-color-ready="true"`, applying fallback gray to `:root` before the cached/fetched theme, merging the two theme flags, a first-run theme fetch that soft-timeouts to gray, collection capacity that fills leftover viewport with empty rows, wrap cards that stretch to full row width as height/count grows, or a loading probe that stays in flex flow (`overflow-visible`) and adds empty tab height.
- Validate loading changes at multiple viewport sizes in addition to TypeScript/build checks. Compare the loading and loaded element geometry or record CLS; screenshots alone are insufficient if element bounds are not compared.

## Data And Prisma

- Treat `prisma/schema.prisma` as the source of truth for DB models.
- Keep product and theme API payloads compatible with existing UI forms and localStorage fallbacks.
- Run `npx prisma generate` after schema changes.

## Docker

- Use `docker-compose.yaml` for production-style runs.
- Use `docker-compose.dev.yaml` for development with volumes and automatic source updates.
- For production-style Docker after code changes, run `npm run build` before `docker compose up --build -d` because the runtime image copies `.next/standalone`.

## Validation

- For code changes, run `npx tsc --noEmit`.
- Run `npm run build` for Next.js, Docker, route, or cross-component changes.
- Report any validation command that could not be run.
