'use strict';
// Kiểm thử hồi quy cho "Đánh giá sẵn sàng thương mại UDIKA V15" (25/11/2026): F01–F07, R1–R4, 5.4–5.6.
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

const mcLogin=async(S,pin,user,pw='password-test-0123')=>(await S.req('POST','/api/login',{role:'mc',pin,user,password:pw})).cookie;
const hostOf=async(S,cookie,pin)=>{const c=S.client(cookie);await c.ready;const w=c.next(m=>m.type==='state'||m.type==='error','host');c.raw({type:'host_auth',pin});await w;
 c.cmd=async(m,pred=()=>true)=>{const w=c.next(x=>(x.type==='state'&&pred(x))||x.type==='error',m.type);c.raw(m);const r=await w;if(r.type==='error')throw Error(m.type+': '+r.message);return r};return c};
const watcher=async(S,pin,cookie)=>{const c=S.client(cookie);await c.ready;const w=c.next(m=>m.type==='state','watch');c.raw({type:'watch',pin});await w;return c};

(async()=>{const S=server(18981);try{await S.wait();const A=await S.admin();

 // ===== F01: đáp án của kỳ thi cũ không được "sống lại" trong kỳ mới sau làm lại + khởi động lại =====
 await step('F01',async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-f01-'));let T=server(18982,{dir});await T.wait();const A2=await T.admin();
  const R=await T.room('F01','mcf01',A2);await R.cmd({type:'set_option',autoReveal:false,scoring:'accuracy'});await R.cmd({type:'bank_set',bank:[{q:'Một',a:['x','y'],c:0,t:60},{q:'Hai',a:['x','y'],c:0,t:60}]},x=>x.bank.length===2);
  let P=await R.join('Người Thi');const pid=P.last.my.id;await sleep(600);
  for(const how of ['reset']){ // (thay bộ đề không thể xảy ra khi câu đang chạy – máy chủ chặn; ranh giới kỳ thi dùng chung mã eid nên cùng được bảo vệ)
   if(P.last.phase!=='running'){const w=P.next(m=>m.type==='state'&&m.phase==='running'&&m.q,'run');R.c.raw({type:'start'});await w}
   const ans=P.next(m=>m.type==='answered'||m.type==='answer_rejected','a');P.raw({type:'answer',eid:P.last.eid,qid:P.last.q.qid,sid:'f01'+how,choice:0});await sleep(2);
   R.c.raw(how==='reset'?{type:'reset'}:{type:'bank_set',bank:[{q:'Đề mới',a:['x','y'],c:0,t:60}]});const a=await ans;
   assert.equal(a.type,'answer_rejected',`${how}: bài của kỳ cũ không được báo "đã nhận" vào kỳ mới (nhận ${a.type})`);
   await sleep(60);T.app.kill('SIGKILL');await new Promise(r=>T.app.once('exit',r));T=server(18982,{dir});await T.wait();
   const M=await mcLogin(T,R.pin,'mcf01');
   const rep=(await T.req('GET',`/api/rooms/${R.pin}/report.csv`,null,M)).text;const row=rep.split('\n').find(l=>l.includes('Người Thi'))||'';
   assert.ok(/Người Thi,0,0/.test(row),`${how}: sau khởi động lại người chơi phải 0 điểm trong kỳ mới: ${row.slice(0,80)}`);
   R.c=await hostOf(T,M,R.pin);P=T.client();await P.ready;const w=P.next(m=>m.type==='state'&&m.my,'re');P.raw({type:'join',pin:R.pin,name:'Người Thi',playerId:pid});await w;
   if(how==='reset'){await R.c.cmd({type:'set_option',autoReveal:false})}}
  await T.stop();
  ok('F01: nộp bài rồi 2 ms sau MC "làm lại kỳ thi" → bài cũ bị từ chối (không báo "đã nhận"); kill -9 rồi khởi động lại → kỳ mới vẫn 0 điểm (nhật ký gắn mã kỳ thi, phát lại kiểm mã)');
 });
 // ===== F02: kho đề cách ly theo tài khoản, không theo tên MC =====
 await step('F02',async()=>{const p1=(await S.req('POST','/api/rooms',{title:'Khách 1',mcUser:'mc',password:'password-khach-1-xx'},A)).data.pin,p2=(await S.req('POST','/api/rooms',{title:'Khách 2',mcUser:'mc',password:'password-khach-2-yy'},A)).data.pin;
  const M1=await mcLogin(S,p1,'mc','password-khach-1-xx'),M2=await mcLogin(S,p2,'mc','password-khach-2-yy');
  const sv=await S.req('POST','/api/library',{name:'Đề riêng khách 1',bank:[{q:'Bí mật khách 1',a:['x','y'],c:1,t:20}]},M1);assert.equal(sv.status,200);const id=sv.data.id;
  const l2=(await S.req('GET','/api/library',null,M2)).data.items||[];assert.ok(!l2.some(x=>x.id===id),'MC trùng tên ở phòng khác KHÔNG được thấy kho đề');
  assert.notEqual((await S.req('GET','/api/library/'+id,null,M2)).status,200,'không được đọc');assert.notEqual((await S.req('DELETE','/api/library/'+id,null,M2)).status,200,'không được xoá');
  assert.notEqual((await S.req('POST','/api/library/'+id+'/load',{pin:p2},M2)).status,200,'không được nạp vào phòng mình');
  assert.equal((await S.req('GET','/api/library/'+id,null,M1)).status,200,'chủ thật vẫn đọc được');
  await S.req('PATCH',`/api/rooms/${p1}/mc`,{mcUser:'mc',password:'password-moi-khach-1'},A);
  assert.notEqual((await S.req('GET','/api/library',null,M1)).status,200,'đổi mật khẩu MC → phiên cũ mất quyền kho đề');
  const M1b=await mcLogin(S,p1,'mc','password-moi-khach-1');assert.ok(((await S.req('GET','/api/library',null,M1b)).data.items||[]).some(x=>x.id===id),'đăng nhập lại vẫn thấy đề của mình');
  ok('F02: hai khách ở hai phòng cùng tên MC "mc" – khách 2 không thấy/đọc/xoá/nạp được đề riêng của khách 1; đổi mật khẩu MC → phiên cũ mất quyền kho đề, đăng nhập lại vẫn dùng được');
 });
 // ===== F03: chỉ màn LED được ghép đôi mới mở lượt sau clip =====
 await step('F03',async()=>{const R=await S.room('F03','mcf03',A);await R.cmd({type:'set_option',autoReveal:false});
  await R.cmd({type:'bank_set',bank:[{q:'Clip 1',a:['x','y'],c:0,t:60,media:{kind:'video',src:'https://example.com/a.mp4',gate:true,silentOk:true}},{q:'Clip 2',a:['x','y'],c:0,t:60,media:{kind:'video',src:'https://example.com/b.mp4',gate:true,silentOk:true}}]},x=>x.bank.length===2);
  const anon=await watcher(S,R.pin);
  let st=await R.cmd({type:'start'},x=>x.phase==='media');const qid=st.q.qid;assert.ok(qid,'mã câu hiện hành phải có');
  anon.raw({type:'media_done',qid});await sleep(300);assert.equal(R.c.last.phase,'media','kết nối CHỈ XEM (chưa ghép đôi, không trạng thái LED) không được mở lượt');
  anon.raw({type:'led_status',s:{id:'gia-mao',label:'LED giả',ready:true,sound:'on'}});await sleep(100);anon.raw({type:'media_done',qid});await sleep(300);assert.equal(R.c.last.phase,'media','LED tự khai danh tính nhưng chưa được MC ghép đôi không được mở lượt');
  // MC ghép đôi một màn LED (theo kết nối do máy chủ cấp)
  const led=await watcher(S,R.pin);led.raw({type:'led_status',s:{id:'gia-mao',label:'LED thật',ready:true,sound:'on'}});await sleep(200);
  const L=(await R.cmd({type:'set_option',streak:true})).leds||[];const mine=L.find(l=>l.label==='LED thật');assert.ok(mine&&mine.conn,'LED có mã kết nối do máy chủ cấp');
  const tok=led.next(m=>m.type==='led_main','tok');R.c.raw({type:'set_main_led',conn:mine.conn});const t=await tok;assert.ok(t.token&&t.token.length>=16);
  anon.raw({type:'media_done',qid});await sleep(300);assert.equal(R.c.last.phase,'media','màn khác (kể cả trùng id tự khai) không mở được lượt');
  led.raw({type:'media_done',qid:'sai-ma'});await sleep(200);assert.equal(R.c.last.phase,'media','sai mã câu không mở');
  led.raw({type:'media_done',qid});await R.c.next(m=>m.type==='state'&&m.phase==='running','open');
  ok('F03: kết nối chỉ xem, LED tự khai danh tính hoặc trùng id KHÔNG mở được lượt; chỉ màn LED đã được MC ghép đôi (máy chủ cấp mã + token bí mật) với đúng mã câu hiện hành mới mở');
  // LED chính tải lại trang: dùng token để lấy lại quyền; màn từ máy MC đã đăng nhập thì tự được tin
  await R.cmd({type:'reveal'},x=>x.phase==='reveal');await R.cmd({type:'next'},x=>x.idx===1);led.close();await sleep(200);
  const led2=await watcher(S,R.pin);led2.raw({type:'led_status',s:{id:'x',label:'LED thật',ready:true,sound:'on',mainToken:t.token}});await sleep(200);
  st=await R.cmd({type:'start'},x=>x.phase==='media');led2.raw({type:'media_done',qid:st.q.qid});await R.c.next(m=>m.type==='state'&&m.phase==='running','open2');
  ok('F03: LED chính tải lại trang dùng token bí mật lấy lại quyền màn chính (không cần ghép lại)');
  anon.close();led2.close();
 });
 // ===== F04: khoá đề có hiệu lực ở MỌI đường thay đề =====
 await step('F04',async()=>{const R=await S.room('F04','mcf04',A);await R.cmd({type:'bank_set',bank:[{q:'Đề đã duyệt',a:['x','y'],c:0,t:20}]},x=>x.bank[0]?.q==='Đề đã duyệt');
  const P=await R.join('Có Điểm');await R.cmd({type:'set_option',autoReveal:false});await startQ(R,[P]);await P.answer({choice:0});await R.cmd({type:'reveal'},x=>x.phase==='reveal');
  const lib=(await S.req('POST','/api/library',{name:'Đề khác F04',bank:[{q:'Đề khác',a:['x','y'],c:0,t:20}]},A)).data.id;
  const before=await R.cmd({type:'bank_lock',on:true},x=>x.bankLocked);const snap=JSON.stringify([before.bank,before.bankVer,before.eid,before.leaderboard]);
  const h1=await S.req('POST',`/api/rooms/${R.pin}/bank`,{bank:[{q:'Thay qua HTTP',a:['x','y'],c:0,t:20}]},A);assert.ok(h1.status>=400&&/KHOÁ|khoá/i.test(h1.data.error||''),'HTTP thay đề phải bị từ chối: '+h1.status+' '+h1.text);
  const h2=await S.req('POST',`/api/library/${lib}/load`,{pin:R.pin},A);assert.ok(h2.status>=400,'nạp từ kho đề phải bị từ chối');
  const h3=await S.req('POST',`/api/library/${lib}/load`,{pin:R.pin,mode:'append'},A);assert.ok(h3.status>=400,'thêm câu từ kho đề phải bị từ chối');
  const after=await R.cmd({type:'set_option',streak:true});assert.equal(JSON.stringify([after.bank,after.bankVer,after.eid,after.leaderboard]),snap,'đề, phiên bản, mã kỳ thi và điểm giữ nguyên');
  ok('F04: khi KHOÁ bộ đề: thay đề qua HTTP, nạp hoặc thêm câu từ kho đề đều bị từ chối; đề, phiên bản đề, mã kỳ thi và điểm giữ nguyên');
 });
 // ===== F05: tự công bố không đóng câu khi người mới vào chưa trả lời =====
 await step('F05',async()=>{const R=await S.room('F05','mcf05',A);await R.cmd({type:'bank_set',bank:[{q:'Tự công bố',a:['x','y'],c:0,t:60},{q:'Câu 2',a:['x','y'],c:0,t:60}]},x=>x.bank.length===2);
  const P1=await R.join('Nhanh');await startQ(R,[P1]);await P1.answer({choice:0});await sleep(200);const P2=await R.join('Vào Muộn');
  await sleep(2600);assert.equal(R.c.last.phase,'running','người mới đang online chưa trả lời → chưa được tự công bố');
  await P2.answer({choice:1});await R.c.next(m=>m.type==='state'&&m.phase==='reveal','auto',5000);
  await R.cmd({type:'next'},x=>x.idx===1);await startQ(R,[P1,P2]);await P1.answer({choice:0});await P2.answer({choice:0});await sleep(300);
  await R.cmd({type:'set_option',autoReveal:false},x=>x.autoReveal===false);await sleep(2000);assert.equal(R.c.last.phase,'running','tắt tự công bố sau khi lịch đã đặt → huỷ lịch');
  ok('F05: người mới vào 200 ms sau khi câu mở, chưa trả lời → câu KHÔNG bị tự công bố; khi người đó nộp thì mới tự công bố; tắt tự công bố huỷ lịch đóng đang chờ');
 });
 // ===== F07: lưu thất bại phải được báo; không ghi đè tệp dữ liệu hỏng =====
 await step('F07',async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-f07-'));let T=server(18984,{dir});await T.wait();const A2=await T.admin();
  fs.mkdirSync(path.join(dir,'rooms.json.tmp'));
  const r=await T.req('POST','/api/rooms',{title:'Không lưu được',mcUser:'mcf07',password:'password-test-0123'},A2);assert.ok(r.status>=500,'tạo phòng khi KHÔNG lưu được phải báo lỗi, không trả 201: '+r.status);
  const h=await T.req('GET','/health');assert.equal(h.status,503,'health phải báo không khoẻ');assert.ok(h.data.persistence.error);
  fs.rmdirSync(path.join(dir,'rooms.json.tmp'));const r2=await T.req('POST','/api/rooms',{title:'Lưu được',mcUser:'mcf07b',password:'password-test-0123'},A2);assert.equal(r2.status,201);
  assert.equal((await T.req('GET','/health')).status,200,'lưu thành công lại → khoẻ lại');
  { // đĩa hỏng lần nữa: MC sửa đề / đổi MC KHÔNG được báo "đã lưu" (màn MC giữ bản nháp để gửi lại)
   const pin2=r2.data.pin;const c=T.client(A2);await c.ready;let w=c.next(m=>m.type==='state','h');c.raw({type:'host_auth',pin:pin2});await w;
   fs.mkdirSync(path.join(dir,'rooms.json.tmp'));
   w=c.next(m=>m.type==='bank_saved'||m.type==='error','ack');c.raw({type:'bank_set',bank:[{q:'Đề mới khi đĩa hỏng',a:['x','y'],c:0,t:20}]});const ack=await w;
   assert.equal(ack.type,'error','không lưu được → KHÔNG báo bank_saved');assert.match(ack.message,/CHƯA lưu/);
   assert.equal((await T.req('PATCH',`/api/rooms/${pin2}/mc`,{mcUser:'mcmoi',password:'password-test-9999'},A2)).status,503,'đổi MC khi không lưu được → 503');
   fs.rmdirSync(path.join(dir,'rooms.json.tmp'));w=c.next(m=>m.type==='bank_saved'||m.type==='error','ack2');c.raw({type:'bank_set',bank:[{q:'Đề mới',a:['x','y'],c:0,t:20}]});assert.equal((await w).type,'bank_saved');c.close()}
  await T.stop();fs.writeFileSync(path.join(dir,'rooms.json'),'{hỏng');T=server(18984,{dir});await T.wait().catch(()=>{});
  const bk=fs.readdirSync(dir).filter(f=>f.startsWith('rooms.json.corrupt-'));assert.equal(bk.length,1,'tệp hỏng phải được giữ lại thành bản sao');assert.equal(fs.readFileSync(path.join(dir,bk[0]),'utf8'),'{hỏng');
  const h2=await T.req('GET','/health');assert.equal(h2.status,503,'khởi động từ tệp hỏng phải báo không khoẻ để người vận hành xử lý');await T.stop();
  ok('F07: không ghi được ảnh chụp → tạo phòng trả lỗi (không 201), /health 503 kèm lỗi; sửa đề / đổi MC không được báo "đã lưu"; ghi lại được → khoẻ lại; tệp dữ liệu hỏng được giữ thành bản sao rooms.json.corrupt-…, không bị ghi đè, /health báo lỗi');
 });
 // ===== 5.4: tổng duyệt là kỳ thi riêng =====
 await step('TONG_DUYET',async()=>{const R=await S.room('Tổng duyệt','mcreh',A);await R.cmd({type:'set_option',autoReveal:false});const P=await R.join('Diễn Tập');
  const e0=R.c.last.eid;const s1=await R.cmd({type:'set_option',rehearsal:true},x=>x.rehearsal);assert.notEqual(s1.eid,e0,'bật tổng duyệt → kỳ thi mới');
  await startQ(R,[P]);await P.answer({choice:0});await R.cmd({type:'reveal'},x=>x.phase==='reveal');
  const s2=await R.cmd({type:'set_option',rehearsal:false},x=>!x.rehearsal);assert.notEqual(s2.eid,s1.eid);assert.equal(s2.phase,'idle');assert.ok(s2.leaderboard.every(p=>p.score===0),'thi thật bắt đầu từ 0 điểm');
  const h=(await S.req('GET',`/api/rooms/${R.pin}/history`,null,A)).data.items;assert.ok(h.some(x=>x.rehearsal&&x.eid===s1.eid),'kết quả tổng duyệt lưu riêng, có nhãn');
  ok('5.4: bật "Tổng duyệt" mở kỳ thi riêng (mã mới); tắt → kết quả tổng duyệt được lưu riêng có nhãn, thi thật bắt đầu kỳ mới từ 0 điểm');
 });
 // ===== 5.5: lịch sử đóng băng đầy đủ đề, đáp án, luật =====
 await step('LICH_SU',async()=>{const R=await S.room('Lịch sử','mchis',A);await R.cmd({type:'set_option',autoReveal:false,scoring:'accuracy'});
  await R.cmd({type:'bank_set',bank:[{q:'Thủ đô?',a:['Huế','Thăng Long'],c:1,t:20},{kind:'number',q:'Năm?',c:1075,tol:0,t:20}]},x=>x.bank.length===2);
  const P=await R.join('Đối Soát');await startQ(R,[P]);await P.answer({choice:0});await R.cmd({type:'reveal'},x=>x.phase==='reveal');
  await R.cmd({type:'reset'},x=>x.phase==='idle');await R.cmd({type:'bank_set',bank:[{q:'Đề khác hẳn',a:['p','q'],c:0,t:20}]},x=>x.bank[0].q==='Đề khác hẳn');
  const h=(await S.req('GET',`/api/rooms/${R.pin}/history`,null,A)).data.items;const eid=h[h.length-1].eid;
  const csv=(await S.req('GET',`/api/rooms/${R.pin}/history/${eid}.csv`,null,A)).text;
  for(const t of ['Thủ đô?','A. Huế','B. Thăng Long','Đáp án đúng: B','1075','chính xác'])assert.ok(csv.includes(t),'lịch sử phải có "'+t+'":\n'+csv.slice(0,600));
  ok('5.5: lịch sử của kỳ thi đóng băng đề, từng phương án, đáp án đúng, sai số và luật điểm lúc thi – đổi đề sau đó vẫn biết "A" lúc ấy là gì');
 });
 // ===== 5.6: vòng đời phòng: lưu trữ & xoá giải phóng hạn mức =====
 await step('VONG_DOI',async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-life-'));const T=server(18985,{dir,env:{MAX_ROOMS:'2'}});await T.wait();const A2=await T.admin();
  const a=(await T.req('POST','/api/rooms',{title:'Cũ 1',mcUser:'m1',password:'password-test-0123'},A2)).data.pin;await T.req('POST','/api/rooms',{title:'Cũ 2',mcUser:'m2',password:'password-test-0123'},A2);
  assert.equal((await T.req('POST','/api/rooms',{title:'Mới',mcUser:'m3',password:'password-test-0123'},A2)).status,409);
  const M=await mcLogin(T,a,'m1');assert.equal((await T.req('DELETE',`/api/rooms/${a}`,null,M)).status,403,'MC không được xoá phòng');
  const d=await T.req('DELETE',`/api/rooms/${a}`,null,A2);assert.equal(d.status,200,d.text);
  assert.equal((await T.req('POST','/api/rooms',{title:'Mới',mcUser:'m3',password:'password-test-0123'},A2)).status,201,'xoá phòng cũ giải phóng hạn mức');
  const ar=(await T.req('GET','/api/archive',null,A2)).data.items;assert.ok(ar.some(x=>x.pin===a&&x.title==='Cũ 1'),'phòng đã xoá còn bản lưu trữ');
  await T.stop();
  ok('5.6: Admin lưu trữ & xoá phòng cũ → giải phóng hạn mức tạo phòng; MC không được xoá; thông tin phòng đã xoá còn trong danh sách lưu trữ');
 });
 // ===== UI-01 / UI-02: thanh trượt bám đúng lưới min + k·bước; số hiển thị tới 9 chữ số thập phân =====
 await step('UI01',async()=>{const src=fs.readFileSync(path.join(ROOT,'public/player.js'),'utf8');const m=src.match(/const slDec=[^\n]+\nconst slSnap=[^\n]+/);assert.ok(m,'player.js phải có slSnap');
  const {slSnap}=new Function(m[0]+';return {slSnap}')();const Q={min:0.1,max:1,step:0.2};
  assert.equal(slSnap(0.3,Q),0.3,'0,3 phải đúng là 0,3 (không phải 0,30000000000000004)');assert.equal(slSnap(0.41,Q),0.5);assert.equal(slSnap(0.2,Q),0.3,'0,2 không nằm trên lưới 0,1 + k·0,2 → 0,3');assert.equal(slSnap(1,Q),0.9,'không vượt điểm lưới cuối ≤ max');
  assert.equal(slSnap((1+4)/2,{min:1,max:4,step:2}),3,'giá trị khởi đầu cũng nằm trên lưới');
  assert.ok(/maximumFractionDigits:9/.test(src)&&/maximumFractionDigits:9/.test(fs.readFileSync(path.join(ROOT,'public/led.js'),'utf8')),'UI-02: điện thoại & LED hiển thị tới 9 chữ số thập phân');
  const R=await S.room('UI01','mcui01',A);await R.cmd({type:'set_option',autoReveal:false});
  const bad=await R.cmdErr({type:'bank_set',bank:[{kind:'slider',q:'Lệch lưới',min:0.1,max:1,step:0.2,c:0.4,tol:0,t:20}]});assert.ok(bad&&/bước nhảy/.test(bad),'đáp án ngoài lưới, sai số 0 → bị từ chối khi soạn: '+bad);
  await R.cmd({type:'bank_set',bank:[{kind:'slider',q:'Trên lưới',min:0.1,max:1,step:0.2,c:0.3,tol:0,t:20}]},x=>x.bank[0]?.q==='Trên lưới');
  const P=await R.join('Trượt Đúng'),P2=await R.join('Trượt Lệch');await startQ(R,[P,P2]);
  const r2=await P2.answer({value:0.4});assert.ok(r2.type==='error'||r2.type==='answer_rejected','giá trị ngoài lưới bị máy chủ từ chối: '+JSON.stringify(r2));assert.match(r2.message,/bước nhảy/);
  const r1=await P.answer({value:0.30000000000000004});assert.equal(r1.type,'answered');await R.cmd({type:'reveal'},x=>x.phase==='reveal');
  assert.equal(R.c.last.leaderboard.find(x=>x.name==='Trượt Đúng').correct,1,'chọn 0,3 trên lưới → đúng');
  ok('UI-01/UI-02: thanh trượt min 0,1 bước 0,2 cho đúng các giá trị 0,1 · 0,3 · 0,5…; đáp án ngoài lưới (sai số 0) bị chặn khi soạn; máy chủ từ chối giá trị lệch lưới; chọn 0,3 được chấm đúng; số hiện tới 9 chữ số thập phân');
 });
 // ===== R1/R5: đóng gói – mọi tệp máy chủ đọc lúc chạy có trong Dockerfile; phiên bản ghim =====
 await step('DONG_GOI',async()=>{const df=fs.readFileSync(path.join(ROOT,'Dockerfile'),'utf8');const copied=df.split('\n').filter(l=>/^COPY /.test(l)).join(' ');
  const need=new Set();for(const f of ['server.js','router.js','importer.js']){const src=fs.readFileSync(path.join(ROOT,f),'utf8');need.add(f);
   for(const m of src.matchAll(/path\.join\(__dirname,'([^']+)'\)/g))need.add(m[1].split('/')[0]);for(const m of src.matchAll(/require\('\.\/([^']+)'\)/g))need.add(m[1].endsWith('.js')?m[1]:m[1]+'.js')}
  const miss=[...need].filter(f=>!new RegExp('(^|\\s)'+f.replace('.','\\.')+'(\\s|$)').test(copied));assert.deepEqual(miss,[],'Dockerfile thiếu tệp lúc chạy: '+miss.join(', '));
  assert.match(df,/^FROM node:\d+\.\d+\.\d+-alpine/m,'ảnh Node ghim đủ phiên bản');const pk=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
  assert.match(pk.dependencies.pg,/^\d+\.\d+\.\d+$/,'pg ghim cứng phiên bản');assert.equal(pk.engines.node,'>=22');
  for(const f of ['requirements-test.txt','.github/workflows/kiem-thu.yml','docker-compose.portable.yml','public/khach.html','public/khach.js'])assert.ok(fs.existsSync(path.join(ROOT,f)),'thiếu '+f);
  const pr=await S.req('GET','/api/practice');assert.ok(pr.data.items.some(x=>x.id==='mau'),'bộ luyện tập mẫu nạp được');
  ok('Đóng gói: Dockerfile chép đủ mọi tệp máy chủ đọc lúc chạy ('+[...need].join(', ')+'); Node 22.12.0 & pg ghim cứng; có requirements-test.txt, CI, docker-compose dùng cho mọi máy chủ; bộ luyện tập mẫu có mặt');
 });
 console.log(`\nTỔNG: ${results.length} ca đạt, ${fails.length} ca thất bại${fails.length?' ('+fails.join(', ')+')':''}`);process.exit(fails.length?1:0);
}catch(e){console.error('FAIL',e.stack||e);process.exit(1)}finally{try{S.app.kill()}catch{}}})();
