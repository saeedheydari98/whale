// Isolated route checks: no connection to the configured database or email service.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const context = vm.createContext({ console, URL, URLSearchParams, Request, Response, Date, setTimeout, clearTimeout });
const modules = new Map();
let admin = true;
let theme = { id: 1, primary: "blue", style: "light" };
let productArgs;
let userArgs;
const db = {
  product: {
    findMany: async (args) => { productArgs = args; return [{ id: 3 }, { id: 2 }]; },
    count: async () => 5,
  },
  user: {
    findMany: async (args) => { userArgs = args; return [{ id: 1 }]; },
    count: async () => 1,
  },
  adminTheme: {
    findFirst: async () => theme,
    update: async ({ data }) => (theme = { ...theme, ...data }),
  },
  $executeRaw: async () => 0,
};
const mocks = {
  "@/lib/prisma": { prisma: db },
  "@/lib/api/auth": { requireAdmin: async () => admin
    ? { ok: true, user: { id: 1, role: "admin" } }
    : { ok: false, response: Response.json({ ok: false }, { status: 403 }) },
  },
  "@/lib/api/rate-limit": { rateLimit: () => null },
  "@/lib/api/read-retry": { readWithRetry: (read) => read() },
};

function load(file) {
  const absolute = path.resolve(root, file);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const module = { exports: {} };
  modules.set(absolute, module);
  const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = (name) => {
    if (mocks[name]) return mocks[name];
    if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
    if (name.startsWith(".")) return load(`${path.resolve(path.dirname(absolute), name)}.ts`);
    return require(name);
  };
  const run = vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename: absolute });
  run(localRequire, module, module.exports);
  return module.exports;
}

const options = load("app/api/admin/orders/in-person/options/route.ts");
const requestOptions = (query) => options.GET(new Request(`http://localhost/api/admin/orders/in-person/options?${query}`));
admin = false;
assert.equal((await requestOptions("kind=products&limit=2")).status, 403);
assert.equal(productArgs, undefined);
admin = true;
for (const query of ["kind=products", "kind=products&limit=0", "kind=products&limit=101", "kind=customers&limit=2&offset=-1"]) {
  assert.equal((await requestOptions(query)).status, 422, query);
}
let payload = await (await requestOptions("kind=products&limit=2&offset=2")).json();
assert.equal(productArgs.take, 2);
assert.equal(productArgs.skip, 2);
assert.equal(productArgs.select.colorStock, true);
assert.equal(payload.data.nextOffset, 4);
assert.equal(payload.data.total, 5);
await requestOptions("kind=products&limit=2&q=3");
assert.ok(productArgs.where.OR.some((clause) => clause.id === 3));
payload = await (await requestOptions("kind=customers&limit=2&q=09121234567")).json();
assert.ok(!userArgs.where.OR.some((clause) => "id" in clause), "Phone must not become an overflowing Postgres integer");
assert.equal(payload.data.nextOffset, null);
assert.equal(userArgs.select.walletBalance, true);
await requestOptions(`kind=customers&limit=2&q=${encodeURIComponent("علی رضایی")}`);
assert.ok(userArgs.where.OR.some((clause) => clause.profiles?.some.OR.some((part) => part.firstName && part.lastName)));
console.log("PASS: options authentication, validation, bounded pages, stock fields, phone/full-name search");

const themeApi = load("app/api/theme/route.ts");
const serverTheme = load("lib/app-theme-server.ts");
await themeApi.GET(new Request("http://localhost/api/theme"));
assert.equal((await serverTheme.loadServerTheme()).primary, "blue");
const saved = await themeApi.POST(new Request("http://localhost/api/theme", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ primary: "red" }),
}));
assert.equal(saved.status, 200);
assert.equal((await saved.json()).data.theme.primary, "red");
assert.equal((await serverTheme.loadServerTheme()).primary, "red", "Favicon must see the saved theme before cache expiry");
console.log("PASS: API theme cache remains active and favicon cache updates immediately on save");
