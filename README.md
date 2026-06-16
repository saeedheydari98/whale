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
* `UserTheme`
* `Product`
* `Showcase`
* `Banner`

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/products` | Fetch product catalog |
| POST | `/api/products` | Save product catalog |
| GET | `/api/showcases` | Fetch showcases |
| GET | `/api/theme/admin` | Fetch admin theme |
| POST | `/api/theme/admin` | Save admin theme |
| GET | `/api/theme/user` | Fetch user theme |
| POST | `/api/theme/user` | Save user theme |

## Scripts

```bash
npm run dev
npm run build
npm run storybook
```
