'use strict';
/* Kiểm thử TÀI KHOẢN KHÁCH TỰ VẬN HÀNH (multi-tenant):
   UDIKA cấp tài khoản khách kèm gói (số phòng cùng lúc, số sĩ tử/phòng, hạn dùng) → khách tự tạo phòng, cấp/đổi MC, xoá phòng, dùng kho đề riêng;
   dữ liệu tách biệt giữa các khách; hạn mức do MÁY CHỦ kiểm (không tin giao diện); hết hạn/khoá → không tạo phòng mới nhưng vẫn tải được báo cáo cũ. */
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');const PASS='test-admin-password-strong';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results=[],fails=[];const ok=s=>{console.log('PASS',s);results.push(s)};const KEEP=process.env.AUDIT_KEEP_GOING==='1';
async function step(name,fn){try{await fn()}catch(e){fails.push(name);console.log('FAIL',name,'–',String(e.message||e).split('\n')[0]);if(!KEEP)throw e}}
const port=18956,url='http://127.0.0.1:'+port,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-khach-'));
let app;function start(){app=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:String(port),ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json'),DATABASE_URL:''}});let out='';app.stdout.on('data',x=>out+=x);app.stderr.on('data',x=>out+=x);app.out=()=>out}
process.on('exit',()=>{try{app.kill('SIGKILL')}catch{}});
async function wait(){for(let i=0;i<100;i++){if(app.exitCode!=null)throw Error('server thoát: '+app.out());try{if((await fetch(url+'/health')).ok)return}catch{}await sleep(100)}throw Error('server không khởi động')}
async function req(method,p,body,cookie){const r=await fetch(url+p,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const text=await r.text();let data=null;try{data=JSON.parse(text)}catch{}return {status:r.status,data,text,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(cookie){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,cookie?{headers:{Cookie:cookie}}:undefined);let waiters=[];const C={log:[],last:null};
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state')C.last=m;C.log.push(m);waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};
 C.ready=new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});C.raw=m=>ws.send(JSON.stringify(m));C.close=()=>ws.close();
 C.next=(p,l,ms=6000)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+l)),ms);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})});return C}
const login=async(b)=>{const r=await req('POST','/api/login',b);return r.status===200?r.cookie:null};
const hostTry=async(cookie,pin)=>{const c=client(cookie);await c.ready;const w=c.next(m=>m.type==='host_ok'||m.type==='error','host');c.raw({type:'host_auth',pin});const m=await w;return {c,m}};

(async()=>{start();try{await wait();const A=await login({role:'admin',password:PASS});assert.ok(A);
 let K1,K2,t1,t2,r1,r2;
 await step('CAP_TAI_KHOAN',async()=>{
  assert.equal((await req('POST','/api/tenants',{name:'Khách lẻ',login:'x',password:'password-khach-01'})).status,403,'chưa đăng nhập Admin không cấp được');
  const a=await req('POST','/api/tenants',{name:'Công ty Sao Mai',login:'saomai',password:'password-saomai-01',maxRooms:2,maxPlayers:12,days:30},A);assert.equal(a.status,201,a.text);t1=a.data;
  const b=await req('POST','/api/tenants',{name:'Trường Lê Lợi',login:'leloi',password:'password-leloi-001',maxRooms:1,maxPlayers:50,expiresAt:'2099-12-31'},A);assert.equal(b.status,201,b.text);t2=b.data;
  assert.equal((await req('POST','/api/tenants',{name:'Trùng',login:'SaoMai',password:'password-saomai-02'},A)).status,409,'tên đăng nhập trùng (không phân biệt hoa thường)');
  assert.equal(await login({role:'owner',login:'saomai',password:'sai-mat-khau-123'}),null,'sai mật khẩu bị từ chối');
  K1=await login({role:'owner',login:'saomai',password:'password-saomai-01'});K2=await login({role:'owner',login:'LeLoi',password:'password-leloi-001'});assert.ok(K1&&K2);
  const s=(await req('GET','/api/session',null,K1)).data.user;assert.equal(s.role,'owner');assert.equal(s.tenant.name,'Công ty Sao Mai');assert.equal(s.tenant.maxRooms,2);
  assert.equal((await req('GET','/api/tenants',null,K1)).status,403,'khách không xem được danh sách khách khác');
  ok('Admin UDIKA cấp tài khoản khách kèm gói (số phòng, số sĩ tử/phòng, hạn dùng); tên đăng nhập không trùng; khách đăng nhập được, không xem được khách khác');
 });
 await step('TU_TAO_PHONG_VA_HAN_MUC',async()=>{
  const a=await req('POST','/api/rooms',{title:'Gala Sao Mai',mcUser:'mc-a',password:'password-mc-a-0001'},K1);assert.equal(a.status,201,a.text);r1=a.data.pin;assert.equal(a.data.tenant,t1.id);
  const b=await req('POST','/api/rooms',{title:'Sao Mai 2',mcUser:'mc',password:'password-mc-b-0001'},K1);assert.equal(b.status,201);
  const c=await req('POST','/api/rooms',{title:'Sao Mai 3',mcUser:'mc',password:'password-mc-c-0001'},K1);assert.equal(c.status,409,'vượt số phòng của gói');assert.match(c.data.error,/tối đa 2 phòng/);
  const d=await req('POST','/api/rooms',{title:'Lê Lợi',mcUser:'mc',password:'password-mc-d-0001'},K2);assert.equal(d.status,201);r2=d.data.pin;
  const l1=(await req('GET','/api/rooms',null,K1)).data.rooms.map(x=>x.pin),l2=(await req('GET','/api/rooms',null,K2)).data.rooms.map(x=>x.pin);
  assert.ok(l1.includes(r1)&&!l1.includes(r2)&&l2.includes(r2)&&!l2.includes(r1),'mỗi khách chỉ thấy phòng của mình');
  assert.equal(l1.length,2);
  ok('Khách tự tạo phòng + MC; máy chủ chặn vượt số phòng cùng lúc của gói (409, báo rõ); mỗi khách chỉ thấy phòng của mình');
 });
 await step('CACH_LY_DIEU_KHIEN',async()=>{
  let x=await hostTry(K1,r2);assert.equal(x.m.type,'error','khách 1 không điều khiển được phòng khách 2');x.c.close();
  x=await hostTry(K1,r1);assert.equal(x.m.type,'host_ok','chủ khách điều khiển được phòng của mình');x.c.close();
  for(const [m,p,b] of [['GET',`/api/rooms/${r2}/report.csv`],['GET',`/api/rooms/${r2}/history`],['GET',`/api/rooms/${r2}/bank`],['PATCH',`/api/rooms/${r2}/mc`,{mcUser:'chiem',password:'password-chiem-0001'}],['DELETE',`/api/rooms/${r2}`]])
   assert.equal((await req(m,p,b,K1)).status,403,m+' '+p+' của khách khác phải bị chặn');
  assert.equal((await req('GET',`/api/rooms/${r1}/report.csv`,null,K1)).status,200);
  ok('Khách KHÔNG điều khiển, đọc đề, tải báo cáo, đổi MC hay xoá phòng của khách khác; với phòng của mình thì được');
 });
 await step('MC_CUA_KHACH',async()=>{
  const M=await login({role:'mc',pin:r1,user:'mc-a',password:'password-mc-a-0001'});assert.ok(M);let x=await hostTry(M,r1);assert.equal(x.m.type,'host_ok');
  const gone=x.c.next(m=>m.type==='error'&&/thay đổi/.test(m.message),'kick');
  assert.equal((await req('PATCH',`/api/rooms/${r1}/mc`,{mcUser:'mc-moi',password:'password-mc-moi-01'},K1)).status,200,'khách tự đổi / thu hồi MC');await gone;
  assert.equal((await req('GET',`/api/rooms/${r1}/bank`,null,M)).status,403,'MC cũ mất quyền ngay');
  assert.equal((await req('DELETE',`/api/rooms/${r1}`,null,await login({role:'mc',pin:r1,user:'mc-moi',password:'password-mc-moi-01'}))).status,403,'MC không được xoá phòng');
  assert.equal((await req('GET','/api/rooms',null,M)).status,403,'MC không xem danh sách phòng của khách');
  ok('Khách tự đổi/thu hồi MC: MC cũ bị ngắt khỏi màn điều khiển và mất quyền ngay; MC không xoá phòng, không xem danh sách phòng');
 });
 await step('KHO_DE_RIENG',async()=>{
  const sv=await req('POST','/api/library',{name:'Đề nội bộ Sao Mai',bank:[{q:'Bí mật Sao Mai',a:['x','y'],c:0,t:20}]},K1);assert.equal(sv.status,200,sv.text);const id=sv.data.id;
  const M2=await login({role:'mc',pin:r2,user:'mc',password:'password-mc-d-0001'});
  assert.ok(!((await req('GET','/api/library',null,K2)).data.items||[]).some(x=>x.id===id),'khách 2 không thấy');assert.ok(!((await req('GET','/api/library',null,M2)).data.items||[]).some(x=>x.id===id),'MC của khách 2 (cùng tên "mc") không thấy');
  assert.notEqual((await req('POST',`/api/library/${id}/load`,{pin:r2},K2)).status,200);
  const Mn=await login({role:'mc',pin:r1,user:'mc-moi',password:'password-mc-moi-01'});assert.ok(((await req('GET','/api/library',null,Mn)).data.items||[]).some(x=>x.id===id),'MC của chính khách dùng chung kho đề của khách');
  assert.equal((await req('POST',`/api/library/${id}/load`,{pin:r1},Mn)).status,200);
  ok('Kho đề riêng theo khách: chủ khách và MC các phòng của khách dùng chung; khách khác (kể cả MC trùng tên "mc") không thấy, không nạp được');
 });
 await step('SO_SI_TU_THEO_GOI',async()=>{
  await req('PATCH',`/api/tenants/${t1.id}`,{maxPlayers:10},A);let n=0,last=null;const cs=[];
  for(let i=0;i<11;i++){const p=client();await p.ready;cs.push(p);const w=p.next(m=>(m.type==='state'&&m.my)||m.type==='error','join');p.raw({type:'join',pin:r1,name:'Sĩ tử '+i});last=await w;if(last.type==='state')n++}
  assert.equal(n,10,'đúng 10 người vào được');assert.equal(last.type,'error');assert.match(last.message,/gói dịch vụ/);cs.forEach(c=>c.close());
  ok('Số sĩ tử mỗi phòng theo gói do máy chủ chặn: gói 10 người → người thứ 11 bị từ chối với thông báo rõ');
 });
 await step('HET_HAN_KHOA',async()=>{
  await req('PATCH',`/api/tenants/${t1.id}`,{expiresAt:'2020-01-01'},A);
  const del=await req('DELETE',`/api/rooms/${r1}`,null,K1);assert.equal(del.status,200,'khách hết hạn vẫn dọn phòng được: '+del.text);
  const c=await req('POST','/api/rooms',{title:'Hết hạn',mcUser:'mc',password:'password-mc-e-0001'},K1);assert.equal(c.status,403);assert.match(c.data.error,/HẾT HẠN/);
  const ar=(await req('GET','/api/archive',null,K1)).data.items;assert.ok(ar.some(a=>a.pin===r1),'khách hết hạn vẫn xem lưu trữ của mình');
  assert.ok(!((await req('GET','/api/archive',null,K2)).data.items).some(a=>a.pin===r1),'khách khác không thấy lưu trữ của khách này');
  let x=await hostTry(await login({role:'owner',login:'saomai',password:'password-saomai-01'}),(await req('GET','/api/rooms',null,K1)).data.rooms[0].pin);assert.equal(x.m.type,'error','hết hạn → không mở màn điều khiển mới');assert.match(x.m.message,/HẾT HẠN/);x.c.close();
  await req('PATCH',`/api/tenants/${t1.id}`,{days:30},A);assert.equal((await req('POST','/api/rooms',{title:'Gia hạn',mcUser:'mc',password:'password-mc-f-0001'},K1)).status,201,'gia hạn → tạo lại được');
  await req('PATCH',`/api/tenants/${t2.id}`,{locked:true},A);x=await hostTry(K2,r2);assert.equal(x.m.type,'error');assert.match(x.m.message,/KHOÁ/);x.c.close();
  assert.equal((await req('GET',`/api/rooms/${r2}/report.csv`,null,K2)).status,200,'bị khoá vẫn tải được báo cáo cũ');
  await req('PATCH',`/api/tenants/${t2.id}`,{locked:false},A);
  ok('Hết hạn: không tạo phòng / mở điều khiển mới, vẫn dọn phòng & xem lưu trữ; gia hạn là dùng lại ngay. Bị khoá: không điều khiển, vẫn tải báo cáo cũ');
 });
 await step('DOI_MAT_KHAU_KHACH',async()=>{
  await req('PATCH',`/api/tenants/${t2.id}`,{password:'password-leloi-moi1'},A);assert.equal((await req('GET','/api/rooms',null,K2)).status,403,'phiên cũ của khách mất hiệu lực');
  assert.ok(await login({role:'owner',login:'leloi',password:'password-leloi-moi1'}));
  ok('UDIKA đổi mật khẩu khách → phiên cũ của khách mất hiệu lực ngay; mật khẩu mới đăng nhập được');
 });
 await step('KHOI_DONG_LAI',async()=>{
  app.kill('SIGTERM');await new Promise(r=>app.once('exit',r));start();await wait();
  const K=await login({role:'owner',login:'saomai',password:'password-saomai-01'});assert.ok(K,'tài khoản khách còn sau khởi động lại');
  const rs=(await req('GET','/api/rooms',null,K)).data.rooms;assert.ok(rs.length>=1&&rs.every(r=>r.tenant===t1.id),'phòng vẫn gắn đúng khách');
  assert.ok((await req('GET','/api/archive',null,K)).data.items.some(a=>a.pin===r1),'lưu trữ còn');
  const page=await fetch(url+'/khach');assert.equal(page.status,200);assert.match(await page.text(),/Cổng khách hàng|CỔNG KHÁCH/);
  ok('Khởi động lại máy chủ: tài khoản khách, gói, phòng gắn khách và lưu trữ còn nguyên; trang /khach phục vụ bình thường');
 });
 console.log(`\nTỔNG: ${results.length} ca đạt, ${fails.length} ca thất bại${fails.length?' ('+fails.join(', ')+')':''}`);process.exit(fails.length?1:0);
}catch(e){console.error('FAIL',e.stack||e);process.exit(1)}})();
