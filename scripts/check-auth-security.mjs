// Isolated security regressions: no real database, email delivery, or user sessions.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const secret = "isolated-auth-test-secret-not-used-by-the-application";
const cookieValues = new Map();
const cookieOptions = new Map();
const env = { NODE_ENV: "production" };
let user;
let otp;
let sentCode;
let beforeRotation;
const cookieStore = {
  get: (name) => cookieValues.has(name) ? { value: cookieValues.get(name) } : undefined,
  set: (name, value, options) => { cookieValues.set(name, value); cookieOptions.set(name, options); },
  delete: (name) => cookieValues.delete(name),
};
const db = {
  $queryRaw: async (_sql, id) => user?.id === id ? [{ ...user }] : [],
  $transaction: async (run) => run(db),
  user: {
    findUnique: async () => ({ ...user }),
    findMany: async () => [{ ...user }],
    update: async ({ data }) => { Object.assign(user, data); return { ...user }; },
    updateMany: async ({ where, data }) => {
      beforeRotation?.();
      beforeRotation = undefined;
      if (user.id !== where.id || user.refreshTokenHash !== where.refreshTokenHash) return { count: 0 };
      Object.assign(user, data);
      return { count: 1 };
    },
  },
  customerProfile: { findFirst: async () => null, findMany: async () => [] },
  authOtp: {
    findFirst: async () => otp,
    create: async ({ data }) => { otp = { id: "otp", attempts: 0, consumedAt: null, createdAt: new Date(), ...data }; return otp; },
    updateMany: async ({ where, data }) => {
      if (where.id === otp?.id && otp.consumedAt === null) { Object.assign(otp, data); return { count: 1 }; }
      return { count: 0 };
    },
  },
};
const mocks = {
  "next/headers": { cookies: async () => cookieStore },
  "@/lib/prisma": { prisma: db },
  "@/lib/env": {
    authSecret: () => secret,
    runtimeEnv: (name) => name === "AUTH_OTP_EXPOSE_CODE" ? "true" : undefined,
    MissingAuthSecretError: class extends Error {},
  },
  "@/lib/api/rate-limit": { rateLimit: () => null },
  "@/lib/gmail": { sendAuthOtpEmail: async ({ code }) => { sentCode = code; } },
  "@/lib/api/discount-service": { runDiscountRules: async () => undefined },
};
const context = vm.createContext({
  console, Buffer, URL, URLSearchParams, Request, Response, Date, setTimeout, clearTimeout,
  process: { env },
});
const modules = new Map();
function load(file) {
  const absolute = path.resolve(file);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const loadedModule = { exports: {} };
  modules.set(absolute, loadedModule);
  const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = (name) => mocks[name] ?? (name.startsWith("@/") ? load(`${name.slice(2)}.ts`) : require(name));
  vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename: absolute })(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const auth = load("lib/api/auth.ts");
const route = load("app/api/auth/[...path]/route.ts");
const bearerRequest = (token) => new Request("https://store.example/api/auth/me", { headers: { authorization: `Bearer ${token}` } });
const cookieRequest = () => new Request("https://store.example/api/auth/me");
const post = (action, body, token) => route.POST(new Request(`https://store.example/api/auth/${action}`, {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
}), { params: Promise.resolve({ path: [action] }) });
function reset() {
  user = { id: 7, email: "buyer@example.com", username: "09123456789", name: "Buyer", role: "user", avatarUrl: null, refreshTokenHash: null };
  otp = undefined;
  beforeRotation = undefined;
  cookieValues.clear();
  cookieOptions.clear();
}
async function session() {
  const refresh = auth.createRefreshToken(user);
  user.refreshTokenHash = auth.hashToken(refresh);
  const access = auth.createAccessToken(user, user.refreshTokenHash);
  await auth.setAuthCookies(access, refresh);
  return { access, refresh };
}
function rewrite(token, changePayload, changeHeader = (value) => value) {
  const [header, payload] = token.split(".").slice(0, 2).map((part) => JSON.parse(Buffer.from(part, "base64url").toString()));
  const h = Buffer.from(JSON.stringify(changeHeader(header))).toString("base64url");
  const p = Buffer.from(JSON.stringify(changePayload(payload))).toString("base64url");
  return `${h}.${p}.${createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
}
function assertPrivateResponse(data) {
  const serialized = JSON.stringify(data);
  for (const field of ["accessToken", "refreshToken", "refreshTokenHash"]) assert.ok(!serialized.includes(field));
}

reset();
let pair = await session();
assert.ok(auth.verifyAccessToken(pair.access));
assert.ok(auth.verifyRefreshToken(pair.refresh));
assert.equal(auth.verifyAccessToken(pair.refresh), null);
assert.equal(auth.verifyRefreshToken(pair.access), null);
assert.notEqual(auth.createRefreshToken(user), auth.createRefreshToken(user), "Refresh tokens must be unique within one second");
for (const malformed of [null, "", "abc", `${pair.access}.extra`, `${pair.access}x`, ".a.b", "a..b"]) {
  assert.equal(auth.verifyAccessToken(malformed), null);
}
const now = Math.floor(Date.now() / 1000);
for (const patch of [
  { exp: now }, { exp: String(now + 60) }, { exp: now + 100000 }, { iat: now + 100 },
  { sub: "0" }, { sub: "1e1" }, { sub: "9007199254740992" }, { sub: 7 },
  { iss: "another-app" }, { aud: "whale:refresh" }, { type: "refresh" }, { type: undefined }, { sid: undefined },
]) assert.equal(auth.verifyAccessToken(rewrite(pair.access, (p) => ({ ...p, ...patch }))), null);
for (const patch of [{ alg: "none" }, { alg: "HS512" }, { typ: "other" }, { crit: ["custom"] }]) {
  assert.equal(auth.verifyAccessToken(rewrite(pair.access, (p) => p, (h) => ({ ...h, ...patch }))), null);
}
assert.equal((await auth.getAuthUser(bearerRequest(pair.access)))?.id, user.id);
assertPrivateResponse(await auth.getAuthUser(cookieRequest()));
assert.equal(await auth.getAuthUser(bearerRequest(pair.refresh)), null, "A refresh bearer must not fall back to valid cookies");
assert.equal(await auth.getAuthUser(new Request("https://store.example", { headers: { authorization: "Basic invalid" } })), null);
cookieValues.set("accessToken", pair.refresh);
cookieValues.delete("refreshToken");
assert.equal(await auth.getAuthUser(cookieRequest()), null, "Refresh in access cookie must fail");
cookieValues.set("refreshToken", pair.refresh);
cookieValues.set("accessToken", rewrite(pair.access, (p) => ({ ...p, iat: now - 901, exp: now - 1 })));
assert.equal((await auth.getAuthUser(cookieRequest()))?.id, user.id, "Expired access renews from a valid refresh cookie");
assert.ok(auth.verifyAccessToken(cookieValues.get("accessToken")));
assert.equal(cookieValues.get("refreshToken"), pair.refresh, "Automatic access renewal keeps parallel requests valid");
console.log("PASS: strict JWT validation, distinct token types, credential isolation and automatic renewal");

reset();
pair = await session();
assert.equal((await post("refresh-token", undefined, pair.access)).status, 401);
const refreshed = await post("refresh-token", undefined, pair.refresh);
assert.equal(refreshed.status, 200);
assertPrivateResponse(await refreshed.json());
assert.notEqual(cookieValues.get("refreshToken"), pair.refresh);
assert.equal(await auth.getAuthUser(bearerRequest(pair.access)), null, "Rotation revokes previous access token");
assert.equal((await post("refresh-token", undefined, pair.refresh)).status, 401, "Old refresh cannot be replayed");
const currentHash = user.refreshTokenHash;
await auth.revokeAuthSession(bearerRequest(pair.access));
assert.equal(user.refreshTokenHash, currentHash, "Old logout cannot revoke a newer session");
pair = await session();
const results = await Promise.all([post("refresh-token", undefined, pair.refresh), post("refresh-token", undefined, pair.refresh)]);
assert.deepEqual(results.map((r) => r.status).sort(), [200, 401], "Only one concurrent rotation may succeed");
pair = await session();
beforeRotation = () => { user.refreshTokenHash = null; };
assert.equal((await post("refresh-token", undefined, pair.refresh)).status, 401, "Logout during refresh cannot resurrect the session");
pair = await session();
assert.equal((await post("logout")).status, 200);
assert.equal(user.refreshTokenHash, null);
assert.equal(cookieValues.size, 0);
assert.equal(await auth.getAuthUser(bearerRequest(pair.access)), null);
assert.equal(await auth.getAuthUser(bearerRequest(pair.refresh)), null);
assert.equal((await post("refresh-token", undefined, pair.refresh)).status, 401);
cookieValues.set("refreshToken", pair.refresh);
assert.equal(await auth.getAuthUser(cookieRequest()), null, "Revoked refresh cookie cannot renew access");
console.log("PASS: atomic refresh rotation, replay rejection, logout revocation and session races");

reset();
const identity = { phone: user.username, email: user.email, purpose: "login" };
const requested = await post("request-otp", identity);
assert.equal(requested.status, 200);
const requestedData = await requested.json();
assert.ok(sentCode);
assert.ok(!JSON.stringify(requestedData).includes(sentCode), "Production must never disclose OTP even when expose flag is enabled");
assert.equal(requestedData.data.developmentCode, undefined);
const loggedIn = await post("verify-otp", { ...identity, code: sentCode });
assert.equal(loggedIn.status, 200);
const loginData = await loggedIn.json();
assert.equal(loginData.data.user.id, user.id);
assert.equal(loginData.data.profileComplete, false);
assertPrivateResponse(loginData);
for (const name of ["accessToken", "refreshToken"]) {
  assert.ok(cookieValues.get(name));
  const options = cookieOptions.get(name);
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
}
assert.equal(cookieOptions.get("accessToken").maxAge, 900);
assert.equal(cookieOptions.get("refreshToken").maxAge, 2592000);
assert.equal(user.refreshTokenHash, auth.hashToken(cookieValues.get("refreshToken")));
assert.equal((await auth.getAuthUser(cookieRequest()))?.id, user.id);
console.log("PASS: OTP login, cookie-only credentials, production cookie flags and OTP secrecy");
