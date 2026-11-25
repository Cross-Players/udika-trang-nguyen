'use strict';
// Kiểm thử V14: dạng câu hỏi mới, thưởng chuỗi, chơi theo đội, loại/chặn/khoá, lọc tên, tự làm bài, kho đề, ảnh/video (Node >= 22)
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const port=18978,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-v14a-'));const PASS='test-admin-password-strong';
const env={...process.env,PORT:String(port),ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json')};
let app=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env});
const url='http://127.0.0.1:'+port;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(){for(let i=0;i<80;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await sleep(100)}throw Error('no start')}
async function req(method,p,body,cookie){const r=await fetch(url+p,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await r.json()}catch{}return {status:r.status,data,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(cookie){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,cookie?{headers:{Cookie:cookie}}:undefined);let waiters=[],log=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state'){if(m.eid)ws.__eid=m.eid;const q=(m.my&&m.my.self&&m.my.self.q)||m.q;if(q&&q.qid)ws.__qid=q.qid};log.push(m);waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};
 return {ready:new Promise(r=>ws.onopen=r),send:m=>{if(m.type==='answer'||m.type==='self_skip'){const go=()=>ws.send(JSON.stringify({eid:ws.__eid,sid:'s'+Math.random().toString(36).slice(2),...m,qid:m.qid===undefined?ws.__qid:m.qid}));if(m.qid===undefined||!ws.__eid)setTimeout(go,60);else go();return}ws.send(JSON.stringify(m))},log,next:(p,l)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+l)),5000);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})}),close:()=>ws.close()}}
const ok=s=>console.log('PASS',s);
(async()=>{try{await wait();
 const A=await req('POST','/api/login',{role:'admin',password:PASS});const pin=(await req('POST','/api/rooms',{title:'Tự công bố',mcUser:'mca',password:'password-test-0123'},A.cookie)).data.pin;
 const M=await req('POST','/api/login',{role:'mc',pin,user:'mca',password:'password-test-0123'});const c=client(M.cookie);await c.ready;let w=c.next(m=>m.type==='state','s');c.send({type:'host_auth',pin});await w;
 w=c.next(m=>m.type==='state'&&m.bank.length===3,'bank');c.send({type:'bank_set',bank:[{q:'1?',a:['A','B'],c:0,t:30},{q:'2?',a:['A','B'],c:0,t:30},{q:'3?',a:['A','B'],c:0,t:30}]});await w;
 const ps=[];for(const n of ['An','Bình']){const p=client();await p.ready;const j=p.next(m=>m.type==='joined','j');p.send({type:'join',pin,name:n});await j;ps.push(p)}
 w=c.next(m=>m.type==='state'&&m.phase==='running','run');c.send({type:'start'});await w;
 const a1=ps[0].next(m=>m.type==='answered','a');ps[0].send({type:'answer',choice:0});await a1;await sleep(2000);
 let s=(await (async()=>{const x=c.next(m=>m.type==='state','st');c.send({type:'set_title',title:'Tự công bố'});return x})());assert.equal(s.phase,'running','còn người chưa trả lời → chưa công bố');
 const t0=Date.now();w=c.next(m=>m.type==='state'&&m.phase==='reveal','auto');const pw=ps[1].next(m=>m.type==='state'&&m.phase==='reveal'&&m.q.answer===0,'p');ps[1].send({type:'answer',choice:1});s=await w;await pw;
 const dt=Date.now()-t0;assert.ok(dt>=1000&&dt<3500,dt);ok(`mọi sĩ tử đã trả lời → tự công bố đáp án sau ${(dt/1000).toFixed(1)} giây (MC không bấm); điện thoại nhận đáp án đúng`);
 // người mất kết nối không làm treo
 w=c.next(m=>m.type==='state'&&m.phase==='ready','n');c.send({type:'next'});await w;ps[1].close();await sleep(300);
 w=c.next(m=>m.type==='state'&&m.phase==='running','run2');c.send({type:'start'});await w;w=c.next(m=>m.type==='state'&&m.phase==='reveal','auto2');ps[0].send({type:'answer',choice:0});await w;ok('sĩ tử đã thoát không làm treo việc tự công bố');
 // MC tắt tự công bố
 w=c.next(m=>m.type==='state'&&m.autoReveal===false,'off');c.send({type:'set_option',autoReveal:false});await w;w=c.next(m=>m.type==='state'&&m.phase==='ready','n2');c.send({type:'next'});await w;
 w=c.next(m=>m.type==='state'&&m.phase==='running','run3');c.send({type:'start'});await w;ps[0].send({type:'answer',choice:0});await sleep(2200);
 const x=c.next(m=>m.type==='state','st2');c.send({type:'set_title',title:'x'});assert.equal((await x).phase,'running');ok('MC tắt "tự công bố" → chờ MC bấm như cũ');
 c.close();ps[0].close();
}catch(e){console.error('FAIL',e);process.exitCode=1}finally{app.kill()}})();
