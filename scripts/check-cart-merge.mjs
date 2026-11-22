// Client integration checks with isolated storage and HTTP doubles; no live carts.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const guestKey = "product-cart:guest";
const accountKey = "product-cart:user:1";
const transferKey = `${accountKey}:guest-merge`;
const item = (id, quantity, selectedColors = {}) => ({
  id, productId: id, title: `Product ${id}`, description: "", price: "1000", quantity,
  selectedColors, stockQuantity: 100, isAvailable: true,
});
let lockQueue = Promise.resolve();
const locks = { request: (_name, run) => {
  const pending = lockQueue.then(run, run);
  lockQueue = pending.then(() => undefined, () => undefined);
  return pending;
} };
function fixture({ storage = new Map(), server = { items: [] }, fetcher } = {}) {
  let user = { id: 1 };
  const requests = [];
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const fetch = async (url, init = {}) => {
    requests.push(init.method ?? "GET");
    if (fetcher) return fetcher(url, init, server, storage);
    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      if (body.guestMergeUserId !== undefined) assert.equal(body.guestMergeUserId, user.id);
      server.items = body.items;
    }
    return Response.json({ ok: true, data: { cart: { items: server.items } } });
  };
  const mocks = {
    "@/lib/auth-client": { readCachedAuthUser: () => user, fetchCurrentUser: async () => user },
    "@/lib/user-profile": { readUserProfile: () => null, isUserProfileComplete: () => false },
    "@/lib/app-notifications": { NOTIFICATION_SILENT_HEADER: "x-skip-notification", notifyApp: () => undefined },
  };
  const context = vm.createContext({ console, URL, Request, Response, Event, Date, setTimeout, clearTimeout,
    window: new EventTarget(), navigator: { locks }, localStorage, fetch });
  const modules = new Map();
  function load(file) {
    const absolute = path.resolve(file);
    if (modules.has(absolute)) return modules.get(absolute).exports;
    const loadedModule = { exports: {} };
    modules.set(absolute, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (name) => mocks[name] ?? (name.startsWith("@/") ? load(`${name.slice(2)}.ts`) : require(name));
    vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename: absolute })(localRequire, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return { client: load("lib/cart-client.ts"), storage, server, requests, setUser: (next) => { user = next; } };
}
const quantities = (items) => Object.fromEntries(items.map((row) => [row.productId, row.quantity]));

let f = fixture({ server: { items: [item(1, 2, { red: 2 }), item(3, 4)] } });
f.storage.set(guestKey, JSON.stringify([item(1, 1, { blue: 1 }), item(2, 3)]));
f.storage.set(accountKey, JSON.stringify([item(99, 50), item(1, 20)]));
const [first, second, snapshot] = await Promise.all([
  f.client.claimGuestCartForUser({ id: 1 }), f.client.claimGuestCartForUser({ id: 1 }), f.client.getCart({ id: 1 }),
]);
assert.deepEqual(f.requests, ["GET", "POST"]);
assert.deepEqual(quantities(first), { 1: 3, 2: 3, 3: 4 }, "Server cart is authoritative; stale local cache is not added again");
assert.deepEqual(quantities(second), quantities(first));
assert.deepEqual(quantities(snapshot.items), quantities(first));
assert.equal(first.find((row) => row.productId === 1).selectedColors.red, 2);
assert.equal(first.find((row) => row.productId === 1).selectedColors.blue, 1);
assert.equal(f.storage.has(guestKey), false);
assert.equal(f.storage.has(transferKey), false);
assert.equal(await f.client.claimGuestCartForUser({ id: 1 }), null);
console.log("PASS: server + guest union, quantities/colors, stale cache, incomplete profile and concurrent callers");

f = fixture();
f.storage.set("product-cart", JSON.stringify([item(2, 2)]));
await f.client.claimGuestCartForUser({ id: 1 });
assert.deepEqual(quantities(f.server.items), { 2: 2 });
assert.equal(f.storage.has("product-cart"), false);
f = fixture({ server: { items: [item(1, 2)] } });
f.storage.set(guestKey, JSON.stringify([item(1, 3, { blue: 3 })]));
await f.client.claimGuestCartForUser({ id: 1 });
assert.equal(f.server.items[0].quantity, 5, "Draft units are preserved when merged with selected colors");
assert.equal(Object.keys(f.server.items[0].selectedColors).length, 0, "Mixed drafts require a final color selection at checkout");
console.log("PASS: legacy guest migration, empty account and draft quantity preservation");

const initialGuest = JSON.stringify([item(1, 2)]);
f = fixture({ server: { items: [item(1, 3), item(4, 1)] }, fetcher: async (_url, init, server) => {
  if (init.method === "POST") {
    server.items = JSON.parse(init.body).items;
    throw new Error("Response lost after commit");
  }
  return Response.json({ ok: true, data: { cart: { items: server.items } } });
} });
f.storage.set(guestKey, initialGuest);
await assert.rejects(f.client.claimGuestCartForUser({ id: 1 }), /Response lost/);
assert.equal(f.storage.get(guestKey), initialGuest);
assert.ok(f.storage.get(transferKey));
const reloaded = fixture({ storage: f.storage, server: f.server });
reloaded.setUser({ id: 2 });
assert.equal(await reloaded.client.claimGuestCartForUser({ id: 2 }), null, "A pending transfer belongs to its original account");
assert.equal(reloaded.requests.length, 0);
reloaded.setUser({ id: 1 });
await reloaded.client.claimGuestCartForUser({ id: 1 });
assert.deepEqual(reloaded.requests, ["POST"], "Reload retries the same prepared snapshot");
assert.deepEqual(quantities(reloaded.server.items), { 1: 5, 4: 1 }, "Lost response must not add guest units twice");
assert.equal(reloaded.storage.has(guestKey), false);

for (const failureAt of ["GET", "POST"]) {
  f = fixture({ fetcher: async (_url, init, server) => {
    if ((init.method ?? "GET") === failureAt) throw new Error("offline");
    return Response.json({ ok: true, data: { cart: { items: server.items } } });
  } });
  f.storage.set(guestKey, initialGuest);
  await assert.rejects(f.client.claimGuestCartForUser({ id: 1 }), /offline/);
  assert.equal(f.storage.get(guestKey), initialGuest);
}
f = fixture({ fetcher: async (_url, init, server) => init.method === "POST"
  ? Response.json({ ok: false, showMessage: "stock changed" }, { status: 409 })
  : Response.json({ ok: true, data: { cart: { items: server.items } } }) });
f.storage.set(guestKey, initialGuest);
await assert.rejects(f.client.claimGuestCartForUser({ id: 1 }), /stock changed/);
assert.equal(f.storage.get(guestKey), initialGuest);
assert.equal(f.storage.has(transferKey), false);
console.log("PASS: network failure, persisted retry after reload, account isolation and confirmed rejection");

const sharedStorage = new Map([[guestKey, initialGuest]]);
const sharedServer = { items: [item(1, 3)] };
const tabOne = fixture({ storage: sharedStorage, server: sharedServer });
const tabTwo = fixture({ storage: sharedStorage, server: sharedServer });
await Promise.all([tabOne.client.claimGuestCartForUser({ id: 1 }), tabTwo.client.claimGuestCartForUser({ id: 1 })]);
assert.equal(sharedServer.items[0].quantity, 5);
assert.equal([...tabOne.requests, ...tabTwo.requests].filter((method) => method === "POST").length, 1);
f = fixture({ fetcher: async (_url, init, server, storage) => {
  if (init.method === "POST") {
    storage.set(guestKey, JSON.stringify([item(1, 3), item(6, 1)]));
    server.items = JSON.parse(init.body).items;
  }
  return Response.json({ ok: true, data: { cart: { items: server.items } } });
} });
f.storage.set(guestKey, initialGuest);
await f.client.claimGuestCartForUser({ id: 1 });
assert.deepEqual(quantities(JSON.parse(f.storage.get(guestKey))), { 1: 1, 6: 1 }, "Guest additions during transfer must survive");
console.log("PASS: cross-tab serialization and preservation of guest additions during transfer");
