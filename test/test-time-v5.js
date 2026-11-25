'use strict';
// Kiểm thử V5.2: MC chỉnh thời gian câu hỏi mà không mất điểm sĩ tử (Node >= 22)
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const port=18944,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-time-'));const PASS='test-admin-password-strong';
const app=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json')}});
const url='http://127.0.0.1:'+port;
async function wait(){for(let i=0;i<80;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('no start')}
async function post(p,body,cookie){const r=await fetch(url+p,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});return {data:await r.json(),cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(cookie){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,cookie?{headers:{Cookie:cookie}}:undefined);const q=[];let waiters=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state'){if(m.eid)ws.__eid=m.eid;const q=(m.my&&m.my.self&&m.my.self.q)||m.q;if(q&&q.qid)ws.__qid=q.qid};q.push(m);waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};
 return {ready:new Promise(r=>ws.onopen=r),send:m=>{if(m.type==='answer'||m.type==='self_skip'){const go=()=>ws.send(JSON.stringify({eid:ws.__eid,sid:'s'+Math.random().toString(36).slice(2),...m,qid:m.qid===undefined?ws.__qid:m.qid}));if(m.qid===undefined||!ws.__eid)setTimeout(go,60);else go();return}ws.send(JSON.stringify(m))},next:(p,label)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+label)),5000);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})}),close:()=>ws.close()}}
(async()=>{try{await wait();
 const a=await post('/api/login',{role:'admin',password:PASS});const room=(await post('/api/rooms',{title:'Thử thời gian',mcUser:'mctime',password:'password-test-0123'},a.cookie)).data;const pin=room.pin;
 const mc=await post('/api/login',{role:'mc',pin,user:'mctime',password:'password-test-0123'});
 const c=client(mc.cookie);await c.ready;let w=c.next(m=>m.type==='state','state');c.send({type:'host_auth',pin});await w;
 const p=client();await p.ready;w=p.next(m=>m.type==='state','pstate');p.send({type:'join',pin,name:'Sĩ tử B'});await w;
 w=c.next(m=>m.type==='state'&&m.bank?.[0]?.t===45,'t45');c.send({type:'set_time',t:45});await w;console.log('PASS đặt thời gian câu hiện tại = 45 giây');
 w=c.next(m=>m.type==='state'&&m.phase==='running','run');c.send({type:'start',t:12});let s=await w;assert.equal(s.q.t,12);console.log('PASS mở câu với thời gian MC chọn = 12 giây');
 w=p.next(m=>m.type==='answered','ans');p.send({type:'answer',choice:s.bank[0].c});await w;
 w=c.next(m=>m.type==='state'&&m.q?.extra===10,'ext10');c.send({type:'extend',add:10});s=await w;assert.equal(s.q.t,12);assert.ok(Math.abs(s.q.deadline-s.startedAt-22000)<5||s.q.deadline>Date.now()+15000);console.log('PASS cộng thêm 10 giây khi đang thi → hạn nộp 22 giây, thang điểm tốc độ giữ 12 giây (L01)');
 w=c.next(m=>m.type==='state'&&m.bank.slice(1).every(q=>q.t===30),'all30');c.send({type:'set_time',t:30,all:true});s=await w;assert.equal(s.bank[0].t,12);console.log('PASS áp dụng 30 giây cho tất cả câu (câu đang chạy giữ nguyên)');
 w=c.next(m=>m.type==='state'&&m.phase==='reveal','rev');c.send({type:'reveal'});s=await w;const sc=s.leaderboard[0].score;assert.ok(sc>0);
 w=c.next(m=>m.type==='state'&&m.bank[0].t===60,'t60');c.send({type:'set_time',t:60});s=await w;assert.equal(s.leaderboard[0].score,sc);console.log('PASS đổi thời gian không làm mất điểm sĩ tử:',sc);
 w=c.next(m=>m.type==='error','err');c.send({type:'set_time',t:999});console.log('PASS chặn thời gian sai:',(await w).message);
 c.close();p.close();
}catch(e){console.error('FAIL',e);process.exitCode=1}finally{app.kill()}})();
