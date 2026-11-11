// Browser regression with intercepted fixtures; never reads or writes a real database.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const origin = process.argv[2] ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate) {
  for (let i = 0; i < 150; i++) { if (await predicate()) return; await pause(100); }
  assert.fail("Timed out waiting for browser condition");
}
async function run(viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const calls = [];
  let releaseUsers;
  const userGate = new Promise((resolve) => { releaseUsers = resolve; });
  let savedLayout;
  const users = Array.from({ length: 120 }, (_, i) => ({ id: i + 1, name: `کاربر ${i + 1}`, username: `0912${i}`, email: `u${i}@example.com`, role: "user", profiles: [], walletBalance: i, createdAt: "2026-11-01T00:00:00Z", orderCount: 0, orderTotal: 0 }));
  const orders = Array.from({ length: 120 }, (_, i) => ({ id: `order-${i + 1}`, orderType: i % 2 ? "in_person" : "online", status: "paid", fulfillmentStatus: "pending_approval", createdAt: "2026-11-01T00:00:00Z", total: "1000", user: users[i], items: [{ id: `item-${i}`, title: "محصول", quantity: 1, price: "1000" }] }));
  let layout = { home: Array.from({ length: 40 }, (_, i) => ({ id: `brand-${i}`, type: "brandGroup", title: `بخش ${i + 1}`, sortOrder: i + 1 })), categories: [], products: Array.from({ length: 20 }, (_, i) => ({ id: `showcase-${i}`, type: "showcase", title: `ویترین ${i + 1}`, sortOrder: i + 1 })) };
  const paginate = (url, items, key) => {
    const limit = Number(url.searchParams.get("limit")), offset = Number(url.searchParams.get("offset"));
    assert.ok(limit >= 1 && limit <= 100, "Every collection request must have a bounded measured limit");
    const slice = items.slice(offset, offset + limit);
    return { [key]: slice, total: items.length, nextOffset: offset + slice.length < items.length ? offset + slice.length : null };
  };
  await context.route("**/icon?**", (route) => route.fulfill({ status: 204, body: "" }));
  await context.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()), pathname = url.pathname;
    const json = (data) => route.fulfill({ json: { ok: true, data } });
    if (pathname === "/api/theme") return json({ theme: { primary: "blue", style: "light" } });
    if (pathname === "/api/app/user") return json({ user: { id: 999, username: "09176991556", email: "whalestoresupport@gmail.com", role: "superadmin", themeMode: "light", profile: null }, cart: { count: 0 } });
    if (pathname === "/api/cart") return json({ items: [] });
    if (pathname === "/api/admin/catalog/structure") return json({ structure: { users: 120, orders: 120, inPersonOrders: 60, products: 20, banners: 0, discountRules: 30, accessRequests: { pending: 30, approved: 0, archived: 30 }, showcases: [], categoryGroups: [], brandGroups: [], storefront: { home: 40, categories: 0, products: 20 } } });
    if (pathname === "/api/admin/collections/structure") {
      const q = url.searchParams.get("q") ?? "";
      const count = url.searchParams.get("collection") === "users" ? users.filter((user) => user.name.includes(q)).length : orders.filter((order) => order.orderType === url.searchParams.get("view") && order.id.includes(q)).length;
      return json({ structure: { count } });
    }
    if (pathname === "/api/catalog/sync") return route.fulfill({ status: 200, contentType: "text/event-stream", body: ": fixture\n\n" });
    calls.push({ path: pathname, query: Object.fromEntries(url.searchParams), method: route.request().method() });
    if (pathname === "/api/admin/users") {
      await userGate;
      const q = url.searchParams.get("q") ?? "";
      return json(paginate(url, users.filter((user) => user.name.includes(q)), "users"));
    }
    if (pathname === "/api/admin/orders") {
      const q = url.searchParams.get("q") ?? "", view = url.searchParams.get("view");
      return json(paginate(url, orders.filter((order) => order.orderType === view && order.id.includes(q)), "orders"));
    }
    if (pathname === "/api/admin/security/requests") {
      const status = url.searchParams.get("status");
      const requests = Array.from({ length: 30 }, (_, i) => ({ id: `request-${i}`, username: `0912${i}`, phone: `0912${i}`, status: status === "archived" ? "rejected" : status, user: users[i] }));
      return json(paginate(url, requests, "requests"));
    }
    if (pathname === "/api/admin/discounts") {
      if (url.searchParams.get("scope") === "settings") return json({ settings: { cashbackPercent: 5 } });
      const rules = Array.from({ length: 30 }, (_, i) => ({ id: `rule-${i}`, name: `قانون ${i + 1}`, audienceType: "new_users", minimumValue: 1, lookbackDays: 30, discountType: "percentage", percent: 10, validDays: 30, active: true, _count: { discountCodes: 0 } }));
      return json(paginate(url, rules, "rules"));
    }
    if (pathname === "/api/admin/catalog/storefront") {
      if (route.request().method() === "PATCH") { savedLayout = route.request().postDataJSON().storefront; layout = savedLayout; }
      if (url.searchParams.has("limit")) return json(paginate(url, layout[url.searchParams.get("tab")], "entries"));
      return json({ storefront: { home: layout.home, categories: layout.categories, showcases: layout.products } });
    }
    if (pathname === "/api/admin/catalog/products") {
      const products = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, title: `محصول ${i + 1}`, price: "1000", stockQuantity: 1, active: true }));
      const offset = Number(url.searchParams.get("offset")), limit = Number(url.searchParams.get("limit"));
      assert.ok(limit > 0 && limit <= 100);
      return json({ catalog: { products: products.slice(offset, offset + limit) } });
    }
    return route.fulfill({ status: 404, json: { ok: false, showMessage: "Unexpected fixture request" } });
  });
  try {
    await page.goto(`${origin}/panel/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.themeReady === "true");
    for (const label of ["محصولات", "سفارش ها", "کاربران", "تخفیف‌ها", "بنرها", "ویترین‌ها", "دسته‌بندی‌ها", "برندها", "چیدمان", "دسترسی‌ها"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await pause(100);
      assert.equal(calls.length, 0, `Selecting ${label} must not fetch its content`);
      assert.equal(await page.getByRole("button", { name: "به‌روزرسانی", exact: true }).count(), 0);
      if (label === "محصولات") {
        assert.ok(await page.getByRole("button", { name: "محصول جدید", exact: true }).isVisible(), "Creation actions must stay outside the data accordion");
        assert.ok(await page.getByLabel("جستجو در محصولات", { exact: true }).isVisible());
      }
      if (label === "کاربران") assert.ok(await page.getByRole("searchbox", { name: "جست‌وجوی کاربران با نام، موبایل یا ایمیل" }).isVisible());
      if (label === "تخفیف‌ها") assert.ok(await page.getByRole("button", { name: "ساخت کد تخفیف", exact: true }).isVisible(), "Local forms must stay visible without fetching lists");
    }
    await page.getByRole("button", { name: "کاربران", exact: true }).click();
    await page.getByRole("button", { name: "فهرست کاربران", exact: true }).click();
    await until(() => calls.some((call) => call.path === "/api/admin/users"));
    const collection = page.locator("[data-loading-probe]").locator("..").first();
    const bounds = () => collection.evaluate((element) => [...element.children].filter((child) => !child.hasAttribute("data-loading-probe") && !child.hasAttribute("data-loading-sentinel")).map((child) => { const { x, y, width, height } = child.getBoundingClientRect(); return { x, y, width, height }; }));
    await pause(150);
    const before = await bounds();
    assert.ok(before.length > 0);
    releaseUsers();
    await page.getByRole("heading", { name: "کاربر 1", exact: true }).waitFor();
    const after = await bounds();
    for (let i = 0; i < before.length; i++) for (const axis of ["x", "y", "width", "height"]) assert.ok(Math.abs(before[i][axis] - after[i][axis]) < 1, `User skeleton ${axis} shifted`);
    await page.locator("[data-loading-sentinel]").first().scrollIntoViewIfNeeded();
    await until(() => calls.some((call) => call.path === "/api/admin/users" && Number(call.query.offset) > 0));
    await page.getByRole("searchbox", { name: "جست‌وجوی کاربران با نام، موبایل یا ایمیل" }).fill("کاربر 120");
    await page.getByRole("heading", { name: "کاربر 120", exact: true }).waitFor();
    assert.ok(calls.some((call) => call.query.q === "کاربر 120"));
    await page.getByRole("button", { name: /^مبلغ کل خرید/ }).click();
    await until(() => calls.some((call) => call.query.sort === "orderTotal"));

    await page.getByRole("button", { name: "سفارش ها", exact: true }).click();
    await page.getByRole("button", { name: "فهرست سفارش‌ها", exact: true }).click();
    await until(() => calls.some((call) => call.path === "/api/admin/orders" && call.query.view === "online"));
    await page.getByRole("button", { name: "سفارش‌های حضوری", exact: true }).click();
    await page.getByRole("button", { name: "ثبت سفارش حضوری", exact: true }).waitFor({ state: "visible" });
    await pause(350);
    assert.ok(!calls.some((call) => call.path === "/api/admin/orders" && call.query.view === "in_person"));
    await page.getByRole("button", { name: "فهرست سفارش‌ها", exact: true }).click();
    await until(() => calls.some((call) => call.path === "/api/admin/orders" && call.query.view === "in_person"));
    await page.getByLabel("جستجو در سفارش‌ها", { exact: true }).fill("order-120");
    await until(() => calls.some((call) => call.query.q === "order-120"));

    await page.getByRole("button", { name: "دسترسی‌ها", exact: true }).click();
    const accessBefore = calls.length;
    await pause(150);
    assert.equal(calls.length, accessBefore, "Access sublists must wait for their own click");
    await page.getByRole("button", { name: "درخواست‌های جدید", exact: true }).click();
    await until(() => calls.some((call) => call.path === "/api/admin/security/requests" && call.query.status === "pending"));
    assert.ok(!calls.some((call) => call.path === "/api/admin/security/requests" && call.query.status === "approved"));

    await page.getByRole("button", { name: "تخفیف‌ها", exact: true }).click();
    assert.ok(!calls.some((call) => call.path === "/api/admin/discounts"));
    await page.getByRole("button", { name: /^بازگشت وجه کیف پول/ }).click();
    await until(() => calls.some((call) => call.query.scope === "settings"));
    assert.ok(!calls.some((call) => call.query.scope === "rules"));
    await page.getByRole("button", { name: /^کدهای تخفیف ایجادشده/ }).click();
    await until(() => calls.some((call) => call.query.scope === "rules"));
    await page.getByText("قانون 1", { exact: true }).waitFor();

    await page.getByRole("button", { name: "چیدمان", exact: true }).click();
    assert.ok(await page.getByRole("button", { name: "خانه", exact: true }).isVisible());
    await page.getByRole("button", { name: "فهرست چیدمان", exact: true }).click();
    await page.getByRole("heading", { name: "بخش 1", exact: true }).waitFor();
    assert.ok(calls.some((call) => call.query.tab === "home" && Number(call.query.limit) < 40));
    assert.ok(!calls.some((call) => call.path === "/api/admin/catalog/storefront" && !call.query.limit));
    const orderInput = page.getByRole("spinbutton").first();
    await orderInput.fill("25");
    await orderInput.press("Enter");
    await until(() => Boolean(savedLayout));
    assert.equal(savedLayout.home.length, 40, "Reordering must preserve unloaded records");
    assert.equal(savedLayout.home[24].id, "brand-0");
    assert.equal(new Set(savedLayout.home.map((item) => item.id)).size, 40);
    assert.equal(savedLayout.products.length, 20, "Reordering home must preserve the products layout");
    assert.deepEqual(errors, []);
    console.log(`PASS ${viewport.width}x${viewport.height}: closed admin tabs, measured paging/skeleton geometry, next-page scroll, global search/sort, isolated access/discount data, safe paged layout reorder`);
  } catch (error) {
    console.error(JSON.stringify({ viewport, calls, errors, text: await page.locator("main").innerText().catch(() => "") }));
    throw error;
  } finally { releaseUsers(); await context.close(); }
}
try { await run({ width: 1440, height: 1000 }); await run({ width: 390, height: 844 }); }
finally { await browser.close(); }
