// All API calls use fixtures; this never changes the configured database.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.argv[2] ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function check(mode, osMode) {
  const context = await browser.newContext({ colorScheme: osMode });
  const page = await context.newPage();
  let currentUser = { id: 1, username: "09120000000", email: "user@example.com", role: "admin", themeMode: mode, profile: null };
  let themeRequests = 0;
  let releaseTheme;
  const themeGate = new Promise((resolve) => { releaseTheme = resolve; });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.addInitScript(({ user }) => {
    if (!localStorage.getItem("app-user:v2")) {
      localStorage.setItem("app-user:v2", JSON.stringify({ at: Date.now(), data: { user, cart: { count: 0 } } }));
    }
    window.faviconMismatches = [];
    window.readFavicon = () => {
      const icons = document.querySelectorAll("link[rel=icon], link[rel='shortcut icon']");
      const icon = document.getElementById("app-theme-favicon");
      if (!icon) return null;
      const href = icon.getAttribute("href") ?? "";
      const svg = new DOMParser().parseFromString(decodeURIComponent(href.slice(href.indexOf(",") + 1)), "image/svg+xml");
      const dark = document.documentElement.classList.contains("dark");
      const vars = document.documentElement.style;
      return {
        count: icons.length,
        media: icon.getAttribute("media"),
        href,
        dark,
        background: svg.querySelector("[data-favicon-background]")?.getAttribute("fill"),
        foreground: svg.querySelector("[data-favicon-symbol]")?.getAttribute("color"),
        expectedBackground: vars.getPropertyValue(dark ? "--primary-bg" : "--primary"),
        expectedForeground: vars.getPropertyValue(dark ? "--primary-text" : "--primary-base"),
      };
    };
    new MutationObserver(() => {
      if (document.documentElement.dataset.themeColorReady !== "true") return;
      const state = window.readFavicon();
      if (!state || state.count !== 1 || state.media || state.background !== state.expectedBackground || state.foreground !== state.expectedForeground) {
        window.faviconMismatches.push(state);
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["href", "class", "style", "media", "data-theme-color-ready"] });
  }, { user: currentUser });
  await context.route("**/icon?**", async (route) => {
    // An obsolete PNG response must never be able to replace the current SVG favicon.
    await pause(750);
    await route.fulfill({ status: 204, body: "" });
  });
  await context.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let data = {};
    if (url.pathname === "/api/theme") {
      themeRequests += 1;
      await themeGate;
      data = { theme: { primary: "blue", style: "light" } };
    } else if (url.pathname === "/api/app/user") {
      if (route.request().method() === "PATCH") currentUser = { ...currentUser, ...route.request().postDataJSON() };
      data = { user: currentUser, cart: { count: 0 } };
    } else if (url.pathname === "/api/admin/catalog/structure") {
      data = { structure: { products: 0, users: 0, orders: 0, inPersonOrders: 0, banners: 0, showcases: [], categoryGroups: [], brandGroups: [], storefront: {} } };
    } else if (url.pathname === "/api/catalog/sync") {
      return route.fulfill({ status: 200, contentType: "text/event-stream", body: ": fixture\n\n" });
    }
    return route.fulfill({ json: { ok: true, data } });
  });

  const assertCurrent = async () => {
    const state = await page.evaluate(() => window.readFavicon());
    assert.equal(state.count, 1);
    assert.equal(state.media, null);
    assert.equal(state.background, state.expectedBackground);
    assert.equal(state.foreground, state.expectedForeground);
    return state;
  };
  try {
    await page.goto(`${origin}/panel/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.getElementById("app-favicon-template"));
    assert.equal(await page.locator("html").getAttribute("data-theme-color-ready"), "false");
    releaseTheme();
    await page.waitForFunction(() => document.documentElement.dataset.themeReady === "true");
    assert.equal((await assertCurrent()).dark, mode === "dark");

    // Verify that the SVG is decodable and actually paints the selected background.
    assert.equal(await page.evaluate(async () => {
      const state = window.readFavicon();
      const image = new Image();
      image.src = state.href;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 32;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const pixel = ctx.getImageData(16, 1, 1, 1).data;
      const color = `#${[...pixel].slice(0, 3).map((value) => value.toString(16).padStart(2, "0")).join("")}`;
      return color.toLowerCase() === state.background.toLowerCase();
    }), true);

    for (let index = 0; index < 6; index += 1) {
      const previous = await assertCurrent();
      await page.getByRole("switch", { name: "تغییر حالت روز و شب" }).click();
      await page.waitForFunction((dark) => document.documentElement.classList.contains("dark") !== dark, previous.dark);
      await assertCurrent();
    }
    await page.emulateMedia({ colorScheme: mode });
    await pause(850);
    await assertCurrent();
    assert.deepEqual(await page.evaluate(() => window.faviconMismatches), []);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.documentElement.dataset.themeReady === "true");
    await assertCurrent();
    assert.equal(themeRequests, 1, "Cached refresh must keep the existing theme boot contract");
    const marker = await page.evaluate(() => (window.faviconNavigationMarker = Math.random()));
    await page.locator('a[href="/"]').first().click();
    await page.waitForURL(`${origin}/`);
    assert.equal(await page.evaluate(() => window.faviconNavigationMarker), marker, "Exercise a client navigation, not a full reload");
    await pause(150);
    await assertCurrent();
    assert.deepEqual(await page.evaluate(() => window.faviconMismatches), []);
    assert.deepEqual(errors, []);
    console.log(`PASS app=${mode}, OS=${osMode}: v2 cache, actual SVG pixels, rapid toggles, OS changes, cached refresh, client navigation; no mismatched favicon frames`);
  } catch (error) {
    console.error(JSON.stringify(await page.evaluate(() => ({
      favicon: window.readFavicon(),
      template: document.getElementById("app-favicon-template")?.outerHTML,
      mismatches: window.faviconMismatches,
    }))));
    console.error(errors);
    throw error;
  } finally {
    releaseTheme();
    await context.close();
  }
}

try {
  await check("dark", "light");
  await check("light", "dark");
} finally {
  await browser.close();
}
