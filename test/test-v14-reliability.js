'use strict';
// Kiểm thử V14.1 – độ chính xác & giữ điểm (điều kiện nghiệm thu sự kiện có trao giải):
// (1) đáp án giữ lại từ câu trước KHÔNG được tính sang câu sau; (2) đáp án đã báo nhận KHÔNG mất khi tiến trình bị kill -9;
// (3) câu đang mở được tiếp tục sau khởi động lại, bù thời gian gián đoạn; (4) lỗi ghi → không báo nhận; (5) gửi lại không tính trùng.
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const port=18979,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-rel-'));const PASS='test-admin-password-strong';
const env={...process.env,PORT:String(port),ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json')};
let app;const start=(extra={})=>{app=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...env,...extra}});let out='';app.stdout.on('data',x=>out+=x);app.stderr.on('data',x=>out+=x);app.out=()=>out};
const url='http://127.0.0.1:'+port;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(){for(let i=0;i<100;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await sleep(100)}throw Error('no start')}
async function req(method,p,body,cookie){const r=await fetch(url+p,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await r.json()}catch{}return {status:r.status,data,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(cookie){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,cookie?{headers:{Cookie:cookie}}:undefined);let waiters=[],log=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state'){if(m.eid)ws.__eid=m.eid;const q=(m.my&&m.my.self&&m.my.self.q)||m.q;if(q&&q.qid)ws.__qid=q.qid};log.push(m);waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};ws.onerror=()=>{};
 return {ws,ready:new Promise(r=>ws.onopen=r),send:m=>{if(m.type==='answer'||m.type==='self_skip'){const go=()=>ws.send(JSON.stringify({eid:ws.__eid,sid:'s'+Math.random().toString(36).slice(2),...m,qid:m.qid===undefined?ws.__qid:m.qid}));if(m.qid===undefined||!ws.__eid)setTimeout(go,60);else go();return}ws.send(JSON.stringify(m))},log,next:(p,l,ms=6000)=>new Promise((r,j)=>{const hit=log.find(p);const t=setTimeout(()=>j(Error('Timeout '+l)),ms);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})}),close:()=>ws.close()}}
const ok=s=>console.log('PASS',s);
(async()=>{try{start();await wait();
 const A=await req('POST','/api/login',{role:'admin',password:PASS});const pin=(await req('POST','/api/rooms',{title:'Nghiệm thu',mcUser:'mcr',password:'password-test-0123'},A.cookie)).data.pin;
 const M=await req('POST','/api/login',{role:'mc',pin,user:'mcr',password:'password-test-0123'});
 let c=client(M.cookie);await c.ready;let w=c.next(m=>m.type==='state','s');c.send({type:'host_auth',pin});let s=await w;
 const cmd=async(m,pred=()=>true)=>{const w=c.next(x=>(x.type==='state'&&pred(x))||x.type==='error',m.type);c.send(m);const r=await w;if(r.type==='error')throw Error(m.type+': '+r.message);return r};
 s=await cmd({type:'set_option',autoReveal:false},x=>x.autoReveal===false);
 s=await cmd({type:'bank_set',bank:[1,2,3,4].map(i=>({q:'Câu '+i,a:['A','B','C','D'],c:0,t:40}))},x=>x.bank.length===4);
 const join=async name=>{const p=client();await p.ready;const j=p.next(m=>m.type==='joined'||m.type==='error','join');p.firstState=p.next(m=>m.type==='state','first');p.firstState.catch(()=>{});p.send({type:'join',pin,name});const r=await j;assert.equal(r.type,'joined');p.id=r.playerId;return p};
 let P=await join('Thí sinh A');
 // ---- (1) đáp án giữ lại từ câu 1 bị gửi muộn khi đã sang câu 2 ----
 s=await cmd({type:'start'},x=>x.phase==='running');const qid1=s.q.qid;assert.ok(qid1);
 s=await cmd({type:'reveal'},x=>x.phase==='reveal');s=await cmd({type:'next'},x=>x.phase==='ready');s=await cmd({type:'start'},x=>x.phase==='running');const qid2=s.q.qid;assert.notEqual(qid1,qid2);
 let rj=P.next(m=>m.type==='answer_rejected','rej');P.send({type:'answer',qid:qid1,choice:0});let r=await rj;assert.match(r.message,/đã đóng/);
 rj=P.next(m=>m.type==='answer_rejected','rej2');P.send({type:'answer',qid:'',choice:0});r=await rj;assert.match(r.message,/Thiếu mã câu hỏi/);
 await sleep(500);s=await cmd({type:'set_title',title:'Nghiệm thu'});assert.equal(s.players[0].answered,false);assert.equal(s.players[0].score,0);
 ok('đáp án giữ lại từ câu 1 (mã câu cũ) gửi khi đang ở câu 2 → bị từ chối, KHÔNG tính vào câu 2; gửi thiếu mã câu cũng bị từ chối');
 // ---- (5) gửi lại cùng một câu trả lời: chỉ tính 1 lần ----
 let an=P.next(m=>m.type==='answered','a1');P.send({type:'answer',qid:qid2,sid:'lan-gui-1',choice:0});const a1=await an;assert.equal(a1.answer.correct,undefined,'giữ kín đúng/sai khi câu còn chạy');assert.equal(a1.answer.points,undefined);assert.equal(a1.answer.saved,true);
 an=P.next(m=>m.type==='answered'&&m!==a1,'a2');P.send({type:'answer',qid:qid2,sid:'lan-gui-1',choice:0});const a2=await an;assert.equal(a2.sid,'lan-gui-1');
 rj=P.next(m=>m.type==='answer_rejected','rej3');P.send({type:'answer',qid:qid2,sid:'lan-gui-KHAC',choice:1});r=await rj;assert.match(r.message,/đã nộp/);
 rj=P.next(m=>m.type==='answer_rejected','rej4');P.send({type:'answer',qid:qid2,sid:'x',eid:'ky-thi-cu',choice:0});r=await rj;assert.match(r.message,/Kỳ thi đã thay đổi/);
 s=await cmd({type:'set_title',title:'x'});const pts1=s.players[0].score;assert.ok(pts1>0);ok('gửi lại cùng mã lần gửi (mất xác nhận do mạng) → xác nhận lại, điểm tính 1 lần; lần gửi khác cho câu đã nộp → từ chối; mã kỳ thi cũ → từ chối');
 // ---- (2) đã báo nhận rồi kill -9 ngay (trước lần lưu ảnh chụp kế tiếp) ----
 s=await cmd({type:'reveal'},x=>x.phase==='reveal');s=await cmd({type:'next'},x=>x.phase==='ready');s=await cmd({type:'start'},x=>x.phase==='running');const qid3=s.q.qid;
 await sleep(800); // ảnh chụp sau lệnh MC đã lưu xong
 const before=JSON.parse(fs.readFileSync(env.DATA_FILE,'utf8'));
 an=P.next(m=>m.type==='answered','a3');const tSend=Date.now();P.send({type:'answer',qid:qid3,sid:'a3',choice:0});const a3=await an;
 app.kill('SIGKILL');const killedAfter=Date.now()-tSend;
 const snap=JSON.parse(fs.readFileSync(env.DATA_FILE,'utf8'));const inSnap=!!snap.rooms[0].players[0].answers['2'];
 assert.equal(inSnap,false,'ảnh chụp chưa kịp có câu trả lời – phải khôi phục được từ nhật ký');
 
 await sleep(2500); // máy chủ "mất" 2,5 giây
 start();await wait();
 c=client(M.cookie);await c.ready;w=c.next(m=>m.type==='state','s2');c.send({type:'host_auth',pin});s=await w;
 const scoreBefore=s.players[0].score;assert.ok(scoreBefore>pts1,'điểm câu 3 (đã báo nhận) phải còn: '+scoreBefore+' > '+pts1);assert.ok(s.players[0].answered===true);
 ok(`đáp án đã báo nhận rồi tiến trình bị kill -9 sau ${killedAfter} ms (ảnh chụp chưa có) → khởi động lại vẫn đủ điểm ${scoreBefore} (khôi phục từ nhật ký ghi trước)`);
 // ---- (3) câu đang mở được giữ nguyên + bù thời gian ----
 assert.equal(s.phase,'running');assert.equal(s.q.qid,qid3);const left=(s.q.deadline-Date.now())/1000;assert.ok(left>34,'còn '+left);
 ok(`khởi động lại: câu 3 vẫn đang mở (không bị cắt), đồng hồ được bù thời gian gián đoạn – còn ${left.toFixed(1)} giây`);
 // thí sinh khác rớt mạng rồi vào lại, vẫn trả lời được câu đang mở
 const B=await join('Thí sinh B');const sb=(await B.firstState).q.qid;assert.equal(sb,qid3);
 an=B.next(m=>m.type==='answered','b');B.send({type:'answer',qid:qid3,choice:0});await an;
 const Pid=P.id;P=client();await P.ready;let jj=P.next(m=>m.type==='joined','rj');const stE=P.next(m=>m.type==='state'&&m.eid,'st-eid'); // đăng ký chờ cả hai TRƯỚC khi gửi: máy chủ có thể gửi trạng thái trước gói "joined"
 P.send({type:'join',pin,name:'Thí sinh A',playerId:Pid});await jj;
 await stE;an=P.next(m=>m.type==='answered','again');P.send({type:'answer',qid:qid3,sid:'a3',choice:0});await an;s=await cmd({type:'set_title',title:'y'});assert.equal(s.players.find(p=>p.name==='Thí sinh A').score,scoreBefore);
 ok('sau khởi động lại: thí sinh vào lại bằng mã cũ giữ nguyên điểm; gửi lại câu đã nhận không bị tính trùng; người mới vẫn trả lời được câu đang mở');
 // ---- (4) lỗi ghi nhật ký → KHÔNG báo nhận, không cộng điểm ----
 app.kill('SIGKILL');await sleep(300);start({FAIL_JOURNAL:'1'});await wait();
 c=client(M.cookie);await c.ready;w=c.next(m=>m.type==='state','s3');c.send({type:'host_auth',pin});s=await w;
 s=await cmd({type:'reveal'},x=>x.phase==='reveal');s=await cmd({type:'next'},x=>x.phase==='ready');s=await cmd({type:'start'},x=>x.phase==='running');
 P=client();await P.ready;jj=P.next(m=>m.type==='joined','rj2');P.send({type:'join',pin,name:'Thí sinh A',playerId:Pid});await jj;
 rj=P.next(m=>m.type==='answer_rejected'||m.type==='answered','fail');P.send({type:'answer',qid:s.q.qid,choice:0});r=await rj;assert.equal(r.type,'answer_rejected');assert.equal(r.retry,true);
 s=await cmd({type:'set_title',title:'z'});assert.equal(s.players.find(p=>p.name==='Thí sinh A').answered,false);assert.equal(s.players.find(p=>p.name==='Thí sinh A').score,scoreBefore);
 ok('khi máy chủ không ghi được (đĩa lỗi) → không báo "đã nhận", không cộng điểm, điện thoại được yêu cầu gửi lại');
 c.close();P.close();B.close();
}catch(e){console.error('FAIL',e);console.error(app&&app.out().slice(-800));process.exitCode=1}finally{app&&app.kill('SIGKILL')}})();
