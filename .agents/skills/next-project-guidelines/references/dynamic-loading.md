# Structure-driven dynamic loading

Read this reference when changing API-backed data, collections, tabs, accordions, modals, search, galleries, carts, or loading behavior in this repository.

## Required pipeline

The central implementation is app/design-system/components/loading/loading.tsx. Do not add another loading subsystem, viewport observer, skeleton counter, or per-page placeholder array.

For remote collections, the order is: authorized count-only structure -> real item probe measured centrally -> a bounded first data page -> one further measured page when the central sentinel becomes visible. A page response's total is useful for subsequent pages; it does not replace the initial structure request or count passed by a parent.

Keep records disabled until both a valid count and a positive measured capacity exist. Unknown is not zero. A known zero resolves to the empty state without fetching records. Never turn on onCapacityChange, hasMore, or onLoadMore while structure is unresolved. An unopened data accordion must not request its structure or records unless its counts already belong to the page's initial structure.

Use hooks/use-structure-paged-collection.ts for shared paged consumers. The compatibility export useAdminPagedCollection has the same contract. The options require totalCount (which may be unresolved) or a count-only structureEndpoint. Pass collectionProps intact to DynamicLoadingCollection. The onCapacityChange callback must drive the actual API limit and query key; a setter whose value is discarded is a loading bug.

Preserve the matching filtered total while capacity changes. Falling back to a global count during a small search result creates resize/request loops. Placeholder data may be reused only for the same endpoint, filter, and account. Include account identity in private query keys. A disabled query's isPending is not permission to show loading or fetch data.

## Count sources and scope

- Admin route: GET /api/admin/catalog/structure. Counts include products, users, orders, inPersonOrders, banners, discountRules, accessRequests by pending/approved/archived, group child counts, and storefront by tab. Access request counts must be authorized for the superadmin.
- Filtered admin users/orders: GET /api/admin/collections/structure with the same collection, q, date, and view filters as the data request. Count and page must share filtering predicates.
- User route: GET /api/user/structure. Include orders, active discounts, unseenDiscounts, and walletTransactions. Wallet balance is a scalar summary, not a guessed list structure.
- Global search: GET /api/products/search/structure for the current query before a measured search page.
- Product reviews: the product structure counts all active comments, including unrated text comments. GET /api/products/:id/comments/structure supplies the count and numeric rating-group counts. Render rating statistics from those complete counts, not only the downloaded page.
- Public catalog, category, brand, and showcase routes retain their existing page-structure sources. ProductListGrid and showcase/group collections must keep lazy enabled.
- A synchronized cart snapshot or an already loaded local selection has a real item count. Use that count without inventing another remote collection. Mount product-detail consumers inside the central lazy row so offscreen cart items do not eagerly start one request each.

Structure APIs contain counts/IDs needed for shape, not titles, descriptions, prices, images, or full records. A new remote collection requires a count source before it is connected to the UI. Preserve existing endpoint responses when adding paged/scoped behavior for their active consumers.

## Real geometry and appropriate exceptions

For records, use DynamicLoadingCollection with lazy and exact structure counts. Render the same real row/card in renderItem and renderSkeleton. The loading layer gets no manual geometry. Item/card CSS owns dimensions. Measure only through the central probe; never fill spare height with extra fake rows.

For scalar panels, forms, details, authentication, and mutation results, use the central Loading around their actual final subtree. Collections inside them still follow the collection contract. Ordinary finite controls such as OTP slots, five rating stars, gallery navigation dots, color counts, or local form values are not remote record pages.

Horizontal storefront rails intentionally fetch their configured structure count and use native horizontal scrolling; do not attach a fake paging callback. The admin layout editor is paginated. It may read the complete current layout during an explicit reorder mutation to preserve records beyond loaded pages.

Keep forms, filters, headings, and creation actions outside data-only accordions. Do not reintroduce refresh buttons or a whale for ordinary tab/accordion/data requests. Theme boot, route structure, and existing navigation loading stay intact.

After writes, invalidate the appropriate structure and record caches so zero-to-positive and positive-to-zero transitions work without manual refresh. Loading failure must surface an error and stop unresolved skeletons; do not silently interpret an invalid response as an empty list.

## Validation and regression checks

Run npm run check:ui (includes check-loading-contract.mjs), npx tsc --noEmit, and the required production build. Static checks enforce central lazy/count wiring; they cannot prove runtime behavior.

For affected collection types, use intercepted browser fixtures at desktop and mobile sizes. Cover 0, 1, 2, and many records; delayed structure; delayed data; query changes; reopen; errors; and mutation count changes. Assert:

- no records while closed, before count resolution, or before measurement;
- first limit derives from the viewport and never exceeds the known total;
- only scrolling requests further pages; zero never requests records;
- small filtered results settle instead of oscillating capacities;
- skeleton/item bounds and surrounding layout agree before/after data;
- offscreen lazy rows do not mount their data consumers early;
- data and structure remain isolated between accounts.

Useful checks live in scripts/check-structure-loading-ui.mjs, check-admin-lazy-panels.mjs, check-admin-users-loading.mjs, check-in-person-order-ui.mjs, check-cart-ui.mjs, and check-card-overflow.mjs. Update fixtures to include authoritative counts and page metadata rather than making the UI accept a malformed or unbounded response.
