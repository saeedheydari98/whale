# Shared UI

Application pages compose these components and keep their own data and event handlers.
Shared appearance and selected states belong here, not in feature-specific copies.

| UI pattern | Source |
| --- | --- |
| Native action behavior, focus, disabled state | `components/ui/action.tsx` |
| Submit, save, delete, and other actions | `components/ui/button.tsx` |
| Main page/panel tabs | `CustomTabs variant="primary"` |
| Sections inside a page or panel | `CustomTabs variant="secondary"` |
| Choices inside forms and modals | `CustomTabs variant="tertiary"` |
| Multiple choices, options, swatches, filters | `components/ui/selection.tsx` |
| Selection sizes and active/inactive colors | `variants/selection.variant.ts` |
| Header/footer navigation state | `variants/navigation.variant.ts` |
| Tables, rows, sortable headers | `components/ui/table.tsx` |
| Fixed dimensions for each repeated card family | `variants/collection-card.variant.ts` |
| Ellipsis and full-text hover/focus/touch tooltips | `components/ui/overflow-tooltip.tsx`, base text rules in `app/globals.css` |
| Modal section outline and completion badges | `components/ui/modal-section.tsx` |
| Files and ranges | `components/ui/file-upload.tsx`, `components/ui/range.tsx` |
| Color labels, swatches, inventory counts | `components/ui/color-stock-dots.tsx` |
| Per-color quantities in product details, online cart, and in-person orders | `components/ui/color-quantity-picker.tsx` |

`CustomTabs` supports RTL arrow keys, Home/End, disabled choices, icons, and badges.
Use selection controls for persistent choices and `CustomButton` for actions.
Preview the three tab levels in the `Design System/CustomTabs` Storybook stories.

Accordions default to closed; explicitly open only the first section of a form.
Do not use completion status to expand sections on mount. Keep fetching hooks
behind the section's open state or mount data-backed children only when opened.
Default to local entry or search instead of fetching an entire selection list.
Search remains available when a user explicitly enables a full list.
In-person orders start with a new customer, search-only product/customer lists,
and defer automatic quotes until the payment section opens. Option counts
refresh only after the first search or full-list request; opening the
modal itself does not refresh structure. Option results stay fresh for 30 seconds
within the modal and are discarded when it unmounts. Product placement
and showcase references load when their section opens and reuse loaded data.
Theme/authentication, route structure, visible page content, and the storefront
order needed to initialize new catalog records still load when required.

Keep tab headings, forms, filters, and creation actions outside accordions. Only
data lists and tables start collapsed; enable their requests when opened. Do not
wrap a whole tab or an unrelated form in an accordion. Do not add manual refresh
buttons anywhere in the app; reconcile data automatically after mutations.
Users, orders, access requests, discount rules,
and storefront layout use `useAdminPagedCollection` with the central measured
collection and scroll sentinel. Search and sort run on the server before paging.
Catalog lists retain their existing measured pagination. Settings and individual
mutations load on demand; they are not collections. Layout reordering reads the
complete current order only for a mutation, preserving records beyond the loaded
pages. Route structure, theme, and authentication remain startup requirements.

Continue using the existing input, select, switch, accordion, tag, text, image,
modal, and loading components. Loading must measure the real final component;
do not create a second skeleton implementation or guess list counts.

Repeated record cards use `collectionCardClasses` and `data-card-family` on the
real card. Long collections inside a card keep their own scroll region, so the
card never grows with record count. Forms, modal shells, and document sections
keep their natural content layout. In-person order lines also grow with their
color rows so quantity controls stay visible without nested scrolling.

Keep family sizes compact: avoid reserved empty height. `ColorQuantityPicker`
shows swatches and opens a small +/− counter beside the clicked color; other
selected color quantities remain unchanged. Product details, cart rows, and
in-person orders all use this control.
In-person orders use `layout="rows"`: one labeled row per color, with independent
counters that remain visible for selected colors.

Terminal text gets ellipsis centrally; explicit `whitespace-normal`,
`whitespace-pre-wrap`, `line-clamp-*`, or `data-text-wrap` keep multiline copy.
The application tooltip is shown only when the rendered text is actually clipped.

Run `npm run check:ui` to check the shared-control boundary. Also run
`npx tsc --noEmit` and the required Next.js build after UI changes.
