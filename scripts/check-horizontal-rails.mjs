import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({channel:'msedge',headless:true});
try {
for (const width of [390,900,1600]) {
const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390});
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
const rail=page.getByRole('group',{name:'بخش‌های پنل مدیریت'});
await rail.waitFor();
await page.waitForTimeout(300);
const info=await rail.evaluate(el=>({loop:el.dataset.railLoop,width:el.clientWidth,scroll:el.scrollWidth,buttons:[...el.children].filter(c=>!c.hasAttribute('data-rail-copy')).length}));
assert.equal(await rail.locator('[data-rail-copy] [id]').count(),0);
if(info.loop==='true') {
 const box=await rail.boundingBox();
 if(width===390){
  const client=await context.newCDPSession(page);
  const before=await rail.evaluate(el=>el.scrollLeft);
  const x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let step=1;step<=10;step++) { await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+step*12,y}]});await page.waitForTimeout(25); }
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(150);
  assert.notEqual(await rail.evaluate(el=>el.scrollLeft),before,'Native touch swipe moves the rail');
  await client.detach();
 }
 const initial=await rail.evaluate(el=>el.scrollLeft);
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width/2+150,box.y+box.height/2,{steps:12});
 await page.mouse.up();
 assert.notEqual(await rail.evaluate(el=>el.scrollLeft),initial,'Mouse dragging moves the rail');
 for(let i=0;i<15;i++) { await rail.evaluate(el=>el.scrollLeft-=170); await page.waitForTimeout(20); }
 const end=await rail.evaluate(el=>({left:Math.abs(el.scrollLeft),max:el.scrollWidth-el.clientWidth}));
 assert.ok(end.left>0 && end.left<end.max,'Loop never stays at an endpoint');
 assert.equal(await rail.getByRole('button').count(),info.buttons,'Copies are hidden from accessibility');
 const clicked=await rail.evaluate(el=>{
  const bounds=el.getBoundingClientRect();
  const copy=[...el.querySelectorAll(':scope > [data-rail-copy]')].find(node=>{const b=node.getBoundingClientRect();return b.left>=bounds.left && b.right<=bounds.right;});
  if(!copy) return null;
  const b=copy.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2,label:copy.textContent};
 });
 if(clicked) {
  await page.mouse.click(clicked.x,clicked.y);
  assert.ok(await rail.evaluate((el,label)=>[...el.children].some(node=>!node.hasAttribute('data-rail-copy') && node.textContent===label && node.getAttribute('aria-pressed')==='true'),clicked.label),'Visible copy activates its original tab');
 }

} else assert.ok(info.scroll<=info.width+1,'Fitting tabs must not loop');
if(width===390) assert.ok((await rail.getByRole('button').first().boundingBox()).height<=36,'Compact mobile tabs');
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
console.log('PASS '+width+': compact tabs, overflow-only loop, mouse drag, copy activation, unique accessible controls, save/revoke');
await context.close();
}
} finally {await browser.close();}

