'use strict';
/* ===== UDIKA – CHƯƠNG TRÌNH LIÊN HOÀN: một bảng điểm cho nhiều hoạt động (quiz + vận động + sáng tạo…) và VAI TRỌNG TÀI =====
   • Chủ khách (hoặc Admin) tạo chương trình: danh sách ĐỘI, danh sách HOẠT ĐỘNG (mỗi hoạt động có hệ số):
       - "quiz": lấy điểm đội từ một phòng thi UDIKA (điểm trung bình thành viên, như bảng xếp hạng đội của phòng);
       - "cham": trọng tài chấm tay (thang điểm tối đa; nhiều trọng tài → lấy TRUNG BÌNH hoặc TỔNG, chọn theo hoạt động).
   • Trọng tài có tài khoản riêng theo chương trình (mã chương trình + tên + mật khẩu), CHỈ chấm được hoạt động được giao.
     Sửa điểm đã chấm phải ghi LÝ DO; mọi lần sửa được lưu (ai, lúc nào, từ bao nhiêu → bao nhiêu).
   • Khoá chương trình → không ai sửa điểm nữa (chốt kết quả trao giải). Giữ kín bảng điểm → màn LED chỉ hiện "đang giữ kín".
   • Bảng tổng = Σ (hệ số × điểm hoạt động); bằng điểm → đồng hạng. Màn LED /bangdiem?ma=…; báo cáo CSV đầy đủ để giải trình. */
const crypto=require('node:crypto');
const ECH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
module.exports=function makeEvents(C){
 const {EVENTS,sendJson,jsonBody,persistNow,audit,token,clean,foldTxt,passwordRecord,verifyPassword,makeSession,csvOf,rooms,TENANTS}=C;
 const newCode=()=>{for(;;){let c='';for(const x of crypto.randomBytes(6))c+=ECH[x%ECH.length];if(!EVENTS.some(e=>e.code===c))return c}};
 const byId=id=>EVENTS.find(e=>e.id===id);
 const can=(L,e)=>!!L&&!!e&&(L.role==='admin'||(L.role==='owner'&&e.tenant===L.tenant));
 const r2=x=>Math.round(x*100)/100;
 /* điểm của đội ở một hoạt động */
 function actScore(e,a,teamId){const S=e.scores.filter(s=>s.act===a.id&&s.team===teamId);if(!S.length)return null;
  if(a.kind==='quiz')return S[0].points;const v=S.map(s=>s.points);return r2(a.agg==='sum'?v.reduce((x,y)=>x+y,0):v.reduce((x,y)=>x+y,0)/v.length)}
 function board(e){const rows=e.teams.map(t=>{const per={};let total=0;for(const a of e.activities){const v=actScore(e,a,t.id);per[a.id]=v;if(v!=null)total+=v*(a.weight??1)}return {id:t.id,name:t.name,color:t.color||'',per,total:r2(total)}});
  rows.sort((x,y)=>y.total-x.total||x.name.localeCompare(y.name,'vi'));let rank=0,prev=null;rows.forEach((r,i)=>{if(prev===null||r.total!==prev){rank=i+1;prev=r.total}r.rank=rank});return rows}
 const pubAct=a=>({id:a.id,name:a.name,kind:a.kind,weight:a.weight??1,max:a.max??null,agg:a.agg||'avg',pin:a.pin||null});
 const full=e=>({id:e.id,code:e.code,name:e.name,tenant:e.tenant,locked:!!e.locked,hidden:!!e.hidden,teams:e.teams,activities:e.activities.map(pubAct),
  judges:e.judges.map(j=>({id:j.id,name:j.name,user:j.user,acts:j.acts})),scores:e.scores.map(s=>({...s,rev:s.rev||[]})),board:board(e),createdAt:e.createdAt,updatedAt:e.updatedAt});
 const judgeOk=(L,e)=>{if(!L||L.role!=='judge'||!e||L.event!==e.id)return null;const j=e.judges.find(x=>x.id===L.judge);return j&&j.ver===L.jver?j:null};
 const save=async(e)=>{e.updatedAt=Date.now();return persistNow()};
 function teamBoardReal(r){if(!Array.isArray(r.teams)||r.teams.length<2)return [];const m=new Map(r.teams.map(t=>[t.id,{name:t.name,members:0,total:0}]));
  for(const p of r.players.values()){const t=m.get(p.team);if(t){t.members++;t.total+=p.score||0}}return [...m.values()].map(t=>({name:t.name,members:t.members,score:t.members?Math.round(t.total/t.members):0}))}
 async function api(req,res,u,L){const P=u.pathname;
  /* ---- trọng tài đăng nhập: mã chương trình + tên + mật khẩu ---- */
  if(P==='/api/judge/login'&&req.method==='POST'){if(C.limited(C.clientIp(req)))return sendJson(res,429,{error:'Quá nhiều lần đăng nhập. Thử lại sau.'}),true;const b=await jsonBody(req);
   const e=EVENTS.find(x=>x.code===String(b.code||'').trim().toUpperCase());const j=e&&e.judges.find(x=>x.user===String(b.user||'').trim().toLowerCase());
   if(!j||!verifyPassword(j.password,b.password))return sendJson(res,401,{error:'Mã chương trình, tên hoặc mật khẩu không đúng'}),true;
   const s={role:'judge',user:j.name,event:e.id,judge:j.id,jver:j.ver};audit('trongtai:'+j.user,'login',e.code);
   const cookie='udika_session='+encodeURIComponent(makeSession(s))+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200'+(req.socket.encrypted||req.headers['x-forwarded-proto']==='https'?'; Secure':'');
   return sendJson(res,200,{ok:true,event:e.id},cookie),true}
  if(P==='/api/judge/me'&&req.method==='GET'){const e=L&&L.role==='judge'?byId(L.event):null;const j=judgeOk(L,e);if(!j)return sendJson(res,403,{error:'Cần đăng nhập trọng tài'}),true;
   return sendJson(res,200,{judge:{id:j.id,name:j.name},event:{id:e.id,code:e.code,name:e.name,locked:!!e.locked,teams:e.teams,activities:e.activities.filter(a=>j.acts.includes(a.id)).map(pubAct)},
    mine:e.scores.filter(s=>s.by===j.id).map(s=>({act:s.act,team:s.team,points:s.points,note:s.note||'',at:s.at,rev:(s.rev||[]).length}))}),true}
  /* ---- màn LED / công khai: chỉ tên, hoạt động, tổng điểm ---- */
  const pubM=P.match(/^\/api\/events\/public\/([A-Z0-9]{6})$/);
  if(pubM&&req.method==='GET'){const e=EVENTS.find(x=>x.code===pubM[1]);if(!e)return sendJson(res,404,{error:'Không thấy chương trình'}),true;
   if(e.hidden)return sendJson(res,200,{name:e.name,hidden:true,locked:!!e.locked}),true;
   return sendJson(res,200,{name:e.name,locked:!!e.locked,hidden:false,activities:e.activities.map(a=>({id:a.id,name:a.name,weight:a.weight??1})),board:board(e).map(r=>({rank:r.rank,name:r.name,color:r.color,total:r.total,per:r.per})),at:Date.now()}),true}
  /* ---- quản lý chương trình (chủ khách / Admin) ---- */
  if(P==='/api/events'&&req.method==='GET'){if(!L||!(L.role==='admin'||L.role==='owner'))return sendJson(res,403,{error:'Cần đăng nhập'}),true;
   return sendJson(res,200,{items:EVENTS.filter(e=>L.role==='admin'||e.tenant===L.tenant).map(e=>({id:e.id,code:e.code,name:e.name,teams:e.teams.length,activities:e.activities.length,judges:e.judges.length,locked:!!e.locked,hidden:!!e.hidden,tenantName:e.tenant?TENANTS.get(e.tenant)?.name||'':'UDIKA',updatedAt:e.updatedAt}))}),true}
  if(P==='/api/events'&&req.method==='POST'){if(!L||!(L.role==='admin'||L.role==='owner'))return sendJson(res,403,{error:'Cần đăng nhập'}),true;
   if(L.role==='owner'){const t=TENANTS.get(L.tenant);const bl=C.tenantBlock(t);if(bl)return sendJson(res,403,{error:bl}),true;if(EVENTS.filter(e=>e.tenant===L.tenant).length>=50)return sendJson(res,409,{error:'Tối đa 50 chương trình mỗi khách – xoá bớt chương trình cũ'}),true}
   const b=await jsonBody(req);const name=clean(b.name,100);if(!name)return sendJson(res,400,{error:'Đặt tên chương trình'}),true;
   const e={id:'e'+token().slice(0,10),code:newCode(),name,tenant:L.role==='owner'?L.tenant:null,teams:[],activities:[],judges:[],scores:[],locked:false,hidden:false,createdAt:Date.now(),updatedAt:Date.now(),log:[]};
   EVENTS.push(e);if(!(await save(e))){EVENTS.pop();return sendJson(res,503,{error:'Máy chủ CHƯA lưu được'}),true}audit(L.user,'event_created',e.code);return sendJson(res,201,full(e)),true}
  const evM=P.match(/^\/api\/events\/(e[\w-]{6,14})(?:\/(teams|activities|judges|scores|import|report\.csv|log))?(?:\/([\w-]{2,20}))?$/);
  if(!evM)return false;
  const e=byId(evM[1]);const sub=evM[2],sid=evM[3];
  /* trọng tài chấm điểm */
  if(sub==='scores'&&req.method==='POST'&&L&&L.role==='judge'){const j=judgeOk(L,e);if(!j)return sendJson(res,403,{error:'Phiên trọng tài đã hết hiệu lực – đăng nhập lại'}),true;
   if(e.locked)return sendJson(res,423,{error:'Chương trình đã KHOÁ điểm – không sửa được nữa'}),true;const b=await jsonBody(req);
   const a=e.activities.find(x=>x.id===b.act);if(!a||a.kind!=='cham'||!j.acts.includes(a.id))return sendJson(res,403,{error:'Bạn không được giao chấm hoạt động này'}),true;
   const t=e.teams.find(x=>x.id===b.team);if(!t)return sendJson(res,404,{error:'Không có đội này'}),true;
   const pts=Number(String(b.points).replace(',','.'));if(!Number.isFinite(pts)||pts<0||(a.max!=null&&pts>a.max))return sendJson(res,400,{error:`Điểm phải từ 0 đến ${a.max??'∞'}`}),true;
   let s=e.scores.find(x=>x.act===a.id&&x.team===t.id&&x.by===j.id);const note=clean(b.note,200);
   if(s){if(s.points===r2(pts)&&s.note===note)return sendJson(res,200,{ok:true,same:true}),true;if(!note)return sendJson(res,400,{error:'Sửa điểm đã chấm phải ghi LÝ DO'}),true;
    s.rev=(s.rev||[]).concat({points:s.points,note:s.note,at:s.at});s.points=r2(pts);s.note=note;s.at=Date.now()}
   else{s={id:token().slice(0,10),act:a.id,team:t.id,by:j.id,byName:j.name,points:r2(pts),note,at:Date.now(),rev:[]};e.scores.push(s)}
   e.log.unshift({at:Date.now(),who:'Trọng tài '+j.name,what:`${a.name} · ${t.name}: ${s.rev.length?s.rev[s.rev.length-1].points+' → ':''}${s.points}${note?' ('+note+')':''}`});if(e.log.length>2000)e.log.length=2000;
   if(!(await save(e)))return sendJson(res,503,{error:'Máy chủ CHƯA lưu được điểm – chấm lại'}),true;return sendJson(res,200,{ok:true}),true}
  if(sub==='scores'&&req.method==='POST')return sendJson(res,403,{error:'Điểm chấm tay do TRỌNG TÀI nhập (tách vai: người tổ chức không tự chấm). Hoạt động quiz lấy điểm từ phòng thi.'}),true;
  if(!can(L,e))return sendJson(res,e?403:404,{error:e?'Không có quyền với chương trình này':'Không thấy chương trình'}),true;
  if(!sub&&req.method==='GET')return sendJson(res,200,full(e)),true;
  if(!sub&&req.method==='PATCH'){const b=await jsonBody(req);if(b.name)e.name=clean(b.name,100)||e.name;if('locked' in b)e.locked=!!b.locked;if('hidden' in b)e.hidden=!!b.hidden;
   e.log.unshift({at:Date.now(),who:L.user,what:'locked' in b?(b.locked?'KHOÁ điểm':'mở khoá điểm'):'hidden' in b?(b.hidden?'giữ kín bảng điểm':'công bố bảng điểm'):'đổi tên'});
   if(!(await save(e)))return sendJson(res,503,{error:'Máy chủ CHƯA lưu được'}),true;return sendJson(res,200,full(e)),true}
  if(!sub&&req.method==='DELETE'){EVENTS.splice(EVENTS.indexOf(e),1);await persistNow();audit(L.user,'event_deleted',e.code);return sendJson(res,200,{ok:true}),true}
  if(sub==='report.csv'&&req.method==='GET'){const B=board(e),jn=id=>e.judges.find(x=>x.id===id)?.name||id;
   const rows=[[`UDIKA – Chương trình liên hoàn: ${e.name} (mã ${e.code})${e.locked?' – ĐÃ KHOÁ ĐIỂM':''} – xuất lúc ${new Date().toISOString()}`],
    ['Hạng','Đội',...e.activities.map(a=>`${a.name} (×${a.weight??1}${a.kind==='quiz'?', quiz phòng '+(a.pin||'?'):', '+(a.agg==='sum'?'tổng':'trung bình')+' trọng tài'})`),'Tổng'],
    ...B.map(r=>[r.rank,r.name,...e.activities.map(a=>r.per[a.id]??''),r.total]),[],['CHI TIẾT ĐIỂM TỪNG TRỌNG TÀI / NGUỒN'],['Hoạt động','Đội','Điểm','Người chấm / nguồn','Ghi chú','Lúc','Các lần sửa trước']];
   for(const s of e.scores){const a=e.activities.find(x=>x.id===s.act),t=e.teams.find(x=>x.id===s.team);rows.push([a?.name||s.act,t?.name||s.team,s.points,s.by.startsWith('quiz:')?'Quiz phòng '+s.by.slice(5):jn(s.by),s.note||'',new Date(s.at).toISOString(),(s.rev||[]).map(v=>`${v.points}${v.note?' ('+v.note+')':''} lúc ${new Date(v.at).toISOString()}`).join(' | ')])}
   rows.push([],['NHẬT KÝ'],['Lúc','Ai','Việc']);for(const l of e.log)rows.push([new Date(l.at).toISOString(),l.who,l.what]);
   res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="UDIKA_lien_hoan_${e.code}.csv"`,'Cache-Control':'no-store'});res.end(csvOf(rows));return true}
  if(e.locked&&req.method!=='GET'&&!(sub===undefined))return sendJson(res,423,{error:'Chương trình đã KHOÁ điểm – mở khoá trước khi sửa'}),true;
  if(sub==='teams'&&req.method==='PUT'){const b=await jsonBody(req);const list=(Array.isArray(b.teams)?b.teams:[]).map(t=>({id:t.id&&e.teams.some(x=>x.id===t.id)?t.id:'t'+token().slice(0,6),name:clean(t.name,40),color:/^#[0-9a-f]{6}$/i.test(t.color||'')?t.color:''})).filter(t=>t.name);
   if(list.length<2||list.length>60)return sendJson(res,400,{error:'Cần 2–60 đội'}),true;if(new Set(list.map(t=>foldTxt(t.name))).size!==list.length)return sendJson(res,400,{error:'Tên đội bị trùng'}),true;
   const gone=e.teams.filter(t=>!list.some(x=>x.id===t.id)).map(t=>t.id);if(gone.length&&e.scores.some(s=>gone.includes(s.team)))return sendJson(res,409,{error:'Đội bị xoá đã có điểm – không xoá được (đổi tên thì được)'}),true;
   e.teams=list;e.log.unshift({at:Date.now(),who:L.user,what:'cập nhật danh sách đội ('+list.length+')'});if(!(await save(e)))return sendJson(res,503,{error:'Máy chủ CHƯA lưu được'}),true;return sendJson(res,200,full(e)),true}
  if(sub==='activities'&&req.method==='POST'){const b=await jsonBody(req);const kind=b.kind==='quiz'?'quiz':'cham';const name=clean(b.name,60);if(!name)return sendJson(res,400,{error:'Đặt tên hoạt động'}),true;
   const w=Number(b.weight??1);if(!(w>=0&&w<=100))return sendJson(res,400,{error:'Hệ số 0–100'}),true;const a={id:'a'+token().slice(0,6),name,kind,weight:w};
   if(kind==='cham'){const mx=Number(b.max??10);if(!(mx>0&&mx<=100000))return sendJson(res,400,{error:'Điểm tối đa không hợp lệ'}),true;a.max=mx;a.agg=b.agg==='sum'?'sum':'avg'}
   else{const pin=String(b.pin||'');if(!/^\d{6}$/.test(pin))return sendJson(res,400,{error:'Hoạt động quiz cần mã phòng 6 số'}),true;a.pin=pin}
   if(e.activities.length>=40)return sendJson(res,409,{error:'Tối đa 40 hoạt động'}),true;e.activities.push(a);e.log.unshift({at:Date.now(),who:L.user,what:'thêm hoạt động '+name});
   if(!(await save(e)))return sendJson(res,503,{error:'Máy chủ CHƯA lưu được'}),true;return sendJson(res,201,full(e)),true}
  if(sub==='activities'&&sid&&req.method==='DELETE'){if(e.scores.some(s=>s.act===sid))return sendJson(res,409,{error:'Hoạt động đã có điểm – không xoá được'}),true;e.activities=e.activities.filter(a=>a.id!==sid);for(const j of e.judges)j.acts=j.acts.filter(x=>x!==sid);
   await save(e);return sendJson(res,200,full(e)),true}
  if(sub==='judges'&&req.method==='POST'){const b=await jsonBody(req);const name=clean(b.name,40),user=String(b.user||'').trim().toLowerCase(),pw=String(b.password||'');
   if(!name||!/^[a-z0-9][a-z0-9._-]{1,29}$/.test(user)||pw.length<8)return sendJson(res,400,{error:'Cần tên trọng tài, tên đăng nhập (a-z 0-9) và mật khẩu ≥ 8 ký tự'}),true;
   if(e.judges.some(j=>j.user===user))return sendJson(res,409,{error:'Tên đăng nhập trọng tài đã có trong chương trình'}),true;
   const acts=(Array.isArray(b.acts)?b.acts:[]).filter(id=>e.activities.some(a=>a.id===id&&a.kind==='cham'));
   e.judges.push({id:'j'+token().slice(0,6),name,user,password:passwordRecord(pw),ver:token().slice(0,8),acts});e.log.unshift({at:Date.now(),who:L.user,what:'thêm trọng tài '+name});
   if(!(await save(e)))return sendJson(res,503,{error:'Máy chủ CHƯA lưu được'}),true;return sendJson(res,201,full(e)),true}
  if(sub==='judges'&&sid&&req.method==='PATCH'){const j=e.judges.find(x=>x.id===sid);if(!j)return sendJson(res,404,{error:'Không thấy trọng tài'}),true;const b=await jsonBody(req);
   if(Array.isArray(b.acts))j.acts=b.acts.filter(id=>e.activities.some(a=>a.id===id&&a.kind==='cham'));if(b.password){if(String(b.password).length<8)return sendJson(res,400,{error:'Mật khẩu ≥ 8 ký tự'}),true;j.password=passwordRecord(String(b.password));j.ver=token().slice(0,8)}
   if(b.revoke){j.ver=token().slice(0,8);j.acts=[]}e.log.unshift({at:Date.now(),who:L.user,what:'cập nhật trọng tài '+j.name+(b.revoke?' (thu hồi quyền)':'')});
   if(!(await save(e)))return sendJson(res,503,{error:'Máy chủ CHƯA lưu được'}),true;return sendJson(res,200,full(e)),true}
  /* lấy điểm đội từ phòng quiz: khớp TÊN đội (không phân biệt hoa thường/dấu) */
  if(sub==='import'&&req.method==='POST'){const b=await jsonBody(req);const a=e.activities.find(x=>x.id===b.act&&x.kind==='quiz');if(!a)return sendJson(res,404,{error:'Không thấy hoạt động quiz'}),true;
   let tb=null;const r=rooms.get(a.pin);
   if(r){if(!C.roomUser(L,r))return sendJson(res,403,{error:'Phòng '+a.pin+' không thuộc quyền của bạn'}),true;tb=teamBoardReal(r)}
   else{const v=C.verifyBlob(req.headers['x-udika-teamboard']);if(v&&v.kind==='teamboard'&&v.pin===a.pin&&v.sha===crypto.createHash('sha256').update(JSON.stringify(b.board||[])).digest('hex'))tb=b.board;
    else return sendJson(res,404,{error:'Không tìm thấy phòng '+a.pin+' (đã xoá hoặc ở máy chủ khác)'}),true}
   if(!tb.length)return sendJson(res,409,{error:'Phòng '+a.pin+' chưa chơi theo đội'}),true;
   const miss=[];let n=0;for(const t of e.teams){const x=tb.find(y=>foldTxt(y.name)===foldTxt(t.name));if(!x){miss.push(t.name);continue}
    let s=e.scores.find(q=>q.act===a.id&&q.team===t.id);if(s){if(s.points!==x.score){s.rev=(s.rev||[]).concat({points:s.points,note:s.note,at:s.at});s.points=x.score;s.at=Date.now()}}
    else e.scores.push({id:token().slice(0,10),act:a.id,team:t.id,by:'quiz:'+a.pin,byName:'Quiz '+a.pin,points:x.score,note:`trung bình ${x.members} thành viên`,at:Date.now(),rev:[]});n++}
   e.log.unshift({at:Date.now(),who:L.user,what:`lấy điểm quiz phòng ${a.pin} cho ${n} đội`+(miss.length?` (không khớp tên: ${miss.join(', ')})`:'')});
   if(!(await save(e)))return sendJson(res,503,{error:'Máy chủ CHƯA lưu được'}),true;return sendJson(res,200,{...full(e),imported:n,missing:miss}),true}
  if(sub==='log'&&req.method==='GET')return sendJson(res,200,{items:e.log}),true;
  return sendJson(res,405,{error:'Không hỗ trợ'}),true}
 return {api,board,teamBoardReal}};
