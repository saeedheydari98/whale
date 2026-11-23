import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('lib/notifications/dispatch.mjs', 'utf8').replace(/import .*?;\n/, '').replace('export async function', 'async function');
for (const code of [0, 410, 429, 403]) {
 let claimed = false, result, removed = false;
 const job = { id: 'job', attempts: 1, subscriptionId: 'sub', subscription: { userId: 1, endpoint: 'https://example.test', p256dh: 'key', auth: 'auth' }, notification: { userId: 1, id: 'n', title: 't', body: 'b', url: '/' } };
 const prisma = {
  $queryRaw: async (sql,...params) => {
    assert.ok(sql.join('').includes('attempts = 0'), 'First delivery is immediate even if app and database clocks differ');
    assert.deepEqual(params,code === 0 ? ['current-rule','current-rule'] : [null,null]);
    return claimed ? [] : (claimed = true, [{ id: 'job' }]);
  },
  pushDelivery: { findUnique: async () => job, updateMany: async ({ data }) => { result = data; } },
  pushSubscription: { deleteMany: async () => { removed = true; } },
 };
 const context = vm.createContext({ Date, JSON, console, process: { env: { VAPID_PUBLIC_KEY: 'test', VAPID_PRIVATE_KEY: 'test', VAPID_SUBJECT: 'test' } }, async sendBrowserPush(subscription,notification,config) { assert.equal(subscription.userId,1);assert.equal(notification.id,'n');assert.equal(config.publicKey,'test');if (code) throw { statusCode: code }; } });
 vm.runInContext(source + '\nthis.dispatch = dispatchNotifications;', context);
 assert.equal((await context.dispatch(prisma,40000,code === 0 ? {ruleId:'current-rule'} : {})).processed, 1);
 if (code === 410) assert.equal(removed, true);
 else assert.equal(result.status, code === 0 ? 'accepted' : code === 429 ? 'pending' : 'failed');
}
console.log('PASS: shared dispatcher acceptance, expired subscription, retry and terminal failure (no network)');

const sendSource = fs.readFileSync('lib/notifications/send-push.mjs','utf8').replace(/import .*?;\n/, '').replace('export async function','async function');
let sent;
const sendContext = vm.createContext({ JSON, webpush: {sendNotification:async(subscription,payload,options)=>{sent={subscription,payload:JSON.parse(payload),options};}} });
vm.runInContext(sendSource+'\nthis.send = sendBrowserPush;',sendContext);
await sendContext.send({endpoint:'https://fcm.googleapis.com/test',p256dh:'key',auth:'auth'}, {id:'admin-message',title:'Manager message',body:'Body',url:'/panel/user'}, {subject:'mailto:test@example.com',publicKey:'public',privateKey:'private'});
assert.equal(sent.payload.id,'admin-message');
assert.equal(sent.payload.title,'Manager message');
assert.equal(sent.options.vapidDetails.publicKey,'public');
assert.equal(sent.options.TTL,86400);
assert.equal(sent.options.timeout,10000);
console.log('PASS: administrator payload uses the same native push transport and explicit VAPID credentials as the working test');
