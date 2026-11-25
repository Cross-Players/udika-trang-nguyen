'use strict';
// Kiểm thử V5.4: MC thêm/sửa/xóa câu hỏi từng chặng khi đang thi – không mất điểm (Node >= 22)
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const port=18955,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-q-'));const PASS='test-admin-password-strong';
const app=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json')}});
const url='http://127.0.0.1:'+port;
async function wait(){for(let i=0;i<80;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('no start')}
async function post(p,body,cookie){const r=await fetch(url+p,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});return {data:await r.json(),cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(cookie){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,cookie?{headers:{Cookie:cookie}}:undefined);let waiters=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state'){if(m.eid)ws.__eid=m.eid;const q=(m.my&&m.my.self&&m.my.self.q)||m.q;if(q&&q.qid)ws.__qid=q.qid};waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};
 return {ready:new Promise(r=>ws.onopen=r),send:m=>{if(m.type==='answer'||m.type==='self_skip'){const go=()=>ws.send(JSON.stringify({eid:ws.__eid,sid:'s'+Math.random().toString(36).slice(2),...m,qid:m.qid===undefined?ws.__qid:m.qid}));if(m.qid===undefined||!ws.__eid)setTimeout(go,60);else go();return}ws.send(JSON.stringify(m))},next:(p,l)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+l)),5000);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})}),close:()=>ws.close()}}
const Q=(stage,text)=>({stage,q:text,a:['A1','B1','C1','D1'],c:1,t:15});
(async()=>{try{await wait();
 const a=await post('/api/login',{role:'admin',password:PASS});const pin=(await post('/api/rooms',{title:'Thử câu hỏi',mcUser:'mcq',password:'password-test-0123'},a.cookie)).data.pin;
 const mc=await post('/api/login',{role:'mc',pin,user:'mcq',password:'password-test-0123'});
 const c=client(mc.cookie);await c.ready;let w=c.next(m=>m.type==='state','s');c.send({type:'host_auth',pin});let s=await w;
 w=c.next(m=>m.type==='state','s');c.send({type:'bank_set',bank:[Q(0,'L1'),Q(0,'L2'),Q(2,'H1'),Q(4,'D1')]});s=await w;
 const p=client();await p.ready;w=p.next(m=>m.type==='state','p');p.send({type:'join',pin,name:'Sĩ tử C'});await w;
 // thi câu 1, trả lời đúng
 w=c.next(m=>m.type==='state'&&m.phase==='running','run');c.send({type:'start'});await w;
 w=p.next(m=>m.type==='answered','a');p.send({type:'answer',choice:1});await w;
 w=c.next(m=>m.type==='state'&&m.phase==='reveal','rev');c.send({type:'reveal'});s=await w;const score=s.leaderboard[0].score;assert.ok(score>0);
 // thêm câu vào chặng 0 (đang thi) → chèn sau L2
 w=c.next(m=>m.type==='state'&&m.bank.length===5,'add');c.send({type:'q_add',q:Q(0,'L3 mới')});s=await w;
 assert.deepEqual(s.bank.map(q=>q.q),['L1','L2','L3 mới','H1','D1']);console.log('PASS thêm câu vào chặng Lớp thầy đồ khi đang thi');
 // thêm 2 câu vào Khảo hạch (chặng chưa có câu)
 w=c.next(m=>m.type==='state'&&m.bank.length===6,'add2');c.send({type:'q_add',q:Q(1,'K1')});s=await w;assert.equal(s.bank[3].q,'K1');console.log('PASS thêm câu vào chặng trống (Khảo hạch) đúng thứ tự');
 // sửa câu Thi Đình
 const di=s.bank.findIndex(q=>q.q==='D1');w=c.next(m=>m.type==='state'&&m.bank[di]?.q==='D1 đã sửa','upd');c.send({type:'q_update',i:di,id:s.bank[di].id,q:{...Q(4,'D1 đã sửa'),t:40}});s=await w;assert.equal(s.bank[di].t,40);console.log('PASS sửa câu Thi Đình');
 // xóa câu Thi Hương
 const hi=s.bank.findIndex(q=>q.q==='H1');w=c.next(m=>m.type==='state'&&!m.bank.some(q=>q.q==='H1'),'del');c.send({type:'q_delete',i:hi,id:s.bank[hi].id});s=await w;console.log('PASS xóa câu Thi Hương');
 // không được sửa/xóa câu đã thi
 w=c.next(m=>m.type==='error','e1');c.send({type:'q_delete',i:0,id:s.bank[0].id});console.log('PASS chặn xóa câu đã thi:',(await w).message);
 w=c.next(m=>m.type==='error','e2');c.send({type:'q_update',i:0,id:s.bank[0].id,q:Q(0,'x')});await w;console.log('PASS chặn sửa câu đã thi');
 assert.equal(s.leaderboard[0].score,score);console.log('PASS điểm giữ nguyên:',score);
 // chạy tiếp đến hết: thứ tự chặng & màn chúc mừng đúng
 const phases=[];for(;;){w=c.next(m=>m.type==='state'&&['ready','intermission','finished'].includes(m.phase),'nx');c.send({type:'next'});let st=await w;
  if(st.phase!=='ready'){phases.push(st.phase);if(st.phase==='finished')break;w=c.next(m=>m.type==='state'&&m.phase==='ready','ready');c.send({type:'next'});await w}
  w=c.next(m=>m.type==='state'&&m.phase==='running','r');c.send({type:'start'});await w;w=c.next(m=>m.type==='state'&&m.phase==='reveal','c');c.send({type:'reveal'});st=await w;phases.push(st.phase)}
 assert.equal(phases.at(-1),'finished');console.log('PASS chạy hết đề sau khi thêm/xóa, các chặng chuyển đúng:',phases.join(' → '));
 c.close();p.close();
}catch(e){console.error('FAIL',e);process.exitCode=1}finally{app.kill()}})();
