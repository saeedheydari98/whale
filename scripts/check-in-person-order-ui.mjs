// Run against a local production build; all API traffic is fulfilled with fixtures.
// Usage: node scripts/check-in-person-order-ui.mjs [http://127.0.0.1:3100]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.argv[2] ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const user = { id: 1, username: "09120000000", role: "admin", themeMode: "dark", email: "admin@example.com", profile: null };
const products = Array.from({ length: 60 }, (_, index) => ({
  id: index + 1, title: `محصول ${index + 1}`, description: "", price: "1000", stockQuantity: index === 1 ? 6 : 1,
  colorStock: index === 1 ? { red: 2, blue: 3, green: 1 } : {}, active: true, isActive: true, isAvailable: true,
}));
const customers = Array.from({ length: 60 }, (_, index) => ({
  id: index + 1, name: `مشتری ${index + 1}`, username: `0912000${String(index).padStart(4, "0")}`,
  email: "customer@example.com", walletBalance: 0, role: "user", profiles: [],
}));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run(viewport, empty = false) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  const requests = [];
  let quoteRequests = 0;
  let referenceRequests = 0;
  let releaseTheme;
  const themeGate = new Promise((resolve) => { releaseTheme = resolve; });
  let releaseOptions;
  const optionsGate = new Promise((resolve) => { releaseOptions = resolve; });
  let themeRequests = 0;
  let structureRequests = 0;
  const productFixtures = empty ? [] : products;
  const customerFixtures = empty ? [] : customers;
  await context.route("**/icon?**", (route) => route.fulfill({ status: 204, body: "" }));
  await context.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const json = (data, showMessage) => route.fulfill({ json: { ok: true, data, ...(showMessage ? { showMessage } : {}) } });
    if (pathname === "/api/theme") {
      themeRequests += 1;
      await themeGate;
      return json({ theme: { primary: "blue", style: "light" } });
    }
    if (pathname === "/api/app/user") return json({ user, cart: { count: 0 } });
    if (pathname === "/api/cart") return json({ items: [] });
    if (pathname === "/api/admin/catalog/products") {
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? products.length);
      return json({ catalog: { products: products.slice(offset, offset + limit) } });
    }
    if (pathname === "/api/admin/catalog/product-form") {
      referenceRequests += 1;
      return json({ catalog: { products: [], categories: [{ id: "fixture-category", title: "دسته تست", active: true, sortOrder: 1 }], brands: [], showcases: [] } });
    }
    if (pathname === "/api/admin/catalog/structure") {
      structureRequests += 1;
      return json({ structure: {
      products: structureRequests === 1 ? 0 : productFixtures.length,
      users: structureRequests === 1 ? 0 : customerFixtures.length, orders: 0, inPersonOrders: 0,
      banners: 0, showcases: [], categoryGroups: [], brandGroups: [], storefront: { home: 0, products: 0, categories: 0 },
    } });
    }
    if (pathname === "/api/admin/orders") return json({ orders: [], total: 0, nextOffset: null });
    if (pathname.endsWith("/in-person/options")) {
      const kind = url.searchParams.get("kind");
      const limit = Number(url.searchParams.get("limit"));
      const offset = Number(url.searchParams.get("offset"));
      const q = url.searchParams.get("q") ?? "";
      requests.push({ kind, limit, offset, q });
      assert.ok(limit > 0 && limit <= 100);
      await optionsGate;
      const matches = (kind === "products" ? productFixtures : customerFixtures).filter((item) => !q || (item.title ?? item.name).includes(q));
      const items = matches.slice(offset, offset + limit);
      return json({ items, total: matches.length, nextOffset: offset + items.length < matches.length ? offset + items.length : null });
    }
    if (pathname.endsWith("/in-person/quote")) {
      quoteRequests += 1;
      const input = route.request().postDataJSON();
      const subtotal = input.lines.reduce((sum, line) => sum + line.quantity * 1000, 0);
      return json({ quote: { subtotal, total: subtotal, walletAmount: 0, shippingAmount: 0, cashbackEarned: 0, discountAmount: 0 } });
    }
    if (pathname === "/api/test-notification") return json({}, "پیام مستقل API");
    if (pathname === "/api/catalog/sync") return route.fulfill({ status: 200, contentType: "text/event-stream", body: ": fixture\n\n" });
    return route.fulfill({ status: 404, json: { ok: false } });
  });

  try {
    await page.goto(`${origin}/panel/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-theme-boot-loader]"));
    await pause(250);
    assert.equal(await page.locator("html").getAttribute("data-theme-color-ready"), "false");
    assert.equal(await page.locator("[data-theme-boot-loader]").evaluate((element) => getComputedStyle(element).visibility), "hidden");
    releaseTheme();
    await page.waitForFunction(() => document.documentElement.dataset.themeReady === "true");
    if (viewport.width >= 768) {
      const footerCopy = page.locator("footer [data-text-wrap]");
      await footerCopy.waitFor();
      assert.ok(await footerCopy.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.whiteSpace !== "nowrap"
          && element.scrollHeight <= element.clientHeight + 1
          && element.scrollWidth <= element.clientWidth + 1;
      }), "Footer copy must wrap and display completely");
    }
    await page.getByRole("button", { name: "سفارش ها", exact: true }).click();
    await page.getByRole("button", { name: "سفارش‌های حضوری", exact: true }).click();
    const structureRequestsBeforeModal = structureRequests;
    await page.getByRole("button", { name: "ثبت سفارش حضوری", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const customerAccordion = dialog.locator("section").first().locator("button[aria-expanded]");
    const productsAccordion = dialog.getByRole("button", { name: /^محصولات(?:\s|$)/ });
    const cartAccordion = dialog.getByRole("button", { name: /^سبد خرید(?:\s|$)/ });
    const paymentAccordion = dialog.getByRole("button", { name: /^پرداخت و تخفیف(?:\s|$)/ });
    assert.equal(await dialog.locator("button[aria-expanded]").count(), 4);
    assert.equal(await customerAccordion.getAttribute("aria-expanded"), "true");
    for (const accordion of [productsAccordion, cartAccordion, paymentAccordion]) {
      assert.equal(await accordion.getAttribute("aria-expanded"), "false");
    }
    assert.equal(await dialog.getByRole("button", { name: "مشتری جدید", exact: true }).getAttribute("aria-pressed"), "true");
    await pause(500);
    assert.equal(requests.length, 0, "Opening the modal must not request customers or products");
    assert.equal(quoteRequests, 0, "Opening the modal must not request a quote");
    assert.equal(structureRequests, structureRequestsBeforeModal, "Opening the modal must not refresh option counts");
    await dialog.getByRole("button", { name: "مشتری موجود", exact: true }).click();
    await productsAccordion.click();
    await cartAccordion.click();
    await pause(400);
    assert.equal(requests.length, 0, "Search-only sections must wait for input");
    await dialog.getByRole("switch", { name: "نمایش همه مشتری‌ها", exact: true }).click();
    await dialog.getByRole("switch", { name: "نمایش همه محصولات", exact: true }).click();
    assert.ok((await productsAccordion.innerText()).includes("ناقص"));
    assert.ok((await cartAccordion.innerText()).includes("ناقص"));
    if (empty) {
      await dialog.getByText("محصولی مطابق جست‌وجو پیدا نشد.", { exact: true }).waitFor();
      await dialog.getByText("مشتری مطابق جست‌وجو پیدا نشد.", { exact: true }).waitFor();
      assert.equal(requests.length, 0, "Known empty collections must not fetch data");
      console.log(`PASS ${viewport.width}x${viewport.height}: zero-count collections resolve without data requests`);
      return;
    }
    await page.waitForFunction(() => [...document.querySelectorAll("[role=dialog] [data-loading-probe]")].every((probe) => probe.parentElement.children.length > 1));
    const bounds = () => dialog.locator("section").evaluateAll((sections) => sections.map((section) => {
      const { x, y, width, height } = section.getBoundingClientRect();
      return { x, y, width, height };
    }));
    await pause(250);
    const loadingBounds = await bounds();
    assert.ok(requests.length > 0);
    assert.ok(requests.every((request) => request.offset === 0), "Only first pages are fetched before scrolling");
    releaseOptions();
    await dialog.getByText("مشتری 1", { exact: true }).first().waitFor();
    await pause(300);
    const loadedBounds = await bounds();
    for (let index = 0; index < loadingBounds.length; index += 1) {
      for (const key of ["x", "y", "width", "height"]) {
        assert.ok(Math.abs(loadingBounds[index][key] - loadedBounds[index][key]) < 1,
          `${viewport.width}: section ${index} ${key} shifted: ${loadingBounds[index][key]} -> ${loadedBounds[index][key]}`);
      }
    }
    assert.ok(requests.filter((request) => request.kind === "customers").length < customers.length / 2, "Must not fetch the whole customer list on open");
    const header = dialog.locator("[data-modal-header]");
    const body = dialog.locator("[data-modal-body]");
    const headerBefore = await header.boundingBox();
    await body.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    assert.ok(await body.evaluate((element) => element.scrollTop > 0), "Long modal body must scroll");
    const headerAfter = await header.boundingBox();
    assert.ok(Math.abs(headerBefore.y - headerAfter.y) < 1, "Modal header must remain fixed while its body scrolls");
    await body.evaluate((element) => { element.scrollTop = 0; });
    const customerTab = await dialog.getByRole("button", { name: "مشتری موجود", exact: true }).boundingBox();
    const customerSearch = await dialog.getByRole("searchbox", { name: "جست‌وجوی مشتری با نام، موبایل یا ایمیل" }).boundingBox();
    assert.ok(customerTab.y < customerSearch.y, "Customer mode controls belong above the customer section content");
    const list = dialog.locator(".max-h-56");
    await list.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.waitForFunction(() => document.querySelector("[role=dialog] .max-h-56")?.scrollHeight > 224);
    await pause(150);
    assert.ok(requests.some((request) => request.kind === "customers" && request.offset > 0), "Scrolling must fetch the next measured page");
    await dialog.getByRole("switch", { name: "نمایش همه مشتری‌ها", exact: true }).click();
    const customerInput = dialog.getByRole("searchbox", { name: "جست‌وجوی مشتری با نام، موبایل یا ایمیل" });
    await customerInput.fill("مشتری 60");
    await list.getByText("مشتری 60", { exact: true }).waitFor();
    await customerInput.fill("");
    await pause(400);
    assert.equal(await list.getByText("مشتری 60", { exact: true }).count(), 0);
    assert.ok(requests.some((request) => request.kind === "customers" && request.q === "مشتری 60"), "Customer search works with the full list disabled");
    const productList = dialog.locator(".max-h-64");
    await productList.scrollIntoViewIfNeeded();
    // Search must cover records outside the pages already downloaded.
    await dialog.getByRole("searchbox", { name: "جست‌وجوی محصول با نام یا شناسه" }).fill("محصول 60");
    await productList.getByText("محصول 60", { exact: true }).waitFor();
    assert.ok(requests.some((request) => request.kind === "products" && request.q === "محصول 60"));
    await dialog.getByRole("searchbox", { name: "جست‌وجوی محصول با نام یا شناسه" }).fill("بدون نتیجه");
    await dialog.getByText("محصولی مطابق جست‌وجو پیدا نشد.", { exact: true }).waitFor();
    await dialog.getByRole("searchbox", { name: "جست‌وجوی محصول با نام یا شناسه" }).fill("");
    const add = productList.getByRole("button", { name: "افزودن", exact: true }).first();
    await add.click();
    await add.click();
    await add.click();
    await pause(500);
    assert.equal(await dialog.getByText("تعداد کل: 1", { exact: true }).count(), 1);
    assert.ok((await productsAccordion.innerText()).includes("تکمیل"));
    assert.ok((await cartAccordion.innerText()).includes("تکمیل"));
    await cartAccordion.click();
    assert.equal(await cartAccordion.getAttribute("aria-expanded"), "false");
    assert.ok((await cartAccordion.innerText()).includes("تکمیل"), "Selection status remains visible while collapsed");
    await cartAccordion.click();
    await dialog.getByText("تعداد کل: 1", { exact: true }).waitFor();

    // Search-only mode never requests an unfiltered list after clearing input.
    await dialog.getByRole("switch", { name: "نمایش همه محصولات", exact: true }).click();
    const requestsBeforeSearch = requests.filter((request) => request.kind === "products").length;
    await pause(400);
    assert.equal(requests.filter((request) => request.kind === "products").length, requestsBeforeSearch);

    await dialog.getByRole("searchbox", { name: "جست‌وجوی محصول با نام یا شناسه" }).fill("محصول 2");
    await productList.getByText("محصول 2", { exact: true }).waitFor();
    await productList.getByRole("button", { name: "افزودن", exact: true }).first().click();
    const colorChoice = dialog.getByRole("button", { name: "انتخاب رنگ قرمز", exact: true });
    await colorChoice.waitFor();
    assert.ok((await cartAccordion.innerText()).includes("ناقص"), "Unselected colors must keep the cart incomplete");
    assert.equal(await dialog.locator("[data-color-counter]").count(), 0);
    await colorChoice.click();
    assert.equal(await dialog.getByLabel("تعداد رنگ قرمز", { exact: true }).innerText(), "1");
    await dialog.getByRole("button", { name: "افزایش تعداد رنگ قرمز", exact: true }).click();
    await dialog.getByRole("button", { name: "انتخاب رنگ آبی", exact: true }).click();
    assert.equal(await dialog.getByLabel("تعداد رنگ قرمز", { exact: true }).innerText(), "2");
    assert.equal(await dialog.getByLabel("تعداد رنگ آبی", { exact: true }).innerText(), "1");
    await dialog.getByRole("button", { name: "کاهش تعداد رنگ آبی", exact: true }).click();
    assert.equal(await dialog.getByLabel("تعداد رنگ قرمز", { exact: true }).innerText(), "2");
    const picker = dialog.locator("[data-color-quantity-picker]");
    assert.ok(await picker.evaluate((element) => {
      const rows = [...element.children].map((child) => child.getBoundingClientRect());
      return element.scrollHeight <= element.clientHeight + 1
        && element.scrollWidth <= element.clientWidth + 1
        && rows.every((row, index) => index === 0 || row.top >= rows[index - 1].bottom);
    }), "Colors must occupy separate rows without an internal scroll region");
    assert.ok(await picker.locator("..").evaluate((element) => element.scrollHeight <= element.clientHeight + 1));
    assert.ok((await cartAccordion.innerText()).includes("تکمیل"));
    assert.equal(quoteRequests, 0, "A closed payment section must not request quotes after cart changes");
    await paymentAccordion.click();
    await pause(600);
    assert.ok((await paymentAccordion.innerText()).includes("تکمیل"));

    // A local validation error immediately after an unrelated API success must survive.
    await dialog.getByRole("button", { name: "مشتری جدید", exact: true }).click();
    assert.ok((await customerAccordion.innerText()).includes("ناقص"));
    await page.evaluate(() => fetch("/api/test-notification", { method: "POST" }));
    await dialog.getByRole("button", { name: "ثبت سفارش حضوری", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "مشخصات کاربر جدید را کامل کنید." }).waitFor();

    assert.equal(await page.locator("link[rel=icon]").count(), 1);
    assert.ok(await page.locator("#app-theme-favicon").evaluate((link) => {
      const svg = new DOMParser().parseFromString(decodeURIComponent(link.getAttribute("href").split(",")[1]), "image/svg+xml");
      return svg.querySelector("[data-favicon-background]")?.getAttribute("fill")
        === document.documentElement.style.getPropertyValue("--primary-bg");
    }));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.themeReady === "true");
    assert.equal(themeRequests, 1, "Fresh cached refresh must not wait for another theme request");
    await page.getByRole("button", { name: "محصولات", exact: true }).click();
    await page.getByRole("button", { name: "محصول جدید", exact: true }).click();
    const productDialog = page.getByRole("dialog");
    const productSections = productDialog.locator("section > div > div > button[aria-expanded]");
    await productDialog.waitFor();
    assert.equal(await productSections.first().getAttribute("aria-expanded"), "true");
    assert.equal(await productDialog.locator('section > div > div > button[aria-expanded="true"]').count(), 1);
    await pause(350);
    assert.equal(referenceRequests, 0, "Product modal opening must not fetch placement references");
    const placement = productDialog.getByRole("button", { name: /^محل نمایش(?:\s|$)/ });
    await placement.click();
    await productDialog.getByRole("checkbox", { name: "دسته تست", exact: true }).waitFor();
    assert.equal(referenceRequests, 1, "Placement references load when opened");
    await placement.click();
    await placement.click();
    await pause(350);
    assert.equal(referenceRequests, 1, "Reopening placement must reuse its references");
    assert.deepEqual(failures, []);
    console.log(`PASS ${viewport.width}x${viewport.height}: lazy modal sections, search/full-list modes, deferred quotes/references, loading bounds, pagination, stock limits, independent colors, footer wrapping`);
  } catch (error) {
    console.error(JSON.stringify({ viewport, requests, failures, dialog: await page.getByRole("dialog").innerText().catch(() => "") }));
    throw error;
  } finally {
    releaseTheme();
    releaseOptions();
    await context.close();
  }
}

try {
  await run({ width: 1440, height: 1000 });
  await run({ width: 390, height: 844 });
  await run({ width: 390, height: 844 }, true);
} finally {
  await browser.close();
}
