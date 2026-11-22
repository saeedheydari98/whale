import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('lib/notifications/dispatch.mjs', 'utf8').replace(/import .*?;\n/, '').replace('export async function', 'async function');
for (const code of [0, 410, 429, 403]) {
 let claimed = false, result, removed = false;
 const job = { id: 'job', attempts: 1, subscriptionId: 'sub', subscription: { userId: 1, endpoint: 'https://example.test', p256dh: 'key', auth: 'auth' }, notification: { userId: 1, id: 'n', title: 't', body: 'b', url: '/' } };
 const prisma = {
  $queryRaw: async () => claimed ? [] : (claimed = true, [{ id: 'job' }]),
  pushDelivery: { findUnique: async () => job, updateMany: async ({ data }) => { result = data; } },
  pushSubscription: { deleteMany: async () => { removed = true; } },
 };
 const context = vm.createContext({ Date, JSON, console, process: { env: { VAPID_PUBLIC_KEY: 'test', VAPID_PRIVATE_KEY: 'test', VAPID_SUBJECT: 'test' } }, webpush: { setVapidDetails() {}, async sendNotification() { if (code) throw { statusCode: code }; } } });
 vm.runInContext(source + '\nthis.dispatch = dispatchNotifications;', context);
 assert.equal((await context.dispatch(prisma)).processed, 1);
 if (code === 410) assert.equal(removed, true);
 else assert.equal(result.status, code === 0 ? 'accepted' : code === 429 ? 'pending' : 'failed');
}
console.log('PASS: shared dispatcher acceptance, expired subscription, retry and terminal failure (no network)');
