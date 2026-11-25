'use strict';
// Kiểm thử hồi quy cho "UDIKA V15 – Báo cáo kiểm định độc lập" (25/11/2026).
// Mỗi ca tái hiện đúng điều kiện trong báo cáo; với bản V15 gốc các ca này THẤT BẠI, bản sửa phải ĐẠT.
// Chạy: node test/test-audit-v15.js   (Node >= 22)
const assert=require('node:assert/strict');const {spawn,spawnSync}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');const PASS='test-admin-password-strong';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results=[],fails=[];const ok=s=>{console.log('PASS',s);results.push(s)};
const KEEP=process.env.AUDIT_KEEP_GOING==='1';// chạy tiếp các ca còn lại khi một ca thất bại (dùng để chứng minh bản cũ thất bại TỪNG ca)
async function step(name,fn){try{await fn()}catch(e){fails.push(name);console.log('FAIL',name,'–',String(e.message||e).split('\n')[0]);if(!KEEP)throw e}}
const APPS=new Set();process.on('exit',()=>{for(const a of APPS)try{a.kill('SIGKILL')}catch{}});
function server(port,extra={}){const dir=extra.dir||fs.mkdtempSync(path.join(os.tmpdir(),'udika-audit-'));
 const env={...process.env,PORT:String(port),ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json'),...extra.env};delete env.DATABASE_URL;if(extra.env&&'DATABASE_URL' in extra.env)env.DATABASE_URL=extra.env.DATABASE_URL;
 const app=spawn(process.execPath,['server.js'],{cwd:ROOT,env});APPS.add(app);app.once('exit',()=>APPS.delete(app));let out='';app.stdout.on('data',x=>out+=x);app.stderr.on('data',x=>out+=x);
 const url='http://127.0.0.1:'+port;
 const S={app,dir,url,out:()=>out,
  wait:async()=>{if(app.exitCode!=null)throw Error('server thoát sớm: '+out);for(let i=0;i<100;i++){if(app.exitCode!=null)throw Error('server thoát (cổng bị chiếm?): '+out);try{if((await fetch(url+'/health')).ok)return}catch{}await sleep(100)}throw Error('server không khởi động: '+out)},
  req:async(method,p,body,cookie)=>{const r=await fetch(url+p,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const text=await r.text();let data=null;try{data=JSON.parse(text)}catch{}return {status:r.status,data,text,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}},
  client:(cookie)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,cookie?{headers:{Cookie:cookie}}:undefined);let waiters=[];const C={log:[],last:null};
   ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state')C.last=m;C.log.push(m);waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};
   C.ready=new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});C.raw=m=>ws.send(JSON.stringify(m));C.ws=ws;
   C.next=(p,l,ms=8000)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+l)),ms);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})});
   C.answer=async(m)=>{const s=C.last;const w=C.next(x=>x.type==='answered'||x.type==='answer_rejected'||x.type==='error','ans');C.raw({type:'answer',eid:s.eid,qid:s.q?.qid,sid:'s'+Math.random().toString(36).slice(2),...m});return w};
   C.close=()=>ws.close();return C},
  stop:async(sig='SIGTERM')=>{if(app.exitCode!=null)return;const done=new Promise(r=>app.once('exit',r));app.kill(sig);await done}};
 S.admin=async()=>(await S.req('POST','/api/login',{role:'admin',password:PASS})).cookie;
 S.room=async(title,user,A)=>{const pin=(await S.req('POST','/api/rooms',{title,mcUser:user,password:'password-test-0123'},A)).data.pin;const M={cookie:A}; // dùng phiên Admin điều khiển (máy chủ giới hạn 12 lần đăng nhập/phút/địa chỉ)
  const c=S.client(M.cookie);await c.ready;let w=c.next(m=>m.type==='state','host');c.raw({type:'host_auth',pin});await w;
  const cmd=async(m,pred=()=>true)=>{const w=c.next(x=>(x.type==='state'&&pred(x))||x.type==='error',m.type);c.raw(m);const r=await w;if(r.type==='error')throw Error(m.type+': '+r.message);return r};
  const cmdErr=async m=>{const w=c.next(x=>x.type==='error'||x.type==='q_saved'||x.type==='bank_saved','err '+m.type,2500).catch(()=>null);c.raw(m);const r=await w;return r&&r.type==='error'?r.message:null};
  const join=async(name,extra={})=>{const p=S.client();await p.ready;const w=p.next(m=>m.type==='state'&&m.my,'join '+name);p.raw({type:'join',pin,name,...extra});await w;return p};
  return {pin,c,cmd,cmdErr,join,cookie:M.cookie}};
 return S}
const startQ=async(R,players)=>{const w=players.map(p=>p.next(m=>m.type==='state'&&m.phase==='running'&&m.q,'run'));const s=await R.cmd({type:'start'},x=>x.phase==='running');await Promise.all(w);return s};

(async()=>{const S=server(18991);let S2=null;try{await S.wait();const A=await S.admin();

 // ================= QF02: câu gõ chữ – dấu có nghĩa =================
 await step('QF02',async()=>{
 {const R=await S.room('QF02','mcqf02',A);await R.cmd({type:'set_option',autoReveal:false,streak:false,scoring:'accuracy'});
  await R.cmd({type:'bank_set',bank:[
   {kind:'type',q:'Nhiệt độ là bao nhiêu?',acc:['-5'],t:60},
   {kind:'type',q:'Ký hiệu "nhỏ hơn"?',acc:['<'],t:60},
   {kind:'type',q:'Tỉ lệ?',acc:['50%'],t:60},
   {kind:'type',q:'Vị vua?',acc:['Lý Thái Tổ'],t:60}]},x=>x.bank.length===4);
  const P1=await R.join('Dương Một'),P2=await R.join('Âm Hai');
  const run=async(i,a1,a2)=>{if(i)await R.cmd({type:'next'},x=>x.idx===i);await startQ(R,[P1,P2]);
   const x1=await P1.answer({text:a1}),x2=await P2.answer({text:a2});assert.equal(x1.type,'answered',`${a1}: ${x1.message||''}`);assert.equal(x2.type,'answered',`${a2}: ${x2.message||''}`);
   const w=[P1,P2].map(p=>p.next(m=>m.type==='state'&&m.phase==='reveal','rv'));await R.cmd({type:'reveal'},x=>x.phase==='reveal');const [s1,s2]=await Promise.all(w);return [s1.my.answer.correct,s2.my.answer.correct]};
  assert.deepEqual(await run(0,'5','-5'),[false,true],'"5" KHÔNG được bằng "-5"');
  assert.deepEqual(await run(1,'<','>'),[true,false],'đáp án là ký hiệu "<" phải nộp được và chấm đúng');
  assert.deepEqual(await run(2,'50','50%'),[false,true],'"50" khác "50%"');
  assert.deepEqual(await run(3,'lý thái tổ.','Lý Thái Tông'),[true,false],'tên kèm dấu chấm cuối câu vẫn đúng');
  ok('QF02: câu gõ chữ giữ dấu có nghĩa – "5"≠"-5", ký hiệu "<" nộp được và chấm đúng, "50"≠"50%"; dấu chấm cuối câu vẫn được bỏ qua');
  const e=await R.cmdErr({type:'bank_set',bank:[{kind:'type',q:'Rỗng?',acc:['...'],t:20}]});assert.ok(e&&/không nộp được|trống/.test(e),'đáp án chỉ gồm dấu câu phải bị báo lỗi: '+e);
  ok('QF02: đáp án được duyệt mà người chơi không thể nộp (chỉ gồm dấu câu bị bỏ) bị báo lỗi khi lưu đề');
 }
 });
 // ================= QF01: câu nhập số – giá trị lớn, số âm, biên sai số =================
 await step('QF01',async()=>{
 {const R=await S.room('QF01','mcqf01',A);await R.cmd({type:'set_option',autoReveal:false,streak:false,scoring:'accuracy'});
  await R.cmd({type:'bank_set',bank:[{kind:'number',q:'Số lớn?',c:1000000000000,tol:0,t:60},{kind:'number',q:'Số âm?',c:-2.5,tol:0.5,t:60},{kind:'number',q:'Thập phân?',c:0.3,tol:0,t:60}]},x=>x.bank.length===3);
  const P=[await R.join('N1'),await R.join('N2'),await R.join('N3')];
  const run=async(i,vals)=>{if(i)await R.cmd({type:'next'},x=>x.idx===i);await startQ(R,P);for(let k=0;k<P.length;k++){const a=await P[k].answer({text:vals[k]});assert.equal(a.type,'answered',vals[k]+': '+(a.message||''))}
   const w=P.map(p=>p.next(m=>m.type==='state'&&m.phase==='reveal','rv'));await R.cmd({type:'reveal'},x=>x.phase==='reveal');return (await Promise.all(w)).map(s=>s.my.answer.correct)};
  assert.deepEqual(await run(0,['1000000000100','1000000000000','999999999999']),[false,true,false],'sai số 0: lệch 100 hay lệch 1 đều sai');
  assert.deepEqual(await run(1,['-2','-3,1','2,5']),[true,false,false],'biên sai số ±0,5 quanh -2,5; dấu âm có nghĩa');
  assert.deepEqual(await run(2,['0,3','0.30','0,31']),[true,true,false],'0,3 chính xác (không lỗi dấu phẩy động)');
  ok('QF01: câu nhập số so sánh chính xác theo thập phân – đáp án 1.000.000.000.000 sai số 0: nhập 1.000.000.000.100 bị chấm SAI; biên ±0,5 với số âm đúng; 0,3 = 0.30');
 }
 });
 // ================= QF05: báo cáo câu sắp xếp 6 mục =================
 await step('QF05',async()=>{
 {const R=await S.room('QF05','mcqf05',A);await R.cmd({type:'bank_set',bank:[{kind:'order',q:'Xếp 6 mục',a:['1','2','3','4','5','6'],t:30}]},x=>x.bank.length===1);
  const csv=(await S.req('GET',`/api/rooms/${R.pin}/report.csv`,null,R.cookie)).text;assert.ok(csv.includes('A→B→C→D→E→F'),'phải ghi đủ A→B→C→D→E→F');assert.ok(!csv.includes('A→A→'),'không còn A→A→');
  ok('QF05: báo cáo CSV ghi thứ tự đúng của câu sắp xếp 6 mục là A→B→C→D→E→F (trước đây A→A→B→C→D)');
 }
 });
 // ================= QF03: JSON đề – không cắt/đổi âm thầm =================
 await step('QF03',async()=>{
 {const R=await S.room('QF03','mcqf03',A);
  const cases=[[{q:'7 lựa chọn',a:['1','2','3','4','5','6','7'],c:0,t:20},/7 lựa chọn.*tối đa 6|tối đa 6/],[{kind:'order',q:'9 mục',a:['1','2','3','4','5','6','7','8','9'],t:20},/tối đa 8/],
   [{kind:'matching',q:'Ghép cặp',a:['x','y'],c:0,t:20},/matching.*chưa hỗ trợ|chưa hỗ trợ/],[{q:'Media hỏng',a:['x','y'],c:0,t:20,media:{kind:'video',src:'ftp://x/y.mp4'}},/media|video/i],
   [{q:'Ảnh hỏng',a:['x','y'],ai:['javascript:alert(1)',''],c:0,t:20},/ảnh/i]];
  for(const [q,re] of cases){const e=await R.cmdErr({type:'bank_set',bank:[q]});assert.ok(e&&re.test(e),`${q.q}: phải báo lỗi rõ, nhận được: ${e}`)}
  ok('QF03 (giới hạn mới từ đợt 6: 6 lựa chọn / 8 mục): JSON có 7 lựa chọn, sắp xếp 9 mục, dạng "matching", media/ảnh có địa chỉ không hợp lệ → BÁO LỖI cụ thể, không tự cắt/đổi sang trắc nghiệm/bỏ media');
 }
 });
 // ================= QF04: nhập CSV – đọc đủ E/F, dạng lạ, cột không dùng =================
 await step('QF04',async()=>{
 {const R=await S.room('QF04','mcqf04',A);
  const imp=async(name,text)=>(await S.req('POST',`/api/rooms/${R.pin}/import`,{name,data:Buffer.from('﻿'+text).toString('base64')},R.cookie)).data;
  let r=await imp('order.csv','Câu hỏi,A,B,C,D,E,F,Dạng,Thời gian\nXếp 6 mục,Một,Hai,Ba,Bốn,Năm,Sáu,Sắp xếp,30\n');
  assert.equal(r.questions.length,1,JSON.stringify(r.errors));assert.deepEqual(r.questions[0].a,['Một','Hai','Ba','Bốn','Năm','Sáu']);
  r=await imp('kind.csv','Câu hỏi,A,B,Đáp án,Dạng\nGhép cặp?,x,y,A,Ghép cặp (matching)\n');assert.equal(r.questions.length,0);assert.ok(r.errors.some(e=>/ghép cặp/.test(e.why)),JSON.stringify(r.errors));
  r=await imp('kind2.csv','Câu hỏi,A,B,Đáp án,Dạng\nLạ?,x,y,A,Bói bài\n');assert.equal(r.questions.length,0);assert.ok(r.errors.some(e=>/chưa hỗ trợ/.test(e.why)),JSON.stringify(r.errors));
  r=await imp('mc7.csv','Câu hỏi,A,B,C,D,E,F,G,Đáp án\nBảy lựa chọn?,1,2,3,4,5,6,7,A\n');assert.equal(r.questions.length,0);assert.ok(r.errors.some(e=>/tối đa 6/.test(e.why)),JSON.stringify(r.errors));
  r=await imp('video.csv','Câu hỏi,A,B,Đáp án,Video,Người soạn\nXem clip?,Có,Không,A,https://example.com/clip.mp4,Thầy Ba\n');
  assert.equal(r.questions.length,1);assert.equal(r.questions[0].media?.kind,'video',JSON.stringify(r.questions[0]));assert.ok(r.warnings.some(w=>/Người soạn/.test(w.why)),'cột không dùng phải được cảnh báo: '+JSON.stringify(r.warnings));
  ok('QF04: CSV đọc đủ cột E/F cho câu sắp xếp; ghép cặp sai dạng, dạng lạ và câu trắc nghiệm 7 lựa chọn bị báo lỗi; cột Video được nhập thành media; cột không dùng được cảnh báo trước khi Áp dụng');
 }
 });
 // ================= C02: không lộ kết quả trước khi công bố =================
 await step('C02',async()=>{
 {const R=await S.room('C02','mcc02',A);await R.cmd({type:'set_option',autoReveal:false,confidence:true,streak:true,scoring:'speed'});await R.cmd({type:'teams_set',names:['Đội Một','Đội Hai']},x=>x.teams.length===2);
  await R.cmd({type:'bank_set',bank:[{q:'Đúng?',a:['Đúng','Sai'],c:0,t:60},{q:'Câu 2',a:['x','y'],c:0,t:60}]},x=>x.bank.length===2);
  const P=await R.join('Một Mình',{team:R.c.last.teams[0].id});const led=S.client();await led.ready;let w=led.next(m=>m.type==='state','w');led.raw({type:'watch',pin:R.pin});await w;
  await startQ(R,[P]);const ws=P.next(m=>m.type==='state'&&m.phase==='running'&&m.my?.answer,'st');const wl=led.next(m=>m.type==='state'&&m.phase==='running'&&m.time,'led');
  const a=await P.answer({choice:0,boost:true});assert.equal(a.type,'answered');assert.equal(a.answer.correct,undefined,'ACK không lộ đúng/sai');
  R.c.raw({type:'set_option',streak:true});const st=await ws; const tb=(st.teamBoard||[]).find(t=>t.name==='Đội Một');
  assert.equal(st.my.cf,1,'mức tự tin chưa được đổi trước khi công bố (my.cf)');assert.equal(st.my.score,0);assert.equal(tb.score,0,'điểm đội phải chưa đổi: '+tb.score);assert.equal(tb.correct,0,'số câu đúng của đội chưa đổi');
  await sleep(300);const ls=led.last;const tl=(ls.teamBoard||[]).find(t=>t.name==='Đội Một');assert.equal(tl.score,0);assert.equal(tl.correct,0);
  const rv=P.next(m=>m.type==='state'&&m.phase==='reveal','rv');await R.cmd({type:'reveal'},x=>x.phase==='reveal');const s2=await rv;
  assert.ok(s2.my.score>1000&&s2.my.cf===2,'sau công bố mới hiện điểm và mức tự tin');assert.ok(s2.teamBoard.find(t=>t.name==='Đội Một').score>1000);
  ok('C02: khi đang thi, điện thoại và LED KHÔNG thấy mức tự tin mới (cf vẫn 1), điểm đội (0) và số câu đúng của đội (0); sau công bố mới hiện');
  led.close();
 }
 });
 // ================= C04: phiên toàn câu sai / khảo sát vẫn được lưu lịch sử =================
 await step('C04',async()=>{
 {const R=await S.room('C04','mcc04',A);await R.cmd({type:'set_option',autoReveal:false});await R.cmd({type:'bank_set',bank:[{q:'Câu?',a:['Đúng','Sai'],c:0,t:60}]},x=>x.bank.length===1);
  const P=await R.join('Người Sai');await startQ(R,[P]);await P.answer({choice:1});await R.cmd({type:'reveal'},x=>x.phase==='reveal');
  await R.cmd({type:'reset'},x=>x.phase==='idle');const h=(await S.req('GET',`/api/rooms/${R.pin}/history`,null,R.cookie)).data;
  assert.equal(h.items.length,1,'phiên toàn sai phải được lưu: '+JSON.stringify(h));const eid=h.items[0].eid;
  const csv=(await S.req('GET',`/api/rooms/${R.pin}/history/${eid}.csv`,null,R.cookie)).text;assert.ok(csv.includes('Người Sai'));assert.ok(/B.*✘|✘/.test(csv),'lịch sử có bài nộp từng câu: '+csv.slice(0,400));
  await R.cmd({type:'bank_set',bank:[{kind:'poll',q:'Thích chặng nào?',a:['Hương','Hội'],t:60}]},x=>x.bank[0]?.kind==='poll');await startQ(R,[P]);await P.answer({choice:0});await R.cmd({type:'reveal'},x=>x.phase==='reveal');
  await R.cmd({type:'reset'},x=>x.phase==='idle');const h2=(await S.req('GET',`/api/rooms/${R.pin}/history`,null,R.cookie)).data;assert.equal(h2.items.length,2,'phiên khảo sát cũng được lưu');
  ok('C04: phiên mà mọi người đều sai và phiên chỉ có khảo sát vẫn được lưu lịch sử, kèm bài nộp từng câu để đối soát');
 }
 });
 // ================= C06: khoá đề chặn đổi thời gian =================
 await step('C06',async()=>{
 {const R=await S.room('C06','mcc06',A);await R.cmd({type:'bank_set',bank:[{q:'1',a:['x','y'],c:0,t:20},{q:'2',a:['x','y'],c:0,t:20},{q:'3',a:['x','y'],c:0,t:20}]},x=>x.bank.length===3);
  const v0=R.c.last.bankVer;await R.cmd({type:'bank_lock',on:true},x=>x.bankLocked);
  assert.ok(await R.cmdErr({type:'set_time',t:45}),'khoá đề: đổi thời gian 1 câu phải bị chặn');assert.ok(await R.cmdErr({type:'set_time',t:60,all:true}),'khoá đề: đổi thời gian tất cả câu phải bị chặn');
  assert.ok(await R.cmdErr({type:'start',t:45}),'khoá đề: MỞ CÂU kèm thời gian khác phải bị chặn');
  assert.deepEqual(R.c.last.bank.map(q=>q.t),[20,20,20]);assert.equal(R.c.last.bankVer,v0);
  await R.cmd({type:'bank_lock',on:false},x=>!x.bankLocked);await R.cmd({type:'set_time',t:45},x=>x.bank[0].t===45);assert.ok(R.c.last.bankVer>v0,'đổi thời gian phải tăng phiên bản đề');
  ok('C06: khi KHOÁ bộ đề, đổi thời gian một câu / tất cả câu / mở câu kèm thời gian khác đều bị chặn; mở khoá thì đổi được và phiên bản đề tăng');
 }
 });
 // ================= C07: hai MC sửa đồng thời – định danh bằng mã câu =================
 await step('C07',async()=>{
 {const R=await S.room('C07','mcc07',A);await R.cmd({type:'bank_set',bank:[{q:'Câu A',a:['x','y'],c:0,t:20},{q:'Câu B',a:['x','y'],c:0,t:20},{q:'Câu C',a:['x','y'],c:0,t:20}]},x=>x.bank.length===3);
  const M2=await S.req('POST','/api/login',{role:'admin',password:PASS});const c2=S.client(M2.cookie);await c2.ready;let w=c2.next(m=>m.type==='state','h2');c2.raw({type:'host_auth',pin:R.pin});await w;
  const bank=R.c.last.bank;const B=bank[1],Aq=bank[0];
  w=c2.next(m=>m.type==='state'&&m.bank.length===2,'del');c2.raw({type:'q_delete',i:0,id:Aq.id,orig:Aq});await w;
  const sv=R.c.next(m=>m.type==='q_saved'||m.type==='error','save');R.c.raw({type:'q_update',i:1,id:B.id,orig:B,q:{...B,q:'Câu B (MC1 sửa)'}});const r1=await sv;assert.equal(r1.type,'q_saved',r1.message);
  await sleep(200);assert.deepEqual(R.c.last.bank.map(q=>q.q),['Câu B (MC1 sửa)','Câu C'],'phải sửa đúng câu B, câu C còn nguyên');
  const B2=R.c.last.bank[0];w=c2.next(m=>m.type==='state'&&m.bank[0].q==='B do MC2','e2');c2.raw({type:'q_update',i:0,id:B2.id,orig:B2,q:{...B2,q:'B do MC2'}});await w;
  const e=await R.cmdErr({type:'q_update',i:0,id:B2.id,orig:B2,q:{...B2,q:'B do MC1 lần 2'}});assert.ok(e&&/MC khác|vừa được sửa|xung đột/.test(e),'sửa trên bản cũ phải báo xung đột: '+e);
  const e2=await R.cmdErr({type:'q_delete',i:5,id:Aq.id,orig:Aq});assert.ok(e2&&/đã bị xoá|không còn/.test(e2),'xoá câu đã bị xoá phải báo rõ: '+e2);
  const e3=await R.cmdErr({type:'q_update',i:0,q:{...B2,q:'Không mã câu'}});assert.ok(e3,'sửa không kèm mã câu phải bị từ chối');
  assert.deepEqual(R.c.last.bank.map(q=>q.q),['B do MC2','Câu C']);c2.close();
  ok('C07: MC2 xoá câu A trong lúc MC1 đang sửa câu B → MC1 lưu vẫn sửa đúng câu B, câu C nguyên vẹn; sửa trên bản đã cũ / xoá câu đã bị xoá / sửa không kèm mã câu đều bị từ chối với thông báo xung đột');
 }
 });

 // ================= LỘ ĐỀ 1: gói dữ liệu khi câu đang chạy không chứa đáp án =================
 await step('LO_DE_1',async()=>{const R=await S.room('Chống lộ','mcleak1',A);await R.cmd({type:'set_option',autoReveal:false});
  const bank=[{q:'Trắc nghiệm',a:['w','x','y','z'],c:2,t:60,note:'Giải thích lộ đáp án'},{kind:'multi',q:'Chọn nhiều',a:['a','b','c'],cs:[0,2],t:60},{kind:'type',q:'Gõ',acc:['Bí Mật'],t:60},
   {kind:'number',q:'Số',c:1442,tol:0,t:60},{kind:'order',q:'Xếp',a:['Một','Hai','Ba','Bốn','Năm'],t:60},{kind:'slider',q:'Trượt',min:0,max:100,step:1,c:37,tol:0,t:60}];
  await R.cmd({type:'bank_set',bank},x=>x.bank.length===6);const P=await R.join('Soi Gói');const led=S.client();await led.ready;let w=led.next(m=>m.type==='state','w');led.raw({type:'watch',pin:R.pin});await w;
  const SECRET=/Bí Mật|\b1442\b|"c":|"cs":|"acc":|"tol":|"note"|Giải thích lộ|\b37\b/; // số đứng riêng – không bắt nhầm chuỗi ngẫu nhiên như mã câu "3708…"
  for(let i=0;i<bank.length;i++){if(i)await R.cmd({type:'next'},x=>x.idx===i);const pl=P.next(m=>m.type==='state'&&m.phase==='running'&&m.q,'p'+i),ll=led.next(m=>m.type==='state'&&m.phase==='running'&&m.q,'l'+i);
   await R.cmd({type:'start'},x=>x.phase==='running');const [ps,ls]=await Promise.all([pl,ll]);
   for(const st of [ps,ls]){const raw=JSON.stringify(st.q);assert.equal(st.q.answer,null);assert.ok(!SECRET.test(raw.replace(/"t":\d+|"max":100|"deadline":\d+|"time":\d+|"qid":"[^"]*"/g,'')),`câu ${i+1} lộ dữ liệu: ${raw.slice(0,300)}`);
    assert.ok(!JSON.stringify(st).includes('"bank"'),'không gửi bộ đề cho người chơi/LED')}
   if(bank[i].kind==='order')assert.notDeepEqual(ps.q.a,bank[i].a,'câu sắp xếp phải gửi thứ tự ĐÃ XÁO');
   await R.cmd({type:'reveal'},x=>x.phase==='reveal')}
  led.close();
  ok('Chống lộ đề: khi câu đang chạy, điện thoại và LED KHÔNG nhận đáp án đúng, danh sách đáp án chấp nhận, giá trị số/sai số, giải thích, hay bộ đề; câu sắp xếp luôn gửi thứ tự đã xáo (6 dạng câu)');
 });
 // ================= LỘ ĐỀ 2: tự làm bài – không chuyền đáp án được =================
 await step('LO_DE_2',async()=>{const R=await S.room('Tự làm kín','mcleak2',A);await R.cmd({type:'bank_set',bank:[{q:'Tự làm 1',a:['x','y'],c:1,t:60},{q:'Tự làm 2',a:['x','y'],c:0,t:60}]},x=>x.bank.length===2);
  await R.cmd({type:'set_mode',mode:'self'},x=>x.mode==='self');assert.equal(R.c.last.selfHide,true,'mặc định giữ kín');await R.cmd({type:'self_open'},x=>x.phase==='self');
  const P=await R.join('Làm Trước');let w=P.next(m=>m.type==='state'&&m.my?.self?.q,'s1');P.raw({type:'self_start'});let st=await w;
  w=P.next(m=>m.type==='answered'||m.type==='answer_rejected','a1');P.raw({type:'answer',eid:st.eid,qid:st.my.self.q.qid,sid:'self1',choice:1});const a=await w;
  assert.equal(a.type,'answered');assert.equal(a.reveal,null,'không gửi đáp án đúng');assert.equal(a.answer.correct,undefined);assert.equal(a.answer.points,undefined);
  await sleep(150);st=P.last;assert.equal(st.my.score,0);assert.equal(st.my.self.last.correct,undefined);assert.equal(st.my.self.last.reveal,undefined);assert.equal((st.leaderboard||[]).length,0,'không có bảng xếp hạng khi đang làm');
  const csv=(await S.req('GET',`/api/rooms/${R.pin}/report.csv`,null,R.cookie)).text;assert.ok(/Làm Trước,1000|Làm Trước,\d{3,}/.test(csv),'MC vẫn thấy điểm thật trong báo cáo');
  const rv=P.next(m=>m.type==='state'&&m.phase==='finished','fin');await R.cmd({type:'self_close'},x=>x.phase==='finished');const f=await rv;assert.ok(f.my.score>0,'đóng bài mới hiện điểm');
  ok('Chống chuyền đáp án (tự làm bài): mặc định người chơi KHÔNG biết đúng/sai, điểm, đáp án đúng, bảng xếp hạng cho tới khi MC đóng bài; MC vẫn xem điểm thật');
 });
 // ================= LỘ ĐỀ 3: chơi thử công khai không dùng chung câu với phòng thi =================
 await step('LO_DE_3',async()=>{const pr=(await S.req('GET','/api/practice/mau')).data;const R=await S.room('Đề mặc định','mcleak3',A);
  const norm=t=>t.normalize('NFC').toLowerCase().trim();const pub=new Set(pr.bank.map(q=>norm(q.q)));assert.ok(pr.bank.length>=10);
  assert.equal(R.c.last.bank.filter(q=>pub.has(norm(q.q))).length,0,'bộ chơi thử không trùng bộ đề mặc định của phòng thi');assert.equal(R.c.last.publicOverlap,0);
  await R.cmd({type:'bank_set',bank:[pr.bank[0],{q:'Câu riêng',a:['x','y'],c:0,t:20}]},x=>x.bank.length===2);assert.equal(R.c.last.publicOverlap,1,'MC được cảnh báo khi dùng câu đang công khai');
  ok('Chống lộ đề: bộ chơi thử công khai là bộ RIÊNG (0 câu trùng bộ đề mặc định của phòng thi); MC được cảnh báo nếu bộ đề có câu trùng bộ đang công khai');
 });
 // ================= BOT: ghi danh dồn dập & gửi tin dồn dập =================
 await step('BOT',async()=>{const R=await S.room('Chống bot','mcbot',A);const bot=async(i)=>{const ws=new WebSocket(`ws://127.0.0.1:18991/ws`,{headers:{'X-Forwarded-For':'203.0.113.7'}});await new Promise(r=>ws.onopen=r);
   const m=await new Promise(r=>{ws.onmessage=e=>{const x=JSON.parse(e.data);if(['state','pending','error'].includes(x.type))r(x)};ws.send(JSON.stringify({type:'join',pin:R.pin,name:'Bot '+i}))});return {ws,m}};
  const alert=R.c.next(m=>m.type==='media_alert'&&/ghi danh mới/.test(m.message),'alert').catch(e=>e);const got=[];for(let i=0;i<65;i++)got.push(await bot(i));
  const joined=got.filter(x=>x.m.type==='state').length,pend=got.filter(x=>x.m.type==='pending').length;assert.equal(joined,60);assert.equal(pend,5);const al=await alert;if(al instanceof Error)throw al;
  const fl=new WebSocket(`ws://127.0.0.1:18991/ws`);await new Promise(r=>fl.onopen=r);const closed=new Promise(r=>fl.onclose=r);for(let i=0;i<200;i++)fl.send(JSON.stringify({type:'ping'}));await closed;
  got.forEach(x=>x.ws.close());
  ok('Chống bot: quá 60 người MỚI/10 giây từ cùng một địa chỉ → người tiếp theo vào hàng chờ duyệt và MC được báo; một kết nối gửi dồn dập (200 tin/giây) bị ngắt');
 });
 await S.stop();

 // ================= C03: REQUIRE_DATABASE=1 =================
 await step('C03',async()=>{
 for(const v of ['1','true','yes','on']){const r=spawnSync(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:'18992',REQUIRE_DATABASE:v,DATABASE_URL:'',ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(os.tmpdir(),'udika-c03.json')},timeout:8000,encoding:'utf8'});
  assert.equal(r.status,1,`REQUIRE_DATABASE=${v} thiếu DATABASE_URL phải dừng (exit 1), nhận ${r.status} ${r.stdout}${r.stderr}`)}
 {const r=spawnSync(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:'18992',REQUIRE_DATABASE:'maybe',ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough'},timeout:8000,encoding:'utf8'});assert.equal(r.status,1,'giá trị lạ phải bị từ chối rõ ràng');assert.match(r.stderr+r.stdout,/REQUIRE_DATABASE/)}
 ok('C03: REQUIRE_DATABASE=1/true/yes/on khi thiếu DATABASE_URL → máy chủ dừng (exit 1); giá trị lạ cũng bị từ chối, không âm thầm dùng tệp tạm');

 });
 // ================= C05: giới hạn trực tuyến – áp dụng cho MỌI đường vào, có chỗ dự phòng cho người vào lại =================
 await step('C05',async()=>{
 {const T=server(18993,{env:{MAX_ONLINE:'4',RECONNECT_RESERVE:'1'}});await T.wait();const A2=await T.admin();const R=await T.room('C05','mcc05',A2);
  const ids=[];const P=[];for(const n of ['Một','Hai','Ba']){const p=await R.join(n);ids.push(p.last.my.id);P.push(p)}
  const p4=T.client();await p4.ready;let w=p4.next(m=>m.type==='error'||m.type==='state','x');p4.raw({type:'join',pin:R.pin,name:'Bốn'});let m=await w;assert.equal(m.type,'error','người MỚI thứ 4 phải chờ (1 chỗ dự phòng cho người vào lại): '+JSON.stringify(m).slice(0,200));assert.match(m.message,/quá tải|đông/);
  // người cũ mất mạng rồi vào lại: dùng được chỗ dự phòng
  const extra=T.client();await extra.ready;w=extra.next(m=>m.type==='state'&&m.my,'re');extra.raw({type:'join',pin:R.pin,name:'Một',playerId:ids[0]});await w; // vào lại thêm 1 tab (tab cũ bị thay)
  await sleep(200);const h=await T.req('GET','/health');assert.ok(h.data.online<=4,'không vượt giới hạn: '+JSON.stringify(h.data));
  // giới hạn cứng: đã 4/4 (3 người + chỗ dự phòng đã dùng?) → mở thêm kết nối của người cũ khác khi đã đủ thì phải báo rõ, không âm thầm
  const fill=T.client();await fill.ready;w=fill.next(m=>m.type==='state'&&m.my||m.type==='error','fill');fill.raw({type:'join',pin:R.pin,name:'Hai',playerId:ids[1]});m=await w;
  assert.equal(m.type,'state','người cũ thay tab của chính mình không làm tăng số trực tuyến nên luôn được vào');
  assert.ok(h.data.onlineLimit===4&&h.data.reconnectReserve===1,'health báo giới hạn và chỗ dự phòng: '+JSON.stringify(h.data));
  await T.stop();
  ok('C05: giới hạn trực tuyến áp dụng thống nhất; người MỚI chỉ vào khi còn chỗ ngoài phần dự phòng; người đã ghi danh vào lại dùng chỗ dự phòng; /health báo onlineLimit và reconnectReserve');
 }

 });
 // ================= C01: lỗi ghi nhật ký + ảnh chụp đồng thời + khởi động lại =================
 await step('C01',async()=>{
 {const dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-c01-'));let T=server(18994,{dir,env:{FAIL_JOURNAL:'1'}});await T.wait();let A2=await T.admin();
  // Không thể ghi danh khi nhật ký lỗi → tạo phòng/ghi danh trên máy chủ bình thường trước
  await T.stop();T=server(18994,{dir});await T.wait();A2=await T.admin();const R=await T.room('C01','mcc01',A2);await R.cmd({type:'set_option',autoReveal:false,scoring:'accuracy'});
  await R.cmd({type:'bank_set',bank:[{q:'Đúng?',a:['Đúng','Sai'],c:0,t:120}]},x=>x.bank.length===1);const P=await R.join('Bị Từ Chối');const pid=P.last.my.id;
  await T.stop();T=server(18994,{dir,env:{FAIL_JOURNAL:'1'}});await T.wait();A2=await T.admin();
  const M=await T.req('POST','/api/login',{role:'mc',pin:R.pin,user:'mcc01',password:'password-test-0123'});const c=T.client(M.cookie);await c.ready;let w=c.next(m=>m.type==='state','h');c.raw({type:'host_auth',pin:R.pin});await w;
  const p=T.client();await p.ready;w=p.next(m=>m.type==='state'&&m.my,'j');p.raw({type:'join',pin:R.pin,name:'Bị Từ Chối',playerId:pid});await w;
  w=p.next(m=>m.type==='state'&&m.phase==='running'&&m.q,'run');c.raw({type:'start'});await w;
  const ans=p.next(m=>m.type==='answered'||m.type==='answer_rejected','ans');p.raw({type:'answer',eid:p.last.eid,qid:p.last.q.qid,sid:'c01sid',choice:0});
  await sleep(2);c.raw({type:'set_title',title:'Đổi tên lúc bài đang chờ ghi'});const a=await ans;assert.equal(a.type,'answer_rejected');assert.equal(a.retry,true);
  await sleep(150);T.app.kill('SIGKILL');await new Promise(r=>T.app.once('exit',r));
  T=server(18994,{dir});await T.wait();const st=JSON.parse(fs.readFileSync(path.join(dir,'rooms.json'),'utf8'));const pl=st.rooms[0].players.find(x=>x.id===pid);
  const M2=await T.req('POST','/api/login',{role:'mc',pin:R.pin,user:'mcc01',password:'password-test-0123'});const rep=(await T.req('GET',`/api/rooms/${R.pin}/report.csv`,null,M2.cookie)).text;
  assert.equal(pl.score,0,'bài đã bị từ chối không được có điểm sau khởi động lại');assert.equal(pl.correct,0);assert.equal(Object.keys(pl.answers).length,0,'không có bài nộp');
  assert.ok(!/Bị Từ Chối,1000/.test(rep),'báo cáo không được ghi 1000 điểm');
  // ca thuận: ảnh chụp lúc bài còn chờ ghi + nhật ký ghi thành công → sau kill -9 bài vẫn còn (không mất do mốc lastSeq)
  const c2=T.client(M2.cookie);await c2.ready;w=c2.next(m=>m.type==='state','h2');c2.raw({type:'host_auth',pin:R.pin});await w;
  const p2=T.client();await p2.ready;w=p2.next(m=>m.type==='state'&&m.my,'j2');p2.raw({type:'join',pin:R.pin,name:'Bị Từ Chối',playerId:pid});await w;
  if(p2.last.phase!=='running'){w=p2.next(m=>m.type==='state'&&m.phase==='running','r2');c2.raw({type:'start'});await w}
  const ans2=p2.next(m=>m.type==='answered'||m.type==='answer_rejected','a2');p2.raw({type:'answer',eid:p2.last.eid,qid:p2.last.q.qid,sid:'c01ok',choice:0});await sleep(2);c2.raw({type:'set_title',title:'Đổi tên lần 2'});
  assert.equal((await ans2).type,'answered');await sleep(100);T.app.kill('SIGKILL');await new Promise(r=>T.app.once('exit',r));
  T=server(18994,{dir});await T.wait();const M3=await T.req('POST','/api/login',{role:'mc',pin:R.pin,user:'mcc01',password:'password-test-0123'});
  const rep2=(await T.req('GET',`/api/rooms/${R.pin}/report.csv`,null,M3.cookie)).text;assert.ok(/Bị Từ Chối,1000,1/.test(rep2),'bài đã xác nhận phải còn sau kill -9: '+rep2.split('\n').slice(0,4).join(' / '));
  await T.stop();
  ok('C01: FAIL_JOURNAL + đổi tên phòng 2 ms sau khi nộp (ảnh chụp lúc bài còn chờ) + kill -9 → bài đã bị từ chối KHÔNG xuất hiện (0 điểm, 0 bài); ca thuận: bài đã xác nhận vẫn còn sau kill -9');
 }
 });
 console.log(`\nTỔNG: ${results.length} ca đạt, ${fails.length} ca thất bại${fails.length?' ('+fails.join(', ')+')':''}`);process.exit(fails.length?1:0);
}catch(e){console.error('FAIL',e.stack||e);console.error(S.out().slice(-1500));process.exit(1)}finally{try{S.app.kill()}catch{}}})();
