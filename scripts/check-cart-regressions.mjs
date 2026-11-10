// Isolated API/client checks: never connects to the database or modifies real carts.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loader(mocks, globals = {}) {
  const context = vm.createContext({ console, URL, URLSearchParams, Request, Response, Event, CustomEvent, Date, setTimeout, clearTimeout, ...globals });
  const modules = new Map();
  function load(file) {
    const absolute = path.resolve(file);
    if (modules.has(absolute)) return modules.get(absolute).exports;
    const module = { exports: {} };
    modules.set(absolute, module);
    const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => mocks[name] ?? (name.startsWith("@/") ? load(`${name.slice(2)}.ts`)
      : name.startsWith(".") ? load(`${path.resolve(path.dirname(absolute), name)}.ts`) : require(name));
    vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename: absolute })(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}

let authCalls = 0, batchWrites = 0, deletes = 0, cartReads = 0, profileWrites = 0;
let saved = [], products = [], signedIn = true;
const profile = { id: "profile", userId: 1, firstName: "علی", lastName: "رضایی", phone: "09121234567", email: "test@example.com", address: "نشانی کامل", isAdminUnlocked: false };
const cart = () => ({ id: "cart", profileId: profile.id, profile, items: saved });
const db = {
  product: { findMany: async () => products },
  customerProfile: {
    findFirst: async () => profile,
    update: async () => { profileWrites++; return profile; },
  },
  cart: { upsert: async () => { cartReads++; return cart(); } },
  cartItem: {
    deleteMany: async () => { deletes++; saved = []; },
    createMany: async ({ data }) => { batchWrites++; saved = data.map((item, index) => ({ ...item, id: `line-${index}` })); return { count: data.length }; },
    findMany: async () => saved,
  },
  $transaction: async (run) => run(db),
};
const load = loader({
  "@/lib/prisma": { prisma: db },
  "@/lib/api/auth": { getAuthUser: async () => { authCalls++; return signedIn ? { id: 1 } : null; } },
  "@/lib/api/rate-limit": { rateLimit: () => null },
  "@/lib/api/catalog-service": {
    getOrCreateActiveCart: async () => { cartReads++; return cart(); },
    cartItemDto: (item) => item,
  },
  "@/lib/api/checkout-service": { CheckoutError: class extends Error {} },
});
const api = load("app/api/cart/route.ts");
const { getFinalPriceValue } = load("lib/price-format.ts");
assert.equal(getFinalPriceValue({ price: "10000", discountPrice: "" }), "10000", "An empty optional discount must not erase the displayed price");
assert.equal(getFinalPriceValue({ price: "10000", discountPrice: 0 }), "0", "An explicit zero price must remain valid");
const item = (id, extra = {}) => ({ productId: id, title: `محصول ${id}`, price: "1000", quantity: 1, ...extra });
const product = (id, extra = {}) => ({ id, stockQuantity: 10, colorStock: {}, active: true, isActive: true, isAvailable: true, ...extra });
const post = (body) => api.POST(new Request("http://localhost/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

for (const items of [null, [item(1, { quantity: -1 })], [item(1, { quantity: "NaN" })], [item(1, { selectedColors: { red: -1 } })]]) {
  assert.equal((await post({ items })).status, 422);
}
assert.equal(authCalls, 0, "Invalid input must not reach auth/DB");
products = [product(1, { colorStock: { red: 5, blue: 5 } })];
let response = await post({ items: [item(1)], profile });
assert.equal(response.status, 200, "Drafts may defer color selection until checkout");
assert.equal(authCalls, 1, "Complete profiles must not trigger authentication twice");
assert.equal(profileWrites, 0, "Unchanged profiles must not be written on every cart save");
assert.equal(cartReads, 1, "Saving must not upsert/read the cart again after the transaction");
assert.equal(saved[0].selectedColor, null);
response = await post({ items: [item(1, { selectedColor: "red", quantity: 2 })] });
assert.equal(response.status, 200);
assert.equal(saved[0].quantity, 2);
const beforeRejected = deletes;
for (const extra of [{ selectedColor: "green" }, { selectedColors: { red: 5, blue: 5 } }]) {
  products = [product(1, { stockQuantity: 8, colorStock: { red: 5, blue: 5 } })];
  assert.equal((await post({ items: [item(1, extra)] })).status, 409);
}
products = [product(1, { stockQuantity: 0 })];
assert.equal((await post({ items: [item(1)] })).status, 409);
products = [];
assert.equal((await post({ items: [item(1)] })).status, 409);
assert.equal(deletes, beforeRejected, "Stock conflicts must leave the persisted cart untouched");
products = [product(1, { stockQuantity: 3 })];
assert.equal((await post({ items: [item(1, { quantity: 2 }), item(1, { quantity: 2 })] })).status, 200);
assert.equal(saved.length, 1);
assert.equal(saved[0].quantity, 3, "Duplicates must be merged before applying the stock limit");
products = Array.from({ length: 100 }, (_, i) => product(i + 1));
const beforeBatch = batchWrites;
assert.equal((await post({ items: products.map((p) => item(p.id)) })).status, 200);
assert.equal(saved.length, 100);
assert.equal(batchWrites - beforeBatch, 1, "100 items require one bulk insert, not 100 sequential inserts");
signedIn = false;
assert.equal((await post({ items: [item(1)] })).status, 400);
console.log("PASS API: body validation, one auth lookup, no redundant profile/cart writes, bulk insert, draft colors, real stock conflicts, duplicate/total stock limits");

function clientFixture({ user = { id: 1 }, fetcher } = {}) {
  const storage = new Map();
  const notifications = [], requests = [];
  const localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
  const window = new EventTarget();
  const clientLoad = loader({
    "@/lib/auth-client": { readCachedAuthUser: () => user, fetchCurrentUser: async () => user },
    "@/lib/user-profile": { readUserProfile: () => null, isUserProfileComplete: () => false },
    "@/lib/app-notifications": { NOTIFICATION_SILENT_HEADER: "x-skip-notification", notifyApp: (notice) => notifications.push(notice) },
  }, { window, localStorage, fetch: async (url, init) => {
    requests.push({ url, init });
    if (fetcher) return fetcher(url, init);
    return Response.json({ ok: true, data: { cart: { items: JSON.parse(init.body).items } } });
  } });
  return { client: clientLoad("lib/cart-client.ts"), notifications, requests };
}
const clientProduct = { ...product(1), title: "محصول تست", description: "", price: "1000" };
let fixture = clientFixture();
await fixture.client.addProductToCart(clientProduct);
assert.equal(fixture.requests.length, 1);
assert.equal(fixture.requests[0].init.headers["x-skip-notification"], "true");
assert.equal(fixture.notifications.length, 1);
assert.equal(fixture.notifications[0].type, "success");
assert.match(fixture.notifications[0].message, /به سبد خرید اضافه شد/);
fixture = clientFixture({ user: null });
await fixture.client.addProductToCart({ ...clientProduct, colorStock: { red: 0, blue: 3 } });
assert.equal(fixture.requests.length, 0);
assert.equal(fixture.notifications[0].type, "success");
assert.equal(fixture.client.readLocalCart()[0].selectedColor, "blue");
fixture = clientFixture({ user: null });
const multiProduct = { ...clientProduct, stockQuantity: 5, colorStock: { red: 4, blue: 4 } };
await fixture.client.addProductToCart(multiProduct, 4, { red: 2, blue: 2 });
assert.equal(fixture.client.readLocalCart()[0].quantity, 4);
assert.equal(fixture.client.getCartItemColorSelection(fixture.client.readLocalCart()[0]).blue, 2);
await assert.rejects(fixture.client.addProductToCart(multiProduct, 2, { blue: 2 }), /موجودی محصول کافی نیست/);
await fixture.client.updateCartColorQuantity(fixture.client.readLocalCart()[0], "red", 10);
assert.equal(fixture.client.readLocalCart()[0].quantity, 5, "Color changes share the total stock limit");
assert.equal(fixture.client.getCartItemColorSelection(fixture.client.readLocalCart()[0]).red, 3);
fixture = clientFixture({ fetcher: async () => Response.json({ ok: false, showMessage: "موجودی تغییر کرده است." }, { status: 409 }) });
await assert.rejects(fixture.client.addProductToCart(clientProduct), /موجودی تغییر/);
assert.equal(fixture.client.readLocalCart().length, 0, "Rejected add must roll back the local snapshot");
assert.equal(fixture.notifications.length, 1);
assert.equal(fixture.notifications[0].type, "error");
fixture = clientFixture({ fetcher: async () => { throw new Error("network offline"); } });
await assert.rejects(fixture.client.addProductToCart(clientProduct), /ذخیره سبد خرید انجام نشد/);
assert.equal(fixture.notifications.length, 1);
assert.equal(fixture.notifications[0].type, "error");
assert.equal(fixture.client.readLocalCart().length, 1, "Network failure retains the existing pending offline snapshot");
fixture = clientFixture({ user: null });
await fixture.client.addProductToCart({ ...clientProduct, stockQuantity: 1 });
await assert.rejects(fixture.client.addProductToCart({ ...clientProduct, stockQuantity: 1 }), /موجودی محصول کافی نیست/);
assert.equal(fixture.client.readLocalCart()[0].quantity, 1);
assert.equal(fixture.notifications.at(-1).type, "error");
let release;
const gate = new Promise((resolve) => { release = resolve; });
let requestIndex = 0;
fixture = clientFixture({ fetcher: async (_url, init) => {
  if (requestIndex++ === 0) { await gate; return Response.json({ ok: false, showMessage: "موجودی تغییر کرده است." }, { status: 409 }); }
  return Response.json({ ok: true, data: { cart: { items: JSON.parse(init.body).items } } });
} });
const first = fixture.client.addProductToCart(clientProduct).catch(() => null);
const second = fixture.client.addProductToCart({ ...clientProduct, id: 2 });
release();
await Promise.all([first, second]);
assert.equal(fixture.client.readLocalCart().length, 2, "An older rejected request must not overwrite a newer mutation");
console.log("PASS client: guest/account success notices, first available color, 409 rollback/error, network error/offline recovery, stock cap, concurrent mutation protection");
