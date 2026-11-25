'use strict';
// Kiểm thử tải nhiều phòng đồng thời (mặc định 2000 + 500 + 500 = 3000 kết nối), có:
//  - trả lời dồn sát giờ (30% nộp trong 1,3 giây cuối),
//  - đợt mất mạng hàng loạt (20% điện thoại rớt kết nối giữa câu, nối lại sau 1–4 giây bằng danh tính cũ rồi mới nộp),
//  - các phòng chuyển câu cùng lúc.
// Kiểm tra chính xác: số câu đúng của TỪNG người khớp tuyệt đối với bài đã được máy chủ xác nhận. Chạy: node test/load-multi.js 2000,500,500 3
const {spawn,execSync}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const SIZES=String(process.argv[2]||'2000,500,500').split(',').map(Number),QN=Number(process.argv[3]||3),T=12;
const port=18991,url='http://127.0.0.1:'+port,PASS='load-admin-password-strong';const dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-multi-'));
// ROUTER_WORKERS=W → chạy qua router.js với W tiến trình server.js; ROUTERS=R → thêm R−1 bộ định tuyến song song (như sau bộ cân bằng tải)
const W=Number(process.env.ROUTER_WORKERS||0),RT=Math.max(1,Number(process.env.ROUTERS||1)),TOTAL=SIZES.reduce((a,b)=>a+b,0);
const baseEnv={...process.env,ADMIN_PASSWORD:PASS,SESSION_SECRET:'load-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json'),MAX_ONLINE:String(TOTAL+500),MAX_PLAYERS:String(Math.max(...SIZES)+50),MAX_ROOMS:'200'};
const EXT=String(process.env.EXT_PORTS||'').split(',').filter(Boolean).map(Number);// EXT_PORTS=… → dùng cụm máy chủ đã chạy sẵn (nhiều tiến trình kiểm thử chạy song song)
const app=EXT.length?{pid:process.pid,kill(){},stdout:{on(){}},stderr:{on(){}}}:spawn(process.execPath,[W?'router.js':'server.js'],{cwd:path.resolve(__dirname,'..'),env:{...baseEnv,PORT:String(port),...(W?{LOCAL_WORKERS:String(W),WORKER_BASE_PORT:String(port+100)}:{})}});
const extra=[];if(!EXT.length)for(let i=1;i<(W?RT:1);i++)extra.push(spawn(process.execPath,['router.js'],{cwd:path.resolve(__dirname,'..'),env:{...baseEnv,PORT:String(port+50+i),NODES:Array.from({length:W},(_,k)=>'http://127.0.0.1:'+(port+100+k)).join(',')}}));
const ports=EXT.length?EXT:[port,...extra.map((_,i)=>port+51+i)];const url0='http://127.0.0.1:'+ports[0];let rr=0;
let out='';app.stdout.on('data',x=>out+=x);app.stderr.on('data',x=>out+=x);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const pids=()=>{if(EXT.length)return String(process.env.SERVER_PIDS||process.pid);let l=[app.pid,...extra.map(x=>x.pid)];try{l=l.concat(execSync(`pgrep -P ${app.pid}`).toString().trim().split(/\s+/).filter(Boolean))}catch{}return l.join(',')};
const rss=()=>{try{return Math.round(execSync(`ps -o rss= -p ${pids()}`).toString().trim().split(/\s+/).reduce((s,x)=>s+Number(x),0)/1024)}catch{return -1}};
async function wait(){for(let i=0;i<100;i++){try{if((await fetch((EXT.length?'http://127.0.0.1:'+EXT[0]:url)+'/health')).ok)return}catch{}await sleep(100)}throw Error('server not ready')}
async function post(p,b,c){const r=await fetch((EXT.length?'http://127.0.0.1:'+EXT[0]:url)+p,{method:'POST',headers:{'Content-Type':'application/json',...(c?{Cookie:c}:{})},body:JSON.stringify(b)});return {data:await r.json(),cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function sock(cookie,pin){const pt=ports[(rr++)%ports.length];const ws=new WebSocket(`ws://127.0.0.1:${pt}/ws${pin?'?pin='+pin:''}`,cookie?{headers:{Cookie:cookie}}:undefined);const c={ws,hs:[]};ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state'){if(m.eid)c.eid=m.eid;if(m.q&&m.q.qid)c.qid=m.q.qid;c.phase=m.phase}c.hs=c.hs.filter(h=>!h(m))};ws.onerror=()=>{};
 c.ready=new Promise((r,j)=>{ws.onopen=r;ws.onclose=()=>j(Error('closed'))});c.send=m=>ws.send(JSON.stringify(m));c.when=(p,ms=30000)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('timeout')),ms);c.hs.push(m=>{if(p(m)){clearTimeout(t);r(m);return true}return false})});return c}
const pct=(a,p)=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p/100*s.length))]};
(async()=>{const report=[];const log=s=>{console.log(s);report.push(s)};let fail=false;
try{await wait();const A=await post('/api/login',{role:'admin',password:PASS});
 log(`== Nhiều phòng đồng thời: ${SIZES.join(' + ')} = ${TOTAL} kết nối · ${QN} câu/phòng · ${T} giây/câu${EXT.length?' · gửi vào cụm máy chủ đang chạy':W?` · ${W} tiến trình server.js sau ${RT} bộ định tuyến`:' · 1 tiến trình'} · máy thử ${os.cpus().length} nhân, ${Math.round(os.totalmem()/2**30)} GB RAM ==`);
 const rooms=[];for(const [k,n] of SIZES.entries()){const pin=(await post('/api/rooms',{title:'Phòng '+(process.env.TAG||'')+(k+1),mcUser:'mc'+(process.env.TAG||'')+k,password:'password-load-0123'},A.cookie)).data.pin;
  const ml=await post('/api/login',{role:'mc',pin,user:'mc'+(process.env.TAG||'')+k,password:'password-load-0123'});const mc=sock(ml.cookie,pin);await mc.ready;let w=mc.when(m=>m.type==='state');mc.send({type:'host_auth',pin});await w;
  w=mc.when(m=>m.type==='state'&&m.autoReveal===false);mc.send({type:'set_option',autoReveal:false});await w;
  w=mc.when(m=>m.type==='state'&&m.bank.length===QN);mc.send({type:'bank_set',bank:Array.from({length:QN},(_,i)=>({q:'Câu '+(i+1),a:['A','B','C','D'],c:i%4,t:T}))});await w;rooms.push({pin,n,mc,players:[],expect:[],k})}
 const t0=Date.now();let jf=0;
 await Promise.all(rooms.map(async R=>{for(let i=0;i<R.n;i+=200){await Promise.all(Array.from({length:Math.min(200,R.n-i)},async(_,j)=>{const k=i+j;const c=sock(null,R.pin);R.players[k]=c;try{await c.ready;const w=c.when(m=>m.type==='joined'),ws_=c.when(m=>m.type==='state');c.send({type:'join',pin:R.pin,name:'P'+R.k+'-'+k});c.id=(await w).playerId;await ws_}catch{jf++}}))}}));
 log(`Ghi danh: ${SIZES.reduce((a,b)=>a+b)-jf}/${SIZES.reduce((a,b)=>a+b)} trong ${((Date.now()-t0)/1000).toFixed(1)} giây · RAM ${rss()} MB`);if(jf)fail=true;
 let totalAcks=0,totalSent=0,reconnects=0,lateRejected=0;
 for(let q=0;q<QN;q++){
  const res=await Promise.all(rooms.map(async R=>{
   const gotRun=R.players.map(c=>c.when(m=>m.type==='state'&&m.phase==='running',15000).catch(()=>null));let w=R.mc.when(m=>m.type==='state'&&m.phase==='running');R.mc.send({type:'start'});const st=await w;await Promise.all(gotRun);
   const correct=st.bank[st.idx].c;const acks=[];
   await Promise.all(R.players.map(async(c,i)=>{const drop=Math.random()<.2,burst=Math.random()<.3;const good=Math.random()<.6;
    if(drop){c.ws.close();reconnects++;await sleep(1000+Math.random()*3000);const n=sock(null,R.pin);R.players[i]=n;n.id=c.id;await n.ready;const jw=n.when(m=>m.type==='state'&&m.my);n.send({type:'join',pin:R.pin,name:'P'+R.k+'-'+i,playerId:c.id});await jw;c=n}
    const delay=burst?(T-1.3)*1000+Math.random()*1100-(Date.now()-st.time):Math.random()*5000;await sleep(Math.max(0,delay));
    const sid='s'+q+'-'+i;const s0=Date.now();totalSent++;const p=c.when(m=>(m.type==='answered'||m.type==='answer_rejected')&&m.sid===sid,15000).catch(()=>null);
    c.send({type:'answer',eid:c.eid,qid:c.qid,sid,choice:good?correct:(correct+1)%4});const r=await p;
    if(r&&r.type==='answered'){totalAcks++;acks.push(Date.now()-s0);R.expect[i]=(R.expect[i]||0)+(good?1:0)}else if(r)lateRejected++}));
   await sleep(Math.max(0,st.q.deadline-Date.now())+1800);
   w=R.mc.when(m=>m.type==='state'&&m.phase!=='running');R.mc.send({type:'reveal'});await w;
   if(q<QN-1){w=R.mc.when(m=>m.type==='state'&&m.phase==='ready');R.mc.send({type:'next'});await w}
   return acks}));
  const all=res.flat();log(`Câu ${q+1}: ${all.length} bài được xác nhận · phản hồi p50 ${pct(all,50)} ms, p95 ${pct(all,95)} ms, tối đa ${Math.max(...all)} ms · RAM ${rss()} MB`);
 }
 log(`Tổng: gửi ${totalSent} bài, máy chủ xác nhận đã lưu ${totalAcks}, từ chối vì quá giờ ${lateRejected} · ${reconnects} lượt mất mạng – nối lại`);
 // kiểm tra chính xác từng người
 await sleep(1000);let bad=0,checked=0;
 for(const R of rooms){const w=R.mc.when(m=>m.type==='state');R.mc.send({type:'set_title',title:'Phòng '+(R.k+1)});const hs=await w;const by=new Map(hs.players.map(p=>[p.name,p]));
  for(let i=0;i<R.n;i++){checked++;const p=by.get('P'+R.k+'-'+i);if(!p||p.correct!==(R.expect[i]||0))bad++}}
 log(`Độ chính xác: ${checked-bad}/${checked} người có số câu đúng khớp tuyệt đối với bài đã xác nhận · ${bad} sai lệch`);if(bad)fail=true;
 let ok=0,er=0;await Promise.all(rooms.flatMap(R=>R.players).map(c=>new Promise(r=>{c.ws.onclose=e=>{(e.code===1000||e.code===1005)?ok++:er++;r()};try{c.ws.close(1000)}catch{er++;r()}setTimeout(r,5000)})));
 log(`Đóng kết nối: ${ok} đúng chuẩn · ${er} lỗi`);if(er)fail=true;
 log(`Máy chủ vẫn hoạt động: ${(await fetch((EXT.length?'http://127.0.0.1:'+EXT[0]:url)+'/health')).ok?'CÓ':'KHÔNG'}`);
}catch(e){log('LỖI: '+e.stack);fail=true}finally{if(fail)process.exitCode=1;app.kill();for(const x of extra)x.kill();fs.writeFileSync(path.resolve(__dirname,'..',process.env.OUT||'KET_QUA_KIEM_THU_NHIEU_PHONG.txt'),report.join('\n')+'\n');process.exit()}})();
