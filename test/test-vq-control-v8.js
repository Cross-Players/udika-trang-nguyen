'use strict';
// Kiểm thử V8: MC điều khiển hoạt cảnh rước Trạng nguyên trên màn LED (Node >= 22)
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const port=18961,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-vq-'));const PASS='test-admin-password-strong';
const app=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json')}});
const url='http://127.0.0.1:'+port;
async function wait(){for(let i=0;i<80;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('no start')}
async function post(p,body,cookie){const r=await fetch(url+p,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});return {data:await r.json(),cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(cookie){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,cookie?{headers:{Cookie:cookie}}:undefined);const q=[];let waiters=[];ws.onmessage=e=>{const m=JSON.parse(e.data);q.push(m);waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};
 return {ready:new Promise(r=>ws.onopen=r),send:m=>ws.send(JSON.stringify(m)),next:(p,label)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+label)),5000);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})}),close:()=>ws.close()}}
(async()=>{try{await wait();
 const a=await post('/api/login',{role:'admin',password:PASS});const room=(await post('/api/rooms',{title:'Thử hoạt cảnh',mcUser:'mcvq',password:'password-test-0123'},a.cookie)).data;const pin=room.pin;
 const mc=await post('/api/login',{role:'mc',pin,user:'mcvq',password:'password-test-0123'});
 const c=client(mc.cookie);await c.ready;let w=c.next(m=>m.type==='state','state');c.send({type:'host_auth',pin});await w;
 const led=client();await led.ready;w=led.next(m=>m.type==='state','lstate');led.send({type:'watch',pin});await w;
 const p=client();await p.ready;w=p.next(m=>m.type==='state','pstate');p.send({type:'join',pin,name:'Sĩ tử C'});await w;
 let gotPlayer=false;const origNext=p.next;p.next(m=>m.type==='vq','pvq').then(()=>gotPlayer=true).catch(()=>{});
 for(const [cmd,v] of [['replay',1],['pause',1],['resume',1],['speed',1.5],['honor',1],['sound',1],['volume',0.4]]){
  w=led.next(m=>m.type==='vq'&&m.cmd===cmd,'led '+cmd);const ok=c.next(m=>m.type==='vq_ok'&&m.cmd===cmd,'ok '+cmd);c.send({type:'vq',cmd,v});const m=await w;await ok;
  if(cmd==='speed')assert.equal(m.v,1.5);if(cmd==='volume')assert.equal(m.v,0.4);console.log('PASS màn LED nhận lệnh hoạt cảnh:',cmd)}
 w=c.next(m=>m.type==='error','err');c.send({type:'vq',cmd:'xoa_du_lieu'});console.log('PASS chặn lệnh hoạt cảnh không hợp lệ:',(await w).message);
 w=p.next(m=>m.type==='error','perr');p.send({type:'vq',cmd:'pause'});console.log('PASS sĩ tử không điều khiển được hoạt cảnh:',(await w).message);
 await new Promise(r=>setTimeout(r,300));assert.equal(gotPlayer,false);console.log('PASS lệnh hoạt cảnh chỉ gửi tới màn LED, không gửi tới điện thoại sĩ tử');
 c.close();p.close();led.close();
}catch(e){console.error('FAIL',e);process.exitCode=1}finally{app.kill()}})();
