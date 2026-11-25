'use strict';
// Kiểm thử tải UDIKA: N sĩ tử (mặc định 2000) + MC + màn LED trong 1 phòng, chạy nhiều câu hỏi.
// Chạy: node test/load-test.js 2000   (Node >= 22)
const {spawn,execSync}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const N=Number(process.argv[2]||2000),QUESTIONS=Number(process.argv[3]||3);const port=18990,url='http://127.0.0.1:'+port,PASS='load-admin-password-strong';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-load-'));
const ROUTER=Number(process.env.ROUTER_WORKERS||0);// ROUTER_WORKERS=2 → chạy qua router.js với 2 tiến trình
const app=spawn(process.execPath,[ROUTER?'router.js':'server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),...(ROUTER?{LOCAL_WORKERS:String(ROUTER),WORKER_BASE_PORT:String(port+1)}:{}),ADMIN_PASSWORD:PASS,SESSION_SECRET:'load-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json'),MAX_PLAYERS:String(N+10),MAX_ONLINE:String(N+100),RECONNECT_RESERVE:'100'}});
let out='';app.stdout.on('data',x=>out+=x);app.stderr.on('data',x=>out+=x);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tree=()=>{try{return [app.pid,...execSync(`pgrep -P ${app.pid}`).toString().trim().split(/\s+/).filter(Boolean)].join(',')}catch{return String(app.pid)}};
const rss=()=>{try{return Math.round(execSync(`ps -o rss= -p ${tree()}`).toString().trim().split(/\s+/).reduce((s,x)=>s+Number(x),0)/1024)}catch{return -1}};
const cpu=()=>{try{return execSync(`ps -o time= -p ${tree()}`).toString().trim().split(/\s+/).join(' + ')}catch{return '?'}};
async function wait(){for(let i=0;i<100;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await sleep(100)}throw Error('server not ready '+out)}
async function post(p,b,c){const r=await fetch(url+p,{method:'POST',headers:{'Content-Type':'application/json',...(c?{Cookie:c}:{})},body:JSON.stringify(b)});return {data:await r.json(),cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
let PIN='';function client(cookie){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws${PIN?'?pin='+PIN:''}`,cookie?{headers:{Cookie:cookie}}:undefined);const c={ws,last:null,handlers:[],msgs:0};
 ws.onmessage=e=>{c.msgs++;const m=JSON.parse(e.data);if(m.type==='presence'){c.lastPres=m;return}c.last=m;if(m.type==='state'){if(m.eid)c.eid=m.eid;if(m.q&&m.q.qid)c.qid=m.q.qid}c.handlers=c.handlers.filter(h=>!h(m))};
 c.ready=new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});c.send=m=>ws.send(JSON.stringify(m));
 c.when=(pred,ms=30000)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('timeout')),ms);c.handlers.push(m=>{if(pred(m)){clearTimeout(t);r(m);return true}return false})});return c}
const pct=(a,p)=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p/100*s.length))]};
(async()=>{const report=[];const log=s=>{console.log(s);report.push(s)};
try{await wait();
 const a=await post('/api/login',{role:'admin',password:PASS});const pin=(await post('/api/rooms',{title:'Kiểm thử tải',mcUser:'mcload',password:'password-load-0123'},a.cookie)).data.pin;PIN=pin;
 const mcl=await post('/api/login',{role:'mc',pin,user:'mcload',password:'password-load-0123'});
 const mc=client(mcl.cookie);await mc.ready;let w=mc.when(m=>m.type==='state');mc.send({type:'host_auth',pin});await w;
 const led=client();await led.ready;w=led.when(m=>m.type==='state');led.send({type:'watch',pin});await w;
 log(`== UDIKA kiểm thử tải: ${N} sĩ tử trong 1 phòng, ${QUESTIONS} câu${ROUTER?` · qua router.js với ${ROUTER} tiến trình`:' · 1 tiến trình server.js'} · máy thử ${os.cpus().length} nhân CPU, ${Math.round(os.totalmem()/2**30)} GB RAM, Node ${process.version} ==`);
 // ghi danh theo từng đợt 200 người
 const players=[],expect=[];let t0=Date.now(),failed=0;
 for(let i=0;i<N;i+=200){const batch=[];for(let k=i;k<Math.min(N,i+200);k++){const c=client();players.push(c);batch.push(c.ready.then(()=>{const p=c.when(m=>m.type==='state');c.send({type:'join',pin,name:'Sĩ tử '+(k+1)});return p}).catch(()=>{failed++}))}await Promise.all(batch)}
 log(`Ghi danh: ${N-failed}/${N} thành công trong ${((Date.now()-t0)/1000).toFixed(1)} giây · RAM máy chủ ${rss()} MB`);
 await sleep(1500);log(`Màn LED thấy sĩ số: ${led.last.count}`);
 for(let q=0;q<QUESTIONS;q++){
  const tStart=Date.now();const gotRun=players.map(c=>c.when(m=>m.type==='state'&&m.phase==='running').then(()=>Date.now()-tStart).catch(()=>-1));
  w=mc.when(m=>m.type==='state'&&m.phase==='running');mc.send({type:q===0?'start':'start',t:20});const st=await w;const correct=st.bank[st.idx].c;
  const lat=await Promise.all(gotRun);const okRun=lat.filter(x=>x>=0);
  log(`Câu ${q+1}: đề tới ${okRun.length}/${N} máy · độ trễ p50 ${pct(okRun,50)} ms, p95 ${pct(okRun,95)} ms, tối đa ${Math.max(...okRun)} ms`);
  // mọi người trả lời rải trong 4 giây
  const tAns=Date.now();const acks=players.map((c,i)=>{const delay=Math.random()*4000;return sleep(delay).then(()=>{const s=Date.now();const p=c.when(m=>m.type==='answered',15000).then(()=>Date.now()-s).catch(()=>-1);const good=Math.random()<.6;expect[i]=(expect[i]||0)+(good?1:0);c.send({type:'answer',qid:c.qid,eid:c.eid,sid:'s'+i+'-'+q,choice:good?correct:(correct+1)%st.q.a.length});return p})});
  const al=(await Promise.all(acks)).filter(x=>x>=0);
  log(`  Nộp bài: ${al.length}/${N} được ghi nhận · phản hồi p50 ${pct(al,50)} ms, p95 ${pct(al,95)} ms · trong ${((Date.now()-tAns)/1000).toFixed(1)} giây`);
  await sleep(1200);const pres=mc.lastPres||{};log(`  MC thấy đã nộp: ${pres.answered}/${N} · trực tuyến ${pres.online}/${pres.count}`);
  const tRev=Date.now();const gotRev=players.map(c=>c.when(m=>m.type==='state'&&['reveal','intermission','finished'].includes(m.phase)&&m.my).then(()=>Date.now()-tRev).catch(()=>-1));
  mc.send({type:'reveal'});const rl=(await Promise.all(gotRev)).filter(x=>x>=0);{const bytes=players[0].lastLen||0;}
  log(`  Công bố: tới ${rl.length}/${N} máy · p95 ${pct(rl,95)} ms · RAM ${rss()} MB · CPU tích lũy ${cpu()}`);
  if(q<QUESTIONS-1){w=mc.when(m=>m.type==='state'&&['ready','intermission'].includes(m.phase));mc.send({type:'next'});let x=await w;if(x.phase==='intermission'){w=mc.when(m=>m.type==='state'&&m.phase==='ready');mc.send({type:'next'});await w}}
 }
 {await sleep(800);const w2=mc.when(m=>m.type==='state');mc.send({type:'set_title',title:'Kiểm thử tải'});const hs=await w2;const byName=new Map(hs.players.map(p=>[p.name,p]));let bad=0;for(let i=0;i<N;i++){const p=byName.get('Sĩ tử '+(i+1));if(!p||p.correct!==(expect[i]||0))bad++}
  log(`Độ chính xác: ${N-bad}/${N} sĩ tử có số câu đúng khớp tuyệt đối với câu trả lời đã gửi · ${bad} sai lệch`);if(bad)process.exitCode=1}
 let closeErr=0,closedOk=0;await Promise.all(players.map(c=>new Promise(r=>{c.ws.onclose=e=>{if(e.code===1000||e.code===1005)closedOk++;else closeErr++;r()};c.ws.onerror=()=>{};try{c.ws.close(1000)}catch{closeErr++;r()};setTimeout(r,5000)})));
 log(`Đóng kết nối: ${closedOk}/${N} đóng đúng chuẩn (mã 1000) · ${closeErr} lỗi đóng`);if(closeErr)process.exitCode=1;
 const top=mc.last.leaderboard?.[0];log(`Bảng vàng: hạng 1 ${top?.name} – ${top?.score} điểm. Máy chủ vẫn hoạt động: ${(await fetch(url+'/health')).ok?'CÓ':'KHÔNG'}`);
}catch(e){log('LỖI: '+e.message);process.exitCode=1}finally{app.kill();fs.writeFileSync(path.resolve(__dirname,'..',process.env.OUT||'KET_QUA_KIEM_THU_TAI.txt'),report.join('\n')+'\n');process.exit()}})();
