// Runs real layout handlers with an isolated, transactional database fixture.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
let state = {
  banner: [
    { id: "b1", title: "بنر اول", active: true, sortOrder: 1, images: { urls: [], showOnHome: true, showOnProducts: true, homeSortOrder: 1, productSortOrder: 1 } },
    { id: "b2", title: "بنر دوم", active: true, sortOrder: 3, images: { urls: [], showOnHome: true, showOnProducts: true, homeSortOrder: 3, productSortOrder: 3 } },
  ],
  showcase: [{ id: "s1", title: "ویترین اول", active: true, sortOrder: 2 }, { id: "s2", title: "ویترین دوم", active: true, sortOrder: 4 }],
  brandGroup: [{ id: "g1", title: "برندها", active: true, sortOrder: 2 }],
  categoryGroup: [], category: [], brand: [],
};
let transactions = 0, invalidations = 0, fail = false, release, entered;
let gate = null;
function client(readState) {
  return Object.fromEntries(Object.keys(state).map((name) => [name, {
    findMany: async (args) => readState()[name].filter((item) => !args?.where?.id?.in || args.where.id.in.includes(item.id)),
    findFirst: async () => null,
    update: async ({ where, data }) => {
      const record = readState()[name].find((item) => item.id === where.id);
      Object.assign(record, data);
      if (name === "banner" && gate) { entered(); await gate; }
      return record;
    },
    updateMany: async ({ where, data }) => {
      if (fail && name === "showcase") throw new Error("fixture transaction failure");
      const record = readState()[name].find((item) => item.id === where.id);
      if (record) Object.assign(record, data);
      return { count: record ? 1 : 0 };
    },
  }]));
}
const db = client(() => state);
db.$transaction = async (run) => {
  transactions++;
  const draft = structuredClone(state);
  const result = await run(client(() => draft));
  state = draft;
  return result;
};
const mocks = {
  "@/lib/prisma": { prisma: db },
  "@/lib/api/auth": { requireAdmin: async () => ({ ok: true, user: { id: 1, role: "superadmin" } }) },
  "@/lib/api/rate-limit": { rateLimit: () => null },
  "@/lib/api/catalog-cache": { invalidateCatalogCache: async () => { invalidations++; } },
  "@/lib/api/catalog-service": {},
  "@/lib/api/read-retry": { readWithRetry: (read) => read() },
};
const context = vm.createContext({ console: { ...console, error: () => {} }, URL, URLSearchParams, Request, Response, Date, setTimeout, clearTimeout });
const modules = new Map();
function load(file) {
  const absolute = path.resolve(file);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const module = { exports: {} };
  modules.set(absolute, module);
  const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = (name) => mocks[name] ?? (name.startsWith("@/") ? load(`${name.slice(2)}.ts`)
    : name.startsWith(".") ? load(`${path.resolve(path.dirname(absolute), name)}.ts`) : require(name));
  vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename: absolute })(localRequire, module, module.exports);
  return module.exports;
}
const { compareStorefrontEntries, moveStorefrontEntry } = load("lib/storefront-order.ts");
const tied = [{ id: "a", type: "showcase", sortOrder: 1 }, { id: "b", type: "banner", sortOrder: 1 }, { id: "c", type: "showcase", sortOrder: 1 }];
assert.equal(tied.slice().reverse().sort(compareStorefrontEntries).map((item) => item.id).join(), "a,b,c");
assert.equal(moveStorefrontEntry(tied, 2, 1).map((item) => item.id).join(), "c,a,b");
const api = load("app/api/admin/[...path]/route.ts");
const params = { params: Promise.resolve({ path: ["catalog", "storefront"] }) };
const get = async () => (await (await api.GET(new Request("http://localhost/api/admin/catalog/storefront"), params)).json()).data.storefront;
const put = (storefront) => api.PUT(new Request("http://localhost/api/admin/catalog/storefront", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storefront }) }), params);
const original = await get();
assert.equal(original.showcases.map((item) => item.id).join(), "b1,s1,b2,s2");
const next = structuredClone(original);
next.showcases = moveStorefrontEntry(next.showcases, 3, 1).map((item, index) => ({ ...item, sortOrder: index + 1 }));
const started = new Promise((resolve) => { entered = resolve; });
gate = new Promise((resolve) => { release = resolve; });
const saving = put(next);
await started;
assert.equal((await get()).showcases.map((item) => item.id).join(), "b1,s1,b2,s2", "Readers must never see a partially saved mixed layout");
gate = null;
release();
assert.equal((await saving).status, 200);
assert.equal(transactions, 1);
assert.equal(invalidations, 1);
assert.equal((await get()).showcases.map((item) => item.id).join(), "s2,b1,s1,b2");
assert.equal((await get()).home.map((item) => item.id).join(), original.home.map((item) => item.id).join(), "Other pages must retain their order");
const persisted = JSON.stringify(state);
fail = true;
assert.equal((await put(original)).status, 500);
assert.equal(JSON.stringify(state), persisted, "A failed save must roll back banners and showcases together");
assert.equal(invalidations, 1, "Failed writes must not publish a new catalog revision");
fail = false;
for (let i = 0; i < 3; i++) await get();
assert.equal(JSON.stringify(state), persisted, "Refreshing/reading must never rewrite order");
console.log("PASS: mixed global positions, stable tie order, atomic layout writes, concurrent readers, rollback, independent page order, read-only refreshes");
