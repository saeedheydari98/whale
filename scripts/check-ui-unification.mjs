// Runs against a local production build with fixture-only API responses.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.argv[2] ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function check(viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let guest = false;
  const user = { id: 1, username: "09176991556", role: "superadmin", themeMode: "light", email: "user@example.com", profile: null };
  const structure = { products: 0, users: 0, orders: 0, inPersonOrders: 0, banners: 0, showcases: [], categoryGroups: [], brandGroups: [], storefront: { home: 0, categories: 0, products: 0 } };
  await context.route("**/icon?**", (route) => route.fulfill({ status: 204, body: "" }));
  await context.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let data = {};
    if (pathname === "/api/theme") data = { theme: { primary: "blue", style: "light" } };
    if (pathname === "/api/app/user") data = { user: guest ? null : user, cart: { count: 0 } };
    if (pathname === "/api/admin/catalog/structure") data = { structure };
    if (pathname === "/api/admin/orders") data = { orders: [] };
    if (pathname === "/api/admin/users") data = { users: [] };
    if (pathname === "/api/admin/security/requests") data = { requests: [] };
    if (pathname === "/api/admin/discounts") data = { rules: [], settings: { cashbackPercent: 0, postalShippingFee: 30000 } };
    if (pathname === "/api/user/structure") data = { structure: { orders: 0, discounts: 0, unseenDiscounts: 0 } };
    if (pathname.startsWith("/api/auth/request-otp")) data = { sent: true, retryAfterSeconds: 0, expiresInSeconds: 300 };
    if (pathname === "/api/catalog/sync") return route.fulfill({ status: 200, contentType: "text/event-stream", body: ": fixture\n\n" });
    return route.fulfill({ json: { ok: true, data } });
  });
  const appearance = (element) => element.evaluate((node) => {
    const style = getComputedStyle(node);
    return Object.fromEntries(["fontSize", "fontWeight", "borderRadius", "backgroundColor", "color", "paddingTop", "paddingBottom", "minHeight"].map((key) => [key, style[key]]));
  });
  try {
    console.log(`Checking ${viewport.width}x${viewport.height}: shared tabs`);
    await page.goto(`${origin}/panel/admin`, { waitUntil: "domcontentloaded" });
    const primary = page.getByRole("group", { name: "بخش‌های پنل مدیریت" });
    await primary.waitFor();
    const primaryStyle = await appearance(primary.locator('button[aria-pressed="true"]'));
    const first = primary.getByRole("button").first();
    await first.focus();
    await page.keyboard.press("End");
    assert.equal(await primary.getByRole("button", { name: "چیدمان", exact: true }).getAttribute("aria-pressed"), "true");
    await page.keyboard.press("Home");
    assert.equal(await primary.getByRole("button", { name: "ظاهر", exact: true }).getAttribute("aria-pressed"), "true");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await primary.getByRole("button").nth(1).getAttribute("aria-pressed"), "true", "RTL arrow navigation must select the next enabled item");
    const securitySecondary = page.locator('[data-selection-level="secondary"]');
    await securitySecondary.waitFor();
    const secondaryStyle = await appearance(securitySecondary.locator('button[aria-pressed="true"]'));
    await primary.getByRole("button", { name: "سفارش ها", exact: true }).click();
    const secondary = page.locator('[data-selection-level="secondary"]');
    assert.deepEqual(await appearance(secondary.locator('button[aria-pressed="true"]')), secondaryStyle);
    await secondary.getByRole("button", { name: "سفارش‌های حضوری", exact: true }).click();
    await page.getByRole("button", { name: "ثبت سفارش حضوری", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const tertiary = dialog.getByRole("group", { name: "نوع مشتری" });
    const tertiaryStyle = await appearance(tertiary.locator('button[aria-pressed="true"]'));
    await tertiary.getByRole("button", { name: "مشتری جدید", exact: true }).click();
    assert.equal(await tertiary.getByRole("button", { name: "مشتری جدید", exact: true }).getAttribute("aria-pressed"), "true");
    await dialog.getByLabel("نام", { exact: true }).waitFor();
    await tertiary.getByRole("button", { name: "مشتری موجود", exact: true }).focus();
    await page.keyboard.press("Home");
    assert.equal(await tertiary.getByRole("button", { name: "مشتری موجود", exact: true }).getAttribute("aria-pressed"), "true");
    await dialog.getByRole("button", { name: "انصراف", exact: true }).click();
    console.log("Checking form selections");
    await primary.getByRole("button", { name: "تخفیف‌ها", exact: true }).click();
    await page.getByRole("button", { name: /کدهای تخفیف خودکار/ }).click();
    const audience = page.getByRole("group", { name: "گروه هدف تخفیف" });
    await audience.waitFor();
    assert.deepEqual(await appearance(audience.locator('button[aria-pressed="true"]')), tertiaryStyle, "Form choices must share the modal choice appearance");
    await audience.getByRole("button", { name: "تعداد خرید", exact: true }).click();
    await page.getByLabel("حداقل تعداد خرید", { exact: true }).waitFor();

    await primary.getByRole("button", { name: "محصولات", exact: true }).click();
    await page.getByRole("button", { name: "محصول جدید", exact: true }).click();
    console.log("Checking product modal");
    await dialog.locator("input[type=file]").waitFor({ state: "attached" });
    assert.ok((await dialog.locator("input[type=file]").getAttribute("accept")).includes("webp"));
    assert.ok(await dialog.locator("section").count() >= 6, "Product modals must use the shared semantic section component");

    await page.goto(`${origin}/panel/user`, { waitUntil: "domcontentloaded" });
    const userTabs = page.getByRole("group", { name: "بخش‌های پنل کاربری" });
    await userTabs.waitFor();
    assert.deepEqual(await appearance(userTabs.locator('button[aria-pressed="true"]')), primaryStyle, "Primary tabs must match across both panels");

    guest = true;
    console.log("Checking login and OTP");
    await context.clearCookies();
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(`${origin}/panel/user`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "حساب کاربری", exact: true }).click();
    await dialog.getByLabel("شماره موبایل", { exact: true }).fill("09121234567");
    await dialog.getByLabel("ایمیل", { exact: true }).fill("test@example.com");
    await dialog.getByRole("button", { name: "ارسال کد ورود به ایمیل", exact: true }).click();
    const otp = dialog.getByRole("textbox", { name: /رقم .* از کد ورود/ });
    await otp.first().waitFor();
    assert.equal(await otp.count(), 6);
    await otp.first().fill("1");
    assert.equal(await otp.first().inputValue(), "1");
    await page.keyboard.press("Backspace");
    assert.equal(await otp.first().inputValue(), "");
    await pause(100);
    assert.deepEqual(errors, []);
    console.log(`PASS ${viewport.width}x${viewport.height}: three shared selection levels, matching styles across panels/forms, RTL keyboard, modal sections/upload, OTP behavior`);
  } finally {
    await context.close();
  }
}

try {
  await check({ width: 1440, height: 1000 });
  await check({ width: 390, height: 844 });
} finally {
  await browser.close();
}
