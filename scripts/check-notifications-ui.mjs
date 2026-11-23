import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({channel:"chrome",headless:true});
try {
 for (const width of [390,1280]) for (const count of [0,1,2,30]) {
 const context=await browser.newContext({viewport:{width,height:850}});
 let pushEnabled=false, pushWrites=0;
 await context.addInitScript(() => {
   let subscription=null;
   const fakeSubscription={endpoint:"https://fcm.googleapis.com/test",toJSON:()=>({endpoint:"https://fcm.googleapis.com/test",keys:{}}),unsubscribe:async()=>{subscription=null;return true;}};
   const registration={pushManager:{getSubscription:async()=>subscription,subscribe:async()=>{subscription=fakeSubscription;return subscription;}}};
   Object.defineProperty(Notification,"permission",{get:()=>"granted"});
   Notification.requestPermission=async()=>"granted";
   navigator.serviceWorker.getRegistration=async()=>registration;
   navigator.serviceWorker.register=async()=>registration;
   Object.defineProperty(navigator.serviceWorker,"ready",{get:()=>Promise.resolve(registration)});
 });
 let measuredLimit=0, structureReady=false;
 const readIds = new Set();
 await context.route("**/api/**", async route => {
 const u=new URL(route.request().url()),p=u.pathname;
 const json=data=>route.fulfill({json:{ok:true,data}});
 if(p==="/api/theme") return json({theme:{primary:"blue",style:"light"}});
 if(p==="/api/app/user") return json({user:{id:1,role:"user",username:"09120000000",email:"test@example.com",themeMode:"light",profile:null},cart:{count:0}});
 if(p==="/api/cart") return json({cart:{items:[]}});
 if(p==="/api/catalog/sync") return route.fulfill({contentType:"text/event-stream",body:": fixture\n\n"});
 if(p==="/api/user/structure") return json({structure:{orders:0,discounts:0,unseenDiscounts:0,walletTransactions:0,unreadNotifications:count}});
 if(p==="/api/user/profile") return json({profile:null});
 if(p==="/api/user/push") {
 if(route.request().method()==="POST") {pushEnabled=true;pushWrites++;return json({});}
 if(route.request().method()==="DELETE") {pushEnabled=false;pushWrites++;return json({});}
 return json({configured:true,enabled:pushEnabled,publicKey:"AQ"});
 }
 if(p==="/api/user/notifications") {
 if(route.request().method()==="PATCH") {
 const {ids}=route.request().postDataJSON();
 assert.ok(ids.length>0 && ids.length<=100);
 ids.forEach(id=>readIds.add(id));
 return json({});
 }
 if(u.searchParams.has("structure")) { await new Promise(r=>setTimeout(r,150));structureReady=true;return json({structure:{count}}); }
 assert.ok(structureReady,"No data before count");
 measuredLimit=Number(u.searchParams.get("limit"));
 assert.ok(measuredLimit>0 && measuredLimit<=count,"Viewport bounded page");
 const offset=Number(u.searchParams.get("offset"));
 await new Promise(r=>setTimeout(r,200));
 const items=Array.from({length:count},(_,i)=>({id:String(i),title:"Fixture notification "+i,body:"Notification body",url:"/panel/user",readAt:readIds.has(String(i))?new Date().toISOString():null})).slice(offset,offset+measuredLimit);
 return json({items,total:count,nextOffset:offset+items.length<count?offset+items.length:null});
 }
 return json({});
 });
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on("pageerror",e=>console.log("PAGE ERROR",e.message));await page.goto("http://localhost:3100/panel/user");
 await page.getByRole("button",{name:/اعلان/}).first().click();
 if(count===0) {
 const toggle=page.getByRole("switch",{name:"اعلان‌های پوش این مرورگر"});
 await toggle.click();
 await toggle.locator('xpath=self::*[@aria-checked="true"]').waitFor();
 assert.equal(pushWrites,1,"Clicking the switch enables push once");
 await page.getByText("اعلان‌های پوش این مرورگر",{exact:true}).click();
 await page.waitForTimeout(300);
 assert.equal(pushWrites,1,"Clicking adjacent text must not send a push mutation");
 assert.equal(await toggle.getAttribute("aria-checked"),"true","Label does not toggle push");
 await toggle.click({position:{x:4,y:14}});
 await toggle.locator('xpath=self::*[@aria-checked="false"]').waitFor();
 assert.equal(pushWrites,2,"Clicking the track outside the thumb disables push once");
 await page.getByText("اعلان‌های پوش این مرورگر",{exact:true}).click();
 await page.waitForTimeout(300);
 assert.equal(pushWrites,2,"Adjacent text must not enable push either");
 assert.equal(await toggle.getAttribute("aria-checked"),"false");
 }
 if(count) await page.getByRole("heading",{name:"Fixture notification 0",exact:true}).waitFor();
 else {await page.getByText("هنوز موردی ثبت نشده است.").waitFor();assert.equal(measuredLimit,0);}
 assert.equal(await page.locator("body").evaluate(e=>e.scrollWidth>window.innerWidth+1),false,"No horizontal overflow");
 if(count) {
 await page.getByText("خوانده‌شده",{exact:true}).first().waitFor();
 assert.ok(readIds.has("0"),"Inbox automatically marks received entries as read");
 assert.equal(await page.getByRole("button",{name:"خواندم",exact:true}).count(),0);
 assert.equal(await page.getByRole("link",{name:"مشاهده مقصد",exact:true}).count(),0);
 const heading=page.getByRole("heading",{name:"Fixture notification 0",exact:true});
 await heading.waitFor({state:"visible"});
 const before=await heading.boundingBox();await page.waitForTimeout(300);
 await heading.waitFor({state:"visible"});
 const after=await heading.boundingBox();
 assert.ok(before && after,"Loaded notification remains visible after read-state refresh");
 assert.ok(Math.abs(before.y-after.y)<1,"Stable loaded geometry");
 }
 await context.close();
 console.log("PASS: notification inbox",width,count);
 }
} finally {await browser.close();}

