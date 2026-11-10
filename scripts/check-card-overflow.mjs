// Real card geometry and delegated tooltips; all API responses are isolated fixtures.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const origin = process.argv[2] ?? "http://127.0.0.1:3188";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const long = "نام بسیار طولانی محصول برای بررسی نمایش سه نقطه و متن کامل در تولتیپ مشترک سامانه";
const orders = [1, 5, 12, 0].map((count, index) => ({
  id: `order-${index}`, createdAt: "2026-11-01T00:00:00Z", total: index ? "999999999999999999" : "10000", shippingMethod: index % 2 ? "post" : "pickup",
  fulfillmentStatus: index % 2 ? "delivered" : "pending_approval", trackingCode: index ? "1234567890".repeat(8) : null,
  items: Array.from({ length: count }, (_, item) => ({ id: `item-${index}-${item}`, title: index ? `${long} ${index}-${item}` : "کوتاه", productId: null, price: "10000", quantity: item + 1, selectedColor: index ? "رنگ بسیار طولانی برای بررسی محدودیت عرض" : "" })),
}));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 500 });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await context.route("**/api/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      let data = {};
      if (pathname === "/api/theme") data = { theme: { primary: "blue", style: "light" } };
      if (pathname === "/api/app/user") data = { user: { id: 1, role: "user", username: "09121234567", themeMode: "light", profile: null }, cart: { count: 0 } };
      if (pathname === "/api/user/structure") data = { structure: { orders: 4, discounts: 0, unseenDiscounts: 0 } };
      if (pathname === "/api/user/orders") { await gate; data = { orders }; }
      if (pathname === "/api/catalog/sync") return route.fulfill({ contentType: "text/event-stream", body: ": fixture\n\n" });
      return route.fulfill({ json: { ok: true, data } });
    });
    try {
      await page.goto(`${origin}/panel/user`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "سفارش ها", exact: true }).click();
      const section = page.locator("section").filter({ has: page.locator('[data-card-family="userOrder"]') });
      const collection = section.locator("[data-loading-probe]").locator("..");
      const geometry = () => collection.evaluate((node) => [...node.children].filter((child) => !child.hasAttribute("data-loading-probe") && !child.hasAttribute("data-loading-sentinel")).map((child) => {
        const { x, y, width, height } = child.getBoundingClientRect();
        return { x, y, width, height };
      }));
      await collection.waitFor({ state: "attached" });
      await pause(250);
      const before = await geometry();
      assert.ok(before.length > 0);
      release();
      await section.getByText("سفارش order-0", { exact: true }).waitFor();
      await pause(150);
      const after = await geometry();
      if (process.env.CAPTURE_UI) await page.screenshot({ path: `.next/compact-orders-${viewport.width}.png` });
      for (let i = 0; i < before.length; i++) for (const key of ["x", "y", "width", "height"]) assert.ok(Math.abs(before[i][key] - after[i][key]) < 1, `Loading card ${i} shifted in ${key}: ${JSON.stringify({ before, after })}`);
      await page.locator("[data-app-scroll-container]").evaluate((node) => { node.scrollTop = node.scrollHeight; });
      await pause(200);
      const cards = section.locator('[data-card-family="userOrder"]').filter({ hasNot: page.locator("[data-loading-probe]") });
      const sizes = await cards.evaluateAll((nodes) => nodes.filter((node) => !node.closest("[data-loading-probe]") && getComputedStyle(node).visibility === "visible").map((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
      assert.ok(sizes.length >= 3);
      assert.equal(new Set(sizes.map((size) => `${size.width}:${size.height}`)).size, 1, "Cards with different item/title/tracking counts must have equal dimensions");
      assert.ok(sizes.every((size) => size.height <= 160 && size.width <= 320), "Order cards must remain compact");
      const many = section.locator('[data-card-family="userOrder"]').filter({ hasText: "سفارش order-2" }).last();
      const items = many.locator("[data-order-items]");
      assert.equal(await items.locator("h3").count(), 12, "No order items may be discarded to fit the card");
      assert.equal(await items.evaluate((node) => node.scrollHeight > node.clientHeight), true);
      const title = many.getByRole("heading", { name: `${long} 2-0`, exact: true });
      await title.hover();
      const tooltip = page.getByRole("tooltip");
      await tooltip.waitFor();
      assert.equal(await tooltip.innerText(), `${long} 2-0`);
      await tooltip.hover();
      await pause(200);
      assert.equal(await tooltip.count(), 1, "Tooltip must remain hoverable");
      await page.keyboard.press("Escape");
      assert.equal(await tooltip.count(), 0);

      // Exercise the global rule outside cards/tables, including keyboard and multiline clamps.
      await page.evaluate((text) => {
        const fixture = document.createElement("div");
        fixture.dataset.overflowFixture = "true";
        fixture.style.cssText = "position:fixed;bottom:12px;inset-inline-start:12px;width:96px;z-index:10900;background:var(--primary-card)";
        const label = document.createElement("span"); label.dataset.testText = "true"; label.textContent = text;
        const button = document.createElement("button"); button.type = "button"; button.className = "w-24 truncate"; button.textContent = text; button.dataset.testButton = "true";
        const clamped = document.createElement("div"); clamped.className = "line-clamp-2 whitespace-normal"; clamped.textContent = text.repeat(4); clamped.dataset.testClamp = "true";
        const short = document.createElement("span"); short.dataset.testShort = "true"; short.textContent = "کوتاه";
        const input = document.createElement("input"); input.value = text; input.style.width = "96px";
        fixture.append(label, button, clamped, short, input); document.body.append(fixture);
      }, long);
      const generic = page.locator("[data-test-text]");
      assert.equal(await generic.evaluate((node) => getComputedStyle(node).textOverflow), "ellipsis");
      assert.equal(await generic.evaluate((node) => node.scrollWidth > node.clientWidth), true);
      await generic.hover(); await tooltip.waitFor(); assert.equal(await tooltip.innerText(), long);
      const bounds = await tooltip.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height);
      await page.locator("[data-test-short]").hover(); await pause(200); assert.equal(await tooltip.count(), 0, "Unclipped text must not show a tooltip");
      const button = page.locator("[data-test-button]");
      await button.focus(); await tooltip.waitFor(); assert.equal(await tooltip.innerText(), long);
      assert.ok(await button.getAttribute("aria-describedby"));
      await page.keyboard.press("Escape"); assert.equal(await button.getAttribute("aria-describedby"), null);
      await page.locator("[data-test-clamp]").hover(); await tooltip.waitFor(); assert.equal(await tooltip.innerText(), long.repeat(4));
      await page.locator("[data-overflow-fixture] input").hover(); await pause(200); assert.equal(await tooltip.count(), 0);
      assert.equal(await page.locator("[data-overflow-fixture] input").inputValue(), long);
      if (viewport.width < 500) { await generic.tap(); await tooltip.waitFor(); assert.equal(await tooltip.innerText(), long); }
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}x${viewport.height}: equal order cards, matching skeleton bounds, all items scrollable, global ellipsis, hover/focus/touch/clamp tooltips, unclipped/input exclusions, viewport positioning`);
    } catch (error) {
      console.error(JSON.stringify({ viewport, errors, text: (await page.locator("body").innerText()).slice(0, 1500) }));
      throw error;
    } finally { release(); await context.close(); }
  }
} finally { await browser.close(); }
