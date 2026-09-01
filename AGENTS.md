<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Agent Rules

Use the local project skill in `.agents/skills/next-project-guidelines/SKILL.md` for repository-specific rules.

Installed Vercel skills live in `.agents/skills/` and should be applied when relevant:

- `vercel-react-best-practices`
- `vercel-react-view-transitions`
- `web-design-guidelines`
- `writing-guidelines`

## Shared UI Rules

- Body copy and chrome stay in `div` or `span`. Do not use `p`.
- Page, section, and item titles use `AppHeading` from `app/design-system/components/ui/text.tsx`. Do not write raw `h1`–`h6`. Pass explicit Tailwind `text-*` and `font-*` classes; do not rely on browser heading size.
- One `level={1}` per page. `level={2}` for major sections. `level={3}` for repeated item titles. Never put a heading inside a `button` or `a`. Header/footer brand is not a page `h1`.
- Build layout with flexbox and `gap-*`.
- Preserve the existing visual appearance unless the user explicitly asks for a design change.
- Prefer avoiding grid, left/right margin, left/right padding, and positioning in new or refactored code, but do not remove them when they are part of the current visual spacing, alignment, overlay behavior, or responsive layout.
- For styling, use Tailwind classes plus existing custom project components from `app/design-system`; prefer `CustomButton`, `CustomInput`, `CustomModal`, `CustomSwitch`, and related local primitives before raw HTML controls.

## Validation

- Run `npx tsc --noEmit` after code changes.
- Run `npm run build` for Next.js, route, Docker, or broad UI changes.
