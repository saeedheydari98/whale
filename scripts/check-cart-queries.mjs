// Route/query regression checks with an isolated database double; no live data is accessed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const calls = [];
const profile = { id: 'profile-1', userId: 1, firstName: '\u0633\u0639\u06cc\u062f', lastName: '\u062d\u06cc\u062f\u0631\u06cc', phone: '09123456789', email: 'test@example.com', address: 'address', isAdminUnlocked: false };
let user = { id: 1 }, existingCart = true, existingProfile = true, failInsert = false;
let rows = [];
const lazy = (run) => ({ then: (resolve, reject) => Promise.resolve().then(run).then(resolve, reject) });
const db = {
  cart: {
    findUnique: async (args) => { calls.push('cart-items'); assert.ok(args.select.items); return { items: rows }; },
    findFirst: async (args) => { calls.push('cart-target'); assert.deepEqual(args.where, { status: 'active', profile: { userId: 1 } }); assert.deepEqual(args.select, { id: true, profile: true }); return existingCart ? { id: 'cart-1', profile } : null; },
    upsert: async (args) => { calls.push('cart-create'); assert.deepEqual(args.select, { id: true }); existingCart = true; return { id: 'cart-1' }; },
  },
  customerProfile: {
    findFirst: async () => { calls.push('profile-read'); return existingProfile ? profile : null; },
    create: async () => { calls.push('profile-create'); existingProfile = true; return profile; },
    update: async ({ data }) => { calls.push('profile-update'); return { ...profile, ...data }; },
  },
  product: { findMany: async () => { calls.push('stock'); return [1,2].map(id => ({ id, active: true, isActive: true, isAvailable: true, stockQuantity: 5, colorStock: { red: 3, blue: 2 } })); } },
  cartItem: {
    findMany: async () => { calls.push('items-read'); return rows; },
    deleteMany: () => lazy(() => { calls.push('delete'); rows = []; return { count: 1 }; }),
    createManyAndReturn: ({ data }) => lazy(() => { calls.push('insert-returning'); if (failInsert) throw new Error('fixture insertion failure'); rows = data.map((item, i) => ({ ...item, id: `row-${i}` })); return [...rows].reverse(); }),
  },
  $transaction: async (operations) => {
    calls.push('batch'); assert.ok(Array.isArray(operations), 'Do not reintroduce an interactive transaction');
    const previous = structuredClone(rows);
    try { const result = []; for (const operation of operations) result.push(await operation); return result; }
    catch (error) { rows = previous; throw error; }
  },
};
const cache = new Map();
function load(file) {
  const resolved = path.resolve(file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const module = { exports: {} }; cache.set(resolved, module);
  const source = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = (id) => {
    if (id === '@/lib/prisma') return { prisma: db };
    if (id === '@/lib/api/auth') return { getAuthUser: async () => { calls.push('auth'); return user; } };
    if (id === '@/lib/api/rate-limit') return { rateLimit: () => null };
    if (id === '@/lib/api/checkout-service') return {};
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
    if (id.startsWith('.')) return load(path.resolve(path.dirname(resolved), id + '.ts'));
    return require(id);
  };
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  return module.exports;
}
const service = load('lib/api/catalog-service.ts');
const route = load('app/api/cart/route.ts');
const submit = async (body) => { const response = await route.POST(new Request('http://localhost/api/cart', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })); return { status: response.status, body: await response.json() }; };
const item = { productId: 1, title: 'Product', description: '', price: '1000', selectedColors: { red: 2, blue: 1 }, quantity: 3 };
let result = await submit({ profile, items: [item, { ...item, productId: 2 }] });
assert.equal(result.status, 200);
assert.deepEqual(result.body.data.cart.items.map(row => row.productId), [1,2], 'RETURNING order must be restored');
assert.deepEqual(result.body.data.cart.items[0].selectedColors, { red: 2, blue: 1 });
assert.deepEqual(calls, ['auth', 'stock', 'cart-target', 'batch', 'delete', 'insert-returning'], 'Existing cart writes must avoid profile reloads, item reads and cart upserts');
calls.length = 0;
result = await submit({ items: [{ ...item, selectedColors: { red: 99 } }] });
assert.equal(result.body.data.cart.items[0].quantity, 3, 'Stock must remain clamped on the server');
calls.length = 0;
const before = structuredClone(rows);
result = await submit({ items: [{ ...item, productId: 99 }] });
assert.equal(result.status, 409);
assert.deepEqual(rows, before);
assert.deepEqual(calls, ['auth', 'stock'], 'Rejected stock must not write anything');
failInsert = true;
const originalError = console.error; console.error = () => {};
try { result = await submit({ items: [item] }); } finally { console.error = originalError; }
assert.equal(result.status, 500); assert.deepEqual(rows, before, 'Failed insertion must roll back deletion'); failInsert = false;
result = await submit({ items: [] }); assert.equal(result.status, 200); assert.deepEqual(result.body.data.cart.items, []);
calls.length = 0;
await service.getOrCreateActiveCart(1);
assert.deepEqual(calls, ['cart-target', 'items-read'], 'GET must read existing carts without upserting them');
existingCart = false; existingProfile = false; calls.length = 0;
await service.getOrCreateActiveCartTarget(1);
assert.deepEqual(calls, ['cart-target', 'profile-read', 'profile-create', 'cart-create']);
user = null; calls.length = 0;
result = await submit({ items: [item] }); assert.equal(result.status, 400);
result = await submit({ profile, items: [item] }); assert.equal(result.status, 200);
calls.length = 0;
const guestGet = await route.GET(new Request('http://localhost/api/cart?phone=09123456789'));
assert.equal(guestGet.status, 200);
assert.ok(!calls.includes('cart-create') && !calls.includes('profile-create'), 'Guest reads must not write an empty cart');
calls.length = 0;
const cleared = await route.DELETE(new Request('http://localhost/api/cart', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ profile }) }));
assert.equal(cleared.status, 200);
assert.deepEqual(calls, ['auth', 'profile-read', 'delete'], 'Clearing a cart must not read or upsert its items');
assert.deepEqual(rows, []);
console.log('PASS: lean existing-cart query budget, stock validation/colors, ordered RETURNING, atomic rollback, empty cart, first-use creation and legacy guest profile');
