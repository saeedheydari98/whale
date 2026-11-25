import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({channel:'msedge',headless:true});
try {
for (const width of [390,1280]) {
const context=await browser.newContext({viewport:{width,height:900}});
const page=await context.newPage();
const user={id:2,name:'مدیر آزمایشی',username:'09120000002',role:'admin',adminPermissions:{products:true},createdAt:'2026-01-01T00:00:00Z',walletBalance:0,orderCount:0,orderTotal:0,profiles:[]};
const writes=[];
await context.route('**/api/**',async route=>{
 const url=new URL(route.request().url()); const path=url.pathname;
 const json=data=>route.fulfill({json:{ok:true,data}});
 if(path==='/api/theme') return json({theme:{primary:'blue',style:'light'}});
 if(path==='/api/app/user') return json({user:{id:1,role:'superadmin',username:'09176991556'},cart:{count:0}});
 if(path==='/api/catalog/sync') return route.fulfill({contentType:'text/event-stream',body:': fixture\n\n'});
 if(path==='/api/admin/catalog/structure') return json({structure:{users:1,products:0,orders:0,banners:0,showcases:[],categoryGroups:[],brandGroups:[],accessRequests:{pending:0,approved:0,archived:0},storefront:{home:0,categories:0,products:0}}});
 if(path==='/api/admin/collections/structure') return json({structure:{count:1}});
 if(path==='/api/admin/users') return json({users:[user],total:1,nextOffset:null});
 if(path==='/api/admin/security/requests' && route.request().method()==='PATCH') {
 const body=route.request().postDataJSON();writes.push(body);
 user.role=body.action==='revoke'?'user':'admin';user.adminPermissions=body.action==='revoke'?{}:body.adminPermissions;
 return json({request:null});
 }
 return json({});
});
await page.goto('http://localhost:3000/panel/admin');
await page.getByRole('button',{name:'دسترسی‌ها',exact:true}).click();
await page.getByRole('button',{name:'فهرست کاربران',exact:true}).click();
await page.getByRole('button',{name:'ویرایش دسترسی',exact:true}).click();
const modal=page.getByRole('dialog');
await modal.waitFor();
const checked=modal.getByRole('switch', { checked: true });
assert.equal(await checked.count(),1,'Existing product permission must be selected');
await modal.getByRole('button',{name:'ذخیره دسترسی‌ها',exact:true}).click();
await modal.waitFor({state:'hidden'});
assert.equal(writes.length,1);assert.equal(writes[0].adminPermissions.products,true);assert.equal(writes[0].userId,2);
await page.getByRole('button',{name:'لغو دسترسی',exact:true}).click();
await page.getByRole('button',{name:'اعطای دسترسی',exact:true}).waitFor();
assert.equal(writes.length,2);assert.equal(writes[1].action,'revoke');
console.log('PASS '+width+': edit prefilled permissions, one save request, revoke and refreshed user action');
await context.close();
}
} finally {await browser.close();}

