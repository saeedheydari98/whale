// Browser check with intercepted API fixtures; does not mutate a real cart.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.argv[2] ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const product = { id: 1, slug: "cart-fixture", title: "محصول تست سبد", description: "توضیح محصول", price: "10000", stockQuantity: 10, colorStock: { red: 4, blue: 6 }, isAvailable: true, active: true, isActive: true, images: [], sortOrder: 1 };
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    const failures = [];
    page.on("pageerror", (error) => failures.push(error.message));
    let reject = false, requests = 0;
    let savedItems = [];
    await context.route("**/api/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      let data = {};
      if (pathname === "/api/theme") data = { theme: { primary: "blue", style: "light" } };
      if (pathname === "/api/app/user") data = { user: { id: 1, username: "09121234567", email: "test@example.com", role: "user", themeMode: "light", profile: null }, cart: { count: 0 } };
      if (pathname.endsWith("/structure")) data = { products: [product], catalog: { showcases: [], categories: [], brands: [] }, tree: { sections: [] } };
      if (pathname === "/api/products/structure") data = { products: [], showcases: [{ id: "fixture", title: "ویترین تست", active: true, sortOrder: 1, productCount: 2, limit: 2 }], banners: [] };
      if (pathname === "/api/showcase/fixture/products") data = { products: [product, { ...product, id: 2, title: "محصول دوم با عنوان بسیار طولانی برای بررسی کارت فشرده" }] };
      if (pathname === "/api/products/cart-fixture" || pathname === "/api/products/1") data = { product, comments: [], recommendations: [] };
      if (pathname === "/api/cart") data = { cart: { items: savedItems } };
      if (pathname === "/api/cart/quote") data = { quote: { subtotal: 50000, total: 50000, discountAmount: 0, walletAmount: 0, shippingAmount: 0, cashbackEarned: 0, cashbackPercent: 0, walletBalance: 0, shippingMethod: "pickup", discountCode: null, discountType: null, discountPercent: null } };
      if (pathname === "/api/cart" && route.request().method() === "POST") {
        requests++;
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (reject) return route.fulfill({ status: 409, json: { ok: false, showMessage: "موجودی محصول تست تغییر کرده است." } });
        savedItems = route.request().postDataJSON().items;
        data = { cart: { items: savedItems } };
      }
      if (pathname === "/api/catalog/sync") return route.fulfill({ contentType: "text/event-stream", body: ": fixture\n\n" });
      return route.fulfill({ json: { ok: true, data } });
    });
    try {
      await page.goto(`${origin}/products/cart-fixture`, { waitUntil: "domcontentloaded" });
      const add = page.getByRole("button", { name: "افزودن", exact: true });
      assert.equal(await page.locator('[data-color-counter]').count(), 0);
      await page.getByRole('button', { name: "انتخاب رنگ قرمز", exact: true }).click();
      await page.getByRole('button', { name: "افزایش تعداد رنگ قرمز", exact: true }).click();
      await page.getByRole('button', { name: "انتخاب رنگ آبی", exact: true }).click();
      await page.getByRole('button', { name: "افزایش تعداد رنگ آبی", exact: true }).click();
      await page.getByRole('button', { name: "افزایش تعداد رنگ آبی", exact: true }).click();
      await add.click();
      const success = page.getByRole("status").filter({ hasText: "محصول تست سبد به سبد خرید اضافه شد." });
      await success.waitFor();
      assert.equal(await success.count(), 1);
      const key = "product-cart:user:1";
      assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key))[0].quantity, key), 5);
      assert.equal(savedItems[0].selectedColors.red, 2);
      assert.equal(savedItems[0].selectedColors.blue, 3);
      await page.getByRole("button", { name: "بستن پیام", exact: true }).click();
      reject = true;
      await add.click();
      await page.getByRole("alert").filter({ hasText: "موجودی محصول تست تغییر کرده است." }).waitFor();
      assert.equal(await success.count(), 0, "A rejected add must not show a success message");
      assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key))[0].quantity, key), 5);
      assert.equal(requests, 2);
      reject = false;
      await page.goto(`${origin}/cart`, { waitUntil: "domcontentloaded" });
      const card = page.locator('[data-card-family="cartLine"]:not([data-loading-probe] *):not([inert] *)');
      await card.waitFor();
      const before = await card.boundingBox();
      assert.ok(before.height <= 96, 'Cart rows must remain minimal');
      assert.equal(await card.locator('[data-color-counter]').count(), 0);
      const red = page.getByLabel("تعداد رنگ قرمز", { exact: true });
      const blue = page.getByLabel("تعداد رنگ آبی", { exact: true });
      await page.getByRole('button', { name: "انتخاب رنگ قرمز", exact: true }).click();
      assert.equal(await red.innerText(), '2');
      const savingColor = page.waitForResponse(response => new URL(response.url()).pathname === '/api/cart' && response.request().method() === 'POST' && response.request().postDataJSON().items[0].selectedColors.red === 4);
      await page.getByRole('button', { name: "افزایش تعداد رنگ قرمز", exact: true }).click();
      await page.getByRole('button', { name: "افزایش تعداد رنگ قرمز", exact: true }).click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('product-cart:user:1'))[0].quantity === 7);
      assert.equal(await red.innerText(), '4');
      assert.equal(await page.getByRole('button', { name: "افزایش تعداد رنگ قرمز", exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: "انتخاب رنگ آبی", exact: true }).click();
      assert.equal(await blue.innerText(), '3', 'Other colors must be preserved');
      assert.equal(await card.locator('[data-color-counter]').count(), 1);
      assert.equal((await card.boundingBox()).height, before.height, 'Opening a counter must not enlarge the card');
      const deleteIcon = await card.getByRole('button', { name: 'حذف محصول', exact: true }).locator('svg').boundingBox();
      assert.ok(deleteIcon.width >= 12 && deleteIcon.height >= 12, 'The compact delete action must keep its icon visible');
      await savingColor;
      const decreasing = page.waitForResponse(response => new URL(response.url()).pathname === '/api/cart' && response.request().method() === 'POST' && response.request().postDataJSON().items[0].selectedColors.blue === 2);
      await page.getByRole('button', { name: 'کاهش تعداد رنگ آبی', exact: true }).click();
      assert.equal(await blue.innerText(), '2');
      await decreasing;
      const increasing = page.waitForResponse(response => new URL(response.url()).pathname === '/api/cart' && response.request().method() === 'POST' && response.request().postDataJSON().items[0].selectedColors.blue === 3);
      await page.getByRole('button', { name: 'افزایش تعداد رنگ آبی', exact: true }).click();
      await increasing;
      if (process.env.CAPTURE_UI) await page.screenshot({ path: `.next/compact-cart-${viewport.width}.png` });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: "انتخاب رنگ قرمز", exact: true }).click();
      assert.equal(await red.innerText(), '4');
      await page.getByRole('button', { name: "انتخاب رنگ آبی", exact: true }).click();
      assert.equal(await blue.innerText(), '3');
      await page.goto(`${origin}/products`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => [...document.querySelectorAll('[data-card-family="product"]')].some(node => !node.closest('[data-loading-probe]') && getComputedStyle(node).visibility === 'visible'));
      const productGeometry = await page.locator('[data-card-family="product"]').evaluateAll(nodes => nodes.filter(node => !node.closest('[data-loading-probe]') && getComputedStyle(node).visibility === 'visible').map(node => {
        const bounds = node.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height, controlsFit: [...node.querySelectorAll('button, a')].every(control => control.getBoundingClientRect().bottom <= bounds.bottom && [...control.querySelectorAll('span')].filter(label => label.children.length === 0 && label.textContent.trim()).every(label => label.scrollWidth <= label.clientWidth)) };
      }));
      assert.ok(productGeometry.every(card => card.height <= 144 && card.width <= 256 && card.controlsFit), 'Product cards must be compact without clipping actions');
      if (process.env.CAPTURE_UI) await page.screenshot({ path: `.next/compact-products-${viewport.width}.png` });
      assert.deepEqual(failures, []);
      console.log(`PASS ${viewport.width}x${viewport.height}: multi-color product/cart, per-color stock, other colors preserved, refresh persistence, add/error messages, rollback`);
    } catch (error) {
      console.error(JSON.stringify({ viewport, savedItems, requests, fields: await page.locator("input[type=number]").evaluateAll((nodes) => nodes.map((node) => ({ label: node.getAttribute("aria-label"), value: node.value, max: node.max }))), storage: await page.evaluate(() => localStorage.getItem("product-cart:user:1")), errors: failures }));
      throw error;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
