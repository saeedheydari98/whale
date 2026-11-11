// Isolated browser fixtures: no production account or database is accessed.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const origin = process.argv[2] ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(test) { for (let i = 0; i < 150; i++) { if (await test()) return; await pause(100); } assert.fail("Browser condition timed out"); }
async function assertControlCentered(control) {
  const result = await control.evaluate((element) => {
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    const top = parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
    const bottom = parseFloat(style.borderBottomWidth) + parseFloat(style.paddingBottom);
    const center = rect.y + top + (rect.height - top - bottom) / 2;
    const text = [...element.querySelectorAll("span")].find((span) => !span.children.length && span.textContent.trim());
    const nodes = [text, element.querySelector("svg")].filter(Boolean);
    return nodes.map((node) => { const bounds = node.getBoundingClientRect(); return Math.abs(bounds.y + bounds.height / 2 - center); });
  });
  assert.ok(result.length > 0 && result.every((offset) => offset < 1), "Control text and icon must share the vertical content center");
}
async function run(viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [], calls = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let releaseAccess, releaseSearch;
  const accessGate = new Promise((resolve) => { releaseAccess = resolve; });
  const searchGate = new Promise((resolve) => { releaseSearch = resolve; });
  let searchStructureReady = false;
  let cartItems = [];
  const adminStructure = { users: 50, orders: 50, inPersonOrders: 0, products: 1, banners: 0, discountRules: 2, accessRequests: { pending: 2, approved: 0, archived: 50 }, showcases: [], categoryGroups: [], brandGroups: [], storefront: { home: 0, categories: 0, products: 0 } };
  const product = { id: 1, slug: "structure-fixture", title: "محصول ساختار", description: "توضیحات", price: "1000", stockQuantity: 5, active: true, isActive: true, isAvailable: true, ratingAverage: 4, ratingCount: 2, reviewCount: 2, specCount: 0, images: [], colorStock: {}, sortOrder: 1 };
  const pageData = (url, items, key) => {
    const limit = Number(url.searchParams.get("limit")), offset = Number(url.searchParams.get("offset"));
    assert.ok(Number.isInteger(limit) && limit > 0 && limit <= Math.min(items.length || 100, 100));
    const result = items.slice(offset, offset + limit);
    return { [key]: result, total: items.length, nextOffset: offset + result.length < items.length ? offset + result.length : null };
  };
  await context.route("**/icon?**", (route) => route.fulfill({ status: 204, body: "" }));
  await context.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()), pathname = url.pathname;
    const json = (data) => route.fulfill({ json: { ok: true, data } });
    if (pathname === "/api/theme") return json({ theme: { primary: "blue", style: "light" } });
    if (pathname === "/api/app/user") return json({ user: { id: 1, role: "superadmin", username: "09176991556", email: "admin@example.com", themeMode: "light", profile: null }, cart: { count: 0 } });
    if (pathname === "/api/cart") return json({ cart: { items: cartItems } });
    if (pathname === "/api/catalog/sync") return route.fulfill({ contentType: "text/event-stream", body: ": fixture\n\n" });
    calls.push({ path: pathname, query: Object.fromEntries(url.searchParams) });
    if (pathname === "/api/admin/catalog/structure") return json({ structure: adminStructure });
    if (pathname === "/api/user/structure") return json({ structure: { orders: 50, discounts: 2, unseenDiscounts: 0, walletTransactions: 50 } });
    if (pathname === "/api/user/profile") return json({ profile: null });
    if (pathname === "/api/admin/security/requests") {
      const status = url.searchParams.get("status");
      if (status === "approved") assert.ok(adminStructure.accessRequests.approved > 0, "A structure count of zero must not fetch records");
      if (status === "pending") await accessGate;
      const count = status === "archived" ? 50 : 2;
      return json(pageData(url, Array.from({ length: count }, (_, i) => ({ id: `${status}-${i}`, phone: "0912", username: "کاربر", user: { name: "کاربر" }, status: status === "archived" ? "rejected" : status })), "requests"));
    }
    if (pathname === "/api/user/orders") {
      assert.ok(calls.some((call) => call.path === "/api/user/structure"));
      return json(pageData(url, Array.from({ length: 50 }, (_, i) => ({ id: `order-${i}`, createdAt: "2026-11-01T00:00:00Z", total: "1000", fulfillmentStatus: "processing", items: [{ id: `item-${i}`, title: `محصول ${i}`, quantity: 1, price: "1000" }] })), "orders"));
    }
    if (pathname === "/api/user/wallet") {
      const scope = url.searchParams.get("scope");
      if (scope === "summary") return json({ wallet: { balance: 12000 } });
      assert.ok(scope === "discounts" || scope === "transactions", "Wallet consumers must use a scoped, bounded request");
      const items = scope === "discounts" ? Array.from({ length: 2 }, (_, i) => ({ id: `code-${i}`, name: `کد ${i}`, code: `CODE${i}`, type: "percentage", percent: 10, expiresAt: "2027-12-01T00:00:00Z" })) : Array.from({ length: 50 }, (_, i) => ({ id: `transaction-${i}`, amount: i + 1, type: "cashback", createdAt: "2026-11-01T00:00:00Z" }));
      return json(pageData(url, items, scope === "discounts" ? "codes" : "transactions"));
    }
    if (pathname === "/api/products/search/structure") { await searchGate; searchStructureReady = true; return json({ structure: { count: 2 } }); }
    if (pathname === "/api/products/search") {
      assert.ok(searchStructureReady, "Search records must wait for authoritative structure");
      return json(pageData(url, [{ ...product, title: "نتیجه 1" }, { ...product, id: 2, title: "نتیجه 2" }], "items"));
    }
    if (pathname.endsWith("/comments/structure")) return json({ structure: { count: 2, ratings: [{ stars: 4, count: 1 }] } });
    if (pathname.endsWith("/comments")) return json(pageData(url, [{ id: "review-1", author: "خریدار", content: "دیدگاه یک", rating: 4, createdAt: "2026-11-01T00:00:00Z" }, { id: "review-2", author: "خریدار", content: "دیدگاه بدون امتیاز", rating: null, createdAt: "2026-11-01T00:00:00Z" }], "comments"));
    if (pathname === "/api/products/structure-fixture/structure") return json({ type: "product", products: [product], tree: { sections: [] }, catalog: { showcases: [], categories: [], brands: [] } });
    if (pathname === "/api/products/structure-fixture") { assert.equal(url.searchParams.get("includeComments"), "0"); return json({ product, comments: [], recommendations: [] }); }
    if (/^\/api\/products\/\d+$/.test(pathname)) return json({ product: { ...product, id: Number(pathname.split("/").at(-1)) }, comments: [], recommendations: [] });
    return json({});
  });
  try {
    await page.goto(`${origin}/panel/admin`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "دسترسی‌ها", exact: true }).click();
    await page.getByRole("button", { name: "درخواست‌های جدید", exact: true }).click();
    await until(() => calls.some((call) => call.path === "/api/admin/security/requests"));
    const pendingButton = page.getByRole("button", { name: "درخواست‌های جدید", exact: true });
    const region = page.locator(`[id="${await pendingButton.getAttribute("aria-controls")}"]`);
    const collection = region.locator("[data-loading-probe]").locator("..");
    const geometry = () => collection.evaluate((element) => [...element.children].filter((child) => !child.hasAttribute("data-loading-probe") && !child.hasAttribute("data-loading-sentinel")).map((child) => { const { x, y, width, height } = child.getBoundingClientRect(); return { x, y, width, height }; }));
    await pause(150);
    const before = await geometry();
    const firstRequest = calls.find((call) => call.path === "/api/admin/security/requests");
    assert.equal(Number(firstRequest.query.limit), before.length);
    assert.ok(before.length > 0 && before.length <= 2, "Small access counts must not produce a viewport full of skeletons");
    releaseAccess();
    await region.getByRole("heading", { name: "کاربر", exact: true }).first().waitFor();
    const after = await geometry();
    for (let i = 0; i < before.length; i++) for (const axis of ["x", "y", "width", "height"]) assert.ok(Math.abs(before[i][axis] - after[i][axis]) < 1, `Access ${axis} changed after loading`);
    await page.getByRole("button", { name: "دسترسی‌های فعال", exact: true }).click();
    await page.getByText("درخواستی برای نمایش وجود ندارد.", { exact: true }).waitFor();
    assert.ok(!calls.some((call) => call.path === "/api/admin/security/requests" && call.query.status === "approved"));

    adminStructure.accessRequests.approved = 2;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "دسترسی‌ها", exact: true }).click();
    const activeButton = page.getByRole("button", { name: "دسترسی‌های فعال", exact: true });
    await activeButton.click();
    const activeRegion = page.locator(`[id="${await activeButton.getAttribute("aria-controls")}"]`);
    const activeHeading = activeRegion.getByRole("heading", { name: "کاربر", exact: true }).first();
    await activeHeading.waitFor();
    const activeLayout = await activeHeading.evaluate((heading) => {
      const row = heading.parentElement.parentElement;
      const bounds = (element) => { const { x, y, width, height } = element.getBoundingClientRect(); return { x, y, width, height }; };
      return { row: bounds(row), fields: [...heading.parentElement.children, row.querySelector("button")].map(bounds), overflow: row.scrollWidth > row.clientWidth };
    });
    assert.equal(activeLayout.overflow, false, "Compact access rows must fit their container");
    await assertControlCentered(activeRegion.getByText("فعال", { exact: true }).first().locator(".."));
    if (viewport.width >= 1024) {
      const centers = activeLayout.fields.map((field) => field.y + field.height / 2);
      assert.ok(Math.max(...centers) - Math.min(...centers) < 2, "Name, phone, status and action must share one desktop row");
      assert.ok(activeLayout.row.height < 60, "Active access must not consume a stacked card's height");
    }

    await page.goto(`${origin}/panel/user`, { waitUntil: "domcontentloaded" });
    const profileName = page.getByRole("textbox", { name: "نام", exact: true });
    await profileName.waitFor();
    await assertControlCentered(page.getByRole("button", { name: "ذخیره و تکمیل پروفایل", exact: true }));
    await assertControlCentered(page.getByRole("button", { name: "خروج از حساب", exact: true }));
    const profileLayout = await profileName.evaluate((input) => {
      const form = input.closest("[class*='flex-wrap']");
      const fields = [...form.querySelectorAll("input")].slice(0, 4).map((element) => { const { y } = element.getBoundingClientRect(); return y; });
      return { fields, overflow: form.scrollWidth > form.clientWidth };
    });
    assert.equal(profileLayout.overflow, false);
    if (viewport.width >= 1024) assert.ok(Math.max(...profileLayout.fields) - Math.min(...profileLayout.fields) < 2, "Profile fields must share the available desktop width");
    await page.getByRole("button", { name: "سفارش ها", exact: true }).click();
    await until(() => calls.some((call) => call.path === "/api/user/orders"));
    assert.ok(Number(calls.find((call) => call.path === "/api/user/orders").query.limit) < 50);
    await page.locator("[data-loading-sentinel]").first().scrollIntoViewIfNeeded();
    await until(() => calls.some((call) => call.path === "/api/user/orders" && Number(call.query.offset) > 0));
    await page.getByRole("button", { name: "تخفیف‌ها", exact: true }).click();
    await page.getByRole("heading", { name: "کد 0", exact: true }).waitFor();
    assert.ok(Number(calls.find((call) => call.query.scope === "discounts").query.limit) <= 2);
    await page.getByRole("button", { name: "کیف پول", exact: true }).click();
    await until(() => calls.some((call) => call.query.scope === "transactions"));
    assert.ok(Number(calls.find((call) => call.query.scope === "transactions").query.limit) < 50);
    const walletLabel = page.locator("span:visible").filter({ hasText: /^بازگشت وجه خرید$/ }).first();
    await walletLabel.waitFor();
    const walletLayout = await walletLabel.evaluate((label) => {
      const row = label.parentElement.parentElement;
      const [name, date] = [...label.parentElement.children].map((element) => element.getBoundingClientRect());
      return { aligned: Math.abs(name.y + name.height / 2 - date.y - date.height / 2) < 2, overflow: row.scrollWidth > row.clientWidth };
    });
    assert.equal(walletLayout.overflow, false);
    if (viewport.width >= 1024) assert.ok(walletLayout.aligned, "Wallet date should use available row width");

    if (viewport.width < 768) await page.getByRole("button", { name: "باز کردن جستجو", exact: true }).click();
    await page.getByLabel("جستجوی محصولات", { exact: true }).fill("نتیجه");
    await until(() => calls.some((call) => call.path === "/api/products/search/structure"));
    assert.ok(!calls.some((call) => call.path === "/api/products/search"));
    releaseSearch();
    await page.getByText("نتیجه 1", { exact: true }).waitFor();
    assert.ok(Number(calls.find((call) => call.path === "/api/products/search").query.limit) <= 2);

    await page.goto(`${origin}/products/structure-fixture`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^دیدگاه/ }).click();
    await page.locator("#product-reviews [data-loading-probe]").locator("..").scrollIntoViewIfNeeded();
    await page.getByText("دیدگاه یک", { exact: true }).waitFor();
    assert.ok(Number(calls.find((call) => /\/comments$/.test(call.path)).query.limit) <= 2);
    const summaryBounds = await page.getByText("مجموع 2 دیدگاه", { exact: true }).evaluate((label) => {
      const summary = label.parentElement;
      return { content: summary.scrollHeight, visible: summary.clientHeight };
    });
    assert.ok(summaryBounds.content <= summaryBounds.visible + 1, "Review summary must show all its content at natural height");
    cartItems = Array.from({ length: 30 }, (_, i) => ({ id: 100 + i, productId: 100 + i, title: `محصول سبد ${100 + i}`, description: "", price: "1000", quantity: 1, isAvailable: true, stockQuantity: 5, colorStock: {} }));
    await page.goto(`${origin}/cart`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "محصول سبد 100", exact: true }).waitFor();
    await pause(200);
    const initialCartReads = calls.filter((call) => /^\/api\/products\/1\d\d$/.test(call.path));
    assert.ok(initialCartReads.length > 0 && initialCartReads.length < 30, "Offscreen cart rows must not eagerly fetch their product details");
    await page.locator("[data-app-scroll-container]").evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await until(() => calls.some((call) => call.path === "/api/products/129"));
    assert.deepEqual(errors, []);
    console.log(`PASS ${viewport.width}x${viewport.height}: structure-gated access geometry/zero counts, paged user orders/discounts/wallet, delayed search structure, paged reviews, deferred offscreen cart queries`);
  } catch (error) { console.error(JSON.stringify({ viewport, calls, errors })); throw error; }
  finally { releaseAccess(); releaseSearch(); await context.close(); }
}
try { await run({ width: 1440, height: 1000 }); await run({ width: 390, height: 844 }); }
finally { await browser.close(); }
