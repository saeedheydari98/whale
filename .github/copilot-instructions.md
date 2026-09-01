# Project Instructions

Follow `AGENTS.md` and `.agents/skills/next-project-guidelines/SKILL.md` for this repository.

Key rules:

- This is a Next.js 16 project. Read relevant docs in `node_modules/next/dist/docs/` before using Next.js APIs.
- Use existing design-system components and local patterns before adding new primitives.
- Keep body copy and chrome in `div` or `span`. Do not use `p`. Page, section, and item titles use `AppHeading` from `app/design-system/components/ui/text.tsx`; do not write raw `h1`–`h6`. One `h1` per page.
- Control typography with explicit `text-*` and `font-*` classes.
- Preserve the existing visual appearance when refactoring.
- Build layout with flexbox and `gap-*` where it does not alter appearance. Avoid grid, left/right margin or padding, and positioning in new code, but keep them when required for current spacing, alignment, responsive behavior, or overlays.
- Style with Tailwind classes and custom project components from `app/design-system`.
- Keep changes scoped and do not revert user edits.
- Validate with `npx tsc --noEmit`; use `npm run build` for broader UI, route, Docker, or Next.js changes.
