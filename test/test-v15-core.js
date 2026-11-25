'use strict';
// Kiểm thử hồi quy V15 cho báo cáo "Lỗi bổ sung" (L01–L09, mục 4.x) và đặc tả câu hỏi/media (mục 5, ca Q01–Q11) – Node >= 22
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const port=18983,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-v15-'));const PASS='test-admin-password-strong';
const env={...process.env,PORT:String(port),ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json')};
let app=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env});let out='';app.stdout.on('data',x=>out+=x);app.stderr.on('data',x=>out+=x);
const url='http://127.0.0.1:'+port;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(){for(let i=0;i<80;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await sleep(100)}throw Error('no start')}
async function req(method,p,body,cookie){const r=await fetch(url+p,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const text=await r.text();let data=null;try{data=JSON.parse(text)}catch{}return {status:r.status,data,text,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(cookie){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,cookie?{headers:{Cookie:cookie}}:undefined);let waiters=[];const C={log:[],last:null};
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state')C.last=m;C.log.push(m);waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};
 C.ready=new Promise(r=>ws.onopen=r);C.raw=m=>ws.send(JSON.stringify(m));
 C.next=(p,l,ms=6000)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+l)),ms);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})});
 C.answer=async(m)=>{const s=C.last;const w=C.next(x=>x.type==='answered'||x.type==='answer_rejected'||x.type==='error','ans');C.raw({type:'answer',eid:s.eid,qid:s.q?.qid,sid:'s'+Math.random().toString(36).slice(2),...m});return w};
 C.close=()=>ws.close();return C}
const ok=s=>console.log('PASS',s);
(async()=>{try{await wait();
 const A=await req('POST','/api/login',{role:'admin',password:PASS});
 const mk=async(title,user)=>{const pin=(await req('POST','/api/rooms',{title,mcUser:user,password:'password-test-0123'},A.cookie)).data.pin;const M=await req('POST','/api/login',{role:'mc',pin,user,password:'password-test-0123'});
  const c=client(M.cookie);await c.ready;let w=c.next(m=>m.type==='state','host');c.raw({type:'host_auth',pin});await w;
  const cmd=async(m,pred=()=>true)=>{const w=c.next(x=>(x.type==='state'&&pred(x))||x.type==='error',m.type);c.raw(m);const r=await w;if(r.type==='error')throw Error(m.type+': '+r.message);return r};
  const cmdErr=async m=>{const w=c.next(x=>x.type==='error','err '+m.type);c.raw(m);return (await w).message};
  const join=async(name,extra={})=>{const p=client();await p.ready;const w=p.next(m=>m.type==='state'&&m.my,'join '+name);p.raw({type:'join',pin,name,...extra});await w;return p};
  return {pin,c,cmd,cmdErr,join,cookie:M.cookie}};
 // ================= L01: gia hạn không làm đổi thang điểm tốc độ =================
 {const R=await mk('L01','mcl01');await R.cmd({type:'set_option',autoReveal:false,streak:false});await R.cmd({type:'bank_set',bank:[{q:'Tốc độ?',a:['A','B'],c:0,t:6}]},x=>x.bank.length===1);
  const P1=await R.join('Người A'),P2=await R.join('Người B'),P3=await R.join('Người C');
  const wrun=[P1,P2,P3].map(p=>p.next(m=>m.type==='state'&&m.phase==='running','run'));const s=await R.cmd({type:'start'},x=>x.phase==='running');await Promise.all(wrun);
  await sleep(1000);const a1=await P1.answer({choice:0});assert.equal(a1.type,'answered');
  const e=await R.cmd({type:'extend',add:10},x=>x.q?.extra===10);assert.equal(e.q.t,6,'thời gian gốc giữ nguyên');assert.ok(e.q.deadline-s.q.deadline>=9990);
  await sleep(1500);const a2=await P2.answer({choice:0});assert.equal(a2.type,'answered');
  await sleep(4300);const a3=await P3.answer({choice:0});assert.equal(a3.type,'answered','trả lời trong phần cộng thêm vẫn được nhận');
  const rv=await R.cmd({type:'reveal'},x=>x.phase==='reveal');const sc=n=>rv.leaderboard.find(p=>p.name===n).score;
  assert.ok(sc('Người A')>sc('Người B'),`A trả lời sớm hơn phải nhiều điểm hơn: A=${sc('Người A')} B=${sc('Người B')}`);assert.equal(sc('Người C'),300);
  ok(`L01: gia hạn +10s chỉ kéo dài hạn nộp – A (≈1s) ${sc('Người A')} > B (≈2,5s, sau gia hạn) ${sc('Người B')}; C trả lời trong phần cộng thêm được mức tối thiểu ${sc('Người C')} (trước đây B được nhiều hơn A)`);
  // ======== L02: giữ nguyên ký hiệu so sánh; ACK không lộ đúng/sai ========
  await R.cmd({type:'next'},x=>x.phase==='finished');
  const txt='Khẳng định nào đúng: 5 < 10 và 20 > 15?',opt='<b>x</b> & "y"';
  await R.cmd({type:'reset'},x=>x.phase==='idle');const b=await R.cmd({type:'bank_set',bank:[{q:txt,a:[opt,'10 > 5'],c:0,t:20}]},x=>x.bank[0]?.q===txt);
  assert.equal(b.bank[0].a[0],opt);const wpq=P1.next(m=>m.type==='state'&&m.q&&m.phase==='running','pq');const st=await R.cmd({type:'start'},x=>x.phase==='running');assert.equal(st.q.q,txt);
  const pq=await wpq;assert.equal(pq.q.a[0],opt);assert.equal(pq.q.answer,null);
  const ack=await P1.answer({choice:0});assert.equal(ack.answer.saved,true);assert.equal(ack.answer.correct,undefined);assert.equal(ack.answer.points,undefined);
  ok('L02: "5 < 10 và 20 > 15", "<b>x</b> & \\"y\\"" lưu và gửi nguyên văn (hiển thị luôn escape – xem test giao diện); xác nhận nhận bài không lộ đúng/sai/điểm');
  // ======== L06: luồng thống nhất ========
  let x=await R.cmd({type:'reveal'},y=>y.phase==='reveal');assert.equal(x.actions.next,true);assert.equal(x.actions.nextLabel,'XƯỚNG DANH CHUNG CUỘC');const again=await R.cmd({type:'reveal'});assert.equal(again.phase,'reveal','bấm lặp KHOÁ & CÔNG BỐ không đổi trạng thái');
  x=await R.cmd({type:'next'},y=>y.phase==='finished');assert.equal(x.actions.next,false);assert.match(await R.cmdErr({type:'next'}),/Hãy mở câu hỏi|kết thúc/);
  ok('L06: câu cuối → KHOÁ & CÔNG BỐ hiện đáp án (không nhảy thẳng xướng danh) → nút "XƯỚNG DANH CHUNG CUỘC"; nút MC lấy đúng luật máy chủ (actions)');
  for(const p of [P1,P2,P3])p.close();R.c.close()}
 // ================= L06 nhiều chặng + 4.1 hạng cá nhân + 4.4 luật hoà & điều kiện vinh danh =================
 {const R=await mk('Luật','mcrule');await R.cmd({type:'set_option',autoReveal:false,streak:false,scoring:'accuracy'});
  await R.cmd({type:'bank_set',bank:[{stage:0,q:'1',a:['A','B'],c:0,t:20},{stage:0,q:'2',a:['A','B'],c:0,t:20},{stage:1,q:'3',a:['A','B'],c:0,t:20}]},x=>x.bank.length===3);
  const P=[];for(const n of ['An','Bình','Chi','Dũng'])P.push(await R.join(n));
  const round=async(answers)=>{const ws=P.map(p=>p.next(m=>m.type==='state'&&m.phase==='running','r'));await R.cmd({type:'start'},x=>x.phase==='running');await Promise.all(ws);for(const [i,ch] of answers)await P[i].answer({choice:ch});return R.cmd({type:'reveal'},x=>x.phase==='reveal')};
  const wme=P[2].next(m=>m.type==='state'&&m.phase==='reveal'&&m.my?.rank,'myrank');let s=await round([[0,0],[1,0],[2,1]]);assert.equal(s.actions.nextLabel,'CÂU TIẾP THEO');
  const me=await wme;assert.equal(me.my.rank,3);assert.equal(me.progress.scoredDone,1);
  ok(`4.1: sau mỗi lần công bố MỌI sĩ tử có hạng riêng (Chi: hạng ${me.my.rank}/${me.count}, đúng ${me.my.correct}/${me.progress.scoredDone})`);
  s=await R.cmd({type:'next'},x=>x.phase==='ready');s=await round([[0,0],[1,0],[2,1]]);assert.equal(s.actions.nextLabel,'TỔNG KẾT CHẶNG');
  s=await R.cmd({type:'next'},x=>x.phase==='intermission');assert.equal(s.completedStage,0);s=await R.cmd({type:'next'},x=>x.phase==='ready');assert.equal(s.idx,2);
  ok('L06: cuối chặng: công bố → TỔNG KẾT CHẶNG → câu đầu chặng sau (không bỏ qua lời chúc chặng)');
  s=await round([[0,0],[1,0]]);
  const sh=await R.cmd({type:'set_option',rules:{tie:'shared',minCorrect:1,minScore:1}},x=>x.rules?.tie==='shared');const lb=sh.leaderboard;
  assert.equal(lb[0].rank,1);assert.equal(lb[1].rank,1,'An và Bình bằng điểm, bằng số câu → đồng hạng');assert.equal(lb[2].rank,3);
  s=await R.cmd({type:'next'},x=>x.phase==='finished');const H=s.honors;assert.equal(H.length,2);assert.ok(H.every(h=>h.title==='Đồng Trạng nguyên'));assert.ok(!H.some(h=>h.name==='Chi'||h.name==='Dũng'));
  ok(`4.4: luật "đồng hạng" → ${H.map(h=>h.name+' – '+h.title).join(', ')}; Chi (0 câu đúng) và Dũng (không trả lời) không được vinh danh dù đứng trong top 3; thời điểm ghi danh không quyết định hạng`);
  // ======== 4.5 lịch sử trước khi đặt lại ========
  await R.cmd({type:'reset'},x=>x.phase==='idle'&&x.history?.length===1);const hs=await req('GET',`/api/rooms/${R.pin}/history`,null,R.cookie);assert.equal(hs.status,200);assert.equal(hs.data.items[0].top[0].score,3000);
  const hc=await req('GET',`/api/rooms/${R.pin}/history/${hs.data.items[0].eid}.csv`,null,R.cookie);assert.match(hc.text,/An/);assert.match(hc.text,/MC làm lại từ đầu/);
  ok('4.5: "Làm lại kỳ thi" tự lưu bảng kết quả cũ vào lịch sử phòng (xem & tải CSV được) trước khi xoá điểm');
  for(const p of P)p.close();R.c.close()}
 // ================= L04/L05: phiên bản bộ đề, bản nháp =================
 {const R=await mk('Nháp','mcdraft');const v=R.c.last.bankVer;const w=R.c.next(m=>m.type==='bank_saved','saved');R.c.raw({type:'bank_set',bank:[{q:'Mới',a:['A','B'],c:1,t:20}],baseVer:v,draftId:'d1'});const bs=await w;assert.equal(bs.draftId,'d1');
  assert.match(await R.cmdErr({type:'bank_set',bank:[{q:'Cũ',a:['A','B'],c:1,t:20}],baseVer:v}),/đã thay đổi/);
  await R.cmd({type:'bank_lock',on:true},x=>x.bankLocked);assert.match(await R.cmdErr({type:'q_add',q:{q:'x',a:['A','B'],c:0,t:20}}),/KHOÁ/);
  ok('L04/L05: áp dụng bản nháp có xác nhận "bank_saved" (giao diện chỉ xoá bản nháp/bản xem trước sau xác nhận); bản nháp dựa trên phiên bản cũ bị chặn; khoá bộ đề đã duyệt');
  R.c.close()}
 // ================= L08 avatar, L09 CSV =================
 {const R=await mk('CSV','mccsv');await R.cmd({type:'set_option',autoReveal:false});await R.cmd({type:'bank_set',bank:[{q:'x',a:['A','B'],c:0,t:20}]});
  const names=['=1+1','+SUM(A1)','-2+3','@cmd',' =HYPERLINK("x")'];const Ps=[];for(const n of names)Ps.push(await R.join(n,{avatar:'👨🏻'}));
  const avs=R.c.last.players?R.c.last.players.map(p=>p.avatar):[];
  const st=await R.cmd({type:'set_title',title:'CSV'});assert.ok(st.players.every(p=>p.avatar==='👨🏻‍🎓'),JSON.stringify(st.players.map(p=>p.avatar)));
  const P9=await R.join('Lạ',{avatar:'<img>'});const st2=await R.cmd({type:'set_title',title:'CSV2'});assert.equal(st2.players.find(p=>p.name==='Lạ').avatar,'📜');
  ok('L08: avatar bị cắt dở "👨🏻" được khôi phục thành "👨🏻‍🎓" theo danh sách cho phép; giá trị lạ → "📜"');
  const rep=await req('GET',`/api/rooms/${R.pin}/report.csv`,null,R.cookie);for(const n of names){const cell="'"+n.trim().replace(/"/g,'""');assert.ok(rep.text.includes(cell),'thiếu ô an toàn cho '+n)}
  assert.ok(!/(^|,)=1\+1/m.test(rep.text));const ex=await req('GET',`/api/rooms/${R.pin}/export`,null,A.cookie);assert.ok(ex.text.includes("'=1+1"));
  ok("L09: tên =1+1, +SUM(A1), -2+3, @cmd, ' =HYPERLINK' xuất ra CSV có dấu ' phía trước – bảng tính hiển thị như chữ, không chạy công thức (báo cáo MC & xuất Admin)");
  for(const p of [...Ps,P9])p.close();R.c.close()}
 // ================= Q04 chọn nhiều, Q03 xáo trộn, Q07 nhập số, Q06 gõ chữ, Q05 sắp xếp, Q11 khảo sát, hệ số điểm, chế độ tự tin =================
 {const R=await mk('Dạng câu','mcq');await R.cmd({type:'set_option',autoReveal:false,streak:false,scoring:'accuracy'});
  const bank=[
   {q:'Chọn các vị vua nhà Lê',kind:'multi',a:['Lê Lợi','Lý Công Uẩn','Lê Thánh Tông','Trần Nhân Tông'],cs:'A,C',t:30,shuffle:true},
   {q:'Chọn các vị vua nhà Lê (chấm một phần)',kind:'multi',a:['Lê Lợi','Lý Công Uẩn','Lê Thánh Tông','Trần Nhân Tông'],cs:[0,2],partial:true,t:30,pts:2},
   {q:'Năm khoa thi đầu tiên?',kind:'number',c:1075,tol:0,unit:'năm',t:30},
   {q:'Một nửa của 25?',kind:'number',c:12.5,tol:0.1,unit:'kg',t:30},
   {q:'Kinh đô thời Lý?',kind:'type',acc:['Thăng Long'],t:30},
   {q:'Xếp thứ tự',kind:'order',a:['Thi Hương','Thi Hội','Thi Đình','Điện thí'],t:30,partial:true},
   {q:'Bạn thích những chặng nào?',kind:'poll',pmulti:true,a:['Hương','Hội','Đình'],t:30},
   {q:'Câu ảnh',kind:'mc',a:['','Chữ B'],ai:['/media/abcdefabcdef.png',''],c:0,t:30,pts:0}];
  let s=await R.cmd({type:'bank_set',bank},x=>x.bank.length===bank.length);assert.deepEqual(s.bank[0].cs,[0,2]);assert.equal(s.bank[7].ai[0],'/media/abcdefabcdef.png');
  const P=[];for(const n of ['Mai','Lan','Cúc','Trúc'])P.push(await R.join(n));
  const open=async()=>{const waits=P.map(p=>p.next(m=>m.type==='state'&&m.phase==='running'&&m.q,'r'));s=await R.cmd({type:'start'},x=>x.phase==='running');const got=await Promise.all(waits);return got[0].q};
  const close=async()=>{s=await R.cmd({type:'reveal'},x=>x.phase==='reveal');const r=s;await R.cmd({type:'next'},x=>['ready','intermission','finished'].includes(x.phase));return r};
  const pts=(st,n)=>st.leaderboard.find(p=>p.name===n).score;
  // Q04 + Q03
  let q=await open();assert.equal(q.answer,null);assert.ok(!('cs' in q));assert.equal(q.need,2);const pos=id=>q.ids.indexOf(id);assert.deepEqual([...q.ids].sort(),[0,1,2,3]);
  assert.equal(q.a[pos(0)],'Lê Lợi','nội dung đi cùng mã gốc sau khi xáo');
  let r=await P[0].answer({choices:[2,0]});assert.equal(r.type,'answered');r=await P[1].answer({choices:[0]});r=await P[2].answer({choices:[0,1,2]});
  r=await P[3].answer({choices:[]});assert.equal(r.type,'answer_rejected');r=await P[3].answer({choices:[0,0]});assert.equal(r.type,'answer_rejected');r=await P[3].answer({choices:[9]});assert.equal(r.type,'answer_rejected');
  r=await P[0].answer({choices:[0,2]});assert.equal(r.type,'answer_rejected','đã nộp – không nộp lần hai');
  let rv=await close();assert.ok(pts(rv,'Mai')>0);assert.equal(pts(rv,'Lan'),0);assert.equal(pts(rv,'Cúc'),0);assert.deepEqual(rv.q.answer,[0,2]);
  ok('Q03/Q04: chọn nhiều – chấm theo MÃ phương án sau khi xáo (LED & điện thoại cùng thứ tự); đúng đủ tập mới có điểm, thiếu/thừa = 0; rỗng/trùng/mã lạ bị từ chối; không nộp lần hai');
  q=await open();assert.equal(q.partial,true);assert.equal(q.pts,2);await P[0].answer({choices:[0,2]});await P[1].answer({choices:[0]});await P[2].answer({choices:[0,1,2]});
  const before=rv;rv=await close();const d=n=>pts(rv,n)-pts(before,n);assert.equal(d('Mai'),2000);assert.equal(d('Lan'),1000);assert.equal(d('Cúc'),1000);
  assert.equal(rv.leaderboard.find(p=>p.name==='Lan').correct,0,'đúng một phần không tính là câu đúng');
  ok(`chấm một phần (bật cho câu) + hệ số ×2: đủ 2/2 → +${d('Mai')}; 1/2 → +${d('Lan')}; 2 đúng 1 sai → (2−1)/2 → +${d('Cúc')}; một phần KHÔNG tính "câu đúng"`);
  // Q07
  const pre7=Object.fromEntries(rv.leaderboard.map(p=>[p.name,p.correct]));q=await open();assert.equal(q.unit,'năm');
  r=await P[0].answer({text:'1075'});assert.equal(r.type,'answered');r=await P[1].answer({text:'1,075'});assert.equal(r.type,'answer_rejected');assert.match(r.message,/không rõ/);
  r=await P[1].answer({text:'1074+1'});assert.equal(r.type,'answer_rejected');r=await P[1].answer({text:'1075 năm'});assert.equal(r.type,'answered');r=await P[2].answer({text:'1076'});r=await P[3].answer({text:'mười'});assert.equal(r.type,'answer_rejected');assert.equal(r.fix,true);
  rv=await close();assert.deepEqual(['Mai','Lan','Cúc'].map(n=>rv.leaderboard.find(p=>p.name===n).correct-pre7[n]),[1,1,0]);
  const c0=Object.fromEntries(rv.leaderboard.map(p=>[p.name,p.correct]));assert.equal(rv.leaderboard.find(p=>p.name==='Mai').correct-c0.Mai,0);
  q=await open();r=await P[0].answer({text:'12,5 kg'});assert.equal(r.type,'answered');r=await P[1].answer({text:'12.6'});r=await P[2].answer({text:'12,61'});r=await P[3].answer({text:'-12,5'});assert.equal(r.type,'answered');rv=await close();
  const cor=n=>rv.leaderboard.find(p=>p.name===n).correct-c0[n];assert.deepEqual(['Mai','Lan','Cúc','Trúc'].map(cor),[1,1,0,0]);
  ok('Q07: nhập số – "1075", "1075 năm" đúng; "1,075" (mơ hồ) và "1074+1" (biểu thức), "mười" bị từ chối để nhập lại; "12,5 kg" = 12.5; biên sai số ±0,1: 12.6 đúng, 12,61 sai; số âm đọc được');
  assert.equal(rv.q.answer.c,12.5);
  // Q06
  q=await open();assert.deepEqual(q.rule,{caseOn:false,loose:false,punct:false});
  const pre6=Object.fromEntries(rv.leaderboard.map(p=>[p.name,p.correct]));r=await P[0].answer({text:'  thăng   long. '});r=await P[1].answer({text:'Thang Long'});r=await P[2].answer({text:'Thăng Lông'});rv=await close();
  assert.deepEqual(['Mai','Lan','Cúc'].map(n=>rv.leaderboard.find(p=>p.name===n).correct-pre6[n]),[1,0,0]);
  const lastAns=async(p)=>{const m=p.last;return m.my?.answer};
  ok('Q06: gõ chữ – mặc định giữ dấu tiếng Việt: "  thăng   long. " đúng (chuẩn hoá khoảng trắng/hoa thường/dấu câu đầu-cuối); "Thang Long" (không dấu) và "Thăng Lông" sai trừ khi người soạn bật "chấp nhận không dấu"');
  // Q05
  q=await open();assert.equal(q.a.length,4);const perm=q.a.map(x=>['Thi Hương','Thi Hội','Thi Đình','Điện thí'].indexOf(x));const right=[0,1,2,3].map(k=>perm.indexOf(k));
  r=await P[0].answer({order:right});assert.equal(r.type,'answered');r=await P[1].answer({order:[0,1,2]});assert.equal(r.type,'answer_rejected');r=await P[1].answer({order:[0,0,1,2]});assert.equal(r.type,'answer_rejected');
  r=await P[1].answer({order:[right[1],right[0],right[2],right[3]]});assert.equal(r.type,'answered');const pre5=Object.fromEntries(rv.leaderboard.map(p=>[p.name,p.score]));rv=await close();
  assert.equal(rv.leaderboard.find(p=>p.name==='Mai').score-pre5.Mai,1000);assert.equal(rv.leaderboard.find(p=>p.name==='Lan').score-pre5.Lan,500);
  ok('Q05: sắp xếp 4 mục – đủ & đúng thứ tự mới được điểm đầy đủ; thiếu mục / lặp mục bị từ chối; chấm một phần (khi bật): 2/4 đúng vị trí → nửa điểm');
  // Q11
  q=await open();r=await P[0].answer({choices:[0,2]});r=await P[1].answer({choices:[0]});r=await P[0].answer({choices:[1]});assert.equal(r.type,'answer_rejected');
  const live=await R.c.next(m=>(m.type==='state'||m.type==='presence')&&m.stats&&m.stats.n===2,'pollstats').catch(()=>null);
  rv=await close();const stp=rv.q.stats;assert.deepEqual(stp.counts,[2,0,1]);assert.equal(stp.n,2);assert.equal(stp.multi,true);
  ok('Q11: khảo sát nhiều lựa chọn – không đổi điểm; mẫu số = số người nộp (2), "Hương" 2/2 = 100%, tổng có thể >100%; gửi lại không cộng phiếu');
  // ảnh phương án + hệ số ×0
  q=await open();assert.equal(q.ai[q.ids.indexOf(0)],'/media/abcdefabcdef.png');const b0=rv;r=await P[0].answer({choice:0});rv=await R.cmd({type:'reveal'},x=>x.phase==='reveal');assert.equal(pts(rv,'Mai'),pts(b0,'Mai'));
  ok('phương án chỉ có ảnh (không chữ) được nhận & gửi kèm mã; câu hệ số ×0 không cộng điểm');
  for(const p of P)p.close();R.c.close()}
 // ================= chế độ tự tin, media phát xong mới mở trả lời (5.4), LED báo trạng thái & xác nhận lệnh (4.2) =================
 {const R=await mk('Media','mcmedia');await R.cmd({type:'set_option',autoReveal:false,streak:false,confidence:true});
  await R.cmd({type:'bank_set',bank:[{q:'Nghe đoạn trống?',a:['Trống cái','Kèn'],c:0,t:20,media:{kind:'audio',src:'/media/abcdefabcdef.mp3',start:2,end:9}},{q:'Câu 2',a:['A','B'],c:1,t:20}]});
  const led=client();await led.ready;let w=led.next(m=>m.type==='state','led');led.raw({type:'watch',pin:R.pin});await w;
  w=R.c.next(m=>m.type==='leds','leds');led.raw({type:'led_status',s:{id:'abc',label:'LED sân khấu',ready:true,sound:'blocked',film:'loading',filmPct:40}});const L=await w;assert.equal(L.leds[0].label,'LED sân khấu');assert.equal(L.leds[0].sound,'blocked');
  {const wt=led.next(m=>m.type==='led_main','ghép đôi');R.c.raw({type:'set_main_led',conn:L.leds[0].conn});await wt} // F03: MC ghép đôi màn LED chính (máy chủ cấp token)
  w=R.c.next(m=>m.type==='vq_ok','vqok');const wl=led.next(m=>m.type==='vq','vq');R.c.raw({type:'vq',cmd:'test',cid:'c1'});const vo=await w;assert.equal(vo.sent,1);const lv=await wl;assert.equal(lv.cid,'c1');
  w=R.c.next(m=>m.type==='led_ack','ack');led.raw({type:'led_ack',cid:'c1',cmd:'test',ok:false,note:'trình duyệt CHẶN tiếng'});const ak=await w;assert.equal(ak.ok,false);assert.match(ak.note,/CHẶN/);
  ok('4.2: LED báo trạng thái thật (sẵn sàng / tiếng bị chặn / đang tải phim 40%); lệnh có mã, MC biết gửi tới mấy LED và LED nào thực hiện được hay không');
  const P1=await R.join('Tự tin'),P2=await R.join('Liều');
  const wpm=P1.next(m=>m.type==='state'&&m.phase==='media','pm');let s=await R.cmd({type:'start'},x=>x.phase==='media');assert.equal(s.q.waitMedia,true);assert.equal(s.q.media.end,9);assert.equal(s.actions.open,true);
  await wpm;let r=await P1.answer({choice:0,boost:true});assert.equal(r.type,'answer_rejected');assert.match(r.message,/Clip đang phát/);
  w=R.c.next(m=>m.type==='state'&&m.phase==='running','open');led.raw({type:'media_done',qid:'sai-ma'});await sleep(200);assert.equal(R.c.last.phase,'media','mã lượt sai không mở được');
  const wr1=P1.next(m=>m.type==='state'&&m.phase==='running','pr'),wr2=P2.next(m=>m.type==='state'&&m.phase==='running','pr2');led.raw({type:'media_done',qid:s.q.qid});s=await w;assert.ok(s.q.deadline>Date.now()+18000,'đồng hồ chung bắt đầu SAU khi phát xong');
  ok('5.4: câu có âm thanh – phát trên LED trước (đoạn 2–9 giây), chưa nhận bài; LED báo phát xong → máy chủ mở lượt & bắt đầu đếm giờ chung (MC có nút mở ngay khi LED lỗi)');
  await wr1;await wr2;
  r=await P1.answer({choice:0,boost:true});r=await P2.answer({choice:1,boost:true});
  let rv=await R.cmd({type:'reveal'},x=>x.phase==='reveal');const a1=rv.leaderboard.find(p=>p.name==='Tự tin'),a2=rv.leaderboard.find(p=>p.name==='Liều');
  assert.ok(a1.score>=1050,'đúng + chắc chắn cấp 1 = +50');assert.equal(a2.score,0,'sai + chắc chắn không làm tổng điểm âm');
  await R.cmd({type:'next'},x=>x.phase==='ready');const wp2=P1.next(m=>m.type==='state'&&m.phase==='running'&&m.idx===1,'p2');s=await R.cmd({type:'start'},x=>x.phase==='running');await wp2;
  r=await P1.answer({choice:1,boost:true});rv=await R.cmd({type:'reveal'},x=>x.phase==='reveal');const a1b=rv.leaderboard.find(p=>p.name==='Tự tin');assert.ok(a1b.score-a1.score>=1075&&a1b.score-a1.score<=1075+1000);
  ok(`chế độ Tự tin: đúng + "Chắc chắn" cấp 1 → +50, câu sau cấp 2 → +75; sai + "Chắc chắn" bị trừ nhưng tổng không âm (Tự tin ${a1b.score}, Liều ${a2.score})`);
  P1.close();P2.close();led.close();R.c.close()}
 // ================= L03: nhập đề dài / phương án trùng – báo lỗi, không cắt âm thầm =================
 {const {importQuestions}=require('../importer.js');const long='Câu hỏi '+'rất dài '.repeat(52)+'?';const optA='Phương án '+'giống nhau '.repeat(28)+'KẾT THÚC A',optB='Phương án '+'giống nhau '.repeat(28)+'KẾT THÚC B';
  const csv=`Câu hỏi,A,B,C,D,Đáp án\n"${long}",Một,Hai,,,A\nNgắn gọn?,"${optA}","${optB}",,,A\nTrùng?,Hà Nội,hà  nội,,,A\nGần trùng?,Sĩ tử,Si tu,,,A\nỔn?,Có,Không,,,A\n`;
  const r=importQuestions('content-audit.csv',Buffer.from(csv,'utf8'));
  assert.equal(r.questions.length,2);assert.equal(r.errors.length,3);assert.match(r.errors[0].why,/câu hỏi dài \d+ ký tự \(tối đa 260\)/);assert.match(r.errors[1].why,/phương án A dài \d+ ký tự/);assert.match(r.errors[2].why,/giống hệt nhau/);
  assert.ok(r.warnings.some(w=>/chỉ khác nhau ở dấu/.test(w.why)));assert.ok(r.questions.every(q=>q.a.every(x=>x.length<=160)));
  ok(`L03: tệp CSV có câu ${long.length} ký tự và hai phương án ${optA.length}/${optB.length} ký tự → BÁO LỖI từng câu (không cắt ngắn, không biến 2 phương án thành giống nhau); "Hà Nội"/"hà  nội" bị chặn trùng; "Sĩ tử"/"Si tu" chỉ cảnh báo`)}
 // ================= Q01: bộ đề V13 cũ chạy lại nguyên vẹn; Q02 round-trip JSON =================
 {const R=await mk('V13','mcv13');const v13=JSON.parse(fs.readFileSync(path.join(__dirname,'..','questions.json'),'utf8'));const list=Array.isArray(v13)?v13:v13.questions;
  const s=await R.cmd({type:'bank_set',bank:list},x=>x.bank.length===list.length);s.bank.forEach((q,i)=>{assert.equal(q.q,list[i].q);assert.deepEqual(q.a,list[i].a);assert.equal(q.c,list[i].c);assert.equal(q.t,list[i].t);assert.equal(q.stage,list[i].stage)});
  const ids=s.bank.map(q=>q.id);const s2=await R.cmd({type:'bank_set',bank:s.bank},x=>x.bankVer>s.bankVer);assert.deepEqual(s2.bank.map(q=>q.id),ids);assert.deepEqual(s2.bank,s.bank);
  ok(`Q01/Q02: bộ đề V13 (${list.length} câu {stage,q,a,c,t}) nhập nguyên vẹn nội dung/đáp án/chặng/thời gian, có mã câu ổn định; xuất → nhập lại giữ nguyên mọi trường`);R.c.close()}
}catch(e){console.error('FAIL',e);console.error(out.slice(-1500));process.exitCode=1}finally{app.kill()}})();
