// Query and validation checks with a mocked database; no real account or database is used.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const queries = [];
const database = {
  $queryRaw: async (query) => {
    queries.push(query);
    if (query.sql.startsWith("SELECT COUNT") || query.sql.includes("SELECT COUNT(*)::int AS total FROM normalized_orders")) return [{ total: 8 }];
    if (query.sql.includes('COALESCE(s."orderCount"')) return [{ id: 2, orderCount: 3, orderTotal: 12000, lastOrderAt: null }];
    return [{ id: "order-2" }];
  },
  user: { findMany: async () => [{ id: 2, name: "کاربر", profiles: [] }] },
};
const cache = new Map();
function load(file) {
  const resolved = path.resolve(file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const module = { exports: {} };
  cache.set(resolved, module);
  const source = ts.transpileModule(fs.readFileSync(resolved, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = (id) => {
    if (id === "@/lib/prisma") return { prisma: database };
    if (id.startsWith("@/")) return load(id.slice(2) + ".ts");
    if (id.startsWith(".")) return load(path.resolve(path.dirname(resolved), id + ".ts"));
    return require(id);
  };
  new Function("require", "module", "exports", source)(localRequire, module, module.exports);
  return module.exports;
}
const { adminListQuerySchema, positiveIdSchema, adminCollectionStructureSchema } = load("lib/api/schemas.ts");
for (const id of [0, -1, "bad", 1.5]) assert.equal(positiveIdSchema.safeParse(id).success, false);
assert.equal(positiveIdSchema.parse("2"), 2);
assert.equal(adminCollectionStructureSchema.safeParse({ collection: "invalid" }).success, false);
for (const bad of [{ limit: 0 }, { limit: 101 }, { limit: 2, offset: -1 }, { limit: 2, direction: "desc;DROP TABLE users" }, { limit: 2, sort: "password" }, { limit: 2, tab: "unknown" }]) {
  assert.equal(adminListQuerySchema.safeParse(bad).success, false);
}
const { readAdminUserPage, readAdminOrderPageIds, countAdminUsers, countAdminOrders, pageMetadata } = load("lib/api/admin-list-pages.ts");
const input = adminListQuerySchema.parse({ limit: 2, offset: 2, q: "ي۱۲%_';DROP TABLE users;--", sort: "orderTotal", direction: "asc" });
const users = await readAdminUserPage(input);
assert.equal(users.users[0].orderCount, 3);
assert.equal(users.total, 8);
assert.equal(users.nextOffset, 3);
assert.ok(queries[0].sql.includes('FROM "users"'));
for (const query of queries) {
  assert.ok(!query.sql.includes("DROP TABLE"), "Search must remain a parameter");
  assert.ok(query.values.some((value) => typeof value === "string" && value.includes("ی12\\%\\_")), "Search preserves Persian normalization and escapes wildcards");
}
queries.length = 0;
const orders = await readAdminOrderPageIds(adminListQuerySchema.parse({ limit: 3, offset: 3, view: "in_person", from: 0, to: 1000, sort: "total" }));
assert.deepEqual(orders.ids, ["order-2"]);
assert.equal(orders.nextOffset, 4);
assert.ok(queries[0].values.includes("in_person"));
assert.equal(queries[0].values.filter((value) => value instanceof Date).length, 2);
assert.deepEqual(pageMetadata(0, 0, 0), { total: 0, nextOffset: null });
assert.deepEqual(pageMetadata(8, 0, 0), { total: 8, nextOffset: null });
assert.deepEqual(pageMetadata(8, 6, 2), { total: 8, nextOffset: null });
queries.length = 0;
assert.equal(await countAdminUsers(input), 8);
assert.equal(queries.length, 1);
assert.ok(queries[0].sql.startsWith("SELECT COUNT"));
queries.length = 0;
assert.equal(await countAdminOrders(adminListQuerySchema.parse({ limit: 1, view: "in_person" })), 8);
assert.equal(queries.length, 1);
assert.ok(queries[0].values.includes("in_person"));
console.log("PASS: bounded paging, validation, parameterized SQL, Persian search, whole-dataset sorting, order filters, page metadata");
