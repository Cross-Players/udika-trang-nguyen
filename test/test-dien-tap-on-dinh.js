'use strict';
/* DIỄN TẬP MỘT BUỔI THI HOÀN CHỈNH – tự động, có sự cố, rồi ĐỐI SOÁT từng bài (rút kinh nghiệm từ các phản ánh về Kahoot:
   "trả lời rồi mà không được tính", "mạng chậm bị tính sai", "bấm nhầm hai lần nhảy câu", "sập máy chủ mất điểm").
   Kịch bản (mặc định 300 sĩ tử, 12 câu nhiều dạng, 6 giây/câu):
   - sĩ tử trả lời rải rác cả lúc sát giờ; ~5% gửi TRỄ sau khi hết giờ; ~5% bấm gửi HAI LẦN; ~8% rớt mạng giữa câu rồi vào lại bằng mã cũ;
   - MC bấm CÔNG BỐ hai lần, CÂU KẾ TIẾP hai lần (không được nhảy câu), đổi luật không hợp lệ giữa câu (phải bị từ chối);
   - giữa câu 7, máy chủ bị TẮT ĐỘT NGỘT (kill -9) rồi khởi động lại – mọi người vào lại, thi tiếp.
   Đối soát cuối buổi (từ báo cáo CSV của máy chủ):
   (1) bài nào máy chủ đã báo "đã nhận" thì PHẢI có trong báo cáo đúng giá trị đã gửi – không mất bài, kể cả bài nhận ngay trước khi sập;
   (2) bài bị từ chối / gửi trễ KHÔNG được tính; (3) bấm hai lần chỉ tính một; (4) tổng điểm = cộng điểm từng câu; số câu đúng = số ✔;
   (5) chấm đúng/sai khớp đáp án; điểm câu đúng (tốc độ) nằm trong 300–1000 + thưởng chuỗi; (6) xếp hạng giảm dần theo điểm;
   (7) đủ người trong báo cáo; (8) máy chủ khoẻ, không có lỗi chương trình trong nhật ký.
   Chạy: node test/test-dien-tap-on-dinh.js [số sĩ tử]   (DIEN_TAP_SEED=… để lặp lại đúng một kịch bản ngẫu nhiên) */
const assert=require('node:assert/strict');const {spawn,execSync}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');const N=Number(process.argv[2]||process.env.DIEN_TAP_N||300);const T=6;const port=18959,url='http://127.0.0.1:'+port,PASS='dien-tap-admin-password';
let seed=Number(process.env.DIEN_TAP_SEED||Date.now()%1e9);const SEED=seed;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-dientap-'));
let app,out='';function start(){app=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:String(port),ADMIN_PASSWORD:PASS,SESSION_SECRET:'dien-tap-session-secret-long-enough',DATA_FILE:path.join(dir,'rooms.json'),DATABASE_URL:'',RECONNECT_RESERVE:'50',BOT_JOINS:'100000'}});app.stdout.on('data',x=>out+=x);app.stderr.on('data',x=>out+=x)}
process.on('exit',()=>{try{app.kill('SIGKILL')}catch{}});
async function wait(){for(let i=0;i<150;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await sleep(100)}throw Error('máy chủ không khởi động: '+out.slice(-800))}
const rss=()=>{try{return Math.round(Number(execSync(`ps -o rss= -p ${app.pid}`).toString().trim())/1024)}catch{return -1}};
async function req(method,p,body,cookie){const r=await fetch(url+p,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const text=await r.text();let data=null;try{data=JSON.parse(text)}catch{}return {status:r.status,data,text,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function ws(pin,cookie){const s=new WebSocket(`ws://127.0.0.1:${port}/ws?pin=${pin}`,cookie?{headers:{Cookie:cookie}}:undefined);const C={last:null,h:[],open:false,s};
 s.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state')C.last=m;C.onmsg&&C.onmsg(m);C.h=C.h.filter(w=>!w(m))};s.onclose=()=>{C.open=false;C.onclose&&C.onclose()};s.onerror=()=>{};
 C.ready=new Promise((r,j)=>{s.onopen=()=>{C.open=true;r()};setTimeout(()=>j(Error('không kết nối được')),8000)});C.send=m=>{if(s.readyState===1)s.send(JSON.stringify(m))};
 C.when=(p,ms=15000,l='')=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Hết giờ chờ '+l)),ms);C.h.push(m=>{if(p(m)){clearTimeout(t);r(m);return true}return false})});return C}
function parseCsv(t){t=t.replace(/^﻿/,'');const rows=[];let row=[],cell='',q=false;for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){cell+='"';i++}else q=false}else cell+=ch}else if(ch==='"')q=true;else if(ch===','){row.push(cell);cell=''}else if(ch==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}else cell+=ch}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
const BANK=[
 {q:'Khoa thi Minh kinh bác học đầu tiên ở nước ta mở năm nào?',a:['1070','1075','1086','1400'],c:1},
 {kind:'multi',q:'Những kỳ nào thuộc hệ thống khoa cử thời Nguyễn?',a:['Thi Hương','Thi Hội','Thi Đình','Thi Olympic'],cs:[0,1,2]},
 {kind:'number',q:'Văn Miếu được xây dựng năm nào?',c:1070,tol:0},
 {q:'Người đỗ đầu kỳ thi Đình gọi là gì?',a:['Trạng nguyên','Hoàng giáp','Cử nhân','Tú tài'],c:0},
 {kind:'type',q:'Kỳ thi ở các địa phương (trước thi Hội) gọi là thi gì?',acc:['Hương','thi Hương']},
 {kind:'poll',q:'Bạn thích vòng thi nào nhất?',a:['Khảo hạch','Thi Hương','Thi Hội','Thi Đình']},
 {q:'Bảng vàng ghi tên người đỗ gọi là gì?',a:['Bảng vàng','Bảng bạc','Bảng đỏ','Bảng xanh'],c:0},
 {kind:'number',q:'Khoa thi cuối cùng của Nho học ở Việt Nam là năm nào?',c:1919,tol:0},
 {q:'Bia tiến sĩ ở Văn Miếu đặt trên lưng con vật nào?',a:['Rùa','Hạc','Lân','Rồng'],c:0},
 {kind:'multi',q:'Danh hiệu nào thuộc Tam khôi?',a:['Trạng nguyên','Bảng nhãn','Thám hoa','Tú tài'],cs:[0,1,2]},
 {q:'Quốc Tử Giám được lập năm nào?',a:['1070','1076','1086','1442'],c:1},
 {q:'Lễ vinh quy bái tổ dành cho ai?',a:['Người đỗ đạt về làng','Quan về hưu','Thương nhân','Binh lính'],c:0},
].map(x=>({kind:'mc',t:T,stage:0,...x}));
const L='ABCDEF';
const ansFor=(q,i,k)=>{const good=rnd()<.62;switch(q.kind){
 case 'mc':return {choice:good?q.c:(q.c+1+Math.floor(rnd()*3))%4};
 case 'poll':return {choice:Math.floor(rnd()*4)};
 case 'multi':return {choices:good?[...q.cs]:[0,3]};
 case 'number':return {text:String(good?q.c:q.c+1+Math.floor(rnd()*5))};
 case 'type':return {text:good?(rnd()<.5?'Hương':'thi Hương'):'Hội'}}};
const repr=(q,a)=>q.kind==='mc'||q.kind==='poll'?L[a.choice]:q.kind==='multi'?a.choices.map(i=>L[i]).join('+'):a.text;
const expectOk=(q,a)=>q.kind==='mc'?a.choice===q.c:q.kind==='multi'?JSON.stringify(a.choices)===JSON.stringify(q.cs):q.kind==='number'?Number(a.text)===q.c:q.kind==='type'?['hương','thi hương'].includes(a.text.toLowerCase()):null;

(async()=>{const t0=Date.now();const R=[];const log=s=>{console.log(s);R.push(s)};let failed=false;
try{start();await wait();const A=(await req('POST','/api/login',{role:'admin',password:PASS})).cookie;
 const pin=(await req('POST','/api/rooms',{title:'Diễn tập ổn định',mcUser:'mc-dientap',password:'password-dientap-01'},A)).data.pin;
 let mc;const mcConnect=async()=>{mc=ws(pin,A);await mc.ready;const w=mc.when(m=>m.type==='state',15000,'host');mc.send({type:'host_auth',pin});await w};await mcConnect();
 const cmd=async(m,pred=()=>true,ms=10000)=>{const w=mc.when(x=>(x.type==='state'&&pred(x))||x.type==='error',ms,m.type);mc.send(m);const r=await w;if(r.type==='error')throw Error(m.type+': '+r.message);return r};
 const cmdErr=async m=>{const w=mc.when(x=>x.type==='error',1500,'err').catch(()=>null);mc.send(m);return w};
 await cmd({type:'bank_set',bank:BANK},x=>x.bank&&x.bank.length===BANK.length);await cmd({type:'set_option',autoReveal:false,streak:true},x=>x.autoReveal===false);
 log(`== DIỄN TẬP ỔN ĐỊNH: ${N} sĩ tử · ${BANK.length} câu (${[...new Set(BANK.map(q=>q.kind))].join(', ')}) · ${T} giây/câu · hạt ngẫu nhiên ${SEED}`);
 // ---- sĩ tử ----
 const P=[];const rec=[];// rec[i][qi] = {sent, state:'acked'|'rejected'|'unknown'|'late', dup}
 const connectP=async(i,rejoin)=>{const p=P[i];const c=ws(pin);p.c=c;await c.ready;
  c.onmsg=m=>{if(m.type==='joined')p.id=m.playerId;const pend=p.pend;if(!pend)return;
   if(m.type==='answered'&&m.sid===pend.sid){const r=rec[i][pend.qi];if(r.state!=='late')r.state='acked';else r.state='LATE_ACKED';p.pend=null}
   else if((m.type==='answer_rejected'&&(m.sid===pend.sid||!m.sid))||(m.type==='error'&&pend)){const r=rec[i][pend.qi];if(r.state!=='acked')r.state=r.state==='late'?'late':'rejected';r.why=m.message;p.pend=null}};
  c.onclose=()=>{if(p.pend){const r=rec[i][p.pend.qi];if(r.state==='sent')r.state='unknown';p.pend=null}};
  const w=c.when(m=>(m.type==='state'&&m.my)||m.type==='error',15000,'join');c.send({type:'join',pin,name:p.name,...(rejoin&&p.id?{playerId:p.id}:{})});const m=await w;if(m.type==='error')throw Error('ghi danh '+p.name+': '+m.message)};
 for(let i=0;i<N;i++){P.push({name:'Sĩ tử '+String(i+1).padStart(3,'0')});rec.push({})}
 for(let i=0;i<N;i+=100)await Promise.all(P.slice(i,i+100).map((_,k)=>connectP(i+k,false)));
 assert.ok(P.every(p=>p.id),'mọi sĩ tử nhận mã ghi danh');log(`Ghi danh đủ ${N}/${N} · RAM máy chủ ${rss()} MB`);
 const send=(i,qi,st,a,late)=>{const p=P[i];if(!p.c||!p.c.open)return false;const sid='s'+i+'_'+qi+'_'+Math.floor(rnd()*1e9);
  if(!rec[i][qi])rec[i][qi]={sent:a,state:late?'late':'sent'};p.pend={sid,qi};p.c.send({type:'answer',eid:st.eid,qid:st.q.qid,sid,...a});return true};
 let killAt=6,stats={late:0,dup:0,drop:0,acked:0,rejected:0,unknown:0};
 for(let qi=0;qi<BANK.length;qi++){const q=BANK[qi];
  const st=await cmd({type:'start',t:T},x=>x.phase==='running'&&x.idx===qi);const deadline=st.q.deadline||Date.now()+T*1000;
  if(qi===1){const e=await cmdErr({type:'start',t:T});assert.ok(e,'bấm MỞ CÂU lần hai khi câu đang mở → bị từ chối, không mở lại / không đặt lại giờ')}
  if(qi===2){const e=await cmdErr({type:'set_option',scoring:'accuracy'});assert.ok(e&&/giữa hai câu|chưa mở câu/.test(e.message),'đổi luật điểm giữa câu → bị từ chối')}
  const tasks=[];
  for(let i=0;i<N;i++){const r=rnd();const at=r<.05?(deadline-Date.now())+2600:200+rnd()*(T*1000-500);const late=r<.05;const drop=!late&&rnd()<.08;const dup=!late&&!drop&&rnd()<.06;const skip=!late&&!drop&&!dup&&rnd()<.08;
   if(skip)continue;const a=ansFor(q,i);
   tasks.push((async()=>{
    if(drop){stats.drop++;await sleep(rnd()*2500);try{P[i].c.s.close()}catch{}await sleep(400+rnd()*1500);try{await connectP(i,true)}catch(e){return}if(Date.now()<deadline-300){await sleep(rnd()*Math.max(0,deadline-Date.now()-400));send(i,qi,st,a)}return}
    await sleep(Math.max(0,at));if(late)stats.late++;if(!send(i,qi,st,a,late))return;if(dup){stats.dup++;await sleep(30);P[i].c.send({type:'answer',eid:st.eid,qid:st.q.qid,sid:'dup'+i+'_'+qi,...a})}})())}
  if(qi===killAt){// máy chủ sập giữa câu
   await sleep(T*1000*0.55);const ackedBefore=rec.filter(x=>x[qi]&&x[qi].state==='acked').length;app.kill('SIGKILL');await new Promise(r=>app.once('exit',r));const tk=Date.now();
   start();await wait();await mcConnect();
   await Promise.all(P.map((p,i)=>connectP(i,true).catch(()=>{})));
   log(`Câu ${qi+1}: MÁY CHỦ BỊ TẮT ĐỘT NGỘT (kill -9) sau khi đã báo nhận ${ackedBefore} bài → khởi động lại + ${N} sĩ tử vào lại trong ${((Date.now()-tk)/1000).toFixed(1)} giây`);
   const s=mc.last;if(s.phase==='running')await mc.when(m=>m.type==='state'&&m.phase==='reveal',(T+8)*1000,'tự công bố sau khởi động lại').catch(async()=>{await cmd({type:'reveal'},x=>x.phase==='reveal')})}
  else{if(qi===3){await sleep(T*1000-800);await cmd({type:'reveal'},x=>x.phase==='reveal');mc.send({type:'reveal'});await sleep(200)} // MC bấm CÔNG BỐ hai lần
   else await mc.when(m=>m.type==='state'&&m.phase==='reveal'&&m.idx===qi,(T+6)*1000,'tự hết giờ')}
  await Promise.all(tasks);await sleep(3200);// chờ cả nhóm gửi trễ
  if(qi<BANK.length-1){const before=mc.last.idx;mc.send({type:'next'});mc.send({type:'next'});// MC bấm CÂU KẾ TIẾP hai lần
   let s=await mc.when(m=>m.type==='state'&&m.phase!=='reveal',8000,'next');await sleep(300);s=mc.last;
   while(s.phase==='intermission'){s=await cmd({type:'next'},x=>x.phase!=='intermission')}
   assert.equal(s.idx,before+1,`bấm "câu kế tiếp" hai lần KHÔNG được nhảy câu (đang ở câu ${s.idx+1}, đúng ra ${before+2})`)}
  const c=rec.map(x=>x[qi]).filter(Boolean);log(`Câu ${qi+1} (${q.kind}): ${c.filter(x=>x.state==='acked').length} bài báo nhận · ${c.filter(x=>x.state==='rejected'||x.state==='late').length} bị từ chối/trễ · ${c.filter(x=>x.state==='unknown').length} chưa rõ (rớt mạng lúc chờ xác nhận)`)}
 // kết thúc
 for(let k=0;k<3&&mc.last.phase!=='finished';k++){mc.send({type:'next'});await sleep(800)}
 // ---- ĐỐI SOÁT ----
 const csv=(await req('GET',`/api/rooms/${pin}/report.csv`,null,A));assert.equal(csv.status,200);const rows=parseCsv(csv.text);const head=rows[1];
 const ci=n=>head.findIndex(h=>h===n);const cName=ci('Sĩ tử'),cScore=ci('Tổng điểm'),cCorr=ci('Số câu đúng'),cRank=ci('Hạng'),cQ0=head.findIndex(h=>/^Câu 1 /.test(h));
 const data=rows.slice(2).filter(r=>/^Sĩ tử \d+$/.test(r[cName]||''));assert.equal(data.length,N,'(7) báo cáo có đủ '+N+' sĩ tử');
 const byName=new Map(data.map(r=>[r[cName],r]));let lost=[],counted=[],sumBad=[],gradeBad=[],dupBad=0,checked=0,ackTotal=0,rejTotal=0,unk=0;
 P.forEach((p,i)=>{const r=byName.get(p.name);let sum=0,ok=0;
  BANK.forEach((q,qi)=>{const cell=r[cQ0+qi]||'';const m=cell.match(/ (-?\d+)đ [\d.]+s$/);const pts=m?Number(m[1]):0;const has=!!m;sum+=pts;if(/ ✔/.test(cell))ok++;const x=rec[i][qi];
   if(has&&q.kind!=='poll'){const want=/ ✔/.test(cell);const v=cell.replace(/ [✔✘½].*$/,'');const sent=x&&x.sent;if(sent&&v===repr(q,sent)){const e=expectOk(q,sent);if(e!=null&&e!==want)gradeBad.push(`${p.name} câu ${qi+1}: "${cell}"`)}
    if(want&&(pts<300||pts>1000+500))gradeBad.push(`${p.name} câu ${qi+1}: điểm câu đúng ${pts} ngoài 300–1500`);if(!want&&pts!==0)gradeBad.push(`${p.name} câu ${qi+1}: sai mà có ${pts} điểm`)}
   if(!x)return;checked++;
   if(x.state==='acked'){ackTotal++;if(!has||!cell.startsWith(repr(q,x.sent)+(q.kind==='poll'?' ':' ')))lost.push(`${p.name} câu ${qi+1}: đã báo nhận "${repr(q,x.sent)}" nhưng báo cáo ghi "${cell}"`)}
   else if(x.state==='rejected'||x.state==='late'){rejTotal++;if(has)counted.push(`${p.name} câu ${qi+1}: bị từ chối (${x.why||x.state}) nhưng vẫn tính "${cell}"`)}
   else if(x.state==='LATE_ACKED')counted.push(`${p.name} câu ${qi+1}: gửi SAU giờ mà máy chủ vẫn báo nhận`);
   else{unk++;if(has&&!cell.startsWith(repr(q,x.sent)))lost.push(`${p.name} câu ${qi+1}: bài chưa rõ nhưng báo cáo ghi giá trị khác "${cell}"`)}});
  if(sum!==Number(r[cScore]))sumBad.push(`${p.name}: tổng điểm ${r[cScore]} ≠ cộng từng câu ${sum}`);if(ok!==Number(r[cCorr]))sumBad.push(`${p.name}: số câu đúng ${r[cCorr]} ≠ số ✔ ${ok}`)});
 const sc=data.map(r=>Number(r[cScore]));const rankOk=sc.every((s,k)=>k===0||sc[k-1]>=s)&&data.every((r,k)=>k===0||Number(data[k-1][cRank])<=Number(r[cRank]));
 const show=a=>a.slice(0,5).join(' | ')+(a.length>5?` … (+${a.length-5})`:'');
 log(`Đối soát ${checked} bài nộp: ${ackTotal} đã báo nhận · ${rejTotal} bị từ chối/trễ · ${unk} chưa rõ kết quả (rớt mạng/sập lúc chờ xác nhận)`);
 log(`Sự cố đã gây ra: ${stats.late} lần gửi trễ · ${stats.dup} lần bấm gửi hai lần · ${stats.drop} lần rớt mạng giữa câu · 1 lần kill -9 máy chủ · MC bấm trùng CÔNG BỐ / CÂU KẾ TIẾP / MỞ CÂU`);
 assert.deepEqual(lost,[],'(1) MẤT BÀI đã báo nhận: '+show(lost));log('(1) Không mất bài nào đã báo "đã nhận" – kể cả bài nhận ngay trước khi máy chủ sập: ĐẠT');
 assert.deepEqual(counted,[],'(2) TÍNH NHẦM bài bị từ chối/trễ: '+show(counted));log('(2) Không bài trễ / bị từ chối nào được tính: ĐẠT');
 log('(3) Bấm gửi hai lần chỉ tính một lần (tổng điểm khớp cộng từng câu): '+(sumBad.length?'KHÔNG ĐẠT':'ĐẠT'));assert.deepEqual(sumBad,[],'(4) '+show(sumBad));log('(4) Tổng điểm = cộng điểm từng câu; số câu đúng = số ✔: ĐẠT');
 assert.deepEqual(gradeBad,[],'(5) chấm sai: '+show(gradeBad));log('(5) Chấm đúng/sai khớp đáp án; điểm câu đúng trong khung 300–1000 + thưởng chuỗi: ĐẠT');
 assert.ok(rankOk,'(6) xếp hạng không giảm dần theo điểm');log('(6) Xếp hạng giảm dần theo điểm, hạng không đảo: ĐẠT');log(`(7) Báo cáo đủ ${N}/${N} sĩ tử: ĐẠT`);
 const h=await req('GET','/health');assert.equal(h.status,200,'(8) máy chủ phải khoẻ: '+h.text);const bad=out.split('\n').filter(l=>/TypeError|ReferenceError|RangeError|SyntaxError|Unhandled|at .*server\.js:\d+/.test(l));
 assert.deepEqual(bad,[],'(8) nhật ký máy chủ có lỗi chương trình: '+bad.slice(0,3).join(' | '));log(`(8) Máy chủ khoẻ (/health 200), nhật ký không có lỗi chương trình · RAM cuối ${rss()} MB · thời gian diễn tập ${((Date.now()-t0)/1000).toFixed(0)} giây`);
 console.log(`PASS diễn tập ổn định ${N} sĩ tử × ${BANK.length} câu có sự cố (kill -9, rớt mạng, gửi trễ, bấm trùng) – đối soát 8/8 điều kiện đạt (hạt ${SEED})`);
}catch(e){failed=true;console.log('FAIL',String(e.message||e));console.log(`(lặp lại đúng kịch bản: DIEN_TAP_SEED=${SEED} node test/test-dien-tap-on-dinh.js ${N})`);console.log(out.slice(-1500))}
finally{if(process.env.OUT)fs.writeFileSync(path.join(ROOT,process.env.OUT),R.join('\n')+'\n');try{app.kill('SIGTERM')}catch{}await sleep(300);process.exit(failed?1:0)}})();
