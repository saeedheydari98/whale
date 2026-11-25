import assert from "node:assert/strict";
import { chromium } from "playwright";
const origin = process.argv[2] || "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 850 } });
    const calls = new Map();
    const showcases = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, title: `Showcase ${i}`, active: true, sortOrder: i, productCount: 2, limit: 2 }));
    await context.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      const json = data => route.fulfill({ json: { ok: true, data } });
      if (url.pathname === "/api/theme") return json({ theme: { primary: "yellow", style: "light" } });
      if (url.pathname === "/api/app/user") return json({ user: null, cart: { count: 0 } });
      if (url.pathname === "/api/cart") return json({ cart: { items: [] } });
      if (url.pathname === "/api/catalog/sync") return route.fulfill({ contentType: "text/event-stream", body: ": fixture\n\n" });
      if (url.pathname === "/api/products/structure") return json({ catalog: { showcases, banners: [], categories: [], brands: [] }, showcases, products: [], tree: { sections: [] } });
      if (/^\/api\/showcase\/s\d\/products$/.test(url.pathname)) {
        const id = url.pathname.split("/")[3];
        calls.set(id, (calls.get(id) || 0) + 1);
        await new Promise(resolve => setTimeout(resolve, 900));
        return json({ ...showcases.find(s => s.id === id), products: [1, 2].map(n => ({ id: Number(id.slice(1)) * 10 + n, title: `Product ${id} ${n}`, description: "Fixture", price: "1000", active: true, isActive: true, stockQuantity: 4, isAvailable: true, imageUrl: "", images: [], colorStock: {}, sortOrder: n })) });
      }
      return json({});
    });
    const page = await context.newPage();
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${origin}/products`);
    await page.getByRole("heading", { name: "Product s0 1", exact: true }).waitFor();
    assert.equal(calls.has("s7"), false, "Offscreen sections do not request records");
    const last = page.locator("h2").filter({ hasText: /^Showcase 7$/ });
    await last.evaluate(element => element.scrollIntoView({ block: "center" }));
    const section = last.locator("xpath=ancestor::section[1]");
    await section.locator('[data-loading-overlay="true"]').first().waitFor({ state: "visible" });
    await page.getByRole("heading", { name: "Product s7 1", exact: true }).waitFor();
    await page.getByRole("heading", { name: "Showcase 0", exact: true }).scrollIntoViewIfNeeded();
    await last.scrollIntoViewIfNeeded();
    await page.setViewportSize({ width: width === 390 ? 430 : 1100, height: 850 });
    await page.waitForTimeout(400);
    assert.equal(calls.get("s0"), 1); assert.equal(calls.get("s7"), 1);
    assert.equal(await section.locator('[data-loading-overlay="true"]:visible').count(), 0, "Loaded cards do not become skeletons again");
    const foreground = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary-contrast").trim());
    assert.equal(foreground.toLowerCase(), "#ffffff", "Yellow filled controls use the same light foreground");
    await page.locator('a[href="/"]').first().click();
    await page.waitForURL(`${origin}/`);
    await page.goBack();
    await page.getByRole("heading", { name: "Product s0 1", exact: true }).waitFor();
    await last.evaluate(element => element.scrollIntoView({ block: "center" }));
    await page.getByRole("heading", { name: "Product s7 1", exact: true }).waitFor();
    assert.equal(calls.get("s0"), 1); assert.equal(calls.get("s7"), 1);
    assert.deepEqual(errors, []);
    console.log("PASS: visible first-load skeleton, no repeat on scroll/resize/back, light yellow foreground", width);
    await context.close();
  }
} finally { await browser.close(); }
