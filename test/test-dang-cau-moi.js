'use strict';
// V15 đợt 6 – 10 hình thức trả lời + cơ chế điểm riêng từng câu (máy chủ). Kiểm: tương thích ngược (bộ đề cũ chuẩn hoá y hệt trước),
// không lộ đáp án trên điện thoại, chấm đúng từng dạng, ×3, điểm tối đa, điểm cố định, không thưởng chuỗi, câu quyết định khi bằng điểm,
// bình chọn giữ kín, MC duyệt tay câu viết (có ghi nhật ký – kill -9 vẫn giữ), giữ bảng điểm theo câu, chống nộp trùng, nhập CSV dạng mới.
// Chạy: node test/test-dang-cau-moi.js
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

const mcLogin=async(S,pin,user,pw='password-test-0123')=>(await S.req('POST','/api/login',{role:'mc',pin,user,password:pw})).cookie;
const hostOf=async(S,cookie,pin)=>{const c=S.client(cookie);await c.ready;const w=c.next(m=>m.type==='state'||m.type==='error','host');c.raw({type:'host_auth',pin});await w;
 c.cmd=async(m,pred=()=>true)=>{const w=c.next(x=>(x.type==='state'&&pred(x))||x.type==='error',m.type);c.raw(m);const r=await w;if(r.type==='error')throw Error(m.type+': '+r.message);return r};return c};
const watcher=async(S,pin,cookie)=>{const c=S.client(cookie);await c.ready;const w=c.next(m=>m.type==='state','watch');c.raw({type:'watch',pin});await w;return c};

const SYN=[
 {kind:'mc',q:'Đúng hay sai?',a:['Đúng','Sai'],c:1,t:10,stage:0},
 {kind:'mc',q:'Bốn lựa chọn 🐉',a:['A 😀','B','C','D'],c:3,t:20,stage:1,pts:2,shuffle:true,note:'giải thích'},
 {kind:'multi',q:'Chọn nhiều',a:['1','2','3','4'],cs:[0,2],partial:true,t:20,stage:1},
 {kind:'type',q:'Gõ',acc:['Hà Nội','Ha Noi'],loose:true,caseOn:false,punct:true,t:20,stage:2,pts:0},
 {kind:'number',q:'Số',c:1075,tol:5,unit:'năm',t:20,stage:2},
 {kind:'order',q:'Xếp',a:['a','b','c','d','e','f'],partial:true,t:30,stage:3},
 {kind:'poll',q:'Khảo sát',a:['x','y','z'],pmulti:true,t:15,stage:0},
 {kind:'slider',q:'Trượt',min:0,max:100,step:5,c:50,tol:10,unit:'%',t:20,stage:4},
 {kind:'cloud',q:'Mây',t:20,stage:0},
 {kind:'mc',q:'Ảnh',a:['','','',''],ai:['https://example.com/1.png','https://example.com/2.png','https://example.com/3.png','https://example.com/4.png'],c:0,t:20,stage:0,media:{kind:'image',src:'https://example.com/q.png',where:'both'}}];
const W='TRẠNG NGUYÊN';
const BANK=[
 /*0*/{kind:'mc',q:'Sáu phương án – chọn F',a:['Một','Hai','Ba','Bốn','Năm','Sáu'],c:5,t:30,stage:0,scoring:'accuracy'},
 /*1*/{kind:'mc',tf:true,q:'Lương Thế Vinh đỗ Trạng nguyên năm 1463?',a:['Đúng','Sai'],c:0,t:30,stage:0,scoring:'accuracy'},
 /*2*/{kind:'multi',q:'Chọn nhiều trong 6',a:['a','b','c','d','e','f'],cs:[1,4],partial:true,t:30,stage:0,scoring:'accuracy'},
 /*3*/{kind:'fill',q:'Đuổi hình bắt chữ 👑📜',word:W,hint:[0,7],t:30,stage:0,scoring:'accuracy'},
 /*4*/{kind:'fill',q:'Giải mã từ khoá (không cần dấu)',word:'Văn Miếu',hint:[],loose:true,t:30,stage:0,scoring:'accuracy'},
 /*5*/{kind:'type',q:'Thủ đô Việt Nam?',acc:['Hà Nội'],t:30,stage:0,scoring:'accuracy'},
 /*6*/{kind:'order',q:'Xếp 8 mục',a:['1','2','3','4','5','6','7','8'],t:60,stage:0,scoring:'accuracy'},
 /*7*/{kind:'number',q:'Đoán giá sản phẩm (nghìn đồng)',c:1000,tol:100,prox:true,t:30,stage:0,scoring:'accuracy'},
 /*8*/{kind:'poll',q:'Bình chọn giữ kín',a:['X','Y','Z'],hideLive:true,t:30,stage:0},
 /*9*/{kind:'match',q:'Ghép Trạng nguyên với triều đại',l:['Lương Thế Vinh','Mạc Đĩnh Chi','Nguyễn Hiền','Lê Văn Thịnh'],r:['Lê sơ','Trần','Trần (1247)','Lý'],t:60,stage:0,scoring:'accuracy'},
 /*10*/{kind:'mc',q:'×3, tối đa 2000, cố định, không thưởng chuỗi',a:['đúng','sai'],c:0,t:30,stage:0,pts:3,maxPts:2000,scoring:'accuracy',noStreak:true,hideBoard:true},
 /*11*/{kind:'mc',q:'Câu quyết định khi bằng điểm',a:['đúng','sai'],c:0,t:30,stage:0,tie:true,scoring:'speed'}];
(async()=>{const S=server(18985);try{await S.wait();const A=await S.admin();
 await step('TUONG_THICH',async()=>{const want=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','de_cu_chuan_hoa_truoc_dot6.json'),'utf8'));
  for(const [name,bank] of [['questions',JSON.parse(fs.readFileSync(path.join(ROOT,'questions.json'),'utf8'))],['practice',JSON.parse(fs.readFileSync(path.join(ROOT,'practice_sample.json'),'utf8'))],['synthetic',SYN]]){
   const R=await S.room('compat '+name,'mcc'+name.slice(0,3),A);const st=await R.cmd({type:'bank_set',bank},x=>x.bank.length===bank.length);
   assert.deepEqual(st.bank.map(({id,...x})=>x),want[name],'bộ đề cũ "'+name+'" phải chuẩn hoá y hệt trước đợt 6')}
  ok('tương thích ngược: questions.json (15 câu), bộ chơi thử (12 câu) và 10 câu mẫu đủ 8 dạng cũ chuẩn hoá Y HỆT bản trước khi thêm dạng mới (so từng trường)')});
 let R,P,Q,c3;
 await step('KIEM_DE',async()=>{R=await S.room('Dạng câu mới','mcmoi',A);
  const bad=[[{kind:'mc',q:'7',a:['1','2','3','4','5','6','7'],c:0,t:20},/tối đa 6/],[{kind:'fill',q:'f',word:'A',t:20},/ít nhất 2 chữ/],[{kind:'fill',q:'f',word:'AB',hint:[0,1],t:20},/chừa ít nhất 1 ô/],
   [{kind:'fill',q:'f',word:'A+B',t:20},/chỉ gồm chữ/],[{kind:'match',q:'m',l:['a','b'],r:['1','2'],t:20},/3–6 cặp/],[{kind:'match',q:'m',l:['a','b','c'],r:['1','1','2'],t:20},/vế phải giống nhau/],
   [{kind:'match',q:'m',l:['a','b','c','d','e','f','g'],r:['1','2','3','4','5','6','7'],t:20},/tối đa 6/],[{kind:'order',q:'o',a:['1','2'],t:20},/3–8 mục/]];
  for(const [q,re] of bad){const e=await R.cmdErr({type:'bank_set',bank:[q]});assert.ok(e&&re.test(e),q.q+': '+e)}
  {const m=await R.cmd({type:'bank_set',bank:[{q:'Ghi nhớ',a:['1','2'],c:0,t:20,media:{kind:'image',src:'https://example.com/a.png',hide:5}}]},x=>x.bank.length===1);assert.equal(m.bank[0].media.hide,5,'ảnh tự ẩn sau 5 giây (trò ghi nhớ hình ảnh)')}
  const st=await R.cmd({type:'bank_set',bank:BANK},x=>x.bank.length===BANK.length);Q=st.bank;
  assert.equal(Q[3].word,W);assert.deepEqual(Q[3].hint,[0,7]);assert.equal(Q[10].pts,3);assert.equal(Q[10].maxPts,2000);assert.equal(Q[11].tie,true);assert.equal(Q[1].tf,true);assert.equal(Q[7].prox,true);
  await R.cmd({type:'set_option',autoReveal:false,streak:true});
  ok('kiểm đề: báo lỗi rõ cho 7 phương án, ô chữ thiếu chữ / không chừa ô / ký tự lạ, ghép cặp <3 hoặc >6 cặp, vế phải trùng, sắp xếp <3 mục; nhận đủ 12 câu 10 dạng + cơ chế riêng')});
 const answer=async(p,m)=>{const s=p.last;const w=p.next(x=>x.type==='answered'||x.type==='answer_rejected'||x.type==='error','ans');p.raw({type:'answer',eid:s.eid,qid:s.q.qid,sid:'s'+Math.random().toString(36).slice(2),...m});return w};
 const reveal=async()=>{await sleep(250);const w=P.map(p=>p.next(x=>x.type==='state'&&x.phase==='reveal','rv'));const st=await R.cmd({type:'reveal'},x=>x.phase==='reveal');const ps=await Promise.all(w);return {st,ps}};
 const next=async()=>{await sleep(250);return R.cmd({type:'next'},x=>x.phase==='ready'||x.phase==='intermission'||x.phase==='finished')};
 const base=a=>a.points-(a.bonus||0);
 const scoreOf=(st,name)=>(st.leaderboard.find(x=>x.name===name)||{}).score;
 await step('CHAM_TUNG_DANG',async()=>{P=[await R.join('Sĩ tử Một'),await R.join('Sĩ tử Hai'),await R.join('Sĩ tử Ba')];
  const leak=(s,arr)=>{const j=JSON.stringify(s.q);for(const x of arr)assert.ok(!j.includes(x),'LỘ ĐÁP ÁN trên điện thoại: '+x);assert.equal(s.q.answer,null)};
  // 0 – 6 phương án
  let s=await startQ(R,P);assert.equal(P[0].last.q.a.length,6);leak(P[0].last,[]);
  assert.equal((await answer(P[0],{choice:5})).type,'answered');assert.equal((await answer(P[1],{choice:4})).type,'answered');
  const dup=await answer(P[0],{choice:0});assert.ok(dup.type==='answered'||/đã nộp/.test(dup.message||''),'nộp lại không được tính lại');
  let {st,ps}=await reveal();assert.equal(ps[0].my.answer.correct,true);assert.equal(base(ps[0].my.answer),1000);assert.equal(ps[1].my.answer.correct,false);await next();
  // 1 – đúng sai
  await startQ(R,P);assert.equal(P[0].last.q.tf,true);await answer(P[0],{choice:0});await answer(P[1],{choice:1});({ps}=await reveal());assert.equal(ps[0].my.answer.correct,true);assert.equal(ps[1].my.answer.correct,false);await next();
  // 2 – chọn nhiều 6 phương án, chấm một phần
  await startQ(R,P);await answer(P[0],{choices:[1,4]});await answer(P[1],{choices:[1]});({ps}=await reveal());assert.equal(base(ps[0].my.answer),1000);assert.equal(base(ps[1].my.answer),500);await next();
  // 3 – điền ô chữ có dấu
  await startQ(R,P);const m=P[0].last.q.mask;leak(P[0].last,['NGUYÊN','RẠNG']);assert.equal(m.length,Array.from(W).length);assert.deepEqual(m[0],{h:'T'});assert.deepEqual(m[5],{s:' '});assert.deepEqual(m[7],{h:'G'});assert.equal(m[1],null);
  assert.equal((await answer(P[2],{text:'TRẠNG'})).type,'answer_rejected','thiếu ô phải bị từ chối để điền lại');
  await answer(P[0],{text:'trạng nguyên'});await answer(P[1],{text:'TRANG NGUYEN'});await answer(P[2],{text:'TRẠNG NGUYỄN'});({ps}=await reveal());
  assert.equal(ps[0].my.answer.correct,true,'không phân biệt hoa thường');assert.equal(ps[1].my.answer.correct,false,'thiếu dấu khi KHÔNG bật "không dấu"');assert.equal(ps[2].my.answer.correct,false);assert.equal(ps[0].q.answer,W);await next();
  // 4 – điền ô chữ không dấu
  await startQ(R,P);await answer(P[0],{text:'VAN MIEU'});await answer(P[1],{text:'văn miếu'});({ps}=await reveal());assert.equal(ps[0].my.answer.correct,true);assert.equal(ps[1].my.answer.correct,true);await next();
  // 5 – viết câu trả lời (để MC duyệt tay ở bước sau)
  await startQ(R,P);await answer(P[0],{text:'Hà Nội'});await answer(P[1],{text:'Ha Noi'});await answer(P[2],{text:'Thăng Long'});({st,ps}=await reveal());
  assert.equal(ps[1].my.answer.correct,false);assert.ok(st.review&&st.review.items.some(x=>x.text==='Ha Noi'&&!x.ok),'MC thấy danh sách cách viết để duyệt');
  const before=scoreOf(st,'Sĩ tử Hai');let r=await R.cmd({type:'accept_text',idx:5,text:'ha noi'},x=>(x.leaderboard||[]).some(p=>p.name==='Sĩ tử Hai'&&p.score===before+1000));
  assert.ok(r.review.items.find(x=>x.text==='Ha Noi').mc);r=await R.cmd({type:'accept_text',idx:5,text:'Ha Noi',on:false},x=>(x.leaderboard||[]).some(p=>p.name==='Sĩ tử Hai'&&p.score===before));
  await R.cmd({type:'accept_text',idx:5,text:'Ha Noi'},x=>(x.leaderboard||[]).some(p=>p.name==='Sĩ tử Hai'&&p.score===before+1000));
  assert.match(await R.cmdErr({type:'accept_text',idx:0,text:'x'}),/câu gõ đáp án/);
  const pc=S.client();await pc.ready;const wpc=pc.next(x=>x.type==='error'||x.type==='state','pc');pc.raw({type:'accept_text',idx:5,text:'Thăng Long'});assert.equal((await wpc).type,'error','sĩ tử không được tự duyệt');pc.close();
  await next();
  // 6 – sắp xếp 8 mục
  await startQ(R,P);const ids=P[0].last.q.a.map(x=>Number(x)-1);const right=[...Array(8).keys()].map(v=>ids.indexOf(v));await answer(P[0],{order:right});({ps}=await reveal());assert.equal(ps[0].my.answer.correct,true);await next();
  // 7 – ước lượng con số: càng gần càng nhiều điểm
  await startQ(R,P);await answer(P[0],{text:'1000'});await answer(P[1],{text:'1050'});await answer(P[2],{text:'1101'});({ps}=await reveal());
  assert.equal(base(ps[0].my.answer),1000);assert.equal(base(ps[1].my.answer),750);assert.equal(base(ps[2].my.answer),0);await next();
  // 8 – bình chọn giữ kín
  await startQ(R,P);assert.equal(P[0].last.q.stats,undefined,'không lộ kết quả bình chọn khi MC giữ kín');await answer(P[0],{choice:0});await answer(P[1],{choice:0});await sleep(400);
  assert.ok(!P[2].log.some(x=>x.type==='presence'&&x.stats),'gói cập nhật nhỏ (presence) cũng không có kết quả');({ps}=await reveal());assert.deepEqual(ps[2].q.stats.counts,[2,0,0]);await next();
  // 9 – ghép cặp
  await startQ(R,P);const q9=P[0].last.q;assert.ok(!('ids' in q9));const D=q9.r,want=Q[9].r;const pos=want.map(x=>D.indexOf(x));
  const sw=pos.slice();[sw[0],sw[1]]=[sw[1],sw[0]];assert.equal((await answer(P[2],{pairs:[pos[0],pos[0],pos[2],pos[3]]})).type,'answer_rejected','mỗi mục phải dùng đúng 1 lần');
  await answer(P[0],{pairs:pos});await answer(P[1],{pairs:sw});({st,ps}=await reveal());assert.equal(base(ps[0].my.answer),1000);assert.equal(base(ps[1].my.answer),500);assert.deepEqual(ps[0].q.answer,want);assert.equal(st.q.stats.avgPairs,3);await next();
  // 10 – ×3, tối đa 2000, cố định, không thưởng chuỗi, giữ bảng
  await startQ(R,P);await answer(P[0],{choice:0});({st,ps}=await reveal());assert.equal(base(ps[0].my.answer),6000);assert.equal(ps[0].my.answer.bonus,0);assert.ok(ps[0].my.answer.streak>=2,'vẫn đếm chuỗi');
  assert.equal(st.boardHeld,true,'câu bật "không tự hiện bảng xếp hạng"');assert.deepEqual(ps[1].leaderboard,[]);await R.cmd({type:'show_board'},x=>!x.boardHeld).catch(()=>null);await next();
  ok('chấm đúng: 6 phương án; đúng–sai; chọn nhiều 6 phương án (một phần 50%); ô chữ có dấu / không dấu (thiếu ô bị trả lại để điền tiếp); sắp xếp 8 mục; ước lượng 1000/750/0 điểm theo độ gần; bình chọn giữ kín cả trong gói cập nhật nhỏ; ghép cặp 4/4 = 1000, 2/4 = 500, chọn trùng bị trả lại; ×3 × tối đa 2000 = 6000, không thưởng chuỗi, giữ bảng xếp hạng');
  ok('MC duyệt tay câu viết: thấy danh sách cách viết, chấp nhận "Ha Noi" → +1000 điểm cho người viết như vậy, bỏ chấp nhận → trừ lại; câu khác dạng bị từ chối; sĩ tử không tự duyệt được')});
 await step('CAU_QUYET_DINH',async()=>{const st0=R.c.last;const a=scoreOf(st0,'Sĩ tử Hai'),b=scoreOf(st0,'Sĩ tử Ba');
  // làm cho Hai và Ba bằng điểm: dùng một phòng riêng nhỏ để kiểm rõ ràng
  const T=await S.room('Bằng điểm','mctie',A);await T.cmd({type:'set_option',autoReveal:false,scoring:'accuracy'});await T.cmd({type:'bank_set',bank:[{q:'Thường',a:['x','y'],c:0,t:30},{q:'Quyết định',a:['x','y'],c:0,t:30,tie:true}]},x=>x.bank.length===2);
  const X=[await T.join('Người Giáp'),await T.join('Người Ất')];const start=async()=>{const w=X.map(p=>p.next(m=>m.type==='state'&&m.phase==='running','run'));await T.cmd({type:'start'},x=>x.phase==='running');await Promise.all(w)};
  await start();await answer(X[0],{choice:0});await answer(X[1],{choice:0});let st=await T.cmd({type:'reveal'},x=>x.phase==='reveal');assert.equal(st.leaderboard[0].score,st.leaderboard[1].score);
  await T.cmd({type:'next'},x=>x.phase==='ready');await start();await answer(X[1],{choice:0});await answer(X[0],{choice:1});st=await T.cmd({type:'reveal'},x=>x.phase==='reveal');
  assert.equal(st.leaderboard[0].name,'Người Ất');assert.equal(st.leaderboard[0].score,st.leaderboard[1].score,'câu quyết định KHÔNG cộng vào tổng điểm');assert.equal(st.leaderboard[0].rank,1);assert.equal(st.leaderboard[1].rank,2);
  assert.equal(st.leaderboard[0].correct,1,'không tính là câu đúng');assert.equal(X[1].log.filter(m=>m.type==='state').pop().progress.scoredDone,1);
  ok('câu quyết định khi bằng điểm: hai người bằng 1000 điểm → người trả lời đúng câu quyết định xếp hạng 1, tổng điểm & số câu đúng KHÔNG đổi')});
 await step('NHAT_KY_DUYET_TAY',async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-acc-'));let T=server(18986,{dir});await T.wait();const A2=await T.admin();
  const R2=await T.room('Duyệt tay','mcacc',A2);await R2.cmd({type:'set_option',autoReveal:false,scoring:'accuracy'});await R2.cmd({type:'bank_set',bank:[{kind:'type',q:'Thủ đô?',acc:['Hà Nội'],t:30}]},x=>x.bank.length===1);
  const p=await R2.join('Người Viết');const w=p.next(m=>m.type==='state'&&m.phase==='running','run');await R2.cmd({type:'start'},x=>x.phase==='running');await w;await answer(p,{text:'Ha Noi'});
  await R2.cmd({type:'reveal'},x=>x.phase==='reveal');await R2.cmd({type:'accept_text',idx:0,text:'Ha Noi'},x=>(x.leaderboard||[])[0]?.score===1000);
  await T.stop('SIGKILL');T=server(18986,{dir});await T.wait();const A3=await T.admin();const h=await hostOf(T,A3,R2.pin);const st=h.last;
  assert.equal(st.leaderboard[0].score,1000);assert.equal(st.leaderboard[0].correct,1);await T.stop();
  const csv=await (async()=>{T=server(18986,{dir});await T.wait();const A4=await T.admin();const r=await fetch(T.url+'/api/rooms/'+R2.pin+'/report.csv',{headers:{Cookie:A4}});const t=await r.text();await T.stop();return t})();
  assert.match(csv,/MC duyệt/);ok('MC duyệt tay được ghi nhật ký trước khi báo: kill -9 rồi khởi động lại vẫn giữ 1000 điểm & 1 câu đúng; báo cáo CSV ghi "(MC duyệt)"')});
 await step('BAO_CAO',async()=>{const r=await fetch(S.url+'/api/rooms/'+R.pin+'/report.csv',{headers:{Cookie:A}});const csv=await r.text();
  for(const x of ['Điền ô chữ','Ghép cặp','từ khoá: TRẠNG NGUYÊN','cặp đúng: Lương Thế Vinh↔Lê sơ','×3','câu quyết định khi bằng điểm','điểm cố định','(MC duyệt)','tối đa 2000 điểm','không thưởng chuỗi','càng gần càng nhiều điểm','tính theo số cặp đúng'])assert.ok(csv.includes(x),'báo cáo thiếu: '+x);
  ok('báo cáo CSV ghi đủ dạng câu mới, đáp án (từ khoá, các cặp đúng) và luật điểm riêng từng câu')});
 await step('NHAP_CSV',async()=>{const imp=async(name,text)=>(await S.req('POST',`/api/rooms/${R.pin}/import`,{name,data:Buffer.from('﻿'+text).toString('base64')},R.cookie)).data;
  const r=await imp('moi.csv','Câu hỏi,A,B,C,D,E,F,G,H,Đáp án,Dạng,Điểm\n'+
   'Sáu phương án?,1,2,3,4,5,6,,,F,Trắc nghiệm,x3\n'+'Trời xanh?,,,,,,,,,Đúng,Đúng sai,\n'+'Giải mã,1;4,,,,,,,,TRẠNG NGUYÊN,Điền ô chữ,\n'+
   'Ghép,Hà Nội = Thăng Long,Huế = Phú Xuân,Sài Gòn = Gia Định,,,,,,,Ghép cặp,\n'+'Xếp tám,a,b,c,d,e,f,g,h,,Sắp xếp,\n');
  assert.equal(r.errors.length,0,JSON.stringify(r.errors));const by=t=>r.questions.find(x=>x.q===t);const [a,b,c,d,e]=['Sáu phương án?','Trời xanh?','Giải mã','Ghép','Xếp tám'].map(by);
  assert.equal(a.a.length,6);assert.equal(a.c,5);assert.equal(a.pts,3);assert.equal(b.tf,true);assert.deepEqual(b.a,['Đúng','Sai']);assert.equal(c.kind,'fill');assert.equal(c.word,'TRẠNG NGUYÊN');assert.deepEqual(c.hint,[0,3]);
  assert.equal(d.kind,'match');assert.deepEqual(d.l,['Hà Nội','Huế','Sài Gòn']);assert.deepEqual(d.r,['Thăng Long','Phú Xuân','Gia Định']);assert.equal(e.a.length,8);
  const R3=await S.room('Áp dụng nhập','mcimp',A);await R3.cmd({type:'bank_set',bank:r.questions},x=>x.bank.length===5);
  ok('nhập CSV: 6 phương án + hệ số ×3, đúng–sai, điền ô chữ (gợi ý vị trí 1;4), ghép cặp "trái = phải", sắp xếp 8 mục → nhập đúng và áp dụng được')});
 await step('MAU_TRO_CHOI',async()=>{const L=JSON.parse(fs.readFileSync(path.join(ROOT,'public','mau_tro_choi.json'),'utf8'));const R4=await S.room('Mẫu trò chơi','mcmau',A);
  const st=await R4.cmd({type:'bank_set',bank:L},x=>x.bank.length===L.length);const kinds=new Set(st.bank.map(q=>q.kind));for(const k of ['fill','mc','type','number','match'])assert.ok(kinds.has(k));
  ok(`bộ ${L.length} câu mẫu trò chơi (đuổi hình bắt chữ, nghe nhạc, đoán nhân vật, đoán thương hiệu, xem video, giải mã emoji, đoán giá, tìm khác biệt, ghi nhớ hình ảnh, giải mã từ khoá, ghép cặp) đều hợp lệ – chỉ dùng các dạng câu cốt lõi`)});
 console.log(`\nTỔNG: ${results.length} ca đạt, ${fails.length} ca thất bại`);if(fails.length)process.exitCode=1;
}catch(e){console.error('FAIL',e);process.exitCode=1}finally{await S.stop()}})();
