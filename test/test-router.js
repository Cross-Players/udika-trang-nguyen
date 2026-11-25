'use strict';
// Kiểm thử bộ định tuyến nhiều tiến trình: phòng chia đều cho các nút theo mã, admin thấy đủ phòng, MC/sĩ tử/LED vào đúng nút,
// kho đề dùng chung giữa các nút, một nút bị tắt đột ngột → tự khởi động lại, điểm và câu đang mở được giữ.
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const port=18990,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-router-'));const PASS='test-admin-password-strong';
const env={...process.env,PORT:String(port),LOCAL_WORKERS:'3',WORKER_BASE_PORT:'18991',ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json')};
const app=spawn(process.execPath,['router.js'],{cwd:path.resolve(__dirname,'..'),env});let out='';app.stdout.on('data',x=>out+=x);app.stderr.on('data',x=>out+=x);
const url='http://127.0.0.1:'+port;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(){for(let i=0;i<120;i++){try{const r=await fetch(url+'/health');if(r.ok)return r.json()}catch{}await sleep(150)}throw Error('router not ready')}
async function req(method,p,body,cookie){const r=await fetch(url+p,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await r.json()}catch{}return {status:r.status,data,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(pin,cookie){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws?pin=${pin}`,cookie?{headers:{Cookie:cookie}}:undefined);let waiters=[];const C={last:null};
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state')C.last=m;waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};C.ready=new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});C.raw=m=>ws.send(JSON.stringify(m));
 C.next=(p,l,ms=8000)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+l)),ms);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})});C.close=()=>ws.close();return C}
const ok=s=>console.log('PASS',s);
(async()=>{try{const h=await wait();assert.equal(h.nodes.length,3);
 const A=await req('POST','/api/login',{role:'admin',password:PASS});assert.equal(A.status,200);
 const pins=[];for(let i=0;i<6;i++){const r=await req('POST','/api/rooms',{title:'Phòng '+i,mcUser:'mc'+i,password:'password-test-0123'},A.cookie);assert.ok(r.status===200||r.status===201,JSON.stringify(r.data));pins.push(r.data.pin)}
 const byNode=[0,1,2].map(k=>pins.filter(p=>Number(p)%3===k).length);assert.ok(byNode.every(n=>n===2),'phòng chia đều: '+byNode);
 const list=await req('GET','/api/rooms',null,A.cookie);assert.equal(list.data.rooms.length,6);
 ok(`6 phòng chia đều cho 3 tiến trình (${byNode.join('/')}) theo quy tắc mã % 3; Admin thấy đủ 6 phòng qua bộ định tuyến`);
 const play=async(i)=>{const pin=pins[i];const M=await req('POST','/api/login',{role:'mc',pin,user:'mc'+i,password:'password-test-0123'});assert.equal(M.status,200);
  const c=client(pin,M.cookie);await c.ready;let w=c.next(m=>m.type==='state','host');c.raw({type:'host_auth',pin});await w;
  w=c.next(m=>m.type==='state'&&m.bank?.length===2,'bank');c.raw({type:'bank_set',bank:[{q:'Câu 1 phòng '+i,a:['A','B'],c:0,t:30},{q:'Câu 2',a:['A','B'],c:1,t:30}]});await w;
  w=c.next(m=>m.type==='state','opt');c.raw({type:'set_option',autoReveal:false});await w;
  const p=client(pin);await p.ready;w=p.next(m=>m.type==='state'&&m.my,'join');p.raw({type:'join',pin,name:'Sĩ tử '+i});await w;
  const wr=p.next(m=>m.type==='state'&&m.phase==='running','run');w=c.next(m=>m.type==='state'&&m.phase==='running','start');c.raw({type:'start'});await w;const s=await wr;
  const wa=p.next(m=>m.type==='answered'||m.type==='answer_rejected','ans');p.raw({type:'answer',eid:s.eid,qid:s.q.qid,sid:'x'+i,choice:0});assert.equal((await wa).type,'answered');
  w=c.next(m=>m.type==='state'&&m.phase==='reveal','rev');c.raw({type:'reveal'});const rv=await w;assert.ok(rv.leaderboard[0].score>0);assert.equal(rv.nodeIndex,Number(pin)%3);return {pin,c,p,M}};
 const R=[];for(const i of [0,1,2,3,4,5])R.push(await play(i));
 ok('MC, sĩ tử ở cả 6 phòng (3 tiến trình) kết nối WebSocket qua bộ định tuyến, chơi & chấm điểm đúng nút giữ phòng');
 // kho đề: lưu từ phòng ở nút khác 0, nạp vào phòng ở nút khác
 const src=R.find(x=>Number(x.pin)%3===2),dst=R.find(x=>Number(x.pin)%3===1);
 const sv=await req('POST','/api/library',{name:'Bộ đề liên nút',pin:src.pin},src.M.cookie);assert.equal(sv.status,200,JSON.stringify(sv.data));
 const ld=await req('POST',`/api/library/${sv.data.id}/load`,{pin:dst.pin,mode:'append'},A.cookie);assert.equal(ld.status,200,JSON.stringify(ld.data));assert.equal(ld.data.count,4);
 ok('kho đề dùng chung: lưu từ phòng ở nút 2, nạp thêm vào phòng ở nút 1 (giữ điểm)');
 // ===== tài khoản khách tự vận hành khi chạy nhiều nút =====
 {const T=await req('POST','/api/tenants',{name:'Khách cụm',login:'khachcum',password:'password-khach-cum1',maxRooms:3,maxPlayers:10,days:30},A.cookie);assert.equal(T.status,201,JSON.stringify(T.data));
  assert.equal((await req('POST','/api/tenants',{name:'Khách khác',login:'khachkhac',password:'password-khach-khac',maxRooms:3,days:30},A.cookie)).status,201);
  const K=await req('POST','/api/login',{role:'owner',login:'khachcum',password:'password-khach-cum1'});assert.equal(K.status,200);
  const kp=[];for(let i=0;i<3;i++){const r=await req('POST','/api/rooms',{title:'Cụm '+i,mcUser:'mc',password:'password-cum-000'+i},K.cookie);assert.equal(r.status,201,JSON.stringify(r.data));kp.push(r.data.pin)}
  assert.deepEqual(kp.map(p=>Number(p)%3).sort(),[0,1,2],'3 phòng của khách nằm ở 3 nút khác nhau');
  const x4=await req('POST','/api/rooms',{title:'Cụm 4',mcUser:'mc',password:'password-cum-0004'},K.cookie);assert.equal(x4.status,409,'hạn mức số phòng tính trên TOÀN cụm: '+JSON.stringify(x4.data));
  assert.equal((await req('GET','/api/rooms',null,K.cookie)).data.rooms.length,3);assert.equal((await req('GET','/api/session',null,K.cookie)).data.user.tenant.rooms,3,'cổng khách hiện đúng số phòng trên toàn cụm');
  const far=kp.find(p=>Number(p)%3===2),mid=kp.find(p=>Number(p)%3===1);
  const hostTry=async(pin,cookie)=>{const c=client(pin,cookie);await c.ready;const w=c.next(m=>m.type==='host_ok'||m.type==='error','h');c.raw({type:'host_auth',pin});const m=await w;c.close();return m};
  assert.equal((await hostTry(far,K.cookie)).type,'host_ok','chủ khách điều khiển phòng của mình ở nút 2 (sổ khách đã chép sang)');
  const Mf=await req('POST','/api/login',{role:'mc',pin:far,user:'mc',password:'password-cum-000'+kp.indexOf(far)});assert.equal(Mf.status,200);
  const c=client(far,Mf.cookie);await c.ready;let w=c.next(m=>m.type==='state','h');c.raw({type:'host_auth',pin:far});await w;w=c.next(m=>m.type==='state'&&m.bank?.length===1,'b');c.raw({type:'bank_set',bank:[{q:'Đề riêng khách cụm',a:['x','y'],c:0,t:20}]});await w;c.close();
  const sv=await req('POST','/api/library',{name:'Đề khách cụm',pin:far},Mf.cookie);assert.equal(sv.status,200,'MC ở nút 2 lưu kho đề (nút 0): '+JSON.stringify(sv.data));
  assert.ok((await req('GET','/api/library',null,Mf.cookie)).data.items.some(x=>x.id===sv.data.id&&x.mine),'MC thấy đề của khách mình');
  assert.ok((await req('GET','/api/library',null,K.cookie)).data.items.some(x=>x.id===sv.data.id),'chủ khách thấy đề do MC của mình lưu');
  const K2=await req('POST','/api/login',{role:'owner',login:'khachkhac',password:'password-khach-khac'});assert.ok(!(await req('GET','/api/library',null,K2.cookie)).data.items.some(x=>x.id===sv.data.id),'khách khác không thấy');
  const cs=[];let last;for(let i=0;i<11;i++){const p=client(far);await p.ready;cs.push(p);const wj=p.next(m=>(m.type==='state'&&m.my)||m.type==='error','j');p.raw({type:'join',pin:far,name:'Cụm '+i});last=await wj}cs.forEach(p=>p.close());
  assert.equal(last.type,'error','người thứ 11 bị chặn theo gói ở nút 2');
  assert.equal((await req('PATCH','/api/tenants/'+T.data.id,{locked:true},A.cookie)).status,200);const lk=await hostTry(far,K.cookie);assert.equal(lk.type,'error');assert.match(lk.message,/KHOÁ/,'khoá có hiệu lực ngay ở nút 2');
  await req('PATCH','/api/tenants/'+T.data.id,{locked:false},A.cookie);
  assert.equal((await req('DELETE','/api/rooms/'+mid,null,K.cookie)).status,200);assert.ok((await req('GET','/api/archive',null,K.cookie)).data.items.some(a=>a.pin===mid),'lưu trữ gom từ mọi nút');
  assert.equal((await req('POST','/api/rooms',{title:'Cụm 4',mcUser:'mc',password:'password-cum-0004'},K.cookie)).status,201,'xoá phòng → tạo lại được');
  { // chương trình liên hoàn ở nút 0 lấy điểm đội từ phòng quiz ở nút 2 (qua router, có chữ ký)
   await req('PATCH','/api/tenants/'+T.data.id,{maxPlayers:50},A.cookie);const hc=client(far,K.cookie);await hc.ready;let w=hc.next(m=>m.type==='state','h');hc.raw({type:'host_auth',pin:far});await w;w=hc.next(m=>m.type==='state'&&m.teams&&m.teams.length===2,'t');hc.raw({type:'teams_set',names:['Đội Xanh','Đội Đỏ']});const ts=(await w).teams;
   for(const [n,t] of [['Xanh 1',0],['Đỏ 1',1]]){const p=client(far);await p.ready;const j=p.next(m=>m.type==='state'&&m.my,'j');p.raw({type:'join',pin:far,name:n,team:ts[t].id});await j;p.close()}hc.close();
   const ev=(await req('POST','/api/events',{name:'Liên hoàn cụm'},K.cookie)).data;await req('PUT',`/api/events/${ev.id}/teams`,{teams:[{name:'Đội Xanh'},{name:'Đội Đỏ'}]},K.cookie);
   const ac=(await req('POST',`/api/events/${ev.id}/activities`,{name:'Quiz',kind:'quiz',pin:far},K.cookie)).data.activities[0];
   const im=await req('POST',`/api/events/${ev.id}/import`,{act:ac.id},K.cookie);assert.equal(im.status,200,JSON.stringify(im.data));assert.equal(im.data.imported,2)}
  ok('tài khoản khách khi chạy 3 nút: hạn mức số phòng tính trên toàn cụm; chương trình liên hoàn (nút 0) lấy điểm đội từ phòng quiz ở nút 2; chủ khách điều khiển phòng ở nút khác; MC ở nút 2 dùng kho đề riêng của khách (nút 0), khách khác không thấy; số sĩ tử theo gói và lệnh khoá có hiệu lực ở mọi nút; lưu trữ gom từ mọi nút')}
 // tắt đột ngột một nút
 const victim=R.find(x=>Number(x.pin)%3===1);const hh=await (await fetch(url+'/health')).json();const pid=hh.nodes[1].pid;assert.ok(pid);
 const scoreBefore=(await victim.c.next(m=>m.type==='state','s',100).catch(()=>victim.c.last))||victim.c.last;
 process.kill(pid,'SIGKILL');await sleep(400);
 for(let i=0;i<60;i++){const x=await (await fetch(url+'/health')).json().catch(()=>null);if(x&&x.ok&&x.nodes[1].pid!==pid)break;await sleep(250)}
 const M2=await req('POST','/api/login',{role:'mc',pin:victim.pin,user:'mc'+R.indexOf(victim),password:'password-test-0123'});const c2=client(victim.pin,M2.cookie);await c2.ready;const w2=c2.next(m=>m.type==='state','re');c2.raw({type:'host_auth',pin:victim.pin});const st=await w2;
 assert.equal(st.phase,'reveal');assert.ok(st.leaderboard[0].score>0);
 const other=R.find(x=>Number(x.pin)%3===0);const w3=other.c.next(m=>m.type==='state','o');other.c.raw({type:'set_title',title:'vẫn chạy'});await w3;
 ok(`một tiến trình (nút 1) bị tắt đột ngột (kill -9) → bộ định tuyến tự khởi động lại; phòng ${victim.pin} còn nguyên điểm & trạng thái; các phòng ở nút khác không bị ảnh hưởng`);
 for(const x of R){x.c.close();x.p.close()}c2.close();
}catch(e){console.error('FAIL',e);console.error(out.slice(-2000));process.exitCode=1}finally{app.kill('SIGTERM');await sleep(1600)}})();
