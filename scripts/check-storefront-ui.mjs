// Browser layout fixtures only: no real catalog changes are made.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const origin = process.argv[2] ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let writes = 0, fail = false;
    let layout = { home: [], categories: [], showcases: [
      { type: "banner", id: "b1", title: "بنر اول", sortOrder: 1 },
      { type: "showcase", id: "s1", title: "ویترین اول", sortOrder: 2 },
      { type: "banner", id: "b2", title: "بنر دوم", sortOrder: 3 },
      { type: "showcase", id: "s2", title: "ویترین دوم", sortOrder: 4 },
    ] };
    await context.route("**/api/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      let data = {};
      if (pathname === "/api/theme") data = { theme: { primary: "blue", style: "light" } };
      if (pathname === "/api/app/user") data = { user: { id: 1, username: "09176991556", role: "superadmin", themeMode: "light", profile: null }, cart: { count: 0 } };
      if (pathname === "/api/admin/catalog/structure") data = { structure: { products: 0, users: 0, orders: 0, banners: 2, showcases: [{ id: "s1", count: 0 }, { id: "s2", count: 0 }], categoryGroups: [], brandGroups: [], storefront: { home: 0, categories: 0, products: 4 } } };
      if (pathname === "/api/admin/catalog/storefront") {
        if (route.request().method() === "PUT") {
          writes++;
          if (fail) return route.fulfill({ status: 500, json: { ok: false, showMessage: "ذخیره چیدمان فروشگاه ناموفق بود." } });
          layout = route.request().postDataJSON().storefront;
        }
        data = { storefront: layout };
      }
      if (pathname === "/api/catalog/sync") return route.fulfill({ contentType: "text/event-stream", body: ": fixture\n\n" });
      return route.fulfill({ json: { ok: true, data } });
    });
    const enter = async () => {
      await page.getByRole("group", { name: "بخش‌های پنل مدیریت" }).getByRole("button", { name: "چیدمان", exact: true }).click();
      await page.getByRole("group", { name: "صفحه‌ی چیدمان" }).getByRole("button", { name: "ویترین", exact: true }).click();
    };
    const expectOrder = async (titles) => {
      await page.waitForFunction((titles) => {
        const rows = [...document.querySelectorAll('[draggable="true"]')].filter((node) => node.getBoundingClientRect().height > 0);
        return JSON.stringify(rows.map((row) => row.querySelector("h3")?.textContent)) === JSON.stringify(titles);
      }, titles);
      const inputs = page.getByRole("spinbutton", { name: "ترتیب", exact: true });
      assert.deepEqual(await inputs.evaluateAll((nodes) => nodes.map((node) => node.value)), ["1", "2", "3", "4"]);
    };
    try {
      await page.goto(`${origin}/panel/admin`, { waitUntil: "domcontentloaded" });
      await enter();
      await expectOrder(["بنر اول", "ویترین اول", "بنر دوم", "ویترین دوم"]);
      assert.equal(writes, 0, "Loading layout must not write a new order");
      const first = page.getByRole("spinbutton", { name: "ترتیب", exact: true }).first();
      await first.fill("3");
      await first.press("Tab");
      await expectOrder(["ویترین اول", "بنر دوم", "بنر اول", "ویترین دوم"]);
      await page.waitForFunction(() => !document.querySelector('button[disabled][aria-label="ویترین"]'));
      assert.equal(writes, 1);
      assert.equal(layout.showcases.map((item) => `${item.id}:${item.sortOrder}`).join(), "s1:1,b2:2,b1:3,s2:4");
      await page.reload({ waitUntil: "domcontentloaded" });
      await enter();
      await expectOrder(["ویترین اول", "بنر دوم", "بنر اول", "ویترین دوم"]);
      assert.equal(writes, 1, "Refresh must retain the exact mixed order without auto-saving");
      fail = true;
      const last = page.getByRole("spinbutton", { name: "ترتیب", exact: true }).last();
      await last.fill("1");
      await last.press("Tab");
      await page.getByRole("alert").filter({ hasText: "ذخیره چیدمان فروشگاه ناموفق بود." }).waitFor();
      await expectOrder(["ویترین اول", "بنر دوم", "بنر اول", "ویترین دوم"]);
      assert.equal(writes, 2);
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}x${viewport.height}: mixed sequential numbering, numeric move shifts all types, persisted refresh, no auto-writes, failed save rollback`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
