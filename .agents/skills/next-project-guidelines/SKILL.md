---
name: next-project-guidelines
description: Project-specific rules for this Next.js 16 app. Use when editing, reviewing, or generating code in this repository, especially UI, Docker, Prisma, API routes, admin panel, or design-system work. Applies alongside installed Vercel React, web design, view transition, and writing skills.
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
- For API routes, validate inputs, keep response shapes stable, and avoid leaking internal errors.

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
