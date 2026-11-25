'use strict';
/* Kiểm thử CHƯƠNG TRÌNH LIÊN HOÀN + TRỌNG TÀI: đội, hoạt động quiz/chấm tay, hệ số; trọng tài chỉ chấm hoạt động được giao,
   sửa điểm phải ghi lý do (lưu lịch sử), lấy điểm đội từ phòng quiz, bảng tổng & đồng hạng, giữ kín / khoá điểm, cách ly khách, báo cáo CSV, khởi động lại. */
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results=[],fails=[];const ok=s=>{console.log('PASS',s);results.push(s)};const KEEP=process.env.AUDIT_KEEP_GOING==='1';
async function step(n,fn){try{await fn()}catch(e){fails.push(n);console.log("FAIL",n,"–",String(e.message||e).split("\n").slice(0,8).join(" "));if(!KEEP)throw e}}
const port=18954,url='http://127.0.0.1:'+port,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-lh-'));
let app;function start(){app=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:String(port),ADMIN_PASSWORD:'lh-admin-password-1',SESSION_SECRET:'lh-session-secret-long-enough',DATA_FILE:path.join(dir,'rooms.json'),DATABASE_URL:''}});let out='';app.stdout.on('data',x=>out+=x);app.stderr.on('data',x=>out+=x);app.out=()=>out}
process.on('exit',()=>{try{app.kill('SIGKILL')}catch{}});
async function wait(){for(let i=0;i<100;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await sleep(100)}throw Error('server')}
async function req(m,p,b,c){const r=await fetch(url+p,{method:m,headers:{'Content-Type':'application/json',...(c?{Cookie:c}:{})},body:b?JSON.stringify(b):undefined});const t=await r.text();let d=null;try{d=JSON.parse(t)}catch{}return {status:r.status,data:d,text:t,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function ws(c){const s=new WebSocket(`ws://127.0.0.1:${port}/ws`,c?{headers:{Cookie:c}}:undefined);const C={h:[],last:null};s.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state')C.last=m;C.h=C.h.filter(w=>!w(m))};C.ready=new Promise(r=>s.onopen=r);C.send=m=>s.send(JSON.stringify(m));C.when=(p,ms=8000)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('timeout')),ms);C.h.push(m=>{if(p(m)){clearTimeout(t);r(m);return true}return false})});C.close=()=>s.close();return C}
(async()=>{start();try{await wait();const A=(await req('POST','/api/login',{role:'admin',password:'lh-admin-password-1'})).cookie;
 await req('POST','/api/tenants',{name:'Ngân hàng Sao Việt',login:'saoviet',password:'password-saoviet-1',maxRooms:3,maxPlayers:100,days:30},A);
 await req('POST','/api/tenants',{name:'Khách Khác',login:'khackhac',password:'password-khackhac1',maxRooms:1,days:30},A);
 const K=(await req('POST','/api/login',{role:'owner',login:'saoviet',password:'password-saoviet-1'})).cookie,K2=(await req('POST','/api/login',{role:'owner',login:'khackhac',password:'password-khackhac1'})).cookie;
 let E,J1,J2,quizPin;
 await step('TAO_CHUONG_TRINH',async()=>{let r=await req('POST','/api/events',{name:'Team building Sao Việt 2026'},K);assert.equal(r.status,201,r.text);E=r.data;assert.match(E.code,/^[A-Z2-9]{6}$/);
  r=await req('PUT',`/api/events/${E.id}/teams`,{teams:[{name:'Đội Rồng'},{name:'Đội Phượng'},{name:'Đội Lân'}]},K);assert.equal(r.status,200,r.text);E=r.data;
  assert.equal((await req('PUT',`/api/events/${E.id}/teams`,{teams:[{name:'A'},{name:'a'}]},K)).status,400,'tên đội trùng bị chặn');
  const pin=(await req('POST','/api/rooms',{title:'Quiz Sao Việt',mcUser:'mc',password:'password-mc-sv-01'},K)).data.pin;quizPin=pin;
  r=await req('POST',`/api/events/${E.id}/activities`,{name:'Quiz Khoa bảng',kind:'quiz',pin,weight:1},K);assert.equal(r.status,201,r.text);
  r=await req('POST',`/api/events/${E.id}/activities`,{name:'Kéo co',kind:'cham',max:100,weight:2,agg:'avg'},K);r=await req('POST',`/api/events/${E.id}/activities`,{name:'Tiết mục sáng tạo',kind:'cham',max:10,weight:10,agg:'avg'},K);E=r.data;
  assert.equal(E.activities.length,3);
  r=await req('POST',`/api/events/${E.id}/judges`,{name:'Thầy Minh',user:'minh',password:'judge-pass-01',acts:[E.activities[1].id,E.activities[2].id]},K);assert.equal(r.status,201,r.text);
  r=await req('POST',`/api/events/${E.id}/judges`,{name:'Cô Lan',user:'lan',password:'judge-pass-02',acts:[E.activities[2].id]},K);E=r.data;
  assert.equal((await req('GET',`/api/events/${E.id}`,null,K2)).status,403,'khách khác không xem được');assert.ok(!(await req('GET','/api/events',null,K2)).data.items.some(x=>x.id===E.id));
  ok(`Chủ khách tạo chương trình liên hoàn (mã ${E.code}): 3 đội, 3 hoạt động (quiz ×1, kéo co ×2, sáng tạo ×10), 2 trọng tài được giao hoạt động riêng; khách khác không thấy`);
 });
 await step('TRONG_TAI',async()=>{assert.equal((await req('POST','/api/judge/login',{code:E.code,user:'minh',password:'sai-mat-khau'})).status,401);
  J1=(await req('POST','/api/judge/login',{code:E.code,user:'minh',password:'judge-pass-01'})).cookie;J2=(await req('POST','/api/judge/login',{code:E.code.toLowerCase(),user:'LAN',password:'judge-pass-02'})).cookie;
  const me=(await req('GET','/api/judge/me',null,J2)).data;assert.deepEqual(me.event.activities.map(a=>a.name),['Tiết mục sáng tạo'],'cô Lan chỉ thấy hoạt động được giao');
  const [T1,T2,T3]=E.teams,[aQ,aK,aS]=E.activities;const sc=(J,a,t,p,note)=>req('POST',`/api/events/${E.id}/scores`,{act:a.id,team:t.id,points:p,note},J);
  assert.equal((await sc(J2,aK,T1,90)).status,403,'chấm hoạt động không được giao → chặn');assert.equal((await sc(J1,aQ,T1,90)).status,403,'không chấm tay hoạt động quiz');
  assert.equal((await sc(J1,aK,T1,101)).status,400,'quá điểm tối đa');assert.equal((await sc(J1,aK,T1,-1)).status,400);
  for(const [t,p] of [[T1,80],[T2,95],[T3,60]])assert.equal((await sc(J1,aK,t,p)).status,200);
  for(const [t,p,q] of [[T1,8,9],[T2,7,8],[T3,9.5,9]]){await sc(J1,aS,t,p);await sc(J2,aS,t,q)}
  assert.equal((await sc(J1,aK,T1,85)).status,400,'sửa điểm không ghi lý do → chặn');assert.equal((await sc(J1,aK,T1,85,'Đội Rồng được cộng do đội bạn phạm luật')).status,200);
  assert.equal((await req('POST',`/api/events/${E.id}/scores`,{act:aK.id,team:T1.id,points:99},K)).status,403,'chủ khách không chấm thay trọng tài qua đường này');
  ok('Trọng tài đăng nhập bằng mã chương trình + tên + mật khẩu; CHỈ chấm được hoạt động được giao, không vượt điểm tối đa; sửa điểm bắt buộc ghi lý do');
 });
 await step('QUIZ_DOI',async()=>{const H=ws(K);await H.ready;let w=H.when(m=>m.type==='state');H.send({type:'host_auth',pin:quizPin});await w;
  w=H.when(m=>m.type==='state'&&m.teams&&m.teams.length===3);H.send({type:'teams_set',names:['Đội Rồng','Đội Phượng','Đội Lân']});await w.catch(()=>null);
  const st=H.last;assert.ok(st.teams&&st.teams.length===3,'phòng quiz chia 3 đội: '+JSON.stringify(st.teams));
  w=H.when(m=>m.type==='state'&&m.bank&&m.bank.length===1);H.send({type:'bank_set',bank:[{q:'1+1?',a:['2','3'],c:0,t:30}]});await w;H.send({type:'set_option',autoReveal:false});
  const P=[];for(const [n,ti] of [['An',0],['Bình',0],['Chi',1],['Dũng',2]]){const p=ws();await p.ready;const j=p.when(m=>m.type==='state'&&m.my);p.send({type:'join',pin:quizPin,name:n,team:st.teams[ti].id});await j;P.push(p)}
  w=H.when(m=>m.type==='state'&&m.phase==='running');H.send({type:'start'});const s=await w;await sleep(200);
  for(const [i,ch] of [[0,0],[1,1],[2,0],[3,1]]){const a=P[i].when(m=>m.type==='answered');P[i].send({type:'answer',eid:s.eid,qid:s.q.qid,sid:'x'+i,choice:ch});await a}
  w=H.when(m=>m.type==='state'&&m.phase==='reveal');H.send({type:'reveal'});await w;
  const r=await req('POST',`/api/events/${E.id}/import`,{act:E.activities[0].id},K);assert.equal(r.status,200,r.text);assert.equal(r.data.imported,3);E=r.data;
  const q=E.scores.filter(x=>x.act===E.activities[0].id);const by=n=>q.find(x=>x.team===E.teams.find(t=>t.name===n).id).points;
  assert.ok(by('Đội Phượng')>by('Đội Rồng')&&by('Đội Rồng')>0&&by('Đội Lân')===0,'điểm đội = trung bình thành viên: '+JSON.stringify(q.map(x=>x.points)));
  H.close();P.forEach(p=>p.close());
  ok('Lấy điểm đội từ phòng quiz (khớp tên đội): điểm đội = trung bình thành viên như bảng đội của phòng');
 });
 await step('BANG_TONG',async()=>{E=(await req('GET',`/api/events/${E.id}`,null,K)).data;const B=E.board;const [aQ,aK,aS]=E.activities;
  const exp=t=>{const s=E.scores.filter(x=>x.team===t.id);const q=s.find(x=>x.act===aQ.id)?.points||0,k=s.find(x=>x.act===aK.id).points,ss=s.filter(x=>x.act===aS.id).map(x=>x.points);return Math.round((q*1+k*2+ss.reduce((a,b)=>a+b,0)/ss.length*10)*100)/100};
  for(const r of B)assert.equal(r.total,exp(E.teams.find(t=>t.id===r.id)),'tổng có hệ số của '+r.name);
  assert.ok(B[0].total>=B[1].total&&B[1].total>=B[2].total);
  const pub=(await req('GET','/api/events/public/'+E.code)).data;assert.equal(pub.board.length,3);assert.ok(!JSON.stringify(pub).includes('judge-pass')&&!JSON.stringify(pub).includes('"by"'),'công khai không lộ trọng tài');
  await req('PATCH',`/api/events/${E.id}`,{hidden:true},K);const hid=(await req('GET','/api/events/public/'+E.code)).data;assert.equal(hid.hidden,true);assert.ok(!hid.board,'giữ kín → LED không nhận điểm');
  await req('PATCH',`/api/events/${E.id}`,{hidden:false},K);
  ok(`Bảng tổng = Σ hệ số × điểm hoạt động (sáng tạo = trung bình 2 trọng tài); dẫn đầu: ${B[0].name} ${B[0].total}; trang LED công khai không lộ trọng tài; "giữ kín" → LED không nhận điểm`);
 });
 await step('KHOA_VA_BAO_CAO',async()=>{await req('PATCH',`/api/events/${E.id}`,{locked:true},K);
  assert.equal((await req('POST',`/api/events/${E.id}/scores`,{act:E.activities[1].id,team:E.teams[0].id,points:10,note:'sửa sau khoá'},J1)).status,423,'khoá → trọng tài không sửa được');
  assert.equal((await req('PUT',`/api/events/${E.id}/teams`,{teams:[{name:'X'},{name:'Y'}]},K)).status,423);
  const csv=(await fetch(url+`/api/events/${E.id}/report.csv`,{headers:{Cookie:K}}).then(r=>r.text()));
  for(const t of ['Đội Rồng','Thầy Minh','Cô Lan','85','80','Đội Rồng được cộng do đội bạn phạm luật','Quiz phòng '+quizPin,'KHOÁ điểm','ĐÃ KHOÁ ĐIỂM'])assert.ok(csv.includes(t),'CSV phải có '+t);
  await req('PATCH',`/api/events/${E.id}/judges/${E.judges[0].id}`,{revoke:true},K).catch(()=>null);
  ok('Khoá điểm → không ai sửa được; báo cáo CSV có bảng tổng, điểm từng trọng tài, lần sửa (80 → 85 kèm lý do), nguồn quiz và nhật ký');
 });
 await step('KHOI_DONG_LAI',async()=>{app.kill('SIGKILL');await new Promise(r=>app.once('exit',r));start();await wait();
  const K3=(await req('POST','/api/login',{role:'owner',login:'saoviet',password:'password-saoviet-1'})).cookie;const e=(await req('GET',`/api/events/${E.id}`,null,K3)).data;
  assert.equal(e.scores?.length,E.scores.length,'số điểm: '+JSON.stringify(e).slice(0,200));assert.equal(e.locked,true);const jm=await req('GET','/api/judge/me',null,J2);assert.equal(jm.status,200,'phiên trọng tài còn hiệu lực: '+jm.text);
  const p=await fetch(url+'/bangdiem?ma='+E.code);assert.equal(p.status,200);const t=await fetch(url+'/trongtai');assert.equal(t.status,200);
  ok('kill -9 rồi khởi động lại: chương trình, điểm, trạng thái khoá còn nguyên; trang /bangdiem và /trongtai phục vụ bình thường');
 });
 console.log(`\nTỔNG: ${results.length} ca đạt, ${fails.length} ca thất bại${fails.length?' ('+fails.join(', ')+')':''}`);process.exitCode=fails.length?1:0;
}catch(e){console.log('FAIL',e.stack||e);console.log(app.out().slice(-1500));process.exitCode=1}finally{app.kill('SIGKILL')}})();
