import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
 const module = { exports: {} };
 const code = ts.transpileModule(fs.readFileSync(file,"utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 vm.runInNewContext(code, { exports: module.exports, module, require: name => mocks[name] ?? require(name), URL, Date, TextEncoder });
 return module.exports;
}
const { ruleSchema, endpointSchema, readSchema } = load("lib/notification-schemas.ts");
assert.equal(readSchema.safeParse({ids:[]}).success,false);
assert.equal(readSchema.safeParse({ids:["n1","n2"]}).success,true);
assert.equal(readSchema.safeParse({ids:Array(101).fill("n1")}).success,false);
assert.equal(ruleSchema.parse({name:"test",title:"test",body:"test",audienceType:"all"}).url,"/");
const draft = { name: "rule", title: "hello", body: "body", audienceType: "all" };
for (const url of ["//evil.example","/\\evil.example","https://evil.example","/\nevil"]) assert.equal(ruleSchema.safeParse({ ...draft,url }).success,false);
assert.equal(ruleSchema.safeParse({ ...draft,url: "/panel/user" }).success,true);
assert.equal(ruleSchema.safeParse({ ...draft,audienceType: "selected",userIds: [] }).success,false);
for (const url of ["https://127.0.0.1/push","https://fcm.googleapis.com.evil.example/a","http://fcm.googleapis.com/a","https://user:pass@fcm.googleapis.com/a"]) assert.equal(endpointSchema.safeParse(url).success,false);
assert.equal(endpointSchema.safeParse("https://fcm.googleapis.com/fcm/send/test").success,true);
console.log("PASS: audience validation, local destinations and push endpoint SSRF restrictions");
let rule, records = new Map(), deliveries = [];
const users = [
 { id: 1, createdAt: new Date(), orders: [{ subtotal:"500",discountAmount:"100",total:"450" }] },
 { id: 2, createdAt: new Date(0), orders: [] },
];
const db = {
 notificationRule: { findUniqueOrThrow: async () => rule },
 user: { findMany: async ({where}) => users.filter(u => u.id > where.id.gt && (!where.id.in || where.id.in.includes(u.id))) },
 notification: {
 createMany: async ({data}) => { const n=data[0], key=n.ruleId+":"+n.userId; if(records.has(key)) return {count:0};records.set(key,{...n,id:key});return {count:1}; },
 findUniqueOrThrow: async ({where}) => records.get(where.ruleId_userId.ruleId+":"+where.ruleId_userId.userId),
 },
 pushSubscription: { findMany: async ({where}) => where.userId===1 ? [{id:"browser"}] : [] },
 pushDelivery: { createMany: async ({data}) => deliveries.push(...data) },
 $transaction: async fn => fn(db),
};
const { runNotificationRule } = load("lib/api/notification-service.ts",{ "@/lib/prisma": { prisma: db } });
for (const [audienceType,minimumValue,expected] of [["all",1,2],["selected",1,1],["new_users",1,1],["purchase_count",1,1],["purchase_count",2,0],["purchase_amount",400,1],["purchase_amount",401,0],["no_purchase",1,1]]) {
 records=new Map(); deliveries=[]; rule={id:"rule",...draft,audienceType,minimumValue,userIds:[2],lookbackDays:30,active:true,url:"/panel/user"};
 const result=await runNotificationRule("rule");assert.equal(result.created,expected,audienceType);
 assert.equal((await runNotificationRule("rule")).created,0,"Retry must not duplicate inbox entries");
 assert.equal(deliveries.length,[...records.values()].filter(n=>n.userId===1).length);
}
rule.active=false;assert.equal((await runNotificationRule("rule")).created,0);
console.log("PASS: all six audiences, minimum amount after discount, disabled rules, idempotent replay and per-device jobs");
const handlers={},shown=[],opened=[];
const self={ location:{origin:"https://shop.example"}, addEventListener:(name,fn)=>handlers[name]=fn, registration:{showNotification:async(...args)=>shown.push(args)},clients:{matchAll:async()=>[],openWindow:async u=>opened.push(u)} };
const readRequests=[];
vm.runInNewContext(fs.readFileSync("public/notification-worker.js","utf8"),{self,URL,fetch:async(url,options)=>{readRequests.push({url,...options});return {ok:true};}});
let pending;
handlers.push({ data:{json:()=>({title:"hello",body:"world",id:"n1"})},waitUntil:p=>pending=p });await pending;
assert.equal(shown[0][1].tag,"n1");
assert.equal(shown[0][1].dir,"rtl");
assert.equal(shown[0][1].data.id,"n1");
assert.equal(shown[0][1].data.url,"/");
handlers.notificationclick({ notification:{close(){},data:{url:"https://evil.example"}},waitUntil:p=>pending=p });await pending;
assert.equal(opened[0],"https://shop.example/");
assert.equal(readRequests.length,0,"Legacy pushes must not mark the entire inbox read");
handlers.notificationclick({notification:{close(){},data:{id:"n1",url:"/products"}},waitUntil:p=>pending=p});await pending;
assert.deepEqual(JSON.parse(readRequests[0].body),{id:"n1"});
assert.equal(readRequests[0].method,"PATCH");
assert.equal(opened[1],"https://shop.example/products");
console.log("PASS: push rendering, deduplication tag and same-origin click destination");

let attempted=false, failDispatch=false;
const adminRoute=load("app/api/admin/notifications/route.ts",{
 "next/server":{after:()=>{}},
 "@/lib/notifications/dispatch.mjs":{dispatchNotifications:async()=>{attempted=true;if(failDispatch)throw new Error("offline");return {processed:1};}},
 "@/lib/prisma":{prisma:{pushDelivery:{count:async({where})=>where.status?0:1}}},
 "@/lib/api/auth":{requireAdmin:async()=>({ok:true,user:{id:1}})},
 "@/lib/api/rate-limit":{rateLimit:()=>null},
 "@/lib/api/response":{apiOk:data=>data,apiFail:()=>({error:true}),apiServerError:()=>({error:true})},
 "@/lib/api/validation":{parseJsonBody:async()=>({ok:true,data:{id:"rule",action:"run"}})},
 "@/lib/notification-schemas":{},
 "@/lib/api/notification-service":{runNotificationRule:async()=>({created:1})},
});
const runRequest={method:"PATCH",headers:{get:()=>null}};
assert.equal((await adminRoute.PATCH(runRequest)).pushWarning,"");
assert.equal(attempted,true,"Initial push delivery must run before the response");
failDispatch=true;
const offlineResult=await adminRoute.PATCH(runRequest);
assert.equal(offlineResult.created,1,"A push error must preserve the inbox result");
assert.ok(offlineResult.pushWarning,"Do not report push failure as unconditional success");
console.log("PASS: synchronous initial push attempt and visible delivery failure");

