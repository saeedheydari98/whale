# Next.js UI Playground

A modern Next.js learning project focused on scalable UI systems, product showcase flows, Storybook, Prisma, and PostgreSQL.

## Features

* Built with Next.js App Router
* Reusable design-system components
* Product catalog and showcase pages
* Admin and user panels
* Theme customization
* Storybook for isolated component development
* Prisma ORM with PostgreSQL
* REST API routes

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js |
| UI Library | React |
| Language | TypeScript |
| Component Dev | Storybook |
| ORM | Prisma |
| Database | PostgreSQL |

## Getting Started

Install dependencies:

```bash
npm install
```

Create `.env` and set your database URL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
```

Generate Prisma Client:

```bash
npx prisma generate
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Project Structure

```text
app/
  api/
  cart/
  design-system/
  panel/
  products/
  search/
prisma/
  schema.prisma
```

## Database Models

* `User`
* `AdminTheme`
* `CustomerProfile`
* `Product`
* `Showcase`
* `Banner`
* `Order` and `OrderItem`
* `WalletTransaction`, `DiscountCode`, and `DiscountRule`

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/products` | Fetch product catalog |
| POST | `/api/products` | Save product catalog |
| GET | `/api/showcases` | Fetch showcases |
| GET | `/api/theme` | Fetch the store palette |
| PUT | `/api/admin/theme` | Save the admin palette |
| PATCH | `/api/app/user` | Update the user's light/dark mode |
| POST | `/api/cart/quote` | Preview checkout totals |
| POST | `/api/admin/orders/in-person` | Record an in-person sale |
| GET | `/api/user/wallet` | Fetch wallet summary, discounts, or transactions |
| GET | `/api/openapi` | Read the complete API contract |

## Scripts

```bash
npm run dev
npm run build
npm run storybook
```

## API documentation and component previews

Start Next.js with `npm run dev`, then run `npm run swagger` in another terminal.
Swagger opens at `http://localhost:3001` and reads the current contract from
`/api/openapi`. Its API requests are forwarded to Next.js, including request
bodies and authentication cookies. Use `SWAGGER_PORT` to change the documentation
port and `NEXT_API_ORIGIN` to point it at another local API server. If the preferred
port is occupied, use the URL printed by the Swagger process.

The contract covers catalog structure, search and review counts, offset pagination,
wallet sections, discount rules, checkout quotes, and in-person sales. For paginated
collections, request the structure count first and then send the measured `limit`
with `offset` to the data endpoint. Reading the contract does not require a database;
executing database-backed endpoints requires a valid `DATABASE_URL`.

Run `npm run storybook` to open component previews at `http://localhost:6006`.
Storybook uses local sample data and does not require the application database.
The direction toolbar switches between Persian RTL and English LTR. Examples include
semantic headings, clipped text with the shared tooltip, full explanatory text,
order status, color quantities, product ratings, empty states, and content loading.
In the Loading story, toggle `isLoading` to compare the skeleton with the real form.

Run `npm run build-storybook` to generate the static preview in `storybook-static`.

## SEO regression checks

Use Node.js 22.19 or newer and an installed Google Chrome for the pinned Lighthouse
audit. The production application needs its normal database and theme configuration.

```bash
npm run build
npm run check:seo
# Full sitemap coverage before release:
npm run verify:seo
# Check a deployed build and include an affected route:
npm run check:seo -- https://your-store.example /products/example
```

`check:seo` starts the current production build when no origin is supplied. It checks
public static pages and one URL per dynamic sitemap route family on mobile and desktop;
`--all` checks every sitemap URL. Public pages must score exactly 100/100 in Lighthouse
SEO, with valid metadata, canonical links, headings, image alternatives, and JSON-LD.
Reports and their URL/device/version details are saved in `artifacts/seo/`.

The cart is checked separately: its deliberate `noindex` reduces the raw Lighthouse
score. Crawling stays allowed so search engines can read that directive. The check
preserves `noindex` and fails for any other scored SEO failure or a robots.txt block
that prevents reading it; it never relabels the raw score as 100. Private routes must
stay out of the sitemap. A failed page request, invalid metadata, or browser error fails
the check. Use a populated database to include the dynamic catalog routes.
