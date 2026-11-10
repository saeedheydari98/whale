// Browser regression: all API responses are fixtures; no database access.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.argv[2] ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function check(viewport, count) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  let releaseUsers;
  let gate = new Promise((resolve) => { releaseUsers = resolve; });
  const user = { id: 1, username: "09120000000", role: "admin", themeMode: "light", profile: null };
  const users = Array.from({ length: count }, (_, index) => ({
    ...user, id: index + 1, role: "user", name: `کاربر ${index + 1}`, profiles: [],
    createdAt: "2026-11-01T00:00:00Z", orderCount: 0, orderTotal: 0, walletBalance: 0, lastOrderAt: null,
  }));
  await context.route("**/icon?**", (route) => route.fulfill({ status: 204, body: "" }));
  await context.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let data = {};
    if (pathname === "/api/theme") data = { theme: { primary: "blue", style: "light" } };
    if (pathname === "/api/app/user") data = { user, cart: { count: 0 } };
    if (pathname === "/api/admin/catalog/structure") data = { structure: {
      users: count, products: 0, orders: 0, inPersonOrders: 0, banners: 0, showcases: [], categoryGroups: [], brandGroups: [], storefront: {},
    } };
    if (pathname === "/api/admin/users") {
      await gate;
      data = { users };
    }
    if (pathname === "/api/catalog/sync") return route.fulfill({ status: 200, contentType: "text/event-stream", body: ": fixture\n\n" });
    return route.fulfill({ json: { ok: true, data } });
  });
  try {
    await page.goto(`${origin}/panel/admin`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "کاربران", exact: true }).click();
    const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "کاربران", exact: true }) });
    const collection = section.locator("[data-loading-probe]").locator("..");
    const geometry = () => collection.evaluate((element) => {
      const rows = [...element.children].filter((child) => !child.hasAttribute("data-loading-probe") && !child.hasAttribute("data-loading-sentinel"));
      const root = document.querySelector("[data-app-scroll-container]");
      const bottom = Math.min(window.innerHeight, root.getBoundingClientRect().bottom);
      const top = element.getBoundingClientRect().top;
      const gap = parseFloat(getComputedStyle(element).rowGap) || 0;
      const bounds = rows.map((row) => {
        const { x, y, width, height } = row.getBoundingClientRect();
        return { x, y, width, height };
      });
      const fit = rows.length ? Math.max(1, Math.floor((bottom - top + gap) / (bounds[0].height + gap))) : 0;
      return { count: rows.length, fit, bounds };
    });
    await collection.waitFor({ state: "attached" });
    await pause(300);
    const before = await geometry();
    assert.equal(before.count, Math.min(count, before.fit), `Viewport ${viewport.width}, total ${count}: expected measured skeleton capacity, got ${JSON.stringify(before)}`);
    if (count > 2) assert.ok(before.count > 1, "A visible user table must not be limited to one skeleton");
    releaseUsers();
    if (count) await section.getByRole("heading", { name: "کاربر 1", exact: true }).waitFor();
    else await section.getByText("کاربری پیدا نشد.", { exact: true }).waitFor();
    await pause(150);
    const after = await geometry();
    for (let index = 0; index < before.count; index += 1) {
      for (const key of ["x", "y", "width", "height"]) {
        assert.ok(Math.abs(before.bounds[index][key] - after.bounds[index][key]) < 1, `Row ${index} ${key} shifted between skeleton and content`);
      }
    }
    if (count) {
      gate = new Promise((resolve) => { releaseUsers = resolve; });
      await section.getByRole("button", { name: "به‌روزرسانی", exact: true }).click();
      await pause(200);
      const refreshing = await geometry();
      assert.equal(refreshing.count, Math.min(count, refreshing.fit), "Refresh must also use the measured skeleton capacity");
      releaseUsers();
    }
    assert.deepEqual(failures, []);
    console.log(`PASS ${viewport.width}x${viewport.height}, total=${count}: ${before.count} measured skeletons, matching row geometry, refresh`);
  } finally {
    releaseUsers();
    await context.close();
  }
}

try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    for (const count of [40, 2, 0]) await check(viewport, count);
  }
} finally {
  await browser.close();
}
