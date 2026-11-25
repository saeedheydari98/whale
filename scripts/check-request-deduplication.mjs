import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import ts from "typescript";

let account = { id: 1 };
let subscription = { endpoint: "https://fcm.googleapis.com/test", toJSON() { return { endpoint: this.endpoint, keys: { auth: "test", p256dh: "test" } }; } };
const storage = new Map();
let calls = [];
let complete;
const context = vm.createContext({
  console, AbortController, Promise, Map, Set, Date,
  window: { isSecureContext: true, Notification: {} },
  Notification: { permission: "granted" },
  navigator: { serviceWorker: { getRegistration: async () => ({ pushManager: { getSubscription: async () => subscription } }) } },
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  fetch: (url, options = {}) => {
    calls.push({ url, options });
    return new Promise((resolve, reject) => {
      complete = () => resolve({ ok: true, json: async () => ({ ok: true, data: { enabled: true } }) });
      options.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    });
  },
});
const modules = new Map();
function load(file) {
  const absolute = path.resolve(file);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const module = { exports: {} }; modules.set(absolute, module);
  const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const require = name => name === "@/lib/auth-client" ? { readCachedAuthUser: () => account } : load(name.replace("@/", "") + ".ts");
  vm.runInContext(`(function(require,module,exports){${code}\n})`, context)(require, module, module.exports);
  return module.exports;
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const cache = load("lib/fetch-json.ts");
const first = cache.fetchJsonDeduped("/api/test", { force: true });
cache.invalidateFetchCache("/api/test");
const second = cache.fetchJsonDeduped("/api/test", { force: true });
assert.equal(calls.length, 1, "Invalidation must not fork an active request");
complete(); await Promise.all([first, second]);
const third = cache.fetchJsonDeduped("/api/test");
assert.equal(calls.length, 2, "Invalidated response must not repopulate the cache");
complete(); await third;
const cancelled = cache.fetchJsonDeduped("/api/private", { force: true });
cache.invalidateFetchCache();
await assert.rejects(cancelled, /aborted/);
console.log("PASS: concurrent forced reads, in-flight invalidation and full cache cancellation");

const push = load("lib/notification-client.ts");
calls = [];
const a = push.restoreBrowserPush(1), b = push.restoreBrowserPush(1);
await tick(); assert.equal(calls.length, 1); complete(); await Promise.all([a, b]);
await push.restoreBrowserPush(1); assert.equal(calls.length, 1, "Settings and receiver must not reattach twice");
push.resetPushRestore(); // Logout detaches on the server but retains the browser subscription.
account = null;
await push.restoreBrowserPush(1); assert.equal(calls.length, 1);
account = { id: 1 };
const login = push.restoreBrowserPush(1); await tick(); assert.equal(calls.length, 2); complete(); await login;
push.setBrowserPushDisabled(true);
push.resetPushRestore();
await push.restoreBrowserPush(1); assert.equal(calls.length, 2, "Explicitly disabled preference survives login");
push.setBrowserPushDisabled(false);
subscription = null;
await push.restoreBrowserPush(1); assert.equal(calls.length, 2, "Login never creates a browser subscription");
const write1 = push.notificationRequest("/api/user/notifications", "PATCH", { ids: ["a"] });
const write2 = push.notificationRequest("/api/user/notifications", "PATCH", { ids: ["a"] });
await tick(); assert.equal(calls.length, 3); complete(); await Promise.all([write1, write2]);
assert.equal(calls[2].options.headers["x-account-id"], "1");
console.log("PASS: single restoration, logout/login retention, explicit opt-out, no implicit subscription and concurrent acknowledgements");
