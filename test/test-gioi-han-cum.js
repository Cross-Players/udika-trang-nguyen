'use strict';
// V15 #5: giới hạn kết nối CHUNG cho cả cụm (CLUSTER_MAX_ONLINE) – 3 tiến trình, trần chung 6 điện thoại, dành 1 chỗ cho người vào lại.
// Kiểm: người mới bị chặn khi TỔNG cả cụm chạm trần (dù nút của phòng đó còn trống), người đã ghi danh vẫn vào lại được, /health báo tổng.
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const port=18960,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-cum-'));const PASS='test-admin-password-strong';
const env={...process.env,PORT:String(port),LOCAL_WORKERS:'3',WORKER_BASE_PORT:'18961',ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json'),CLUSTER_MAX_ONLINE:'6',CLUSTER_RESERVE:'1'};
const app=spawn(process.execPath,['router.js'],{cwd:path.resolve(__dirname,'..'),env});let out='';app.stdout.on('data',x=>out+=x);app.stderr.on('data',x=>out+=x);
const url='http://127.0.0.1:'+port;const sleep=ms=>new Promise(r=>setTimeout(r,ms));const ok=s=>console.log('PASS',s);
async function wait(){for(let i=0;i<120;i++){try{const r=await fetch(url+'/health');if(r.ok)return r.json()}catch{}await sleep(150)}throw Error('router not ready')}
async function req(method,p,body,cookie){const r=await fetch(url+p,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await r.json()}catch{}return {status:r.status,data,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(pin){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws?pin=${pin}`);let waiters=[];const C={ws};
 ws.onmessage=e=>{const m=JSON.parse(e.data);waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};C.ready=new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});C.raw=m=>ws.send(JSON.stringify(m));
 C.next=(p,l,ms=8000)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+l)),ms);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})});C.close=()=>new Promise(r=>{ws.onclose=r;ws.close()});return C}
async function join(pin,name,extra={}){const p=client(pin);await p.ready;const w=p.next(m=>(m.type==='state'&&m.my)||m.type==='error','join '+name);p.raw({type:'join',pin,name,...extra});const m=await w;return {p,m}}
(async()=>{try{await wait();const A=await req('POST','/api/login',{role:'admin',password:PASS});
 const pins=[];for(let i=0;i<3;i++){const r=await req('POST','/api/rooms',{title:'Phòng '+i,mcUser:'mc'+i,password:'password-test-0123'},A.cookie);assert.equal(r.status,201,JSON.stringify(r.data));pins.push(r.data.pin)}
 assert.deepEqual(pins.map(p=>Number(p)%3).sort(),[0,1,2]);
 // 5 người (= trần 6 − 1 chỗ dành người vào lại) dồn vào 2 nút
 const P=[];for(let i=0;i<3;i++)P.push(await join(pins[0],'Nút A '+i));for(let i=0;i<2;i++)P.push(await join(pins[1],'Nút B '+i));assert.ok(P.every(x=>x.m.type==='state'));
 await sleep(2600);const h=await (await fetch(url+'/health')).json();assert.equal(h.online,5);assert.equal(h.clusterLimit,6);assert.equal(h.clusterReserve,1);
 ok('/health của bộ định tuyến báo tổng 5 người đang kết nối, trần chung 6, dành 1 chỗ người vào lại');
 const n3=await (await fetch('http://127.0.0.1:18963/health')).json();assert.equal(n3.online,0);assert.deepEqual(n3.cluster,{limit:6,reserve:1,others:5});
 const x=await join(pins[2],'Người mới ở nút C');assert.equal(x.m.type,'error');assert.match(x.m.message,/quá đông/);
 ok('nút C còn trống (0 người) nhưng cả cụm đã 5/6 → người MỚI bị từ chối, thông báo rõ: "'+x.m.message.slice(0,60)+'…"');
 // người đã ghi danh mất mạng → chỗ trống được người mới ở nút C lấy (cụm lại 5/6) → người mới tiếp theo bị chặn, NHƯNG người cũ vào lại được (chỗ dự phòng)
 const me=P[0].m.my;assert.ok(me&&me.id);await P[0].p.close();await sleep(2600);
 const c1=await join(pins[2],'Người mới C1');assert.equal(c1.m.type,'state');P.push(c1);await sleep(2600);
 const c2=await join(pins[2],'Người mới C2');assert.equal(c2.m.type,'error');
 const back=await join(pins[0],'Nút A 0',{playerId:me.id});
 assert.equal(back.m.type,'state',JSON.stringify(back.m).slice(0,200));assert.equal(back.m.my.id,me.id);P[0]=back;
 ok('cụm 5/6: người mới bị chặn, người đã ghi danh mất mạng vào lại ĐƯỢC (đúng người cũ, giữ bài) – chỗ dự phòng hoạt động trên toàn cụm');
 await sleep(2600);const c3=await join(pins[1],'Người mới lúc đầy');assert.equal(c3.m.type,'error');ok('cụm 6/6 → mọi người mới đều bị chặn ở mọi nút');
 // nhả chỗ → người mới vào được
 await P[4].p.close();await P[3].p.close();await P[1].p.close();await sleep(2600);const y=await join(pins[2],'Người mới lúc vắng');assert.equal(y.m.type,'state');ok('khi có người rời (cụm còn 3/6) → người mới ở nút C vào được');
 // bộ định tuyến không gửi tin quá 15 giây → nút chỉ còn giới hạn riêng (không chặn nhầm vì số liệu cũ)
 const forged=await fetch('http://127.0.0.1:18963/api/internal/cluster',{method:'POST',headers:{'x-udika-internal':'abc.def'}});assert.equal(forged.status,403);
 ok('gửi số liệu cụm giả (không có chữ ký) thẳng vào nút → bị từ chối 403');
 console.log('\nKẾT QUẢ: giới hạn kết nối chung cả cụm – ĐẠT');
}catch(e){console.error('FAIL',e);console.error(out.slice(-2000));process.exitCode=1}finally{app.kill('SIGTERM');await sleep(500);fs.rmSync(dir,{recursive:true,force:true})}})();
