'use strict';
// Kiểm thử V10: phát phim vinh danh dựng sẵn (Range/HEAD) cho màn LED (Node >= 22)
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const port=18983,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-video-'));const PASS='test-admin-password-strong';
const app=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json')}});
const url='http://127.0.0.1:'+port;
async function wait(){for(let i=0;i<80;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('no start')}
async function post(p,body,cookie){const r=await fetch(url+p,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});return {data:await r.json(),cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(cookie){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,cookie?{headers:{Cookie:cookie}}:undefined);const q=[];let waiters=[];ws.onmessage=e=>{const m=JSON.parse(e.data);q.push(m);waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};
 return {ready:new Promise(r=>ws.onopen=r),send:m=>ws.send(JSON.stringify(m)),next:(p,label)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+label)),5000);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})}),close:()=>ws.close()}}
(async()=>{const vf=path.resolve(__dirname,'../public/assets/vinhquy/vinh_quy.mp4');const had=fs.existsSync(vf);
 try{if(!had)fs.writeFileSync(vf,Buffer.alloc(5000,7));await wait();
 let r=await fetch(url+'/assets/vinhquy/vinh_quy.mp4',{method:'HEAD'});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'video/mp4');assert.equal(r.headers.get('accept-ranges'),'bytes');console.log('PASS màn LED phát hiện được phim (HEAD, video/mp4)');
 r=await fetch(url+'/assets/vinhquy/vinh_quy.mp4',{headers:{Range:'bytes=100-199'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 100-199/'+fs.statSync(vf).size);assert.equal((await r.arrayBuffer()).byteLength,100);console.log('PASS tua phim (Range 206)');
 r=await fetch(url+'/assets/vinhquy/vinh_quy.mp4',{headers:{Range:'bytes='+(fs.statSync(vf).size+10)+'-'}});assert.equal(r.status,416);console.log('PASS chặn khoảng tua sai (416)');
 r=await fetch(url+'/assets/vinhquy/khong_co.mp4',{method:'HEAD'});assert.equal(r.status,404);console.log('PASS không có phim thì dùng hoạt cảnh có sẵn (404)');
 r=await fetch(url+'/assets/vinhquy/trong_mua_lan.m4a',{headers:{Range:'bytes=0-99'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-type'),'audio/mp4');console.log('PASS tệp trống múa lân phát và tua được (audio/mp4, 206)');
 r=await fetch(url+'/led.html',{method:'HEAD'});assert.equal(r.status,200);console.log('PASS HEAD trang thường');
}catch(e){console.error('FAIL',e);process.exitCode=1}finally{if(!had)try{fs.unlinkSync(vf)}catch{}app.kill()}})();
