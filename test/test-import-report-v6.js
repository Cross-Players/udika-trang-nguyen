'use strict';
// Kiểm thử V6: nhập đề Word/Excel qua API, thêm vào bộ đề giữ điểm, câu Đúng/Sai, báo cáo Excel (Node >= 22)
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const port=18966,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-imp-'));const PASS='test-admin-password-strong';
const app=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json')}});
const url='http://127.0.0.1:'+port;
async function wait(){for(let i=0;i<80;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('no start')}
async function post(p,body,cookie){const r=await fetch(url+p,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(cookie){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,cookie?{headers:{Cookie:cookie}}:undefined);let waiters=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state'){if(m.eid)ws.__eid=m.eid;const q=(m.my&&m.my.self&&m.my.self.q)||m.q;if(q&&q.qid)ws.__qid=q.qid};waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};
 return {ready:new Promise(r=>ws.onopen=r),send:m=>{if(m.type==='answer'||m.type==='self_skip'){const go=()=>ws.send(JSON.stringify({eid:ws.__eid,sid:'s'+Math.random().toString(36).slice(2),...m,qid:m.qid===undefined?ws.__qid:m.qid}));if(m.qid===undefined||!ws.__eid)setTimeout(go,60);else go();return}ws.send(JSON.stringify(m))},next:(p,l)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+l)),5000);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})}),close:()=>ws.close()}}
const sample=process.argv[2]||path.join(__dirname,'..','public','mau-cau-hoi.csv');
(async()=>{try{await wait();
 const a=await post('/api/login',{role:'admin',password:PASS});const pin=(await post('/api/rooms',{title:'Nhập đề',mcUser:'mci',password:'password-test-0123'},a.cookie)).data.pin;
 const mc=await post('/api/login',{role:'mc',pin,user:'mci',password:'password-test-0123'});
 // không đăng nhập thì không được nhập đề / tải báo cáo
 assert.equal((await post(`/api/rooms/${pin}/import`,{name:'x.csv',data:'YQ=='})).status,403);
 assert.equal((await fetch(`${url}/api/rooms/${pin}/report.csv`)).status,403);console.log('PASS chặn người lạ nhập đề / tải báo cáo');
 const imp=await post(`/api/rooms/${pin}/import`,{name:path.basename(sample),data:fs.readFileSync(sample).toString('base64')},mc.cookie);
 assert.equal(imp.status,200,JSON.stringify(imp.data));const list=imp.data.questions;console.log(`PASS đọc tệp ${path.basename(sample)}: ${list.length} câu, chặng ${list.map(q=>q.stage).join(',')}`);
 const bad=await post(`/api/rooms/${pin}/import`,{name:'de.doc',data:'YWJj'},mc.cookie);assert.equal(bad.status,400);console.log('PASS báo lỗi rõ với tệp .doc cũ:',bad.data.error);
 const c=client(mc.cookie);await c.ready;let w=c.next(m=>m.type==='state','s');c.send({type:'host_auth',pin});let s=await w;const before=s.bank.length;
 w=c.next(m=>m.type==='state'&&m.bank.length===list.length,'replace');c.send({type:'bank_set',bank:list.map(({stage,q,a,c,t})=>({stage,q,a,c,t}))});s=await w;console.log(`PASS thay bộ đề bằng ${list.length} câu vừa nhập (trước đó ${before} câu)`);
 const p=client();await p.ready;w=p.next(m=>m.type==='state','p');p.send({type:'join',pin,name:'Sĩ tử D'});await w;
 // trả lời câu 1 đúng
 w=c.next(m=>m.type==='state'&&m.phase==='running','run');c.send({type:'start'});s=await w;
 w=p.next(m=>m.type==='answered','a');p.send({type:'answer',choice:s.bank[0].c});const ans=await w;assert.ok(ans.answer.saved);
 w=c.next(m=>m.type==='state'&&m.phase!=='running','rev');c.send({type:'reveal'});s=await w;const score=s.leaderboard[0].score;assert.ok(score>0,'câu 1 đúng được tính điểm');
 // thêm nhiều câu khi đang thi, giữ điểm
 w=c.next(m=>m.type==='state'&&m.bank.length===list.length+list.length,'many');c.send({type:'q_add_many',list:list.map(({stage,q,a,c,t})=>({stage,q,a,c,t}))});s=await w;
 assert.equal(s.leaderboard[0].score,score);console.log(`PASS thêm ${list.length} câu vào bộ đề khi đang thi – điểm giữ nguyên ${score}`);
 // câu Đúng/Sai: chọn đáp án C (không tồn tại) bị chặn
 const tf=s.bank.findIndex((q,i)=>i>s.idx&&q.a.length===2);assert.ok(tf>0,'có câu Đúng/Sai');
 while(s.idx<tf){w=c.next(m=>m.type==='state'&&m.phase==='ready','rd');c.send({type:'next'});s=await w;if(s.idx<tf){w=c.next(m=>m.type==='state'&&m.phase==='running','r');c.send({type:'start'});await w;w=c.next(m=>m.type==='state'&&m.phase!=='running','v');c.send({type:'reveal'});s=await w}}
 w=c.next(m=>m.type==='state'&&m.phase==='running','tfrun');c.send({type:'start'});s=await w;assert.equal(s.q.a.length,2);
 w=p.next(m=>m.type==='error'||(m.type==='answer_rejected'&&m.fix),'e');p.send({type:'answer',choice:2});console.log('PASS câu Đúng/Sai hiển thị 2 đáp án, chặn chọn sai chỉ số:',(await w).message);
 w=p.next(m=>m.type==='answered','tfa');p.send({type:'answer',choice:s.bank[s.idx].c});await w;console.log('PASS trả lời câu Đúng/Sai');
 const rep=await fetch(`${url}/api/rooms/${pin}/report.csv`,{headers:{Cookie:mc.cookie}});assert.equal(rep.status,200);const raw=Buffer.from(await rep.arrayBuffer());assert.deepEqual([...raw.subarray(0,3)],[0xef,0xbb,0xbf],'có BOM để Excel đọc đúng tiếng Việt');const csv=raw.toString('utf8');assert.ok(csv.includes('Hạng,Sĩ tử'));assert.ok(csv.includes('Sĩ tử D'));assert.ok(csv.includes('THỐNG KÊ TỪNG CÂU'));
 fs.writeFileSync(path.join(os.tmpdir(),'udika_report_sample.csv'),csv);console.log('PASS báo cáo Excel: '+csv.split('\r\n').length+' dòng, có thống kê từng câu');
 c.close();p.close();
}catch(e){console.error('FAIL',e);process.exitCode=1}finally{app.kill()}})();
