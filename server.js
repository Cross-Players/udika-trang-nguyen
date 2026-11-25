'use strict';
// UDIKA realtime pilot: built-in Node.js HTTP + WebSocket (RFC 6455 text frames).
// For commercial scale, move room and response state to PostgreSQL/Redis and load-test.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname,'data','rooms.json');
/* C03: REQUIRE_DATABASE nhận 1/true/yes/on (bật) và 0/false/no/off/trống (tắt); giá trị khác bị từ chối để không âm thầm chạy bằng tệp tạm */
const REQ_DB_RAW=String(process.env.REQUIRE_DATABASE??'').trim().toLowerCase();
if(REQ_DB_RAW&&!['1','true','yes','on','0','false','no','off'].includes(REQ_DB_RAW)){console.error(`REQUIRE_DATABASE="${process.env.REQUIRE_DATABASE}" không hợp lệ – dùng 1/true/yes/on hoặc 0/false/no/off.`);process.exit(1)}
const REQUIRE_DATABASE = ['1','true','yes','on'].includes(REQ_DB_RAW);
if (REQUIRE_DATABASE && !process.env.DATABASE_URL) {
 console.error('DATABASE_URL is required when REQUIRE_DATABASE is on (1/true/yes/on). No temporary-file fallback allowed.');
 process.exit(1);
}
const publicDir = path.join(__dirname,'public');
const MAX_ROOMS = Number(process.env.MAX_ROOMS || 30);
const JT=Number(process.env.NODE_COUNT||1)>1?'udika_journal_n'+Number(process.env.NODE_INDEX||0):'udika_journal',SNAP_ID=Number(process.env.NODE_COUNT||1)>1?Number(process.env.NODE_INDEX||0)+1:1;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS || 6000); // giới hạn MỖI PHÒNG (đã thử tải 6.000 người/phòng – xem KET_QUA_KIEM_THU_6000.txt)
const MAX_ONLINE = Number(process.env.MAX_ONLINE || 15000);
const BOT_JOINS = Math.max(5,Number(process.env.BOT_JOINS||60)); // ngưỡng chống bot: số người MỚI tối đa / 10 giây / một địa chỉ mạng / một phòng
/* C05: chỗ dự phòng cho người ĐÃ ghi danh vào lại (mất mạng, đổi máy): người MỚI chỉ được vào khi số đang kết nối < MAX_ONLINE − RECONNECT_RESERVE;
   người vào lại dùng được tới MAX_ONLINE. Vượt MAX_ONLINE thì mọi đường vào đều bị từ chối với thông báo rõ (giới hạn cứng, MỖI tiến trình). */
const RECONNECT_RESERVE = Math.max(0,Math.min(MAX_ONLINE-1,process.env.RECONNECT_RESERVE!=null&&process.env.RECONNECT_RESERVE!==''?Number(process.env.RECONNECT_RESERVE):Math.ceil(MAX_ONLINE*0.05))); // giới hạn TỔNG số điện thoại đang kết nối trên toàn máy chủ // giới hạn an toàn mỗi phòng; đã kiểm thử tải 2.000 kết nối (xem test/load-test.js)
const MAX_BODY = 1_000_000;
const LOCK_TIME_MS = 120_000;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'';
const SESSION_SECRET=process.env.SESSION_SECRET||'';
if(!ADMIN_PASSWORD || !SESSION_SECRET || ADMIN_PASSWORD.length<12 || SESSION_SECRET.length<24){
 console.error('CẦN THIẾT LẬP ADMIN_PASSWORD (>=12 ký tự) và SESSION_SECRET (>=24 ký tự) trong Render Environment.');
 process.exit(1);
}
const passwordHash=(password,salt)=>crypto.scryptSync(String(password),salt,64).toString('hex');
function passwordRecord(password){let salt=crypto.randomBytes(16).toString('hex');return {salt,hash:passwordHash(password,salt)}}
function verifyPassword(rec,password){if(!rec||!rec.hash||!rec.salt)return false;try{let a=Buffer.from(passwordHash(password,rec.salt),'hex'),b=Buffer.from(rec.hash,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b)}catch{return false}}
function makeSession(payload){let data=Buffer.from(JSON.stringify({...payload,exp:Date.now()+12*3600*1000})).toString('base64url');let sig=crypto.createHmac('sha256',SESSION_SECRET).update(data).digest('base64url');return data+'.'+sig}
function verifySession(t){try{let [d,sig]=String(t||'').split('.');if(!d||!sig)return null;let expected=crypto.createHmac('sha256',SESSION_SECRET).update(d).digest('base64url');if(!timingEq(expected,sig))return null;let user=JSON.parse(Buffer.from(d,'base64url'));return user.exp>Date.now()?user:null}catch{return null}}
function getCookie(req,name){let c=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return c?decodeURIComponent(c.split('=').slice(1).join('=')):''}
function authRequest(req){return verifySession(getCookie(req,'udika_session'))}
const accessLog=[];
function audit(actor,action,room){accessLog.push({at:Date.now(),actor,action,room});if(accessLog.length>300)accessLog.shift()}

const STAGE_NAMES=['Lớp thầy đồ','Khảo hạch','Thi Hương','Thi Hội','Thi Đình'];
const STAGE_WISHES=['Thầy đồ và gia đình rất tự hào về sự hiếu học của bạn!','Họ hàng, làng xóm đều vui mừng khi bạn vượt qua kỳ khảo hạch!','Tiếng lành đỗ đạt lan khắp quê nhà, gia tộc hân hoan đón tin vui!','Cả họ tộc tự hào, chờ ngày bạn bước vào điện vua!','Khoa thi đã khép lại, quan trường chuẩn bị xướng danh Tam khôi!'];
const {importQuestions}=require('./importer');
const questions = JSON.parse(fs.readFileSync(path.join(__dirname,'questions.json'),'utf8'));
/* Chống lộ đáp án: bộ đề CHƠI THỬ công khai (kèm đáp án) là bộ RIÊNG, không trùng bộ đề mặc định của phòng thi thật */
const PRACTICE_SAMPLE=(()=>{try{return JSON.parse(fs.readFileSync(path.join(__dirname,'practice_sample.json'),'utf8'))}catch{return []}})();
const rooms = new Map();
const LIB = new Map(); // kho đề dùng lại giữa các buổi: id → {id,name,owner,shared,createdAt,updatedAt,bank}
let LIB_VER=0;{const s0=LIB.set.bind(LIB),d0=LIB.delete.bind(LIB);LIB.set=(k,v)=>{LIB_VER++;return s0(k,v)};LIB.delete=k=>{LIB_VER++;return d0(k)}} // đổi kho đề → tính lại cảnh báo trùng bộ chơi thử
const MEDIA_DIR=process.env.MEDIA_DIR||path.join(path.dirname(DATA_FILE),'media');
const now = ()=>Date.now();
const token = () => crypto.randomBytes(24).toString('base64url');
const NODE_INDEX=Math.max(0,Number(process.env.NODE_INDEX||0)),NODE_COUNT=Math.max(1,Number(process.env.NODE_COUNT||1));
// Nhiều tiến trình/nhiều máy: mỗi phòng thuộc trọn MỘT nút; nút giữ phòng có mã (mã % NODE_COUNT === NODE_INDEX) – router.js định tuyến theo đúng quy tắc này.
const makePin = () => {let x; do {x=String(crypto.randomInt(100000,1000000));if(NODE_COUNT>1){const k=Number(x)%NODE_COUNT;x=String(Number(x)-k+NODE_INDEX);if(Number(x)<100000)x=String(Number(x)+NODE_COUNT)}} while(rooms.has(x)||Number(x)>999999);return x;};
// L02: KHÔNG xoá dấu < > (câu toán/logic/mã cần giữ nghĩa) – mọi nơi hiển thị đều escape khi render.
// Cắt theo ký tự Unicode (không cắt đôi emoji/chữ ghép). Độ dài vượt mức được BÁO LỖI ở bước kiểm tra đề (L03), không cắt âm thầm.
const clean = (s,n=48) => {const t=String(s??'').normalize('NFC').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim();const a=Array.from(t);return a.length>n?a.slice(0,n).join('').trim():t};
const ulen=s=>Array.from(String(s??'')).length;
const LIMITS={q:260,opt:160,acc:80,note:240,unit:12,alt:160,word:40,pair:80};
// L08: biểu tượng nhân vật chỉ nhận từ danh sách cho phép (emoji ghép nhiều mã không bị cắt dở thành ký tự lỗi)
const AVATARS=['👨🏻‍🎓','👩🏻‍🎓','🧑🏻‍🎓','📜'];
function pickAvatar(v){v=String(v||'');if(AVATARS.includes(v))return v;return AVATARS.find(a=>v&&a.startsWith(v))||'📜'}
const trimTail=a=>{while(a.length&&!a[a.length-1])a.pop();return a};
/* ===== V14: nhiều dạng câu hỏi (như Kahoot) =====
   mc: trắc nghiệm 2–4 đáp án (gồm Đúng/Sai) · type: gõ câu trả lời · order: sắp xếp thứ tự · poll: thăm dò ý kiến (không tính điểm)
   slider: thanh trượt số · cloud: đám mây từ (không tính điểm) */
const GRACE_MS=1500; // ân hạn độ trễ mạng: câu trả lời gửi sát giờ vẫn được nhận, điểm tính theo thời gian tối đa của câu
const KINDS=['mc','multi','type','number','order','poll','slider','cloud','fill','match'];
/* V15 đợt 6 – thêm dạng câu: fill (điền ô chữ), match (ghép cặp). Số phương án: trắc nghiệm/chọn nhiều/khảo sát 2–6, sắp xếp 3–8.
   Mọi trường mới đều KHÔNG bắt buộc: bộ đề cũ chuẩn hoá ra đúng như trước (test/test-dang-cau-moi.js so khớp từng câu). */
const OPT_MAX={mc:6,multi:6,poll:6,order:8},LETTERS='ABCDEFGH';
/* thanh trượt: giá trị hợp lệ nằm trên lưới min + k·bước (sai lệch dấu phẩy động ≤ 1e-6 bước) */
const onLattice=(v,q)=>{const k=(v-q.min)/q.step;return Math.abs(k-Math.round(k))<=1e-6};
const KIND_NAMES={fill:'Điền ô chữ',match:'Ghép cặp',multi:'Chọn nhiều đáp án',number:'Nhập đáp án số',mc:'Trắc nghiệm',type:'Gõ câu trả lời',order:'Sắp xếp thứ tự',poll:'Thăm dò ý kiến',slider:'Thanh trượt',cloud:'Đám mây từ'};
const SCORED={mc:true,multi:true,type:true,number:true,order:true,slider:true,fill:true,match:true};
const FILL_SEP=[' ','-'];const fillSlot=c=>/[\p{L}\p{N}]/u.test(c);
const numOr=(v,d)=>{const n=Number(v);return v!==''&&v!=null&&Number.isFinite(n)?n:d};
const plainTxt=s=>String(s??'').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const foldTxt=s=>plainTxt(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').normalize('NFC');
/* Lọc tên / từ phản cảm (tiếng Việt có dấu, không dấu, viết lách kiểu 'd.m', 'f*ck', '4', '0'…) */
const BAD_VN=new Set(['địt','đụ','đéo','cặc','lồn','buồi','đĩ','điếm','đù','đjt','chịch']);
const BAD_PHRASE=['chó đẻ','óc chó','mẹ mày','bố mày','cha mày','đồ ngu','thằng ngu','con ngu','con đĩ','đụ má','đụ mẹ','địt mẹ','con cặc','cái lồn','mặt lồn','vãi lồn','vãi cả lồn','súc vật'];
const BAD_WORD=new Set(['dm','dmm','dcm','dcmm','dkm','dmcs','vcl','vkl','vcc','clm','cmm','djt','loz','lozz','fuk','fck','wtf','stfu','sex','dit']);
const BAD_COMPACT=['ditme','ditmia','ditcon','dumama','dume','fuck','shit','bitch','cunt','pussy','nigga','nigger','asshole','dumbass','porn','xvideo','phimsex','dickhead','motherf'];
function badText(s){
 const p=plainTxt(s);if(!p)return false;const pad=' '+p+' ';
 if(p.split(' ').some(w=>BAD_VN.has(w))||BAD_PHRASE.some(x=>pad.includes(' '+x+' ')))return true;
 const leet=String(s).toLowerCase().replace(/0/g,'o').replace(/[1!|]/g,'i').replace(/3/g,'e').replace(/[4@]/g,'a').replace(/[5$]/g,'s').replace(/7/g,'t').replace(/\*/g,'u');
 const f=foldTxt(leet),toks=f.split(' '),merged=[];let run='';for(const t of toks){if(t.length===1)run+=t;else{if(run){merged.push(run);run=''}merged.push(t)}}if(run)merged.push(run);
 if(toks.some(w=>BAD_WORD.has(w))||merged.some(w=>BAD_WORD.has(w)))return true;
 const compact=foldTxt(leet.replace(/[^\p{L}\p{N}]/gu,'')).replace(/(.)\1+/g,'$1');return BAD_COMPACT.some(b=>compact.includes(b.replace(/(.)\1+/g,'$1')));
}
const safeSrc=v=>{const src=String(v||'').trim().slice(0,500);return /^\/media\/[\w.-]{3,80}$/.test(src)||/^https:\/\/[^\s"'<>\\]+$/.test(src)?src:''};
function mediaExtra(m,kind){const o={};const where=m.where==='led'?'led':m.where==='both'?'both':(kind==='image'?'both':'led');o.where=where;
 if(kind!=='image'){const st=Math.max(0,Math.min(36000,numOr(m.start,0))),en=Math.max(0,Math.min(36000,numOr(m.end,0)));if(st)o.start=st;if(en&&en>st)o.end=en;o.gate=m.gate!==false;if(kind!=='audio'&&m.silentOk===true)o.silentOk=true}
 if(kind==='image'){const h=Math.round(numOr(m.hide,0));if(h>=1&&h<=120)o.hide=h} // trò "ghi nhớ hình ảnh": ảnh tự ẩn sau N giây kể từ lúc mở câu
 const alt=clean(m.alt,LIMITS.alt);if(alt)o.alt=alt;return o}
function safeMedia(m){if(!m||typeof m!=='object')return null;const kind=['image','video','audio','youtube'].includes(m.kind)?m.kind:null;const src=String(m.src||'').trim().slice(0,500);if(!kind||!src)return null;
 if(kind==='youtube'){const mm=src.match(/(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);const id=mm?mm[1]:(/^[\w-]{11}$/.test(src)?src:null);
  return id?{kind,src:id,...mediaExtra(m,kind)}:null}
 if(!safeSrc(src))return null;return {kind,src,...mediaExtra(m,kind)}}
function qid6(){return token().slice(0,10)}
/* Chuẩn hoá một câu hỏi. Giữ nguyên văn (không cắt âm thầm): phần vượt giới hạn được ghi vào q._over để checkQ báo lỗi rõ. */
const KIND_VI={fill:'điền ô chữ',match:'ghép cặp',mc:'trắc nghiệm',multi:'chọn nhiều',type:'gõ đáp án',number:'nhập số',order:'sắp xếp',poll:'khảo sát',slider:'thanh trượt',cloud:'đám mây từ'};
function safeQ(q){q=q&&typeof q==='object'?q:{};const over=[];const rawKind=q.kind==null||q.kind===''?'mc':String(q.kind);
 // QF03: dạng câu không hỗ trợ bị BÁO LỖI, không tự đổi thành trắc nghiệm
 if(!KINDS.includes(rawKind))over.push(`dạng câu "${rawKind.slice(0,30)}" chưa hỗ trợ (hỗ trợ: ${Object.values(KIND_VI).join(', ')})`);const kind=KINDS.includes(rawKind)?rawKind:'mc';
 const cut=(v,n,label)=>{const t=clean(v,100000);if(ulen(t)>n)over.push(`${label} dài ${ulen(t)} ký tự (tối đa ${n})`);return t};
 const o={id:/^[\w-]{6,24}$/.test(String(q.id||''))?String(q.id):qid6(),stage:Math.max(0,Math.min(4,Number(q.stage)||0)),kind,q:cut(q.q,LIMITS.q,'Câu hỏi'),a:[],c:null,t:Number(q.t)};
 if(['mc','multi','poll','order'].includes(kind)){const max=OPT_MAX[kind];const L=LETTERS;
  const texts=(Array.isArray(q.a)?q.a:[]).slice(0,max).map((v,i)=>cut(v,LIMITS.opt,'Lựa chọn '+L[i]));
  const rawA=Array.isArray(q.a)?q.a:[],rawAi=Array.isArray(q.ai)?q.ai:[];let used=0;for(let i=0;i<Math.max(rawA.length,rawAi.length);i++)if(String(rawA[i]??'').trim()||String(rawAi[i]??'').trim())used=i+1;
  if(used>max)over.push(`có ${used} lựa chọn – tối đa ${max}${kind==='order'?'':' (câu sắp xếp được 8)'}`); // QF03: không cắt bớt lựa chọn
  rawAi.slice(0,max).forEach((v,i)=>{if(String(v??'').trim()&&!safeSrc(v))over.push(`ảnh lựa chọn ${L[i]} có địa chỉ không hợp lệ (chỉ nhận ảnh đã tải lên hoặc https://)`)});
  const imgs=rawAi.slice(0,max).map(safeSrc);let n=0;for(let i=0;i<max;i++)if(texts[i]||imgs[i])n=i+1;
  o.a=Array.from({length:n},(_,i)=>texts[i]||'');if(imgs.slice(0,n).some(Boolean))o.ai=Array.from({length:n},(_,i)=>imgs[i]||'');
  if(kind!=='order'&&q.shuffle)o.shuffle=true}
 if(kind==='mc'){o.c=Number(q.c);if(q.tf&&o.a.length===2)o.tf=true}
 if(kind==='multi'){o.c=null;o.cs=[...new Set((Array.isArray(q.cs)?q.cs:String(q.cs??'').split(/[,;\s]+/)).map(x=>/^[A-Fa-f]$/.test(String(x))?LETTERS.indexOf(String(x).toUpperCase()):Number(x)).filter(x=>Number.isInteger(x)&&x>=0&&x<o.a.length))].sort((x,y)=>x-y);if(q.partial)o.partial=true}
 if(kind==='poll'&&q.pmulti)o.pmulti=true;
 if(kind==='order'&&q.partial)o.partial=true;
 if(kind==='type'){o.acc=(Array.isArray(q.acc)?q.acc:String(q.acc??'').split(/[|;\n]/)).map((v,i)=>cut(v,LIMITS.acc,'Đáp án chấp nhận '+(i+1))).filter(Boolean).slice(0,12);
  o.loose=q.loose===true;if(q.caseOn)o.caseOn=true;if(q.punct)o.punct=true}
 if(kind==='number'){o.c=numOr(q.c,NaN);o.tol=Math.max(0,numOr(q.tol,0));o.unit=cut(q.unit,LIMITS.unit,'Đơn vị');if(q.prox&&o.tol>0)o.prox=true}
 if(kind==='fill'){o.word=cut(String(q.word??'').normalize('NFC').replace(/\s+/g,' ').trim(),LIMITS.word,'Từ khoá');const ch=Array.from(o.word);
  o.hint=[...new Set((Array.isArray(q.hint)?q.hint:String(q.hint??'').split(/[,;\s]+/).filter(Boolean)).map(Number))].filter(i=>Number.isInteger(i)&&i>=0&&i<ch.length&&fillSlot(ch[i])).sort((x,y)=>x-y);
  if(q.loose)o.loose=true}
 if(kind==='match'){const L=(Array.isArray(q.l)?q.l:[]),R=(Array.isArray(q.r)?q.r:[]);const n=Math.max(L.length,R.length);if(n>6)over.push(`có ${n} cặp – tối đa 6`);
  o.l=L.slice(0,6).map((v,i)=>cut(v,LIMITS.pair,'Vế trái '+(i+1)));o.r=R.slice(0,6).map((v,i)=>cut(v,LIMITS.pair,'Vế phải '+(i+1)))}
 if(kind==='poll'&&q.hideLive)o.hideLive=true;
 if(kind==='slider'){o.min=numOr(q.min,0);o.max=numOr(q.max,100);o.step=numOr(q.step,1);o.c=numOr(q.c,0);o.tol=Math.max(0,numOr(q.tol,0));o.unit=cut(q.unit,LIMITS.unit,'Đơn vị')}
 const pts=Number(q.pts);if(pts===0||pts===2||pts===3)o.pts=pts;
 /* cơ chế riêng từng câu (không đặt = theo luật chung của phòng như trước) */
 if(SCORED[kind]){const mp=Math.round(Number(q.maxPts));if(Number.isFinite(mp)&&mp>0&&mp!==1000)o.maxPts=Math.max(100,Math.min(5000,mp));
  if(q.scoring==='speed'||q.scoring==='accuracy')o.scoring=q.scoring;if(q.noStreak)o.noStreak=true;if(q.tie)o.tie=true}
 if(q.hideBoard)o.hideBoard=true;if(q.noFx)o.noFx=true;
 const md=safeMedia(q.media);if(md)o.media=md;else if(q.media&&typeof q.media==='object'&&String(q.media.src||'').trim())over.push(`media (${String(q.media.kind||'?').slice(0,10)}) có địa chỉ hoặc loại không hợp lệ: "${String(q.media.src).slice(0,60)}" – chỉ nhận tệp đã tải lên, https:// hoặc YouTube`);const note=cut(q.note,LIMITS.note,'Giải thích');if(note)o.note=note;
 if(over.length)Object.defineProperty(o,'_over',{value:over,enumerable:false});
 return o}
/* So sánh lựa chọn sau chuẩn hoá: hai phương án giống hệt nhau thì người chơi không phân biệt được */
// so khớp GIỮ DẤU tiếng Việt ("Sĩ tử" ≠ "Sỹ tử" là hai phương án khác nhau), chỉ bỏ khác biệt hoa/thường & khoảng trắng
const optKey=(q,i)=>String(q.a[i]||'').normalize('NFC').toLocaleLowerCase('vi').replace(/\s+/g,' ').trim()+'|'+((q.ai&&q.ai[i])||'');
function checkQ(q){
 if(q._over&&q._over.length)return q._over.join('; ')+' – hãy rút gọn, hệ thống không tự cắt để tránh đổi nghĩa';
 if(!q.q)return 'thiếu nội dung câu hỏi';if(!Number.isInteger(q.t)||q.t<5||q.t>300)return 'thời gian cần 5–300 giây';
 const L=LETTERS;
 if(['mc','multi','poll','order'].includes(q.kind)){
  const n=q.a.length,miss=q.a.findIndex((x,i)=>!x&&!(q.ai&&q.ai[i]));
  if(q.kind==='order'){if(n<3||n>8)return 'câu sắp xếp cần 3–8 mục, ghi theo đúng thứ tự'}
  else if(n<2||n>6)return (q.kind==='poll'?'câu khảo sát':'câu trắc nghiệm')+' cần 2–6 lựa chọn';
  if(miss>=0)return `lựa chọn ${L[miss]} đang trống (cần chữ hoặc ảnh, các lựa chọn phải liền nhau)`;
  const seen=new Map();for(let i=0;i<n;i++){const k=optKey(q,i);if(seen.has(k))return `lựa chọn ${L[seen.get(k)]} và ${L[i]} giống hệt nhau – người chơi không phân biệt được`;seen.set(k,i)}}
 if(q.kind==='mc'&&(!Number.isInteger(q.c)||q.c<0||q.c>=q.a.length))return 'chưa chọn đáp án đúng hợp lệ';
 if(q.kind==='multi'&&!q.cs.length)return 'câu chọn nhiều cần ít nhất 1 đáp án đúng (ví dụ "A,C")';
 if(q.kind==='type'&&!q.acc.length)return 'câu gõ đáp án cần ít nhất 1 đáp án được chấp nhận';
 if(q.kind==='type'){const bad=q.acc.find(x=>!String(x).trim()||!/[^\s.,!?\u2026;:"'\u201c\u201d\u2018\u2019()\[\]{}\u00ab\u00bb]/u.test(x));if(bad!=null)return `đáp án chấp nhận "${bad}" chỉ gồm dấu câu bị bỏ qua khi chấm – người chơi không nộp được đáp án trống; hãy viết đáp án có chữ, số hoặc ký hiệu`}
 if(q.kind==='number'&&!Number.isFinite(q.c))return 'câu nhập số cần giá trị đáp án là một số';
 if(q.kind==='fill'){const ch=Array.from(q.word),slots=ch.filter(fillSlot).length;if(slots<2)return 'điền ô chữ: từ khoá cần ít nhất 2 chữ cái';if(slots>30)return 'điền ô chữ: từ khoá tối đa 30 chữ cái';
  if(ch.some(c=>!fillSlot(c)&&!FILL_SEP.includes(c)))return 'điền ô chữ: từ khoá chỉ gồm chữ, số, khoảng trắng hoặc gạch nối';if(q.hint.length>=slots)return 'điền ô chữ: phải chừa ít nhất 1 ô để người chơi điền'}
 if(q.kind==='match'){const n=q.l.length;if(n<3||n>6||q.r.length!==n)return 'ghép cặp cần 3–6 cặp, mỗi cặp đủ vế trái và vế phải';const e=[...q.l,...q.r].findIndex(x=>!x);if(e>=0)return `cặp ${(e%n)+1} còn thiếu nội dung`;
  const k=x=>x.normalize('NFC').toLocaleLowerCase('vi').replace(/\s+/g,' ').trim();if(new Set(q.l.map(k)).size<n)return 'ghép cặp: có hai vế trái giống nhau';if(new Set(q.r.map(k)).size<n)return 'ghép cặp: có hai vế phải giống nhau – người chơi không phân biệt được'}
 if(q.kind==='slider'){if(!(q.max>q.min))return 'thanh trượt: giá trị lớn nhất phải lớn hơn nhỏ nhất';if(!(q.step>0)||(q.max-q.min)/q.step>100000)return 'thanh trượt: bước nhảy không hợp lệ';
  if(q.c<q.min||q.c>q.max)return 'thanh trượt: đáp án nằm ngoài khoảng';if(!q.tol&&!onLattice(q.c,q))return `thanh trượt: đáp án ${q.c} không nằm trên bước nhảy (${q.min}, ${q.min}+${q.step}, …) – người chơi không thể chọn đúng; sửa đáp án, bước hoặc đặt sai số`;if(q.tol>q.max-q.min)return 'thanh trượt: sai số cho phép quá lớn'}
 return ''}
function normalizeBank(arr){
 if(!Array.isArray(arr)||!arr.length||arr.length>300)throw Error('Bộ đề cần từ 1 đến 300 câu');
 const a=arr.map(safeQ);const bad=a.findIndex(q=>checkQ(q));
 if(bad>=0)throw Error(`Câu ${bad+1}: ${checkQ(a[bad])}`);
 return a;
}
/* ===== Đọc số người chơi nhập (câu nhập số) =====
   Quy tắc công bố: dấu thập phân là "," hoặc "." (1,5 = 1.5 = một phẩy năm); KHÔNG dùng dấu phân cách hàng nghìn.
   Chuỗi mơ hồ như "1,000" / "2.500" (đúng 3 chữ số sau dấu, phần nguyên khác 0) bị từ chối để người chơi viết lại – không tự đoán.
   Không nhận biểu thức (1+1), chữ, nhiều dấu thập phân. Có thể ghi kèm đúng đơn vị của câu (ví dụ "12 kg"). */
function parseNumAnswer(text,unit){let s=String(text??'').normalize('NFC').trim().replace(/−/g,'-');
 if(unit){const u=unit.normalize('NFC').toLowerCase();if(s.toLowerCase().endsWith(u))s=s.slice(0,s.length-u.length).trim()}
 const m=/^([+-]?)(\d+)(?:([.,])(\d+))?$/.exec(s);if(!m)throw Error(unit?`Hãy nhập một số (có thể kèm đơn vị "${unit}"), ví dụ 12 hoặc 12,5`:'Hãy nhập một số, ví dụ 12 hoặc 12,5 (không nhập phép tính)');
 if(m[4]&&m[4].length===3&&Number(m[2])!==0)throw Error(`"${s}" không rõ là số thập phân hay hàng nghìn – hãy viết ${m[2]}${m[4]} hoặc ${m[2]},${m[4].replace(/0+$/,'')||'0'}`);
 const v=Number(m[1]+m[2]+(m[4]?'.'+m[4]:''));if(!Number.isFinite(v))throw Error('Số không hợp lệ');return v}
/* So khớp câu gõ đáp án (QF02 – kiểm định 25/11/2026):
   – Luôn: chuẩn hoá Unicode NFC, gộp khoảng trắng; mặc định KHÔNG phân biệt hoa/thường, GIỮ dấu tiếng Việt.
   – Chỉ bỏ dấu câu "trang trí": dấu kết câu ở CUỐI (. , ! ? … ; :) và ngoặc/nháy bao quanh. KHÔNG bao giờ bỏ dấu có nghĩa
     như - + − < > = % ≤ ≥ ≠ × ÷ / ^ ° (vì "-5" ≠ "5", "50%" ≠ "50", "<" là một đáp án).
   – Tuỳ chọn "bỏ mọi dấu câu" (punct): bỏ dấu câu/ký hiệu còn lại nhưng VẪN giữ các dấu có nghĩa ở trên (gạch nối giữa hai chữ được coi là khoảng trắng).
   – Nếu sau chuẩn hoá chuỗi rỗng (đáp án chỉ là ký hiệu, ví dụ "?"), so sánh nguyên văn đã gộp khoảng trắng. */
const MEANING_SIGNS='\\-+\u2212<>=%\u2264\u2265\u2260\u00d7\u00f7/^\u00b0';
const RE_LEAD=/^[\s"'\u201c\u201d\u2018\u2019(\[{\u00ab]+/u, RE_TRAIL=/[\s.,!?\u2026;:"'\u201c\u201d\u2018\u2019)\]}\u00bb]+$/u;
const RE_PUNCT=new RegExp('[^\\p{L}\\p{M}\\p{N}\\s'+MEANING_SIGNS+'.,]','gu');
function normAnswer(s,q){const base=String(s??'').normalize('NFC').replace(/\s+/g,' ').trim();let t=base;
 if(q.punct){t=t.replace(/(\p{L})-(?=\p{L})/gu,'$1 ').replace(RE_PUNCT,' ').replace(/(^|[^\d])[.,]|[.,](?!\d)/g,'$1 ').replace(/\s+/g,' ').trim()}
 else t=t.replace(RE_LEAD,'').replace(RE_TRAIL,'');
 if(!t)t=base;
 if(!q.caseOn)t=t.toLocaleLowerCase('vi');
 if(q.loose)t=t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').normalize('NFC');
 return t}
/* QF01: so sánh số theo THẬP PHÂN chính xác (không cộng "sai số máy" theo độ lớn đáp án).
   Hai số được đổi sang số nguyên lớn với 9 chữ số thập phân (đủ cho mọi đáp án nhập tay) rồi so |người chơi − đáp án| ≤ sai số. */
const DEC=9;function decInt(x){if(!Number.isFinite(x))return null;if(Math.abs(x)>=1e21)return null;return BigInt(x.toFixed(DEC).replace('.',''))}
function numClose(v,c,tol){const a=decInt(v),b=decInt(c),t=decInt(Math.max(0,tol||0));if(a===null||b===null||t===null)return Math.abs(v-c)<=Math.max(0,tol||0);const d=a>b?a-b:b-a;return d<=t}
/* Chấm một câu trả lời. Lựa chọn gửi lên là MÃ lựa chọn gốc (không phụ thuộc vị trí nút sau khi xáo trộn).
   Trả về {val (lưu lại), ok (đúng hoàn toàn / null nếu không tính điểm), part (0..1 chấm một phần), close (thanh trượt)} */
function judge(q,msg,perm){
 const n=(q.a||[]).length;const pickSet=()=>{const arr=Array.isArray(msg.choices)?msg.choices.map(Number):[];if(!arr.length)throw Error('Hãy chọn ít nhất một phương án rồi bấm Nộp');
  if(arr.some(x=>!Number.isInteger(x)||x<0||x>=n)||new Set(arr).size!==arr.length)throw Error('Lựa chọn không hợp lệ');return arr.sort((x,y)=>x-y)};
 if(q.kind==='mc'||(q.kind==='poll'&&!q.pmulti)){const c=Number(msg.choice);if(!Number.isInteger(c)||c<0||c>=n)throw Error('Đáp án không hợp lệ');return {val:{choice:c},ok:q.kind==='mc'?c===q.c:null}}
 if(q.kind==='poll'){return {val:{choices:pickSet()},ok:null}}
 if(q.kind==='multi'){const ch=pickSet(),want=new Set(q.cs);const hit=ch.filter(x=>want.has(x)).length,wrong=ch.length-hit;const exact=wrong===0&&hit===want.size;
  return {val:{choices:ch},ok:exact,part:exact?1:q.partial?Math.max(0,(hit-wrong)/want.size):0}}
 if(q.kind==='type'||q.kind==='cloud'){const text=clean(msg.text,q.kind==='cloud'?40:80);if(q.kind==='cloud'?!plainTxt(text):!text.trim())throw Error('Hãy nhập câu trả lời');
  if(q.kind==='cloud')return {val:{text,hidden:badText(text)},ok:null};
  const me=normAnswer(text,q);return {val:{text},ok:!!me&&q.acc.some(x=>normAnswer(x,q)===me)}}
 if(q.kind==='number'){const text=clean(msg.text,40);const v=parseNumAnswer(text,q.unit);const d=Math.abs(v-q.c),ok=numClose(v,q.c,q.tol);
  return {val:{text,value:v},ok,...(q.prox&&ok&&q.tol>0?{close:Math.max(0.5,1-0.5*d/q.tol)}:{})}} // ước lượng: càng gần càng nhiều điểm (50–100%)
 if(q.kind==='fill'){const text=clean(msg.text,120).normalize('NFC');const want=Array.from(q.word).filter(fillSlot),got=Array.from(text).filter(fillSlot);
  if(got.length!==want.length)throw Error(`Hãy điền đủ ${want.length} ô chữ`);const f=c=>{c=c.toLocaleLowerCase('vi');return q.loose?c.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').normalize('NFC'):c};
  return {val:{text},ok:got.every((c,i)=>f(c)===f(want[i]))}}
 if(q.kind==='match'){const m=q.l.length,pr=Array.isArray(msg.pairs)?msg.pairs.map(Number):[];
  if(pr.length!==m||new Set(pr).size!==m||pr.some(x=>!Number.isInteger(x)||x<0||x>=m))throw Error('Hãy ghép đủ tất cả các cặp (mỗi mục bên phải dùng đúng một lần) rồi bấm NỘP');
  const orig=pr.map(d=>perm&&perm.length===m?perm[d]:d),right=orig.filter((x,i)=>x===i).length;return {val:{pairs:orig},ok:right===m,part:right/m}}
 if(q.kind==='order'){const o=Array.isArray(msg.order)?msg.order.map(Number):[];
  if(o.length!==n||new Set(o).size!==n||o.some(x=>!Number.isInteger(x)||x<0||x>=n))throw Error('Thứ tự không hợp lệ – mỗi mục phải có mặt đúng một lần');
  const orig=o.map(d=>perm&&perm.length===n?perm[d]:d);const right=orig.filter((x,i)=>x===i).length;const ok=right===n;return {val:{order:orig},ok,part:ok?1:q.partial?right/n:0}}
 if(q.kind==='slider'){const v=Number(msg.value);if(!Number.isFinite(v)||v<q.min||v>q.max)throw Error('Giá trị ngoài khoảng cho phép');if(!onLattice(v,q))throw Error('Giá trị không đúng bước nhảy của thanh trượt');
  const d=Math.abs(v-q.c),ok=numClose(v,q.c,q.tol);return {val:{value:v},ok,close:ok&&q.tol>0?Math.max(0.5,1-0.5*d/q.tol):1}}
 throw Error('Dạng câu hỏi không hỗ trợ')}
/* Luật điểm (công bố trên màn MC & điện thoại):
   - Tốc độ (mặc định, như Kahoot Classic): đúng = 300–1000 điểm theo thời gian trả lời trên THỜI GIAN GỐC của câu.
     L01: MC cộng thêm giờ chỉ kéo dài hạn nộp; thang điểm tốc độ giữ nguyên → trả lời trong phần cộng thêm nhận mức tối thiểu 300.
   - Chính xác (như Kahoot Accuracy): đúng = 1000 điểm, không phụ thuộc tốc độ.
   - Hệ số câu: ×0 (không tính điểm), ×1, ×2.  Chấm một phần (nếu bật cho câu): điểm × tỷ lệ đúng, nhưng không tính là "câu đúng".
   - Thưởng chuỗi đúng liên tiếp: +100…+500 (MC bật/tắt).  Chế độ Tự tin (MC bật): người chơi chọn "Chắc chắn" → đúng +50/75/100, sai −50/75/100 theo cấp. */
const CF=[50,75,100];
/* Luật điểm theo TỪNG VÒNG (chặng): MC đặt riêng Tốc độ / Chính xác cho mỗi chặng; không đặt thì dùng luật chung */
function scoringOf(r,q){if(q&&(q.scoring==='speed'||q.scoring==='accuracy'))return q.scoring;const v=r.stageScoring&&q&&r.stageScoring[q.stage];return v==='accuracy'||v==='speed'?v:(r.scoring==='accuracy'?'accuracy':'speed')}
/* điểm gốc của một câu đúng: Tốc độ = 30–100% điểm tối đa theo thời gian trên THỜI GIAN GỐC; Cố định (Chính xác) = 100%. Điểm tối đa mặc định 1000 */
function basePoints(r,q,sm){const M=q.maxPts||1000,T=q.t*1000;return scoringOf(r,q)==='accuracy'?M:Math.max(.3*M,M*(.3+.7*(1-Math.min(sm,T)/T)))}
function scoreAnswer(r,p,q,j,ms,boost){
 let points=0,bonus=0,cfDelta=0;const mult=q.pts??1;
 if(SCORED[q.kind]){
  const part=j.ok?1:(j.part||0),T=q.t*1000,sm=Math.min(ms,T);
  if(part>0&&(mult>0||q.tie)){points=basePoints(r,q,sm)*(j.close??1)*part*(q.tie?1:mult);points=Math.round(points)}
  if(q.tie){ // câu quyết định khi bằng điểm: KHÔNG cộng vào tổng, chỉ dùng xếp hạng khi bằng điểm; không đụng chuỗi đúng / cược
   return {...j.val,ms,points:0,tiePts:points,tie:true,bonus:0,...(j.part!=null&&!j.ok&&j.part>0?{part:Math.round(j.part*100)/100}:{}),correct:!!j.ok,streak:p.streak||0}}
  if(j.ok){p.streak=(p.streak||0)+1;bonus=r.streakOn===false||mult===0||q.noStreak?0:Math.min(p.streak-1,5)*100}else p.streak=0;
  if(r.confidence&&boost&&mult>0){const lv=Math.max(1,Math.min(3,p.cf||1));if(j.ok){cfDelta=CF[lv-1];p.cf=Math.min(3,lv+1)}else{cfDelta=-CF[lv-1];p.cf=1}}}
 let total=points+bonus+cfDelta;if((p.score||0)+total<0)total=-(p.score||0); // tổng điểm không âm
 return {...j.val,ms,points:total,bonus,...(cfDelta?{boost:true,cf:cfDelta}:boost&&r.confidence?{boost:true,cf:0}:{}),...(j.part!=null&&!j.ok&&j.part>0?{part:Math.round(j.part*100)/100}:{}),correct:!!j.ok,streak:p.streak||0,...(SCORED[q.kind]?{}:{poll:true})}}
/* thứ tự hiển thị xáo trộn: câu sắp xếp, câu bật xáo trộn, vế phải câu ghép cặp */
function permFor(q){return q.kind==='match'?shuffled(q.l.length):q.kind==='order'||q.shuffle?shuffled(q.a.length):null}
function shuffled(n){const a=[...Array(n).keys()];do{for(let i=n-1;i>0;i--){const k=Math.floor(Math.random()*(i+1));[a[i],a[k]]=[a[k],a[i]]}}while(n>1&&a.every((x,i)=>x===i));return a}
/* Thống kê một câu (để hiện trên LED khi công bố, và trực tiếp với câu thăm dò / đám mây từ) */
function qStats(r,idx){const q=r.bank[idx];if(!q)return null;const list=[];for(const p of r.players.values()){const a=p.answers[idx];if(a&&!a.skipped)list.push(a)}
 const st={n:list.length,right:list.filter(a=>a.correct).length};
 if(['mc','poll','multi'].includes(q.kind)){st.counts=q.a.map((_,i)=>list.filter(a=>a.choice===i||(Array.isArray(a.choices)&&a.choices.includes(i))).length);if(q.kind==='multi'||q.pmulti)st.multi=true}
 else if(q.kind==='number'){const v=list.map(a=>a.value).filter(Number.isFinite);st.avg=v.length?Math.round(v.reduce((s,x)=>s+x,0)/v.length*100)/100:null}
 else if(q.kind==='order'){st.partial=list.filter(a=>a.part).length}
 else if(q.kind==='match'){st.partial=list.filter(a=>a.part).length;const m=q.l.length;st.pairs=q.l.map((_,i)=>list.filter(a=>Array.isArray(a.pairs)&&a.pairs[i]===i).length);st.avgPairs=list.length?Math.round(list.reduce((s,a)=>s+(Array.isArray(a.pairs)?a.pairs.filter((x,i)=>x===i).length:0),0)/list.length*10)/10:null}
 else if(q.kind==='type'||q.kind==='cloud'||q.kind==='fill'){const m=new Map();for(const a of list){if(a.hidden||badText(a.text))continue;const k=plainTxt(a.text);if(!k)continue;const e=m.get(k)||{w:a.text.trim().slice(0,40),n:0,ok:!!a.correct};e.n++;m.set(k,e)}
  st.words=[...m.values()].sort((x,y)=>y.n-x.n).slice(0,q.kind==='cloud'?40:8)}
 else if(q.kind==='slider'){const v=list.map(a=>a.value);st.avg=v.length?Math.round(v.reduce((s,x)=>s+x,0)/v.length*100)/100:null;const B=10,w=(q.max-q.min)/B;st.bins=Array(B).fill(0);for(const x of v)st.bins[Math.min(B-1,Math.floor((x-q.min)/w))]++}
 return st}
function firstPlayers(r,n){const out=[];for(const p of r.players.values()){out.push(p);if(out.length>=n)break}return out}
/* Người được vẽ thành nhân vật có tên trên sân LED (tối đa n). Phòng đông (tới 6.000) không thể vẽ hết có tên:
   – chưa có điểm: n người MỚI VÀO GẦN NHẤT (ai vừa quét QR cũng thấy mình xuất hiện);
   – đã có điểm: n người DẪN ĐẦU. Danh sách chỉ cập nhật ngoài lúc đang làm câu (running/media) để không lộ ai đúng/sai giữa giờ. */
function stagePlayers(r,n){if(r._stg&&(hiddenNow(r)||boardHeld(r))&&(r._stg.mode==='top'||boardHeld(r)))return r._stg; // không lộ thứ tự xếp hạng khi chưa công bố / MC đang giữ bảng điểm // C02: không xếp lại theo điểm khi câu chưa công bố
 if(r._stg&&hiddenNow(r)&&r._stgN===r.players.size)return r._stg;
 const scored=[...r.players.values()].some(p=>shownOf(r,p).score>0);let list,mode;
 if(scored){mode='top';list=(hiddenNow(r)?[...r.players.values()].map(p=>({p,v:shownOf(r,p)})).sort((a,b)=>b.v.score-a.v.score||b.v.correct-a.v.correct||a.p.joinedAt-b.p.joinedAt).map(x=>x.p):leader(r)).slice(0,n).map(p=>({name:p.name,avatar:p.avatar}))}
 else{mode='recent';const all=[...r.players.values()];list=all.slice(-n).reverse().map(p=>({name:p.name,avatar:p.avatar}))}
 r._stg={mode,list};r._stgN=r.players.size;return r._stg}
/* V15 #5: giới hạn kết nối CHUNG cho cả cụm. Bộ định tuyến (CLUSTER_MAX_ONLINE) gửi 2 giây/lần, có chữ ký: số người đang kết nối ở các nút KHÁC.
   Nút cộng với số của mình (tính tức thời) để quyết định. Không nhận được tin quá 15 giây (bộ định tuyến hỏng) → chỉ còn giới hạn riêng từng nút (MAX_ONLINE). */
let CLUSTER={limit:0,reserve:0,others:0,at:0};
function clusterFull(rejoin){const c=CLUSTER;if(!c.limit||Date.now()-c.at>15000)return false;return onlinePlayers()+c.others>=(rejoin?c.limit:c.limit-c.reserve)}
function onlinePlayers(){let n=0;for(const r of rooms.values())for(const c of r.clients)if(c.role==='player')n++;return n}
/* ===== Chơi theo đội: điểm đội = điểm trung bình của thành viên (đội đông không bị lợi) ===== */
const TEAM_COLORS=['#c0392b','#2e7a4f','#2f5d9a','#d39b1e','#7d3c98','#16a2a5','#c25e1a','#6b5b4b'];
function teamOn(r){return Array.isArray(r.teams)&&r.teams.length>=2}
function pickTeam(r,want){if(!teamOn(r))return null;if(r.teams.some(t=>t.id===want))return want;const cnt=new Map(r.teams.map(t=>[t.id,0]));for(const p of r.players.values())if(cnt.has(p.team))cnt.set(p.team,cnt.get(p.team)+1);return [...cnt.entries()].sort((a,b)=>a[1]-b[1])[0][0]}
/* C02: trong lúc câu đang chạy (chưa công bố), mọi số liệu công khai phải tính như TRƯỚC câu này */
function hiddenNow(r){return r.mode!=='self'&&(r.phase==='running'||r.phase==='media')}
/* Chống lộ đáp án ở chế độ TỰ LÀM BÀI: mặc định KHÔNG cho người chơi biết đúng/sai, điểm, đáp án đúng, bảng xếp hạng cho tới khi MC đóng bài
   (nếu hiện ngay, người làm trước có thể chuyền đáp án cho người làm sau). MC có thể tắt để dùng cho luyện tập. */
/* MC GIỮ bảng điểm (holdBoard): sau công bố đáp án / tổng kết chặng / kết thúc, bảng xếp hạng, thứ hạng cá nhân, điểm đội và bảng vàng
   KHÔNG được gửi tới điện thoại hay LED cho tới khi MC bấm "Hiện bảng điểm" / "XƯỚNG DANH" – giữ ở máy chủ, không chỉ ẩn trên giao diện. */
function boardKey(r){return r.phase+':'+r.idx}
function boardOpen(r){return !r.holdBoard||r.mode==='self'||r.shownKey===boardKey(r)}
function boardHeld(r){const cq=r.bank&&r.bank[r.idx];return (!!r.holdBoard||(!!(cq&&cq.hideBoard)&&r.phase==='reveal'))&&r.mode!=='self'&&['reveal','intermission','finished'].includes(r.phase)&&r.shownKey!==boardKey(r)}
/* cộng/trừ số câu đúng & thời gian của một bài; bài ở câu QUYẾT ĐỊNH KHI BẰNG ĐIỂM chỉ cộng vào p.tie (không tính câu đúng, không tính tổng điểm) */
/* áp kết quả MC duyệt tay (dùng cả khi phát lại nhật ký – chỉ áp đúng một lần nhờ cờ mcOk) */
function applyAccept(r,idx,ch){for(const c of ch||[]){const p=r.players.get(c.pid),a=p&&p.answers[idx];if(!a)continue;
  if(c.on){if(a.correct)continue;const pts=Math.max(0,Number(c.pts)||0);a.correct=true;a.mcOk=true;a.mcPts=pts;delete a.part;if(a.tie){a.tiePts=(a.tiePts||0)+pts;p.tie=(p.tie||0)+pts}else{a.points=(a.points||0)+pts;p.score+=pts;p.correct=(p.correct||0)+1;p.totalMs=(p.totalMs||0)+(a.ms||0)}}
  else{if(!a.mcOk)continue;const pts=a.mcPts||0;a.correct=false;delete a.mcOk;delete a.mcPts;if(a.tie){a.tiePts=Math.max(0,(a.tiePts||0)-pts);p.tie=Math.max(0,(p.tie||0)-pts)}else{a.points=(a.points||0)-pts;p.score-=pts;p.correct=Math.max(0,(p.correct||0)-1);p.totalMs=Math.max(0,(p.totalMs||0)-(a.ms||0))}}}
 r.sv=(r.sv||0)+1}
function tallyAdd(p,a){if(a.tie){p.tie=(p.tie||0)+(a.tiePts||0);return}if(a.correct){p.correct=(p.correct||0)+1;p.totalMs=(p.totalMs||0)+(a.ms||0)}}
function tallySub(p,a){if(a.tie){p.tie=Math.max(0,(p.tie||0)-(a.tiePts||0));return}if(a.correct){p.correct=Math.max(0,(p.correct||0)-1);p.totalMs=Math.max(0,(p.totalMs||0)-(a.ms||0))}}
function selfHidden(r){return r.mode==='self'&&r.selfHide!==false&&r.phase!=='finished'}
function shownOf(r,p){if(selfHidden(r))return {score:0,correct:0,streak:0,cf:1};const a=hiddenNow(r)?p.answers[r.idx]:null;if(!a)return {score:p.score,correct:p.correct,streak:p.streak||0,cf:p.cf||1};
 return {score:p.score-(a.points||0),correct:a.correct&&!a.tie?p.correct-1:p.correct,streak:a.prevStreak??p.streak??0,cf:a.prevCf??p.cf??1}}
function teamBoard(r){if(!teamOn(r))return [];const m=new Map(r.teams.map(t=>[t.id,{id:t.id,name:t.name,color:t.color,members:0,total:0,correct:0}]));
 for(const p of r.players.values()){const t=m.get(p.team);if(t){const v=shownOf(r,p);t.members++;t.total+=v.score;t.correct+=v.correct}}
 return [...m.values()].map(t=>({...t,score:t.members?Math.round(t.total/t.members):0})).sort((a,b)=>b.score-a.score||b.correct-a.correct).map((t,i)=>({...t,rank:i+1}))}
function serialize(){return Array.from(rooms.values()).map(r=>({pin:r.pin,hostKey:r.hostKey,title:r.title,bank:r.bank,phase:r.phase,idx:r.idx,mode:r.mode||'live',selfDeadline:r.selfDeadline||0,teams:r.teams||null,locked:!!r.locked,bannedNames:r.bannedNames||[],streakOn:r.streakOn!==false,autoReveal:r.autoReveal!==false,bigQr:r.bigQr||'auto',extra:r.extra||0,scoring:r.scoring||'speed',confidence:!!r.confidence,rules:r.rules||null,rehearsal:!!r.rehearsal,stageScoring:r.stageScoring||{},selfHide:r.selfHide!==false,holdBoard:!!r.holdBoard,shownKey:r.shownKey||null,botGuard:r.botGuard!==false,mainTok:r.mainTok||null,entry:r.entry||'open',late:r.late||'allow',roster:r.roster||[],history:r.history||[],bankVer:r.bankVer||1,bankLocked:!!r.bankLocked,perm:r.perm||null,qid:r.qid||null,eid:r.eid||null,startedAt:r.startedAt,endedAt:r.endedAt,createdAt:r.createdAt,completedStage:r.completedStage??null,mcUser:r.mcUser||'',mcPassword:r.mcPassword||null,mcVersion:r.mcVersion||'',tenant:r.tenant||null,players:durablePlayers(r)}));}
function durablePlayers(r){const out=[];for(const p of r.players.values()){if(p._jp)continue;let c=p;
 for(const [k,a] of Object.entries(p.answers)){if(!a||!a._pending)continue;if(c===p)c={...p,answers:{...p.answers}};delete c.answers[k];
  if(a._undo)Object.assign(c,a._undo);else{c.score=(c.score||0)-(a.points||0);tallySub(c,a)}}
 out.push(c)}return out}
let saveTimer;
const db=process.env.DATABASE_URL?new (require('pg').Pool)({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='require'?{rejectUnauthorized:false}:undefined,max:4}):null;
let saving=Promise.resolve();
let persistenceLastError = null;
let persistenceLastSavedAt = null;
let persistenceReady = false;
/* ===== V14.1: nhật ký ghi trước (write-ahead) – CHỈ xác nhận ghi danh / câu trả lời sau khi đã lưu bền =====
   Tệp: DATA_FILE.journal (ghi nối tiếp + fsync) hoặc bảng udika_journal (PostgreSQL). Gộp theo lô ~15 ms để chịu tải hàng nghìn người.
   Khi khởi động: nạp ảnh chụp (snapshot) rồi phát lại các bản ghi có seq > lastSeq của ảnh chụp. */
const JOURNAL_FILE=DATA_FILE+'.journal';let SEQ=0,savedSeq=0,jq=[],jTimer=null,jBusy=false,jHandle=null,jBytes=0;
/* C01: mốc đã ghi bền tách khỏi số thứ tự đã cấp. Ảnh chụp chỉ ghi lastSeq = mốc mà MỌI bản ghi ≤ mốc đã xong (ghi được hoặc đã huỷ),
   và không chứa tác động của bản ghi còn đang chờ (bài nộp _pending, người ghi danh chưa lưu). Khi khởi động lại, phát lại nhật ký từ mốc đó
   (phát lại là luỹ đẳng: đã có bài/người thì bỏ qua). */
const INFLIGHT=new Set();function durableMark(){if(!INFLIGHT.size)return SEQ;let m=Infinity;for(const x of INFLIGHT)if(x<m)m=x;return m-1}
function durable(entry,cb){entry.seq=++SEQ;entry.at=Date.now();INFLIGHT.add(entry.seq);const done=cb;cb=e=>{INFLIGHT.delete(entry.seq);done(e)};jq.push({entry,cb});if(!jTimer&&!jBusy)jTimer=setTimeout(flushJournal,15)}
async function flushJournal(){jTimer=null;if(jBusy||!jq.length)return;jBusy=true;const batch=jq.splice(0);let err=null;
 try{if(process.env.FAIL_JOURNAL==='1')throw Error('mô phỏng lỗi ghi');
  if(db){await db.query('INSERT INTO '+JT+' (seq,payload) SELECT * FROM UNNEST($1::bigint[],$2::jsonb[]) ON CONFLICT (seq) DO NOTHING',[batch.map(b=>b.entry.seq),batch.map(b=>JSON.stringify(b.entry))])}
  else{if(!jHandle){fs.mkdirSync(path.dirname(JOURNAL_FILE),{recursive:true});jHandle=await fs.promises.open(JOURNAL_FILE,'a')}const txt=batch.map(b=>JSON.stringify(b.entry)).join('\n')+'\n';await jHandle.write(txt);await jHandle.datasync();jBytes+=txt.length;
   if(jBytes>8_000_000&&savedSeq){await jHandle.close();jHandle=null;const keep=readJournal().filter(e=>e.seq>savedSeq);fs.writeFileSync(JOURNAL_FILE+'.tmp',keep.map(e=>JSON.stringify(e)).join('\n')+(keep.length?'\n':''));fs.renameSync(JOURNAL_FILE+'.tmp',JOURNAL_FILE);jBytes=0}}
 }catch(e){err=e;persistenceLastError=String(e.message||e);console.error('JOURNAL WRITE FAILED:',e.message)}
 for(const b of batch){try{b.cb(err)}catch(e){console.error(e)}}
 jBusy=false;if(jq.length)jTimer=setTimeout(flushJournal,5)}
function readJournal(){try{return fs.readFileSync(JOURNAL_FILE,'utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)}catch{return []}}
function replay(entries,fromSeq){let n=0;for(const e of entries.sort((a,b)=>a.seq-b.seq)){SEQ=Math.max(SEQ,e.seq||0);lastAlive=Math.max(lastAlive,e.at||0);if(!(e.seq>fromSeq))continue;const r=rooms.get(e.pin);if(!r)continue;
  if(e.t==='join'){if(!r.players.has(e.p.id)){r.players.set(e.p.id,{...e.p,avatar:pickAvatar(e.p.avatar),score:0,correct:0,totalMs:0,answers:{},streak:0,cur:0,qStart:0,doneAt:0});n++}continue}
  if(e.eid&&r.eid&&e.eid!==r.eid)continue; // F01: bản ghi của kỳ thi khác (trước khi làm lại/thay đề) không được cộng vào kỳ hiện tại
  if(e.t==='acc'){applyAccept(r,e.idx,e.ch);n++;continue}
  const p=r.players.get(e.pid);if(!p||p.answers[e.idx])continue;const a=e.a;p.answers[e.idx]=a;r.sv=(r.sv||0)+1;p.score+=a.points||0;tallyAdd(p,a);if(e.streak!=null)p.streak=e.streak;if(e.cf!=null)p.cf=e.cf;
  if(e.t==='self'){p.cur=Math.max(p.cur||0,e.cur||0);p.qStart=0;if(e.doneAt)p.doneAt=e.doneAt}n++}
 if(n)console.log('Khôi phục từ nhật ký:',n,'bản ghi');return n}
/* Sau khi khởi động lại: câu đang mở được tiếp tục, thời gian máy chủ gián đoạn được cộng bù (coi như tạm dừng) */
function resumeAfterRestart(){const t=Date.now();for(const r of rooms.values()){if(r.phase!=='running')continue;const q=r.bank[r.idx];if(!q){r.phase='reveal';continue}
  const down=lastAlive?Math.max(0,t-lastAlive):0,left=r.startedAt+limitMs(r,q)-(lastAlive||t);
  if(left<=0||down>30*60*1000){r.phase='reveal';r.endedAt=t;continue}
  r.startedAt+=down;r.resumedAt=t;clearTimeout(r.deadlineTimer);r.deadlineTimer=setTimeout(()=>timeoutRound(r),Math.max(0,r.startedAt+limitMs(r,q)-t)+GRACE_MS);
  console.log(`Phòng ${r.pin}: tiếp tục câu ${r.idx+1}, cộng bù ${Math.round(down/1000)} giây gián đoạn, còn ${Math.round(left/1000)} giây`)}}
/* F07: lưu ảnh chụp trả về true/false; lỗi được ghi vào persistenceLastError (→ /health 503, MC được báo), lưu được lại thì hết lỗi.
   Tệp: ghi tệp tạm + fsync tệp + đổi tên + fsync thư mục (an toàn khi mất điện). PostgreSQL: chuỗi JSON được tạo NGAY (không giữ tham chiếu đối tượng). */
let persistFailNotified=false;let STARTUP_DATA_ERROR=null;const ARCHIVE=[];const TENANTS=new Map();const PLANS=[],ORDERS=[],PAYLOG=[],EVENTS=[];
function extraState(){return {archive:ARCHIVE,tenants:[...TENANTS.values()],plans:PLANS,orders:ORDERS,paylog:PAYLOG,events:EVENTS}}
function persistResult(ok,err){if(ok){persistenceLastError=null;persistenceLastSavedAt=Date.now();if(persistFailNotified){persistFailNotified=false;notifyHosts('✅ Máy chủ đã lưu dữ liệu bình thường trở lại.')}}
 else{persistenceLastError=String(err&&err.message||err||'lỗi lưu');console.error('SAVE FAILED:',persistenceLastError);if(!persistFailNotified){persistFailNotified=true;notifyHosts('⚠ MÁY CHỦ KHÔNG LƯU ĐƯỢC DỮ LIỆU ('+persistenceLastError.slice(0,80)+') – báo ngay cho kỹ thuật; kết quả mới có thể mất nếu máy chủ khởi động lại.')}}return ok}
function notifyHosts(message){try{const j=JSON.stringify({type:'media_alert',led:'Máy chủ',message});for(const r of rooms.values())for(const c of r.clients)if(c.role==='host')sendRaw(c,j)}catch{}}
async function persistNow(){const mark=durableMark();const payload=JSON.stringify({v:15,at:Date.now(),lastSeq:mark,rooms:serialize(),library:[...LIB.values()],...extraState()});const upto=mark;
 if(db){let ok=false;saving=saving.then(()=>db.query('INSERT INTO udika_snapshot (id,payload,updated_at) VALUES ('+SNAP_ID+',$1,NOW()) ON CONFLICT (id) DO UPDATE SET payload=$1,updated_at=NOW()',[payload])).then(()=>db.query('DELETE FROM '+JT+' WHERE seq<=$1',[upto])).then(()=>{savedSeq=upto;ok=persistResult(true)}).catch(e=>{persistResult(false,e)});await saving;return ok}
 try{fs.mkdirSync(path.dirname(DATA_FILE),{recursive:true});const tmp=DATA_FILE+'.tmp';const fd=fs.openSync(tmp,'w');try{fs.writeSync(fd,payload);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}fs.renameSync(tmp,DATA_FILE);
  try{const dfd=fs.openSync(path.dirname(DATA_FILE),'r');try{fs.fsyncSync(dfd)}finally{fs.closeSync(dfd)}}catch{}savedSeq=upto;return persistResult(true)}catch(e){return persistResult(false,e)}}
/* Báo "đã lưu" cho MC CHỈ SAU KHI ghi bền (rút kinh nghiệm phản ánh "tự lưu" của Kahoot): máy chủ sập ngay sau đó thì đề vẫn còn;
   lưu thất bại → báo lỗi, màn MC GIỮ bản nháp trên máy để gửi lại. */
function ackSaved(ws,msg){Promise.resolve(persistNow()).catch(()=>false).then(ok=>{if(ok)send(ws,msg);else send(ws,{type:'error',message:'Máy chủ CHƯA lưu được thay đổi đề (lỗi ổ đĩa / cơ sở dữ liệu) – bản nháp vẫn giữ trên máy bạn, hãy thử lại'})})}
function saveSoon(){if(saveTimer)return;saveTimer=setTimeout(()=>{saveTimer=null;persistNow().catch(e=>console.error('SAVE:',e.message))},400)}
function saveNowSoon(){clearTimeout(saveTimer);saveTimer=null;persistNow().catch(e=>console.error('SAVE:',e.message))} // lệnh MC: lưu ngay, không chờ gộp
let restoredSeq=0,lastAlive=0;
function restore(data){const list=Array.isArray(data)?data:(data&&Array.isArray(data.rooms)?data.rooms:[]);restoredSeq=data&&!Array.isArray(data)?Number(data.lastSeq)||0:0;lastAlive=data&&!Array.isArray(data)?Number(data.at)||0:0;SEQ=Math.max(SEQ,restoredSeq);
 for(const it of list)for(const p of it.players||[])for(const [k,a] of Object.entries(p.answers||{}))if(a&&a._pending){delete p.answers[k];p.score=(p.score||0)-(a.points||0);tallySub(p,a)} // C01: bài chưa ghi bền trong ảnh chụp cũ KHÔNG được coi là đã nộp – nhật ký sẽ phát lại nếu thực sự đã ghi
 if(data&&!Array.isArray(data)&&Array.isArray(data.archive)){ARCHIVE.length=0;ARCHIVE.push(...data.archive)}
 if(data&&!Array.isArray(data)&&Array.isArray(data.tenants)){TENANTS.clear();for(const t of data.tenants)if(t&&t.id)TENANTS.set(t.id,t)}
 for(const [k,A] of [['plans',PLANS],['orders',ORDERS],['paylog',PAYLOG],['events',EVENTS]])if(data&&!Array.isArray(data)&&Array.isArray(data[k])){A.length=0;A.push(...data[k])}
 if(data&&!Array.isArray(data)&&Array.isArray(data.library))for(const it of data.library){try{if(it&&it.id&&it.name){it.bank=normalizeBank(it.bank);LIB.set(it.id,it)}}catch(e){console.warn('Bỏ qua bộ đề lỗi trong kho:',it&&it.name)}}
 for(const item of list){if(!item.pin||!item.hostKey)continue;const r={...item,mcUser:item.mcUser||'',mcPassword:item.mcPassword||null,mcVersion:item.mcVersion||'',bank:normalizeBank(item.bank),players:new Map((item.players||[]).map(p=>(p.avatar=pickAvatar(p.avatar),[p.id,p]))),clients:new Set(),deadlineTimer:null};if(r.phase==='running'&&!r.qid){r.phase='reveal';r.endedAt=now()}if(!r.eid)r.eid=token().slice(0,10);rooms.set(r.pin,r);if(r.mode==='self'&&r.phase==='self')armSelfDeadline(r)}console.log('Restored',rooms.size,'rooms,',LIB.size,'bộ đề trong kho')}
async function load(){if(db){await db.query('CREATE TABLE IF NOT EXISTS udika_snapshot (id INTEGER PRIMARY KEY, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');await db.query('CREATE TABLE IF NOT EXISTS '+JT+' (seq BIGINT PRIMARY KEY, payload JSONB NOT NULL)');let {rows}=await db.query('SELECT payload FROM udika_snapshot WHERE id='+SNAP_ID);if(rows.length)restore(rows[0].payload);
  const jr=await db.query('SELECT payload FROM '+JT+' ORDER BY seq');replay(jr.rows.map(x=>x.payload),restoredSeq);resumeAfterRestart();await persistNow();persistenceReady=true;console.log('PostgreSQL persistence active');return}
 {let raw=null;try{raw=fs.readFileSync(DATA_FILE,'utf8')}catch(e){if(e.code!=='ENOENT'){STARTUP_DATA_ERROR='không đọc được tệp dữ liệu: '+e.message}}
  if(raw!=null){try{restore(JSON.parse(raw))}catch(e){const bk=DATA_FILE+'.corrupt-'+new Date().toISOString().replace(/[:.]/g,'-');try{fs.copyFileSync(DATA_FILE,bk)}catch{}STARTUP_DATA_ERROR=`tệp dữ liệu HỎNG (${e.message}) – đã giữ bản sao ${path.basename(bk)}, KHÔNG ghi đè; kiểm tra & khôi phục rồi xác nhận ở /api/health/ack`;console.error('DATA FILE CORRUPT:',STARTUP_DATA_ERROR)}}}
 replay(readJournal(),restoredSeq);resumeAfterRestart();await persistNow();persistenceReady=true;console.warn('WARNING: local file persistence only; Render Free filesystem is ephemeral!')}

/* 4.4 Luật xếp hạng (công bố trước, MC chọn):
   tie='time' (mặc định): điểm ↓ → số câu đúng ↓ → tổng thời gian trả lời đúng ↑ ; bằng cả ba → ĐỒNG HẠNG.
   tie='shared': điểm ↓ → số câu đúng ↓ ; bằng nhau → đồng hạng (không xét thời gian).
   Thời điểm ghi danh KHÔNG bao giờ quyết định hạng (chỉ để sắp thứ tự hiển thị những người đồng hạng).
   Vinh danh: chỉ người đạt điều kiện (mặc định ≥1 câu đúng và >0 điểm; MC chỉnh được số câu đúng / điểm tối thiểu). */
const DEFAULT_RULES={tie:'time',minCorrect:1,minScore:1};
function rulesOf(r){const x=r.rules||{};return {tie:x.tie==='shared'?'shared':'time',minCorrect:Math.max(0,Math.min(300,Math.round(numOr(x.minCorrect,DEFAULT_RULES.minCorrect)))),minScore:Math.max(0,Math.round(numOr(x.minScore,DEFAULT_RULES.minScore)))}}
function leader(r){if(r._ldr&&r._ldrV===r.sv&&r._ldrN===r.players.size&&r._ldrR===JSON.stringify(r.rules||null))return r._ldr;const out=leaderCalc(r);r._ldr=out;r._ldrV=r.sv;r._ldrN=r.players.size;r._ldrR=JSON.stringify(r.rules||null);return out}
function leaderCalc(r){const R=rulesOf(r);const key=p=>R.tie==='time'?[p.score,p.tie||0,p.correct,-p.totalMs]:[p.score,p.tie||0,p.correct];
 const arr=[...r.players.values()].sort((a,b)=>b.score-a.score||(b.tie||0)-(a.tie||0)||b.correct-a.correct||(R.tie==='time'?a.totalMs-b.totalMs:0)||a.joinedAt-b.joinedAt);
 let prev=null,rank=0;return arr.map((p,i)=>{const k=key(p).join('|');if(k!==prev){rank=i+1;prev=k}return {rank,id:p.id,name:p.name,avatar:p.avatar,score:p.score,correct:p.correct,totalMs:p.totalMs,team:p.team||null,streak:p.streak||0}})}
const HONOR_TITLES=['Trạng nguyên','Bảng nhãn','Thám hoa'];
function honorsOf(r,ranks){const R=rulesOf(r);return ranks.filter(p=>p.rank<=3&&p.correct>=R.minCorrect&&p.score>=R.minScore).map(({id,...p})=>{const same=ranks.filter(x=>x.rank===p.rank).length>1;return {...p,title:(same?'Đồng ':'')+HONOR_TITLES[p.rank-1]}})}
/* Câu hỏi công khai: KHÔNG lộ đáp án khi đang thi; câu sắp xếp hiện các mục đã xáo trộn */
function viewQ(q,idx,total,perm,showAnswer){
 const k=q.kind||'mc';const o={index:idx+1,total,stage:q.stage,kind:k,q:q.q,a:q.a||[],t:q.t};
 if(q.media)o.media=q.media;if(q.pts!=null&&q.pts!==1)o.pts=q.pts;
 const n=(q.a||[]).length;const ord=perm&&perm.length===n?perm:null;
 if(['mc','multi','poll','order'].includes(k)){const ids=ord||[...Array(n).keys()];o.ids=k==='order'?ids.map((_,i)=>i):ids;o.a=ids.map(i=>q.a[i]);if(q.ai)o.ai=ids.map(i=>q.ai[i]||'')}
 if(k==='poll'&&q.pmulti)o.pmulti=true;if(k==='multi')o.need=q.cs.length;
 if(k==='slider'){o.min=q.min;o.max=q.max;o.step=q.step;o.unit=q.unit||''}
 if(k==='number'){o.unit=q.unit||'';if(q.prox)o.prox=true}
 if(k==='mc'&&q.tf)o.tf=true;
 if(k==='fill'){o.mask=Array.from(q.word).map((c,i)=>!fillSlot(c)?{s:c}:q.hint.includes(i)?{h:c}:null);o.rule={loose:!!q.loose}}
 if(k==='match'){const m=q.l.length,ord=perm&&perm.length===m?perm:[...Array(m).keys()];o.l=q.l;o.r=ord.map(i=>q.r[i])}
 for(const f of ['maxPts','scoring','noStreak','tie','hideBoard','noFx','hideLive'])if(q[f]!=null)o[f]=q[f];
 if(k==='type'){o.rule={caseOn:!!q.caseOn,loose:!!q.loose,punct:!!q.punct}}
 if(k==='multi'&&q.partial||k==='order'&&q.partial||k==='match')o.partial=true;
 o.answer=null;if(showAnswer){o.answer=k==='mc'?q.c:k==='multi'?q.cs:k==='order'?q.a:k==='type'?q.acc:k==='number'?{c:q.c,tol:q.tol}:k==='slider'?{c:q.c,tol:q.tol}:k==='fill'?q.word:k==='match'?q.r:null;if(k==='order'&&q.ai)o.answerImg=q.ai;if(q.note)o.note=q.note}
 return o}
/* L01: hạn nộp = thời gian gốc + phần MC cộng thêm; thang điểm tốc độ luôn dùng thời gian gốc */
const limitMs=(r,q)=>(q.t+(r.extra||0))*1000;
function publicQuestion(r){if(r.mode==='self'||r.phase==='idle'||r.phase==='ready'||r.phase==='intermission'||r.phase==='self')return null;const q=r.bank[r.idx];if(!q)return null;
 const show=r.phase==='reveal'||r.phase==='finished';const o=viewQ(q,r.idx,r.bank.length,r.perm&&r.perm.idx===r.idx?r.perm.p:null,show);
 o.scoring=scoringOf(r,q);o.deadline=r.phase==='media'?0:r.startedAt+limitMs(r,q);o.extra=r.extra||0;o.qid=r.qid||null;if(r.phase==='media')o.waitMedia=true;
 if(show||(q.kind==='poll'&&!q.hideLive)||q.kind==='cloud')o.stats=qStats(r,r.idx);return o}
function publicState(r,forPlayer){const held=boardHeld(r);const need=(['reveal','intermission','finished'].includes(r.phase)&&!held)||(r.phase==='self'&&!selfHidden(r));const ranks=need?leader(r):[];const safeRanks=ranks.slice(0,20).map(({id,...p})=>p);const done=r.phase==='finished';const tb=held?[]:teamBoard(r);
 const selfInfo=r.mode==='self'?{deadline:r.selfDeadline||0,total:r.bank.length,done:[...r.players.values()].filter(p=>p.doneAt).length}:null;
 return {pin:r.pin,eid:r.eid||null,title:r.title,phase:r.phase,mode:r.mode||'live',selfHide:r.selfHide!==false,holdBoard:!!r.holdBoard,boardHeld:held,stageScoring:r.stageScoring||{},idx:r.idx,count:r.players.size,locked:!!r.locked,streakOn:r.streakOn!==false,autoReveal:r.autoReveal!==false,bigQr:r.bigQr||'auto',scoring:r.scoring==='accuracy'?'accuracy':'speed',confidence:!!r.confidence,rules:rulesOf(r),rehearsal:!!r.rehearsal,
  progress:{idx:r.idx,total:r.bank.length,scoredDone:scoredUpTo(r)},
  candidates:forPlayer?[]:stagePlayers(r,60).list,stageMode:forPlayer?undefined:stagePlayers(r,60).mode,recentJoins:forPlayer?[]:(r.phase==='idle'||(r.phase==='ready'&&r.idx===0)||r.mode==='self'||r.bigQr==='on')?[...r.players.values()].slice(-12).reverse().map(p=>({name:p.name,avatar:p.avatar})):[],q:publicQuestion(r),
  leaderboard:need?safeRanks.slice(0,forPlayer?10:20):[],
  honors:done&&!held?honorsOf(r,ranks):[],
  teams:teamOn(r)?r.teams.map(t=>({id:t.id,name:t.name,color:t.color})):[],teamBoard:tb,self:selfInfo,
  time:now(),isFinal:done,completedStage:r.phase==='intermission'?r.completedStage:null,stageWish:r.phase==='intermission'?STAGE_WISHES[r.completedStage]||'Chúc mừng đã hoàn thành chặng thi!':null,stageLeaders:r.phase==='intermission'?safeRanks.slice(0,5):[]};}
function scoredUpTo(r){const end=r.phase==='running'||r.phase==='media'||r.phase==='ready'||r.phase==='idle'?r.idx:r.idx+1;let n=0;for(let i=0;i<Math.min(end,r.bank.length);i++)if(SCORED[r.bank[i].kind||'mc']&&(r.bank[i].pts??1)>0&&!r.bank[i].tie)n++;return n}
function stageIdx(r){if(r.phase!=='intermission'||r.completedStage==null)return null;if(r._stageIdxKey!==r.completedStage+':'+r.bank.length){r._stageIdx=r.bank.map((q,i)=>q.stage===r.completedStage?i:null).filter(x=>x!==null);r._stageIdxKey=r.completedStage+':'+r.bank.length}return r._stageIdx}
function selfView(r,p){const total=r.bank.length,cur=Math.min(p.cur||0,total);const v={cur,total,started:!!p.qStart,done:!!p.doneAt,deadline:r.selfDeadline||0,q:null,last:null};
 if(p.qStart&&cur<total){v.q=viewQ(r.bank[cur],cur,total,p.perm,false);v.q.deadline=p.qStart+r.bank[cur].t*1000;v.q.qid=p.qid||null}
 if(cur>0&&p.answers[cur-1]){const q=r.bank[cur-1];v.last=selfHidden(r)?privateAnswer(r,p.answers[cur-1]):{...p.answers[cur-1],reveal:viewQ(q,cur-1,total,null,true)}}
 v.hidden=selfHidden(r);
 return v}
function myState(r,id,rankMap){const p=r.players.get(id);if(!p)return null;let stage=null;const ix=stageIdx(r);if(ix){const n=ix.filter(i=>p.answers[i]?.correct).length;const sc=ix.filter(i=>SCORED[r.bank[i]?.kind||'mc']).length;stage={stage:r.completedStage,correct:n,total:sc,passed:n>=Math.ceil(sc/2)}}
 let teamRank=null;if(teamOn(r)&&p.team&&!boardHeld(r)){const tb=teamBoard(r);teamRank=(tb.find(t=>t.id===p.team)||{}).rank||null}
 const v=shownOf(r,p);
 return {id:p.id,name:p.name,avatar:p.avatar,score:v.score,correct:v.correct,streak:v.streak,team:p.team||null,teamRank,answer:r.mode==='self'?null:(p.answers[r.idx]&&!p.answers[r.idx]._pending?privateAnswer(r,p.answers[r.idx]):null),passedStage:stage,
  finalRank:r.phase==='finished'&&rankMap?rankMap.get(id)||null:null,rank:rankMap?rankMap.get(id)||null:null,cf:r.confidence?v.cf:null,self:r.mode==='self'?selfView(r,p):null}}
/* Khi câu còn đang chạy: điện thoại chỉ biết "đã lưu bài", KHÔNG biết đúng/sai, điểm, chuỗi (giữ kín tới lúc công bố) */
function privateAnswer(r,a){if(!a)return null;if(selfHidden(r)){const {correct,points,bonus,streak,prevStreak,prevCf,cf,part,tiePts,mcOk,...rest}=a;return {...rest,saved:true,hidden:true}}if(r.mode==='self'||r.phase!=='running')return a;const {correct,points,bonus,streak,prevStreak,prevCf,cf,part,tiePts,mcOk,...rest}=a;return {...rest,saved:true}}
function rankMapOf(ranks){const m=new Map();for(const x of ranks)m.set(x.id,x.rank);return m}
function playerState(r,id){const pub=publicState(r,true);return {...pub,selfHide:r.selfHide!==false,my:myState(r,id,(['finished','reveal','intermission'].includes(r.phase)&&boardOpen(r))||(r.phase==='self'&&!selfHidden(r))?rankMapOf(leader(r)):null)}}
/* Cảnh báo MC: bộ đề của phòng có câu trùng với bộ đề đang CÔNG KHAI ở chế độ chơi thử (người chơi xem được đáp án trước) */
function publicOverlap(r){const key=(r.bankVer||1)+':'+LIB_VER;if(r._povK===key)return r._pov;const pub=new Set();const add=q=>pub.add(String(q.q||'').normalize('NFC').toLowerCase().replace(/\s+/g,' ').trim());
 PRACTICE_SAMPLE.forEach(add);for(const x of LIB.values())if(x.practice)x.bank.forEach(add);
 const n=r.bank.filter(q=>pub.has(String(q.q||'').normalize('NFC').toLowerCase().replace(/\s+/g,' ').trim())).length;r._povK=key;r._pov=n;return n}
function hostState(r){const hp=hostPresence(r);return {...publicState(r),devices:deviceSummary(r),review:reviewOf(r),publicOverlap:publicOverlap(r),online:hp.online,answeredCount:hp.answered,bank:r.bank,bankVer:r.bankVer||1,bankLocked:!!r.bankLocked,actions:hostActions(r),nodeIndex:NODE_INDEX,leds:ledList(r),history:(r.history||[]).map(h=>({eid:h.eid,at:h.at,reason:h.reason,count:h.count,rehearsal:!!h.rehearsal,top:h.rows.slice(0,3).map(x=>x.name)})),leaderboard:leader(r),bannedNames:r.bannedNames||[],
 players:(on=>[...r.players.values()].map(p=>({name:p.name,id:p.id,avatar:p.avatar,score:p.score,correct:p.correct,team:p.team||null,streak:p.streak||0,answered:r.mode==='self'?false:!!p.answers[r.idx],cur:p.cur||0,done:!!p.doneAt,online:on.has(p.id),...(p.code?{code:p.code}:{})})))(new Set([...r.clients].map(c=>c.playerId).filter(Boolean))),
 entry:entryOf(r),late:r.late==='block'?'block':'allow',lateBlocked:lateBlocked(r),pending:pendingList(r),pendingCount:r.pending?r.pending.size:0,roster:rosterStatus(r)};}
/* L06: một luồng duy nhất  MỞ CÂU → (phát clip) → NHẬN BÀI → KHOÁ & CÔNG BỐ ĐÁP ÁN → [TỔNG KẾT CHẶNG | XƯỚNG DANH] → CÂU TIẾP.
   Giao diện MC chỉ bật nút có trong danh sách này – cùng quy tắc máy chủ dùng để nhận lệnh. */
function stageEndsAt(r,i){return i>=r.bank.length-1||r.bank[i+1].stage!==r.bank[i].stage}
function hostActions(r){if(r.mode==='self')return {start:false,open:false,reveal:false,extend:false,next:false,nextLabel:''};
 const ph=r.phase,last=r.idx>=r.bank.length-1,endStage=stageEndsAt(r,r.idx);
 const nextLabel=ph==='reveal'?(last?'XƯỚNG DANH CHUNG CUỘC':endStage?'TỔNG KẾT CHẶNG':'CÂU TIẾP THEO'):ph==='intermission'?'SANG CHẶNG TIẾP':'';
 return {start:['idle','ready'].includes(ph),open:ph==='media',reveal:ph==='running'||ph==='media',extend:ph==='running'&&limitMs(r,r.bank[r.idx])<300000,next:ph==='reveal'||(ph==='intermission'&&!last),nextLabel}}
/* Màn LED CHÍNH: MC chọn (không chọn → màn nào phát xong trước cũng mở lượt, như cũ). Màn chính mất kết nối trong lúc phát clip → báo MC ngay. */
/* Màn LED CHÍNH được GHÉP ĐÔI bởi MC: máy chủ cấp mã kết nối (conn) cho mỗi kết nối và token BÍ MẬT cho màn được chọn.
   Một kết nối "chỉ xem" bất kỳ (ai biết mã phòng cũng mở được) hay màn tự khai id/nhãn KHÔNG được mở lượt sau clip.
   Khi chưa ghép đôi: chỉ màn LED mở từ máy đã đăng nhập MC/Admin/chủ khách của phòng được tin. Màn chính tải lại trang → gửi lại token để lấy lại quyền. */
function mainLedOf(r){for(const c of r.clients)if(c.role==='watch'&&c.ledMain)return c;return null}
/* V15 #4: vị trí phim vinh danh – chỉ nhận số hữu hạn, giới hạn biên; gửi lại cho màn LED vừa vào (tải lại trang) kèm thời gian đã trôi */
function vqClean(o){if(!o||typeof o!=='object')return null;const n=(v,a,b)=>{v=Number(v);return Number.isFinite(v)?Math.max(a,Math.min(b,v)):0};const sp=n(o.speed,.25,2)||1;
 if(o.kind==='video')return {kind:'video',time:n(o.time,0,7200),paused:!!o.paused,speed:sp};
 if(o.kind!=='anim'||!['intro','march','honor','hold'].includes(o.mode))return null;const x={kind:'anim',mode:o.mode,paused:!!o.paused,speed:sp,honorFast:!!o.honorFast,climax:!!o.climax,cu:!!o.cu};
 for(const k of ['t','tm','th','dx','v','cyc','hcyc','camZ','camX','camY','face'])x[k]=n(o[k],-1e6,1e6);return x}
function vqResume(r,ws){const p=r.vqPos;if(!p||r.phase!=='finished'||boardHeld(r))return;const el=p.s.paused?0:Math.min(600,(now()-p.at)/1000*(p.s.speed||1));send(ws,{type:'vq_sync',s:p.s,key:p.key,elapsed:+el.toFixed(2)})}
/* danh sách cách viết của câu gõ đáp án vừa khoá – để MC duyệt tay (chưa đúng trước, nhiều người trước) */
function reviewOf(r){const q=r.bank[r.idx];if(r.mode==='self'||!q||q.kind!=='type'||!['reveal','intermission','finished'].includes(r.phase))return null;const m=new Map();
 for(const p of r.players.values()){const a=p.answers[r.idx];if(!a||a.skipped||a.text==null)continue;const k=normAnswer(a.text,q);if(!k)continue;const e=m.get(k)||{text:String(a.text).trim().slice(0,80),n:0,ok:!!a.correct,mc:!!a.mcOk};e.n++;m.set(k,e)}
 return {idx:r.idx,items:[...m.values()].sort((x,y)=>(x.ok-y.ok)||(y.n-x.n)).slice(0,60)}}
function deviceSummary(r){const o={total:0,ok:0,warn:0,fail:0};for(const d of (r.devices||new Map()).values()){o.total++;o[d.level]++}return o}
function trustedLed(ws,r){if(ws.role!=='watch'||ws.room!==r)return false;if(ws.ledMain)return true;if(r.mainTok)return false;return !!ws.session&&roomUser(ws.session,r)}
function hostsRaw(r,j){for(const c of r.clients)if(c.role==='host')sendRaw(c,j)}
function ledList(r){const out=[];for(const c of r.clients)if(c.role==='watch'&&c.led)out.push({main:!!c.ledMain,conn:c.connId,trusted:trustedLed(c,r),id:c.led.id,label:c.led.label||'LED',ready:!!c.led.ready,sound:c.led.sound||'?',film:c.led.film||'?',filmPct:c.led.filmPct??null,clean:!!c.led.clean,at:c.led.at||0});return out}
function send(ws,obj){sendRaw(ws,JSON.stringify(obj))}
function sendRaw(ws,json){if(ws.closed||ws.socket.destroyed||!ws.socket.writable)return;if(ws.socket.writableLength>2_000_000){try{ws.socket.destroy()}catch{}return} // máy mạng quá yếu: cắt để không dồn bộ nhớ (máy sẽ tự nối lại và đồng bộ)
try{let data=Buffer.from(json);const h=Buffer.alloc(data.length<=125?2:data.length<=65535?4:10);h[0]=0x81;if(data.length<=125)h[1]=data.length;else if(data.length<=65535){h[1]=126;h.writeUInt16BE(data.length,2)}else{h[1]=127;h.writeBigUInt64BE(BigInt(data.length),2)}ws.socket.write(Buffer.concat([h,data]));}catch(e){ws.socket.destroy()}}
function broadcast(r){
 const pub=publicState(r);const pubJson=JSON.stringify({type:'state',...pub});const ppub=publicState(r,true);const pubHead=JSON.stringify({type:'state',...ppub}).slice(0,-1)+',"my":';
 const rankMap=(['finished','reveal','intermission'].includes(r.phase)&&boardOpen(r))||(r.phase==='self'&&!selfHidden(r))?rankMapOf(leader(r)):null;let hostJson=null;
 for(const ws of r.clients){if(ws.role==='host'){hostJson=hostJson||JSON.stringify({type:'state',...hostState(r)});sendRaw(ws,hostJson)}else if(ws.role==='watch')sendRaw(ws,pubJson);else sendRaw(ws,pubHead+JSON.stringify(myState(r,ws.playerId,rankMap))+'}')}
 saveSoon();
}
/* Cập nhật sĩ số / số bài đã nộp: chỉ gửi cho MC và màn LED, tối đa 2 lần/giây (không dồn ứ khi hàng nghìn người cùng trả lời) */
function hostPresence(r){let online=0,answered=0,done=0;const on=new Set();for(const c of r.clients)if(c.role==='player'&&c.playerId)on.add(c.playerId);
 for(const p of r.players.values()){if(on.has(p.id))online++;if(r.mode!=='self'&&p.answers[r.idx]&&!p.answers[r.idx]._pending)answered++;if(p.doneAt)done++}
 const q=r.phase==='running'?r.bank[r.idx]:null;return {type:'presence',count:r.players.size,online,answered,done,phase:r.phase,idx:r.idx,stats:q&&((q.kind==='poll'&&!q.hideLive)||q.kind==='cloud')?qStats(r,r.idx):null,time:now()}}
/* Cập nhật sĩ số / số bài đã nộp: MC nhận gói số liệu nhỏ; danh sách đầy đủ chỉ gửi lại tối đa 3 giây/lần khi có người vào/ra */
function broadcastPresence(r){const pub=publicState(r);const pubJson=JSON.stringify({type:'state',...pub});let hostJson=null,presJson=null;const full=r.playersDirty&&now()-(r.lastHostFull||0)>3000;if(full){r.playersDirty=false;r.lastHostFull=now()}
 for(const ws of r.clients){if(ws.role==='host'){if(full){hostJson=hostJson||JSON.stringify({type:'state',...hostState(r)});sendRaw(ws,hostJson)}else{presJson=presJson||JSON.stringify(hostPresence(r));sendRaw(ws,presJson)}}else if(ws.role==='watch')sendRaw(ws,pubJson)}
 if(r.playersDirty&&!r.dirtyTimer)r.dirtyTimer=setTimeout(()=>{r.dirtyTimer=null;if(r.playersDirty)broadcastPresence(r)},3100);saveSoon()}
function broadcastPresenceSoon(r){if(r.presenceTimer)return;r.presenceTimer=setTimeout(()=>{r.presenceTimer=null;broadcastPresence(r)},r.players.size>500?700:350)}
/* Gửi trạng thái riêng cho một sĩ tử (chế độ tự làm bài: không làm phiền người khác) */
function sendPlayerState(r,id){const rankMap=(['finished','reveal','intermission'].includes(r.phase)&&boardOpen(r))||(r.phase==='self'&&!selfHidden(r))?rankMapOf(leader(r)):null;const json=JSON.stringify({type:'state',...publicState(r,true),my:myState(r,id,rankMap)});for(const ws of r.clients)if(ws.role==='player'&&ws.playerId===id)sendRaw(ws,json)}
// V4: after revealing the last question in a stage, open the celebration immediately.
// This is a server-side state change; LED, host and every player see the same result.
function ceremonyPhase(r){
 const last=r.idx===r.bank.length-1;
 const stageEnded=last||r.bank[r.idx+1].stage!==r.bank[r.idx].stage;
 if(last){r.phase='finished';r.vqPos=null;r.completedStage=r.bank[r.idx].stage;}
 else if(stageEnded){r.phase='intermission';r.completedStage=r.bank[r.idx].stage;}
 else r.phase='reveal';
}
/* Hết giờ một câu: ai không trả lời câu tính điểm thì mất chuỗi đúng liên tiếp */
function endQuestion(r){r.endedAt=now();r.mediaAck=null;clearTimeout(r.deadlineTimer);r.deadlineTimer=null;clearTimeout(r.autoTimer);r.autoTimer=null;const q=r.bank[r.idx];const on=new Set();for(const c of r.clients)if(c.role==='player'&&c.playerId)on.add(c.playerId);
 for(const p of r.players.values()){if(p.answers[r.idx])continue;if(q&&SCORED[q.kind||'mc'])p.streak=0;
  // lý do không có bài: offline = điện thoại MẤT KẾT NỐI lúc câu đóng; late = có gửi nhưng tới máy chủ sau hạn (kèm số ms trễ); none = đang kết nối nhưng không trả lời
  p.miss=p.miss||{};p.miss[r.idx]=p.late&&p.late[r.idx]!=null?'late':on.has(p.id)?'none':'offline';if(p.drop&&p.drop[r.idx]&&p.miss[r.idx]==='none')p.miss[r.idx]='dropped'}}
function closeRound(r){
 if(r.phase==='reveal')return; // bấm lặp (hoặc hết giờ đã tự công bố): không làm gì thêm – an toàn khi MC bấm 2 lần
 if(!['running','media'].includes(r.phase))throw Error('Chưa có câu hỏi đang mở');
 endQuestion(r);r.phase='reveal';broadcast(r);
}
function openAnswers(r){const q=r.bank[r.idx];r.phase='running';r.startedAt=now();r.extra=r.extra||0;clearTimeout(r.deadlineTimer);r.deadlineTimer=setTimeout(()=>timeoutRound(r),limitMs(r,q)+GRACE_MS)}
function timeoutRound(r){if(r.phase!=='running')return;endQuestion(r);r.phase='reveal';broadcast(r)}
/* Chế độ tự làm bài: đóng bài khi hết hạn */
function closeSelf(r){if(r.mode!=='self'||r.phase!=='self')return;clearTimeout(r.deadlineTimer);r.deadlineTimer=null;r.phase='finished';r.vqPos=null;r.idx=r.bank.length-1;r.completedStage=r.bank[r.idx].stage;for(const p of r.players.values()){p.qStart=0}broadcast(r)}
function armSelfDeadline(r){clearTimeout(r.deadlineTimer);r.deadlineTimer=null;if(r.mode==='self'&&r.phase==='self'&&r.selfDeadline){const ms=r.selfDeadline-now();if(ms<=0)closeSelf(r);else r.deadlineTimer=setTimeout(()=>armSelfDeadline(r),Math.min(ms+50,2147000000))}}
function err(ws,e){send(ws,{type:'error',message:String(e.message||e)});}
function authHost(ws,msg){const r=rooms.get(String(msg.pin||''));if(!r||!roomUser(ws.session,r))throw Error('MC chưa đăng nhập hoặc không có quyền điều khiển phòng');if(ws.session.role!=='admin'){const b=tenantBlock(tenantOf(r));if(b)throw Error(b)}if(ws.room)ws.room.clients.delete(ws);ws.role='host';ws.room=r;ws.playerId=null;r.clients.add(ws);send(ws,{type:'host_ok',pin:r.pin});broadcast(r)}
function timingEq(a,b){let x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function onMessage(ws,msg){
 if(!msg||typeof msg!=='object')throw Error('Yêu cầu không hợp lệ');
 const type=msg.type;
 if(type==='create')throw Error('Chỉ Admin mới được tạo phòng. Vui lòng vào /admin');
 if(type==='host_auth'){authHost(ws,msg);return}
 if(type==='join'){
   let r=rooms.get(String(msg.pin||''));if(!r)throw Error('Không tìm thấy phòng thi');
   let id=String(msg.playerId||'').slice(0,96);let p=id?r.players.get(id):null;
   if(!p){const g=entryGate(r,msg);
    /* Chống bot ghi danh hàng loạt (kiểu công cụ "flood" Kahoot): quá BOT_JOINS người MỚI/10 giây từ CÙNG một địa chỉ vào CÙNG phòng
       → người mới từ địa chỉ đó tạm vào hàng chờ duyệt, MC được báo (không chặn hẳn để hội trường dùng chung Wi-Fi vẫn vào được). */
    if(r.botGuard!==false&&!g.wait&&ws.ip&&!/^(127\.|::1$|::ffff:127\.)/.test(ws.ip)){const B=r._bot||(r._bot=new Map());const t=now();let x=B.get(ws.ip);if(!x||t-x.t>10000)x={t,n:0};x.n++;B.set(ws.ip,x);if(B.size>5000)B.clear();
     if(x.n>BOT_JOINS){g.wait=true;if(!x.warned){x.warned=true;const j=JSON.stringify({type:'media_alert',led:'Chống bot',message:`Có hơn ${BOT_JOINS} lượt ghi danh mới trong 10 giây từ cùng một địa chỉ mạng – người mới từ địa chỉ này tạm vào hàng CHỜ DUYỆT. Nếu là Wi-Fi chung của hội trường, bấm "Duyệt tất cả".`});for(const c of r.clients)if(c.role==='host')sendRaw(c,j)}}}
    if(g.wait){holdPending(r,ws,g);return}admit(r,ws,g);return}
   if(teamOn(r)&&!r.teams.some(t=>t.id===p.team))p.team=pickTeam(r,String(msg.team||''));
   {let replacing=false;for(const c of r.clients)if(c.role==='player'&&c.playerId===p.id&&c!==ws){replacing=true;break}
    if(!replacing&&ws.playerId!==p.id&&(onlinePlayers()>=MAX_ONLINE||clusterFull(true)))throw Error('Máy chủ đã đủ số kết nối tối đa – bài và điểm của bạn vẫn được giữ, vui lòng thử lại sau ít giây')}
   attachPlayer(r,ws,p,false);return;
 }
 if(type==='watch'){let r=rooms.get(String(msg.pin||''));if(!r)throw Error('Không tìm thấy phòng thi');if(ws.room)ws.room.clients.delete(ws);ws.ledMain=false;ws.room=r;ws.role='watch';ws.playerId=null;r.clients.add(ws);send(ws,{type:'watch_ok',pin:r.pin});send(ws,{type:'state',...publicState(r)});vqResume(r,ws);return}
 if(type==='ping'){send(ws,{type:'pong',at:now()});return}
 if(type==='device_report'){ // V15 #1: kết quả trang /kiem-tra của từng máy (điện thoại sĩ tử, máy LED) – để MC biết trước máy nào có vấn đề
  const r=rooms.get(String(msg.pin||''));if(!r)throw Error('Không tìm thấy phòng thi');const t=now();if(ws._devAt&&t-ws._devAt<2500)return;ws._devAt=t;
  const x=msg.r||{},n=(v,a,b)=>{v=Number(v);return Number.isFinite(v)?Math.max(a,Math.min(b,Math.round(v))):null},b3=v=>v===true?true:v===false?false:null;
  const d={id:clean(x.id,16)||token().slice(0,8),name:clean(x.name,28),os:clean(x.os,24),browser:clean(x.browser,24),screen:clean(x.screen,16),net:clean(x.net,16),
   wsMs:n(x.wsMs,0,60000),wsJitter:n(x.wsJitter,0,60000),clockMs:n(x.clockMs,-86400000,86400000),audio:b3(x.audio),typing:b3(x.typing),storage:b3(x.storage),wake:b3(x.wake),
   level:['ok','warn','fail'].includes(x.level)?x.level:'warn',notes:clean(x.notes,200),ip:ws.ip||'',at:t};
  const D=r.devices||(r.devices=new Map());D.delete(d.id);D.set(d.id,d);while(D.size>3000)D.delete(D.keys().next().value);
  hostsRaw(r,JSON.stringify({type:'devices',summary:deviceSummary(r)}));send(ws,{type:'device_ok',level:d.level});return}
 if(type==='led_status'||type==='led_ack'||type==='media_done'||type==='media_alert'||type==='vq_pos'){const r=ws.room;if(!r||ws.role!=='watch')return;
  if(type==='vq_pos'){ // màn LED chính báo vị trí phim vinh danh (2 giây/lần) → màn nào tải lại trang sẽ chạy tiếp đúng chỗ
   if(r.phase!=='finished'||!trustedLed(ws,r))return;const x=vqClean(msg.s);if(x)r.vqPos={s:x,key:String(msg.key||'').slice(0,400),at:now()};return}
  if(type==='led_status'){const x=msg.s||{};ws.led={id:String(x.id||'').slice(0,12)||token().slice(0,6),label:clean(x.label,24)||'LED',ready:!!x.ready,sound:['on','muted','blocked'].includes(x.sound)?x.sound:'?',film:['none','loading','ready','error'].includes(x.film)?x.film:'?',filmPct:Number.isFinite(Number(x.filmPct))?Math.max(0,Math.min(100,Math.round(Number(x.filmPct)))):null,clean:!!x.clean,at:now()};
   if(!ws.ledMain&&r.mainTok&&typeof x.mainToken==='string'&&x.mainToken.length>=16&&timingEq(x.mainToken,r.mainTok)){for(const c of r.clients)if(c!==ws&&c.ledMain)c.ledMain=false;ws.ledMain=true}
   const j=JSON.stringify({type:'leds',leds:ledList(r)});for(const c of r.clients)if(c.role==='host')sendRaw(c,j);return}
  if(type==='led_ack'){if(!ws.led)return;const j=JSON.stringify({type:'led_ack',cid:String(msg.cid||'').slice(0,16),cmd:String(msg.cmd||'').slice(0,20),ok:!!msg.ok,note:clean(msg.note,120),led:ws.led.label+(trustedLed(ws,r)?'':' (chưa ghép đôi)'),trusted:trustedLed(ws,r)});hostsRaw(r,j);return}
  if(type==='media_done'){if(r.phase!=='media'||msg.qid!==r.qid)return;
   if(!trustedLed(ws,r)){ // màn chưa được ghép đôi: KHÔNG mở lượt; báo MC một lần mỗi câu để MC ghép đôi hoặc mở tay
    if(ws.led&&r._unpairedWarn!==r.qid){r._unpairedWarn=r.qid;hostsRaw(r,JSON.stringify({type:'media_alert',qid:r.qid,led:ws.led.label,message:'Màn "'+ws.led.label+'" báo clip đã hết nhưng CHƯA được ghép đôi làm màn LED chính – lượt trả lời CHƯA mở. Bấm "đặt làm màn chính" ở mục Màn LED, hoặc bấm MỞ LƯỢT TRẢ LỜI NGAY.'}))}return}
   const q=r.bank[r.idx];const needSound=q&&q.media&&(q.media.kind==='audio'||!q.media.silentOk);
   if(msg.muted&&needSound){const j=JSON.stringify({type:'media_alert',qid:msg.qid,led:ws.led?ws.led.label:'LED',message:'Clip/âm thanh vừa phát KHÔNG CÓ TIẾNG trên màn LED – lượt trả lời CHƯA mở. Bấm vào màn LED để bật tiếng và phát lại, hoặc MC bấm MỞ LƯỢT TRẢ LỜI NGAY nếu chấp nhận.'});for(const c of r.clients)if(c.role==='host')sendRaw(c,j);return}
   openAnswers(r);broadcast(r);saveNowSoon();return}
  if(type==='media_alert'){if(!trustedLed(ws,r))return;const j=JSON.stringify({type:'media_alert',qid:String(msg.qid||''),led:ws.led?ws.led.label:'LED',message:clean(msg.message,200)});hostsRaw(r,j);return}}
 if(!ws.room)throw Error('Bạn chưa tham gia phòng');
 const r=ws.room;
 if(type==='team_pick'){
   if(ws.role!=='player')return;const p=r.players.get(ws.playerId);if(!p||!teamOn(r))throw Error('Phòng không chơi theo đội');
   if(Object.keys(p.answers).length)throw Error('Đã bắt đầu làm bài, không đổi đội được');if(!r.teams.some(t=>t.id===msg.team))throw Error('Không có đội này');
   p.team=msg.team;r.sv=(r.sv||0)+1;sendPlayerState(r,p.id);broadcastPresenceSoon(r);return}
 if(type==='answer'||type==='self_start'||type==='self_skip'){
   if(ws.role!=='player')return;const p=r.players.get(ws.playerId);if(!p)return;
   const qid=String(msg.qid||''),sid=String(msg.sid||'').slice(0,40);const reject=m=>send(ws,{type:'answer_rejected',qid,sid,message:m});
   if(type!=='self_start'&&(!msg.eid||String(msg.eid)!==r.eid))return reject('Kỳ thi đã thay đổi hoặc đã làm lại – câu trả lời cũ không được tính. Hãy tải lại trang.');
   if(type!=='self_start'&&!sid)return reject('Thiếu mã lần gửi bài – hãy tải lại trang');
   if(r.mode==='self'){
    if(r.phase!=='self')return reject(r.phase==='finished'?'Bài đã đóng':'MC chưa mở bài tự làm');
    if(r.selfDeadline&&now()>r.selfDeadline){closeSelf(r);return reject('Đã hết hạn nộp bài')}
    const total=r.bank.length;p.cur=p.cur||0;if(p.cur>=total){p.doneAt=p.doneAt||now();sendPlayerState(r,p.id);return}
    const q=r.bank[p.cur];
    if(type==='self_start'){if(!p.qStart){p.qStart=now();p.qid=token().slice(0,12);p.perm=permFor(q)}sendPlayerState(r,p.id);return}
    if(!qid)return reject('Thiếu mã câu hỏi – hãy tải lại trang');
    const prevIdx=p.cur-1;if(qid&&p.lastQid===qid&&p.answers[prevIdx]){const a=p.answers[prevIdx];if(a.sid&&a.sid!==sid)return reject('Câu này đã được nộp');if(!a._pending)send(ws,{type:'answered',qid,sid,answer:privateAnswer(r,a),reveal:selfHidden(r)?null:viewQ(r.bank[prevIdx],prevIdx,total,null,true)});return} // gửi lại: xác nhận lại, không tính trùng
    if(!p.qStart||qid!==p.qid)return reject('Câu hỏi này đã đóng – câu trả lời không được tính');
    const ms=now()-p.qStart,idx=p.cur,before={score:p.score,correct:p.correct,totalMs:p.totalMs,tie:p.tie||0,streak:p.streak,cf:p.cf,qStart:p.qStart,qid:p.qid,perm:p.perm,doneAt:p.doneAt};let a;
    if(type==='self_skip'||ms>q.t*1000+1500){a={skipped:true,...(type!=='self_skip'?{late:true}:{}),ms:Math.min(ms,q.t*1000),points:0,bonus:0,correct:false,streak:0};if(SCORED[q.kind||'mc'])p.streak=0}
    else{let j;try{j=judge(q,msg,p.perm)}catch(e){return send(ws,{type:'answer_rejected',qid,sid,fix:true,message:String(e.message||e)})}a=scoreAnswer(r,p,q,j,Math.min(ms,q.t*1000),!!msg.boost);p.score+=a.points;tallyAdd(p,a)}
    a.sid=sid;a.qid=qid;p.answers[idx]=a;a._pending=true;Object.defineProperty(a,'_undo',{value:{...before,cur:idx},configurable:true});r.sv=(r.sv||0)+1;p.cur++;p.qStart=0;p.perm=null;p.lastQid=qid;if(p.cur>=total)p.doneAt=now();
    const eid0=r.eid;durable({t:'self',pin:r.pin,eid:eid0,qid,pid:p.id,idx,a:{...a,_pending:undefined},cur:p.cur,doneAt:p.doneAt||0,streak:p.streak,cf:p.cf},e=>{
     if(r.eid!==eid0||p.answers[idx]!==a){send(ws,{type:'answer_rejected',qid,sid,message:'Bài đã được MC mở lại – câu trả lời trước đó không được tính'});return}
     if(e){r.sv=(r.sv||0)+1;delete p.answers[idx];Object.assign(p,before);p.cur=idx;send(ws,{type:'answer_rejected',qid,retry:true,message:'Máy chủ chưa lưu được câu trả lời – hãy gửi lại'});return}
     delete a._pending;send(ws,{type:'answered',qid,sid,answer:privateAnswer(r,a),reveal:selfHidden(r)?null:viewQ(q,idx,total,null,true)});sendPlayerState(r,p.id);broadcastPresenceSoon(r)});return}
   if(type!=='answer')return;
   if(r.phase==='media'&&qid&&qid===r.qid)return reject('Clip đang phát trên màn hình lớn – lượt trả lời sẽ mở ngay khi clip kết thúc');
   if(r.phase==='reveal'&&qid&&qid===r.qid&&!p.answers[r.idx]){p.late=p.late||{};if(p.late[r.idx]==null)p.late[r.idx]=now()-(r.endedAt||now());p.miss=p.miss||{};p.miss[r.idx]='late'}
   if(r.phase!=='running'||!qid||qid!==r.qid){const old=Object.values(p.answers).find(x=>x.qid===qid&&qid);if(old&&old.sid===sid&&!old._pending)return send(ws,{type:'answered',qid,sid,answer:privateAnswer(r,old)});return reject(!qid?'Thiếu mã câu hỏi – hãy tải lại trang':'Câu hỏi này đã đóng – câu trả lời không được tính')}
   const idx=r.idx,q=r.bank[idx];if(p.answers[idx]){const o=p.answers[idx];if(o.sid&&o.sid!==sid)return reject('Bạn đã nộp câu này rồi – chỉ tính lần nộp đầu tiên');if(!o._pending)send(ws,{type:'answered',qid,sid,answer:privateAnswer(r,o)});return}
   const raw=now()-r.startedAt;if(raw>limitMs(r,q)+GRACE_MS){p.late=p.late||{};if(p.late[idx]==null)p.late[idx]=raw-limitMs(r,q)}
   if(raw<0||raw>limitMs(r,q)+GRACE_MS)return reject('Đã hết giờ – câu trả lời không được tính');const ms=Math.min(raw,limitMs(r,q));
   let j;try{j=judge(q,msg,r.perm&&r.perm.idx===idx?r.perm.p:null)}catch(e){return send(ws,{type:'answer_rejected',qid,sid,fix:true,message:String(e.message||e)})}const before={score:p.score,correct:p.correct,totalMs:p.totalMs,tie:p.tie||0,streak:p.streak,cf:p.cf};const prevStreak=p.streak||0,prevCf=p.cf||1;const a=scoreAnswer(r,p,q,j,ms,!!msg.boost);a.qid=qid;a.sid=sid;a.prevStreak=prevStreak;if(r.confidence)a.prevCf=prevCf;
   p.answers[idx]=a;a._pending=true;Object.defineProperty(a,'_undo',{value:before,configurable:true});p.score+=a.points;r.sv=(r.sv||0)+1;tallyAdd(p,a)
   const eid0=r.eid;durable({t:'ans',pin:r.pin,eid:eid0,qid,pid:p.id,idx,a:{...a,_pending:undefined},streak:p.streak,cf:p.cf},e=>{
    // F01: kỳ thi đã được làm lại / thay đề trong lúc chờ ghi → bài thuộc kỳ CŨ: không xác nhận, không đụng tới kỳ mới
    if(r.eid!==eid0||p.answers[idx]!==a){send(ws,{type:'answer_rejected',qid,sid,message:'Kỳ thi vừa được MC làm lại / thay đề – câu trả lời trước đó không được tính'});return}
    if(e){r.sv=(r.sv||0)+1;if(p.answers[idx]===a){delete p.answers[idx];Object.assign(p,before)}send(ws,{type:'answer_rejected',qid,retry:true,message:'Máy chủ chưa lưu được câu trả lời – hãy gửi lại'});return}
    delete a._pending;send(ws,{type:'answered',qid,sid,answer:privateAnswer(r,a)});broadcastPresenceSoon(r);maybeAutoReveal(r)});return;
 }
 if(!canControl(ws,r))throw Error('Bạn không có quyền điều khiển kỳ thi này');
 const live=()=>{if(r.mode==='self')throw Error('Phòng đang ở chế độ tự làm bài – chuyển về "Thi trực tiếp" để dùng lệnh này')};
 const editGuard=()=>{if(r.bankLocked)throw Error('Bộ đề đã KHOÁ (bản đã duyệt) – mở khoá trước khi sửa')};
 if(type==='bank_set'){editGuard();if(msg.baseVer!=null&&Number(msg.baseVer)!==(r.bankVer||1)&&!msg.force)throw Error(`Bộ đề trên máy chủ đã thay đổi (phiên bản ${r.bankVer||1}) kể từ khi bạn mở bản nháp – hãy xem lại trước khi áp dụng`);applyBank(r,msg.bank);ackSaved(ws,{type:'bank_saved',ver:r.bankVer,n:r.bank.length,draftId:msg.draftId||null})}
 else if(type==='bank_lock'){r.bankLocked=!!msg.on}
 else if(type==='start'){
   live();if(!['idle','ready'].includes(r.phase))throw Error('Trước tiên hãy chuyển chặng bằng nút TIẾP TỤC trên màn MC');
   const ct=Number(msg.t);if(msg.t!=null&&msg.t!==''){if(!Number.isInteger(ct)||ct<5||ct>300)throw Error('Thời gian câu hỏi cần từ 5 đến 300 giây');if(ct!==r.bank[r.idx].t){editGuard();r.bank[r.idx].t=ct;r.bankVer=(r.bankVer||1)+1}}
   const q=r.bank[r.idx];r.extra=0;r.endedAt=0;r.qid=token().slice(0,12);r.perm=permFor(q)?{idx:r.idx,p:permFor(q)}:null;clearTimeout(r.deadlineTimer);r.deadlineTimer=null;
   // 5.4: câu có video/âm thanh (mặc định) – phát xong trên LED rồi máy chủ mới mở lượt trả lời và bắt đầu đếm giờ chung
   if(q.media&&q.media.kind!=='image'&&q.media.gate!==false){r.phase='media';r.startedAt=0;r.mediaAck=null}
   else openAnswers(r);
 }else if(type==='open'){live();if(r.phase!=='media')throw Error('Không có clip đang chờ');openAnswers(r)
 }else if(type==='q_add'||type==='q_add_many'||type==='q_update'||type==='q_delete'){editGuard();r.bankVer=(r.bankVer||1)+1;
   if(r.phase==='finished')throw Error('Khoa thi đã kết thúc, không thể sửa câu hỏi');
   if(r.mode==='self'&&r.phase==='self')throw Error('Đang mở bài tự làm: hãy đóng bài trước khi sửa đề');
   const editable=i=>i>r.idx||(i===r.idx&&['idle','ready'].includes(r.phase));
   const minPos=['idle','ready'].includes(r.phase)?r.idx:r.idx+1;
   const place=q=>{let pos=0;for(let k=0;k<r.bank.length;k++)if(r.bank[k].stage<=q.stage)pos=k+1;if(pos<minPos)throw Error('Chặng này đã thi xong, không thể thêm câu vào chặng này');r.bank.splice(pos,0,q);return pos};
   if(type==='q_add_many'){const list=Array.isArray(msg.list)?msg.list:[];appendQuestions(r,list);ackSaved(ws,{type:'q_saved',i:r.bank.length-1,added:list.length});}
   else if(type==='q_add'){if(r.bank.length>=300)throw Error('Tối đa 300 câu hỏi');const q=normalizeBank([msg.q])[0];ackSaved(ws,{type:'q_saved',i:place(q)});}
   else{/* C07: định danh câu bằng MÃ CÂU ổn định (không dùng vị trí) + kiểm tra xung đột với nội dung MC đang mở */
    // không kèm mã câu: chỉ chấp nhận vị trí khi kèm baseVer đúng phiên bản đề hiện tại (chắc chắn không ai vừa thêm/xoá câu)
    let qidMsg=String(msg.id||'');if(!qidMsg){const ii=Number(msg.i);if(msg.baseVer!=null&&Number(msg.baseVer)===r.bankVer-1&&Number.isInteger(ii)&&r.bank[ii])qidMsg=r.bank[ii].id;else throw Error('Thiếu mã câu – hãy tải lại trang MC rồi thử lại')}
    const i=r.bank.findIndex(q=>q.id===qidMsg);if(i<0)throw Error('Câu này đã bị xoá bởi MC khác (hoặc không còn trong bộ đề) – thao tác không được thực hiện');
    if(msg.orig&&JSON.stringify(r.bank[i])!==JSON.stringify(msg.orig))throw Error('Xung đột: câu này vừa được sửa bởi MC khác kể từ khi bạn mở – nội dung mới nhất đã được tải, hãy xem lại rồi lưu');
    if(!editable(i))throw Error('Câu này đã thi hoặc đang thi, không thể sửa/xóa');
    if(type==='q_delete'){if(r.bank.length<=1)throw Error('Bộ đề cần ít nhất 1 câu');if(i===r.idx&&r.idx===r.bank.length-1)throw Error('Không thể xóa câu cuối cùng còn lại của kỳ thi');r.bank.splice(i,1);ackSaved(ws,{type:'q_saved',i:Math.min(i,r.bank.length-1)});}
    else{const q=normalizeBank([{...msg.q,id:qidMsg}])[0];if(q.stage===r.bank[i].stage){r.bank[i]=q;ackSaved(ws,{type:'q_saved',i,id:q.id})}else{const old=r.bank.splice(i,1)[0];try{ackSaved(ws,{type:'q_saved',i:place(q)})}catch(e){r.bank.splice(i,0,old);throw e}}}}
 }else if(type==='set_time'){editGuard();r.bankVer=(r.bankVer||1)+1; // C06: khoá đề chặn cả đổi thời gian; đổi thời gian là sửa đề → tăng phiên bản
   const t=Number(msg.t),all=!!msg.all;if(!Number.isInteger(t)||t<5||t>300)throw Error('Thời gian câu hỏi cần từ 5 đến 300 giây');
   if(all){r.bank.forEach((q,i)=>{if(!(r.phase==='running'&&i===r.idx))q.t=t})}
   else{if(r.phase==='running')throw Error('Câu đang chạy: hãy dùng nút CỘNG THÊM GIÂY');r.bank[r.idx].t=t}
 }else if(type==='extend'){
   live();if(r.phase!=='running')throw Error('Chỉ cộng thêm giờ khi câu hỏi đang diễn ra');
   const add=Number(msg.add);if(!Number.isInteger(add)||add<5||add>120)throw Error('Số giây cộng thêm không hợp lệ');
   const q=r.bank[r.idx];if(limitMs(r,q)>=300000)throw Error('Câu hỏi đã đạt tối đa 300 giây');r.extra=Math.min(300-q.t,(r.extra||0)+add);const remain=r.startedAt+limitMs(r,q)-now();
   clearTimeout(r.deadlineTimer);r.deadlineTimer=setTimeout(()=>timeoutRound(r),Math.max(0,remain)+GRACE_MS);
 }else if(type==='reveal'){live();closeRound(r)}
 else if(type==='next'){
   live();if(!['reveal','intermission'].includes(r.phase))throw Error(r.phase==='running'||r.phase==='media'?'Câu hỏi đang mở – hãy KHOÁ & CÔNG BỐ đáp án trước':'Hãy mở câu hỏi trước');
   if(r.phase==='reveal'&&stageEndsAt(r,r.idx)){ceremonyPhase(r)} // câu cuối chặng: sang tổng kết chặng / xướng danh chung cuộc
   else{if(r.idx>=r.bank.length-1)throw Error('Khoa thi đã kết thúc và được phong danh');r.idx++;r.phase='ready';r.startedAt=0;r.endedAt=0;r.perm=null;r.qid=null;r.extra=0}
 }else if(type==='reset'){
   clearTimeout(r.deadlineTimer);r.deadlineTimer=null;resetScores(r,'MC làm lại từ đầu');r.idx=0;r.phase='idle';r.startedAt=0;r.endedAt=0;r.perm=null;r.mode=r.mode==='self'?'self':'live';
 }else if(type==='set_title'){r.title=clean(msg.title,80)||r.title}
 else if(type==='set_mode'){ // live | self (giao bài tự làm, không cần MC)
   const m=msg.mode==='self'?'self':'live';if(!['idle','finished'].includes(r.phase)&&r.mode!==m)throw Error('Chỉ đổi chế độ khi kỳ thi chưa bắt đầu (hoặc đã kết thúc – điểm sẽ được đặt lại)');
   if(r.phase==='finished')resetScores(r,'Đổi chế độ thi');r.mode=m;r.phase='idle';r.idx=0;r.startedAt=0;r.endedAt=0;r.perm=null;clearTimeout(r.deadlineTimer);r.deadlineTimer=null}
 else if(type==='self_open'){
   if(r.mode!=='self')throw Error('Hãy chọn chế độ "Tự làm bài" trước');if(r.phase==='self')throw Error('Bài đang mở');
   const dl=Number(msg.deadline)||0;if(dl&&dl<now()+60000)throw Error('Hạn nộp phải sau thời điểm hiện tại ít nhất 1 phút');
   if(r.phase==='finished')resetScores(r,'Mở lại bài tự làm');r.selfDeadline=dl;r.phase='self';r.idx=0;r.startedAt=now();armSelfDeadline(r)}
 else if(type==='self_close'){if(r.mode!=='self'||r.phase!=='self')throw Error('Bài tự làm chưa mở');closeSelf(r);audit(ws.session.user,type,r.pin);return}
 else if(type==='self_deadline'){if(r.mode!=='self')throw Error('Không ở chế độ tự làm bài');const dl=Number(msg.deadline)||0;if(dl&&dl<now()+60000)throw Error('Hạn nộp phải sau hiện tại ít nhất 1 phút');r.selfDeadline=dl;armSelfDeadline(r)}
 else if(type==='teams_set'){
   const names=(Array.isArray(msg.names)?msg.names:[]).map(x=>clean(x,24)).filter(Boolean);
   if(!names.length){r.teams=null}
   else{if(names.length<2||names.length>8)throw Error('Cần từ 2 đến 8 đội');if(new Set(names.map(foldTxt)).size!==names.length)throw Error('Tên các đội phải khác nhau');if(names.some(badText))throw Error('Tên đội chưa phù hợp');
    const old=teamOn(r)?r.teams:[];r.teams=names.map((n,i)=>({id:old[i]?.id||'d'+(i+1),name:n,color:TEAM_COLORS[i%TEAM_COLORS.length]}));
    const ids=new Set(r.teams.map(t=>t.id));for(const p of r.players.values())if(!ids.has(p.team))p.team=null;for(const p of r.players.values())if(!p.team)p.team=pickTeam(r,'')}
 }
 else if(type==='team_move'){if(!teamOn(r))throw Error('Phòng không chơi theo đội');const p=r.players.get(String(msg.id||''));if(!p)throw Error('Không tìm thấy sĩ tử');if(!r.teams.some(t=>t.id===msg.team))throw Error('Không có đội này');p.team=msg.team;r.sv=(r.sv||0)+1}
 else if(type==='kick'){const p=kickPlayer(r,msg.id,!!msg.ban);send(ws,{type:'kick_ok',name:p.name,ban:!!msg.ban})}
 else if(type==='unban'){r.bannedNames=(r.bannedNames||[]).filter(x=>x!==foldTxt(msg.name))}
 else if(type==='lock'){r.locked=!!msg.on}
 else if(type==='show_board'){if(!['reveal','intermission','finished'].includes(r.phase))throw Error('Chỉ hiện bảng điểm sau khi công bố đáp án, tổng kết chặng hoặc kết thúc');r.shownKey=boardKey(r)}
 else if(type==='set_main_led'){const conn=msg.conn?String(msg.conn):null;
   if(!conn){r.mainTok=null;for(const c of r.clients)if(c.role==='watch'&&c.ledMain){c.ledMain=false;send(c,{type:'led_main',token:null})}}
   else{const t=[...r.clients].find(c=>c.role==='watch'&&c.connId===conn);if(!t)throw Error('Màn LED này vừa mất kết nối – chờ màn hiện lại rồi chọn');
    r.mainTok=token();for(const c of r.clients)if(c.role==='watch'&&c.ledMain&&c!==t){c.ledMain=false;send(c,{type:'led_main',token:null})}t.ledMain=true;const tk=r.mainTok; /* chỉ trao token SAU khi đã lưu bền: máy chủ sập ngay sau đó thì LED vẫn dùng lại được token */
    persistNow().catch(()=>false).then(()=>{if(r.mainTok===tk&&!t.closed)send(t,{type:'led_main',token:tk})})}}
 else if(type==='entry_set'){if('entry' in msg){if(!ENTRY_MODES.includes(msg.entry))throw Error('Chế độ ghi danh không hợp lệ');if((msg.entry==='roster'||msg.entry==='roster_only')&&!(r.roster||[]).length)throw Error('Hãy nhập danh sách dự kiến trước khi bật chế độ này');r.entry=msg.entry}
   if('late' in msg)r.late=msg.late==='block'?'block':'allow';if(entryOf(r)==='open'&&r.pending&&r.pending.size)decidePending(r,'all',true)}
 else if(type==='roster_get'){send(ws,{type:'roster',rows:r.roster||[]});return}
 else if(type==='roster_set'){r.roster=parseRoster(msg.rows);if(!r.roster.length&&['roster','roster_only'].includes(entryOf(r)))r.entry='approve';r.playersDirty=true;send(ws,{type:'roster_ok',count:r.roster.length})}
 else if(type==='approve'||type==='deny'){const n=decidePending(r,msg.all?'all':msg.ids,type==='approve',!!msg.ban);send(ws,{type:'pending_ok',n,allow:type==='approve'});audit(ws.session.user,type,r.pin);if(type==='deny'&&!msg.ban)return}
 else if(type==='accept_text'){ // MC duyệt tay câu gõ đáp án: chấp nhận (hoặc bỏ chấp nhận) MỘT cách viết cho mọi người đã gõ đúng như vậy
  if(r.mode==='self')throw Error('Chỉ duyệt tay khi thi trực tiếp');const idx=Number(msg.idx),q=r.bank[idx];if(!q||q.kind!=='type')throw Error('Chỉ duyệt tay được câu gõ đáp án');
  if(idx>r.idx||(idx===r.idx&&!['reveal','intermission','finished'].includes(r.phase)))throw Error('Duyệt tay sau khi câu đã khoá (đang công bố)');
  const key=normAnswer(clean(msg.text,80),q);if(!key)throw Error('Thiếu câu trả lời cần duyệt');const on=msg.on!==false,ch=[];
  for(const p of r.players.values()){const a=p.answers[idx];if(!a||a.skipped||a.text==null||normAnswer(a.text,q)!==key)continue;
   if(on&&!a.correct)ch.push({pid:p.id,on:true,pts:Math.round(basePoints(r,q,Math.min(a.ms||0,q.t*1000))*(q.tie?1:(q.pts??1)))});else if(!on&&a.mcOk)ch.push({pid:p.id,on:false})}
  if(!ch.length){send(ws,{type:'accept_ok',idx,n:0,on});return}const eid0=r.eid;
  durable({t:'acc',pin:r.pin,eid:eid0,idx,ch},e=>{if(e)return send(ws,{type:'error',message:'Máy chủ chưa lưu được – chưa duyệt, hãy thử lại'});if(r.eid!==eid0)return;
   applyAccept(r,idx,ch);audit(ws.session.user,(on?'accept':'unaccept')+'_text',r.pin);send(ws,{type:'accept_ok',idx,n:ch.length,on});broadcast(r)});return}
 else if(type==='set_option'){if('streak' in msg)r.streakOn=!!msg.streak;if('autoReveal' in msg){r.autoReveal=!!msg.autoReveal;if(!r.autoReveal)cancelAutoReveal(r);else maybeAutoReveal(r)}if('bigQr' in msg&&['auto','on','off'].includes(msg.bigQr))r.bigQr=msg.bigQr;
   const midRun=['running','media'].includes(r.phase);
   if('scoring' in msg){if(midRun)throw Error('Đổi cách tính điểm khi chưa mở câu hoặc giữa hai câu');r.scoring=msg.scoring==='accuracy'?'accuracy':'speed'}
   if(msg.stageScoring&&typeof msg.stageScoring==='object'){if(midRun)throw Error('Đổi luật điểm của vòng khi chưa mở câu hoặc giữa hai câu');const o={};for(let k=0;k<5;k++){const v=msg.stageScoring[k];if(v==='speed'||v==='accuracy')o[k]=v}r.stageScoring=o}
   if('confidence' in msg){if(midRun)throw Error('Bật/tắt chế độ Tự tin khi chưa mở câu hoặc giữa hai câu');r.confidence=!!msg.confidence}
   if(msg.rules&&typeof msg.rules==='object'){if(r.phase==='finished')throw Error('Đã xướng danh – không đổi luật xếp hạng');r.rules=rulesOf({rules:msg.rules})}
   if('rehearsal' in msg&&!!msg.rehearsal!==!!r.rehearsal){ // tổng duyệt là MỘT KỲ THI RIÊNG: bật/tắt → lưu kỳ đang có vào lịch sử (đúng nhãn), mở kỳ mới từ 0 điểm
    if(midRun||(r.mode==='self'&&r.phase==='self'))throw Error('Bật/tắt Tổng duyệt khi chưa mở câu hoặc giữa hai câu');
    clearTimeout(r.deadlineTimer);r.deadlineTimer=null;cancelAutoReveal(r);resetScores(r,r.rehearsal?'Kết thúc tổng duyệt':'Bắt đầu tổng duyệt');r.rehearsal=!!msg.rehearsal;r.idx=0;r.phase='idle';r.startedAt=0;r.endedAt=0;r.perm=null;r.completedStage=null;r.shownKey=null}if('selfHide' in msg)r.selfHide=!!msg.selfHide;if('botGuard' in msg)r.botGuard=!!msg.botGuard;if('holdBoard' in msg)r.holdBoard=!!msg.holdBoard}
 else if(type==='vq'){ // điều khiển hoạt cảnh rước Trạng nguyên trên màn LED (chỉ chuyển tiếp, không đổi dữ liệu thi)
   const cmd=String(msg.cmd||'');if(!['start','pause','resume','toggle','honor','replay','speed','sound','volume','preload','test','rehearse','stop_rehearse','board'].includes(cmd))throw Error('Lệnh hoạt cảnh không hợp lệ');
   const cid=String(msg.cid||token().slice(0,8)).slice(0,16);let sent=0;
   const v=cmd==='volume'?Math.max(0,Math.min(1,Number(msg.v))||0):Math.max(.25,Math.min(2,Number(msg.v)||1)),j=JSON.stringify({type:'vq',cmd,v,cid});for(const c of r.clients)if(c.role==='watch'&&++sent)sendRaw(c,j);
   if(['replay','rehearse','stop_rehearse'].includes(cmd))r.vqPos=null;audit(ws.session.user,'vq_'+cmd,r.pin);send(ws,{type:'vq_ok',cmd,cid,sent});return;
 }
 else throw Error('Lệnh không hỗ trợ');
 audit(ws.session.user,type,r.pin);broadcast(r);saveNowSoon();
}
function canControl(ws,r){return ws.role==='host'&&roomUser(ws.session,r)}
/* 4.5: trước MỌI lần xoá điểm (làm lại, thay đề, đổi chế độ, mở lại bài tự làm) lưu bảng kết quả vào lịch sử phòng (20 lần gần nhất) */
/* C04: lưu MỌI phiên có hoạt động (có bài nộp, kể cả toàn sai hay chỉ khảo sát), kèm bài nộp từng câu và bản đề lúc đó để đối soát.
   Giữ 20 phiên gần nhất; số dòng = toàn bộ người chơi (tối đa MAX_PLAYERS). */
function archiveRun(r,reason){if(!r.players||!r.players.size)return;let any=false;for(const p of r.players.values()){for(const a of Object.values(p.answers||{}))if(a&&!a._pending){any=true;break}if(any)break}if(!any)return;
 const ranks=leader(r),L=LETTERS;const cell=(q,a)=>{if(!a)return '';if(a.skipped)return 'bỏ qua';const v=Array.isArray(a.choices)?a.choices.map(i=>L[i]).join('+'):a.choice!=null?L[a.choice]:a.order?a.order.map(i=>L[i]).join('→'):a.pairs?a.pairs.map((x,i)=>(i+1)+'-'+(x+1)).join(' '):a.text!=null?String(a.text):a.value!=null?String(a.value):'';if(a.tie)return `${v} ${a.correct?'✔':a.part?'½':'✘'} quyết định ${a.tiePts||0}đ`;return `${v}${a.mcOk?' (MC duyệt)':''}${SCORED[q.kind||'mc']?' '+(a.correct?'✔':a.part?'½':'✘'):''} ${a.points||0}đ`};
 r.history=r.history||[];r.history.unshift({eid:r.eid,at:now(),reason,rehearsal:!!r.rehearsal,title:r.title,bankVer:r.bankVer||1,questions:r.bank.length,reached:r.idx+1,phase:r.phase,count:r.players.size,
  bank:JSON.parse(JSON.stringify(r.bank)), // đóng băng TOÀN BỘ đề lúc thi: phương án, đáp án, sai số, đơn vị… (đổi đề sau đó vẫn đối soát được)
  scoring:r.scoring==='accuracy'?'accuracy':'speed',stageScoring:{...(r.stageScoring||{})},confidence:!!r.confidence,streakOn:r.streakOn!==false,rules:rulesOf(r),
  rows:ranks.slice(0,MAX_PLAYERS).map(x=>{const p=r.players.get(x.id);return {rank:x.rank,name:x.name,team:x.team,score:x.score,correct:x.correct,totalMs:x.totalMs,...(p&&p.code?{code:p.code}:{}),ans:r.bank.map((q,i)=>p&&!p.answers[i]&&p.miss&&p.miss[i]?missText(p,i):cell(q,p&&p.answers[i]))}})});
 if(r.history.length>20)r.history.length=20;
 // bài nộp từng câu giữ cho 3 phiên gần nhất (đủ đối soát sau sự kiện, không làm ảnh chụp dữ liệu phình to); phiên cũ hơn giữ bảng tổng
 r.history.forEach((h,i)=>{if(i>=3&&h.rows.length&&h.rows[0].ans){h.rows=h.rows.map(({ans,...x})=>x);h.detailTrimmed=true}})}
function resetScores(r,reason){archiveRun(r,reason||'Đặt lại điểm');r.eid=token().slice(0,10);r.extra=0;r.sv=(r.sv||0)+1;for(const p of r.players.values()){p.score=0;p.correct=0;p.totalMs=0;p.tie=0;p.answers={};p.streak=0;p.cur=0;p.qStart=0;p.doneAt=0;p.perm=null;p.cf=1;delete p.miss;delete p.late;delete p.drop}}
/* Áp dụng bộ đề mới (đặt lại điểm) – dùng chung cho lệnh MC và nạp từ kho đề */
function applyBank(r,list){if(r.bankLocked){const e=Error('Bộ đề đã KHOÁ (bản đã duyệt) – mở khoá trước khi thay đề');e.code=409;throw e}if(r.phase==='running'||r.phase==='media')throw Error('Không sửa đề khi câu hỏi đang diễn ra');const nb=normalizeBank(list);resetScores(r,'Thay bộ đề');r.bank=nb;r.bankVer=(r.bankVer||1)+1;r.idx=0;r.phase='idle';r.mode=r.mode==='self'?'self':'live';r.startedAt=0;r.endedAt=0;r.perm=null;clearTimeout(r.deadlineTimer);r.deadlineTimer=null}
/* Thêm câu vào cuối chặng tương ứng (giữ điểm) */
function appendQuestions(r,list){if(r.bankLocked){const e=Error('Bộ đề đã KHOÁ (bản đã duyệt) – mở khoá trước khi sửa');e.code=409;throw e}if(r.phase==='finished')throw Error('Khoa thi đã kết thúc, không thể sửa câu hỏi');if(r.mode==='self'&&r.phase==='self')throw Error('Đang mở bài tự làm: hãy đóng bài trước khi sửa đề');
 const minPos=['idle','ready'].includes(r.phase)?r.idx:r.idx+1;list=normalizeBank(list);if(r.bank.length+list.length>300)throw Error(`Tối đa 300 câu – bộ đề đang có ${r.bank.length} câu`);
 const place=q=>{let pos=0;for(let k=0;k<r.bank.length;k++)if(r.bank[k].stage<=q.stage)pos=k+1;if(pos<minPos)throw Error('Chặng này đã thi xong, không thể thêm câu vào chặng này');r.bank.splice(pos,0,q);return pos};
 let last=0;for(const q of list)last=place(q);return last}
/* ===== 4.6 Kiểm soát người tham gia =====
   entry: open (ai cũng vào) · approve (MỌI người chờ MC duyệt) · roster (có trong danh sách dự kiến thì vào ngay, ngoài danh sách chờ duyệt) · roster_only (chỉ người trong danh sách)
   late: allow (vào muộn được) · block (thi trực tiếp đã mở câu đầu tiên thì không nhận người mới; người đã ghi danh vẫn vào lại được)
   Danh sách dự kiến: {code (mã nội bộ, không hiện công khai), name (tên hiển thị)}; mỗi dòng chỉ một người dùng (một danh tính – một phiên). */
const ENTRY_MODES=['open','approve','roster','roster_only'];
const entryOf=r=>ENTRY_MODES.includes(r.entry)?r.entry:'open';
const foldCode=c=>String(c||'').normalize('NFC').toUpperCase().replace(/\s+/g,'');
const rosterKey=e=>e.code?'#'+foldCode(e.code):'@'+foldTxt(e.name);
const lateBlocked=r=>r.late==='block'&&r.mode!=='self'&&!(r.phase==='idle'||(r.phase==='ready'&&r.idx===0));
function rosterFind(r,name,code){const R=r.roster||[];if(!R.length)return null;if(code){const c=foldCode(code);return R.find(x=>x.code&&foldCode(x.code)===c)||null}const f=foldTxt(name);return R.find(x=>foldTxt(x.name)===f)||null}
function entryGate(r,msg){
 if(r.phase==='finished')throw Error('Khoa thi đã kết thúc, không nhận ghi danh mới');if(r.locked)throw Error('MC đã khoá phòng, không nhận thêm sĩ tử');
 if(lateBlocked(r))throw Error('Kỳ thi đã bắt đầu – MC không nhận người vào muộn');
 if(r.players.size>=roomPlayerCap(r))throw Error('Phòng thi đã đủ số người tối đa'+(tenantOf(r)?' theo gói dịch vụ':''));if(onlinePlayers()>=MAX_ONLINE-RECONNECT_RESERVE||clusterFull(false))throw Error('Máy chủ đang quá đông – chỗ còn lại dành cho người đã ghi danh vào lại. Vui lòng thử lại sau ít phút');
 let name=clean(msg.name,28);const code=clean(msg.code,20);if(!name&&!code)throw Error('Vui lòng nhập tên sĩ tử');
 const mode=entryOf(r),ent=mode==='open'?null:rosterFind(r,name,code);
 if(code&&!ent&&(mode==='roster'||mode==='roster_only'))throw Error('Mã dự thi không có trong danh sách – kiểm tra lại mã hoặc bỏ trống ô mã');
 if(mode==='roster_only'&&!ent)throw Error('Phòng thi chỉ nhận người có tên trong danh sách dự kiến – hãy nhập đúng họ tên (hoặc mã dự thi) như MC đã đăng ký');
 if(ent)name=ent.name;if(!name)throw Error('Vui lòng nhập tên sĩ tử');if(badText(name))throw Error('Tên chưa phù hợp, vui lòng chọn tên khác');
 const f=foldTxt(name);if((r.bannedNames||[]).includes(f))throw Error('Tên này đã bị MC chặn trong phòng thi');
 const rk=ent?rosterKey(ent):'';
 if(rk)for(const o of r.players.values())if(o.rk===rk)throw Error('Người trong danh sách này đã vào phòng trên thiết bị khác. Nếu đó là bạn: dùng lại thiết bị cũ, hoặc nhờ MC mời thiết bị kia rời phòng');
 for(const o of r.players.values())if(foldTxt(o.name)===f)throw Error('Tên này đã có người dùng – hãy thêm họ hoặc chữ số để phân biệt');
 return {name,avatar:pickAvatar(msg.avatar),team:String(msg.team||''),code:ent?(ent.code||''):'',rk,wait:mode==='approve'||(mode==='roster'&&!ent)}}
function attachPlayer(r,ws,p,fresh){const id=p.id;
 if(ws.room)ws.room.clients.delete(ws);for(const other of r.clients){if(other.role==='player'&&other.playerId===id&&other!==ws){send(other,{type:'replaced',message:'Bạn đang thi ở một tab hoặc thiết bị khác. Tab này đã tạm dừng để không bị tính hai lần.'});r.clients.delete(other);other.room=null;other.role=null;other.playerId=null}}
 ws.room=r;ws.role='player';ws.playerId=id;ws.pend=null;r.clients.add(ws);if(r.phase==='running'){cancelAutoReveal(r);setTimeout(()=>maybeAutoReveal(r),0)}
 const confirm=()=>{if(ws.closed||ws.playerId!==id)return;send(ws,{type:'joined',pin:r.pin,playerId:id,name:p.name});send(ws,{type:'state',...playerState(r,id)})};
 r.playersDirty=true;
 if(fresh)durable({t:'join',pin:r.pin,p:{id:p.id,name:p.name,avatar:p.avatar,team:p.team,joinedAt:p.joinedAt,...(p.code?{code:p.code}:{}),...(p.rk?{rk:p.rk}:{})}},e=>{if(!e)p._jp=false;if(e){r.players.delete(id);r.clients.delete(ws);ws.room=null;ws.role=null;ws.playerId=null;send(ws,{type:'error',message:'Máy chủ chưa lưu được ghi danh – vui lòng thử lại'});return}confirm()});else confirm();
 broadcastPresenceSoon(r)}
function admit(r,ws,g){const id=token();const p={id,name:g.name,avatar:g.avatar,score:0,correct:0,totalMs:0,joinedAt:now(),answers:{},streak:0,team:pickTeam(r,g.team),cur:0,qStart:0,doneAt:0};
 if(g.code)p.code=g.code;if(g.rk)p.rk=g.rk;Object.defineProperty(p,'_jp',{value:true,writable:true,configurable:true});r.players.set(id,p);attachPlayer(r,ws,p,true);return p}
/* Hàng chờ duyệt: chỉ trong bộ nhớ (máy chủ khởi động lại thì người chờ tự gửi lại khi kết nối lại). Khoá theo tên đã chuẩn hoá. */
const MAX_PENDING=3000;
function holdPending(r,ws,g){r.pending=r.pending||new Map();const k=foldTxt(g.name);let e=r.pending.get(k);
 if(!e){if(r.pending.size>=MAX_PENDING)throw Error('Hàng chờ duyệt đang quá đông – vui lòng đợi MC duyệt rồi thử lại');e={pid:token().slice(0,12),at:now(),...g};r.pending.set(k,e)}
 else if(e.ws&&e.ws!==ws&&!e.ws.closed)send(e.ws,{type:'replaced',message:'Tên này vừa được gửi duyệt từ thiết bị khác.'});
 Object.assign(e,{avatar:g.avatar,team:g.team});
 if(e.ok){r.pending.delete(k);try{const g2=entryGate(r,{name:e.name,code:e.code,avatar:e.avatar,team:e.team});admit(r,ws,{...g2,wait:false})}catch(err){send(ws,{type:'join_denied',message:err.message})}pendingChanged(r);return}
 if(ws.room&&ws.room!==r)ws.room.clients.delete(ws);e.ws=ws;ws.pend={r,k};ws.role='pending';
 send(ws,{type:'pending',pin:r.pin,name:e.name,message:entryOf(r)==='roster'?'Tên của bạn chưa có trong danh sách dự kiến – đang chờ MC duyệt…':'Đang chờ MC duyệt tên…'});pendingChanged(r)}
function pendingList(r){const out=[];if(!r.pending)return out;const old=now()-15*60000;
 for(const [k,e] of r.pending){if((!e.ws||e.ws.closed)&&e.at<old&&!e.ok){r.pending.delete(k);continue}if(out.length<300)out.push({id:e.pid,name:e.name,at:e.at,online:!!(e.ws&&!e.ws.closed),ok:!!e.ok})}return out}
function pendingChanged(r){if(r._pendT)return;r._pendT=setTimeout(()=>{r._pendT=null;const j=JSON.stringify({type:'pending_list',items:pendingList(r),count:r.pending?r.pending.size:0});for(const c of r.clients)if(c.role==='host')sendRaw(c,j)},300)}
function decidePending(r,ids,allow,ban){if(!r.pending)return 0;let n=0;const all=ids==='all';const want=new Set(Array.isArray(ids)?ids.map(String):[]);
 for(const [k,e] of [...r.pending]){if(!all&&!want.has(e.pid))continue;n++;
  if(!allow){r.pending.delete(k);if(ban){r.bannedNames=r.bannedNames||[];if(!r.bannedNames.includes(k))r.bannedNames.push(k)}if(e.ws&&!e.ws.closed){send(e.ws,{type:'join_denied',message:ban?'MC không duyệt tên này và đã chặn tên.':'MC chưa duyệt tên này. Hãy nhập đúng họ tên như danh sách đăng ký rồi gửi lại.'});e.ws.pend=null;e.ws.role=null}continue}
  if(!e.ws||e.ws.closed){e.ok=true;continue} // đã duyệt – khi thiết bị kết nối lại sẽ vào thẳng
  r.pending.delete(k);const ws=e.ws;ws.pend=null;try{const g=entryGate({...r,entry:'open',locked:false},{name:e.name,code:'',avatar:e.avatar,team:e.team});admit(r,ws,{...g,code:e.code,rk:e.rk})}catch(err){send(ws,{type:'join_denied',message:err.message});ws.role=null}}
 pendingChanged(r);return n}
function rosterStatus(r){const R=r.roster||[];if(!R.length)return null;const got=new Set();for(const p of r.players.values())if(p.rk)got.add(p.rk);
 const missing=[];for(const e of R)if(!got.has(rosterKey(e))&&missing.length<300)missing.push(e.code?`${e.code} · ${e.name}`:e.name);return {total:R.length,joined:R.filter(e=>got.has(rosterKey(e))).length,missing}}
function parseRoster(rows){if(!Array.isArray(rows))throw Error('Danh sách không hợp lệ');if(rows.length>MAX_PLAYERS)throw Error(`Danh sách tối đa ${MAX_PLAYERS} người`);
 const out=[],codes=new Map(),names=new Map();rows.forEach((x,i)=>{const name=clean(x&&x.name,28),code=clean(x&&x.code,20);if(!name)return;if(badText(name))throw Error(`Dòng ${i+1}: tên chưa phù hợp`);
  if(code){const c=foldCode(code);if(codes.has(c))throw Error(`Mã "${code}" bị trùng ở dòng ${codes.get(c)} và ${i+1}`);codes.set(c,i+1)}
  else{const f=foldTxt(name);if(names.has(f))throw Error(`Tên "${name}" bị trùng ở dòng ${names.get(f)} và ${i+1} – hãy thêm mã dự thi để phân biệt`);names.set(f,i+1)}
  out.push(code?{code,name}:{name})});return out}
function kickPlayer(r,id,ban){const p=r.players.get(String(id||''));if(!p)throw Error('Không tìm thấy sĩ tử');r.players.delete(p.id);r.sv=(r.sv||0)+1;
 if(ban){r.bannedNames=r.bannedNames||[];const f=foldTxt(p.name);if(!r.bannedNames.includes(f))r.bannedNames.push(f)}
 for(const ws of r.clients)if(ws.role==='player'&&ws.playerId===p.id){send(ws,{type:'kicked',message:ban?'MC đã mời bạn rời phòng thi và chặn tên này.':'MC đã mời bạn rời phòng thi.'});r.clients.delete(ws);ws.room=null;ws.role=null;ws.playerId=null}
 return p}
/* V14: tự công bố đáp án khi mọi sĩ tử đang kết nối đã trả lời (MC có thể tắt) */
/* F05: điều kiện "mọi người đang kết nối đã nộp (và đã ghi bền)" được kiểm tra LẠI ngay trước khi đóng;
   có người mới vào / vào lại, hoặc MC tắt tự công bố → lịch đóng bị huỷ và đánh giá lại. */
function allAnswered(r){const idx=r.idx;let online=0;for(const c of r.clients)if(c.role==='player'&&c.playerId){const p=r.players.get(c.playerId);if(!p)continue;online++;if(!p.answers[idx]||p.answers[idx]._pending)return false}return online>0}
function cancelAutoReveal(r){if(r.autoTimer){clearTimeout(r.autoTimer);r.autoTimer=null}}
function maybeAutoReveal(r){if(r.autoReveal===false||r.phase!=='running'||r.autoTimer)return;if(!allAnswered(r))return;const idx=r.idx,eid=r.eid;
 r.autoTimer=setTimeout(()=>{r.autoTimer=null;if(r.autoReveal===false||r.phase!=='running'||r.idx!==idx||r.eid!==eid)return;if(!allAnswered(r))return;timeoutRound(r)},1500)}
const MIME={'.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.m4a':'audio/mp4','.mp4':'video/mp4','.webm':'video/webm','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.csv':'text/csv; charset=utf-8','.webp':'image/webp','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const routes={'/':'index.html','/practice':'practice.html','/join':'player.html','/host':'host.html','/led':'led.html','/admin':'admin.html','/khach':'khach.html','/trongtai':'trongtai.html','/bangdiem':'bangdiem.html','/chuongtrinh':'chuongtrinh.html','/kiem-tra':'kiemtra.html'};
/* L09 (OWASP CSV Injection): ô VĂN BẢN bắt đầu bằng = + - @ Tab CR (kể cả sau khoảng trắng đầu dòng) được thêm dấu ' phía trước
   để phần mềm bảng tính hiển thị như chữ, không chạy công thức. Ô SỐ do hệ thống tạo (điểm, hạng…) giữ nguyên là số. */
const MISS_TXT={offline:'– (mất kết nối lúc câu đóng)',none:'– (có kết nối, không trả lời)',dropped:'– (mất kết nối giữa câu, đã vào lại nhưng không trả lời)'};
function missText(p,i){const m=p.miss&&p.miss[i];if(m==='late')return `– (có gửi nhưng tới máy chủ TRỄ ${((p.late&&p.late[i]||0)/1000).toFixed(1)} giây sau hạn – không tính)`;return MISS_TXT[m]||'–'}
function csvCell(v){if(typeof v==='number'&&Number.isFinite(v))return String(v);let t=String(v??'');if(/^[\s]*[=+\-@\t\r]/.test(t)||/^[＝＋－＠]/.test(t))t="'"+t;return /[",\n\r;']/.test(t)||t!==t.trim()?'"'+t.replace(/"/g,'""')+'"':t}
/* Lịch sử kỳ thi: phần "ĐỀ THI LÚC THI" – từng câu, từng phương án, đáp án đúng, sai số và luật điểm đã áp dụng (đóng băng lúc lưu) */
const STAGE_VI=['Lớp thầy đồ','Khảo hạch','Thi Hương','Thi Hội','Thi Đình'];
function keyText(q){const L=LETTERS,k=q.kind||'mc',num=()=>`${q.c}${q.tol?' ±'+q.tol:' (chính xác tuyệt đối)'}${q.unit?' '+q.unit:''}`;
 return k==='mc'?'Đáp án đúng: '+L[q.c]:k==='multi'?'Đáp án đúng: '+(q.cs||[]).map(i=>L[i]).join('+')+(q.partial?' (chấm một phần)':' (phải đủ & đúng tập)'):k==='number'||k==='slider'?'Đáp án đúng: '+num():k==='type'?'Đáp án chấp nhận: '+(q.acc||[]).join(' / '):k==='order'?'Thứ tự đúng: '+(q.a||[]).map((x,i)=>L[i]+'. '+x).join(' → '):k==='fill'?'Từ khoá: '+q.word+(q.loose?' (chấp nhận không dấu)':''):k==='match'?'Cặp đúng: '+(q.l||[]).map((x,i)=>(i+1)+'. '+x+' ↔ '+q.r[i]).join(' · '):k==='poll'?'Thăm dò – không tính điểm':'Đám mây từ – không tính điểm'}
function historyCsv(h){const hb=h.bank||[];return csvOf([[`Lịch sử kỳ thi ${h.eid} – ${h.title} – lưu lúc ${new Date(h.at).toISOString()} – lý do: ${h.reason}${h.rehearsal?' – TỔNG DUYỆT':''} – đã chạy ${h.reached}/${h.questions} câu – bộ đề v${h.bankVer||1}`],['Hạng','Sĩ tử','Mã dự thi','Đội','Điểm','Câu đúng','Tổng thời gian đúng (giây)',...hb.map((q,i)=>`Câu ${i+1}: ${q.q}`)],...h.rows.map(x=>[x.rank,x.name,x.code||'',x.team||'',x.score,x.correct,Math.round(x.totalMs/100)/10,...(x.ans||[])]),...historyKeyRows(h)])}
function historyKeyRows(h){const hb=h.bank||[];if(!hb.length)return [];const L=LETTERS;const R=h.rules||{};
 const rows=[[],['ĐỀ THI LÚC THI (đóng băng khi lưu kỳ thi)'],[`Luật điểm: ${h.scoring==='accuracy'?'chính xác (không tính tốc độ)':h.scoring==='speed'?'tốc độ':'(bản lưu cũ – không ghi luật)'}${Object.keys(h.stageScoring||{}).length?' – riêng theo vòng: '+Object.entries(h.stageScoring).map(([k,v])=>STAGE_VI[k]+' '+(v==='accuracy'?'chính xác':'tốc độ')).join(', '):''}${h.confidence?' – có chế độ Tự tin':''}${h.streakOn===false?' – tắt thưởng chuỗi':h.streakOn?' – có thưởng chuỗi':''}${R.tie?' – xếp hạng: '+(R.tie==='time'?'điểm → câu đúng → thời gian':'điểm → câu đúng, bằng nhau đồng hạng'):''}`],
  ['Câu','Chặng','Dạng','Nội dung','Các phương án','Đáp án','Luật điểm của câu','Thời gian (giây)']];
 hb.forEach((q,i)=>{if(!q||q.a===undefined&&q.c===undefined&&!q.kind){rows.push([i+1,'','',q&&q.q||'','(bản lưu cũ – không có chi tiết đề)','','',''] );return}
  const opts=q.kind==='match'?(q.l||[]).join(' | ')+' ⟷ '+(q.r||[]).join(' | '):q.kind==='fill'?Array.from(q.word||'').map((c,k)=>(q.hint||[]).includes(k)||!fillSlot(c)?c:'_').join(''):(q.kind==='number'||q.kind==='slider'||q.kind==='type'||q.kind==='cloud')?(q.kind==='slider'?`thang ${q.min??0} – ${q.max??100}${q.step?' bước '+q.step:''}`:''):(q.a||[]).map((x,k)=>L[k]+'. '+(x||'(ảnh)')).join(' | ');
  rows.push([i+1,STAGE_VI[q.stage]||'',KIND_NAMES[q.kind||'mc']||'',q.q,opts,keyText(q),SCORED[q.kind||'mc']?qRuleText(h,q):'không tính điểm',q.t||''])});
 return rows}
/* chỉ các tuỳ chọn MỚI của câu (câu cũ không thêm gì → báo cáo cũ giữ nguyên) */
function qRuleExtra(q){const x=[];if(q.tie)x.push('câu quyết định khi bằng điểm – không cộng tổng');if(q.scoring)x.push(q.scoring==='accuracy'?'điểm cố định':'theo tốc độ');if(q.maxPts)x.push('tối đa '+q.maxPts+' điểm');if(q.pts===3)x.push('×3');if(q.noStreak)x.push('không thưởng chuỗi');if(q.prox)x.push('càng gần càng nhiều điểm');if(q.kind==='match')x.push('tính theo số cặp đúng');return x.length?' ['+x.join(', ')+']':''}
function qRuleText(r,q){ // câu cũ: in đúng như trước ('chính xác' / 'tốc độ'); chỉ ghi thêm các tuỳ chọn mới của câu
 const x=[q.tie?'câu quyết định khi bằng điểm (không cộng tổng)':(scoringOf(r,q)==='accuracy'?'chính xác':'tốc độ')];if(q.maxPts)x.push('tối đa '+q.maxPts+' điểm');if(q.pts===3)x.push('×3');if(q.noStreak)x.push('không thưởng chuỗi');if(q.prox)x.push('càng gần càng nhiều điểm');if(q.kind==='match')x.push('tính theo số cặp đúng');return x.join(', ')}
function csvOf(rows){return '﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')}
/* Địa chỉ người dùng thật khi chạy sau Caddy / Nginx / router.js: chỉ tin X-Forwarded-For khi kết nối tới từ địa chỉ nội bộ (proxy),
   lấy địa chỉ ngoài cùng bên phải không phải nội bộ – tránh hàng nghìn người dùng chung một địa chỉ proxy bị giới hạn tần suất oan. */
const PRIV=/^(::ffff:)?(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|localhost)/i;
function clientIp(req){const ra=String(req.socket.remoteAddress||'');if(process.env.TRUST_PROXY==='0'||!PRIV.test(ra))return ra;const xff=String(req.headers['x-forwarded-for']||'').split(',').map(x=>x.trim()).filter(Boolean);for(let i=xff.length-1;i>=0;i--)if(!PRIV.test(xff[i]))return xff[i];return xff[0]||ra}
function sendJson(res,status,obj,cookie){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})});res.end(JSON.stringify(obj))}
function jsonBody(req,limit=MAX_BODY){return new Promise((resolve,reject)=>{let chunks=[],size=0;req.on('data',b=>{size+=b.length;if(size>limit){reject(Error('Dữ liệu quá lớn'));req.destroy()}else chunks.push(b)});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch{reject(Error('JSON không hợp lệ'))}});req.on('error',reject)})}
/* ===== Phiên đăng nhập & tài khoản khách (multi-tenant) =====
   admin  – UDIKA tổng; owner – tài khoản KHÁCH (doanh nghiệp tự vận hành) do UDIKA cấp; mc – MC của MỘT phòng.
   Phiên chỉ còn hiệu lực khi khớp phiên bản mật khẩu hiện hành: đổi mật khẩu / thu hồi MC / đổi mật khẩu khách → phiên cũ mất quyền NGAY (kể cả kho đề). */
function liveSession(s){if(!s)return null;if(s.role==='admin')return s;
 if(s.role==='mc'){const r=rooms.get(String(s.pin||''));return r&&s.user===r.mcUser&&s.mcVersion===r.mcVersion?s:null}
 if(s.role==='owner'){const t=TENANTS.get(String(s.tenant||''));return t&&s.tver===t.ver?s:null}
 if(s.role==='judge'){const e=EVENTS.find(x=>x.id===s.event);const j=e&&e.judges.find(x=>x.id===s.judge);return j&&j.ver===s.jver?s:null}return null}
const loginOf=v=>String(v||'').trim().toLowerCase().slice(0,40);
const tenantOf=r=>r&&r.tenant?TENANTS.get(r.tenant)||null:null;
const tenantExpired=t=>!!(t&&t.expiresAt&&t.expiresAt<Date.now());
function tenantBlock(t){if(!t)return null;if(t.locked)return 'Tài khoản khách "'+t.name+'" đang bị KHOÁ – liên hệ UDIKA';if(tenantExpired(t))return 'Gói dịch vụ của "'+t.name+'" đã HẾT HẠN ngày '+new Date(t.expiresAt).toLocaleDateString('vi-VN')+' – liên hệ UDIKA gia hạn (báo cáo cũ vẫn tải được)';return null}
const tenantRooms=id=>[...rooms.values()].filter(r=>r.tenant===id);
const roomPlayerCap=r=>{const t=tenantOf(r);return t&&t.maxPlayers?Math.min(MAX_PLAYERS,t.maxPlayers):MAX_PLAYERS};
/* ===== Chạy nhiều nút (router.js): sổ tài khoản khách & kho đề nằm ở nút 0 =====
   Bộ định tuyến ký (HMAC bằng SESSION_SECRET) các thông tin nó chuyển giữa các nút: danh tính MC đã được nút giữ phòng xác minh (x-udika-principal),
   số phòng hiện có của một khách trên TOÀN cụm (x-udika-tenant-rooms), bản sao sổ tài khoản khách (x-udika-internal). Chữ ký hết hạn sau 30 giây. */
function signBlob(o){const d=Buffer.from(JSON.stringify({...o,exp:Date.now()+30000})).toString('base64url');return d+'.'+crypto.createHmac('sha256','udika-internal|'+SESSION_SECRET).update(d).digest('base64url')}
function verifyBlob(t){try{const [d,sig]=String(t||'').split('.');if(!d||!sig)return null;const e=crypto.createHmac('sha256','udika-internal|'+SESSION_SECRET).update(d).digest('base64url');if(!timingEq(e,sig))return null;const o=JSON.parse(Buffer.from(d,'base64url'));return o.exp>Date.now()?o:null}catch{return null}}
function principalOf(req){const o=verifyBlob(req.headers['x-udika-principal']);return o&&o.kind==='principal'&&o.role==='mc'&&o.key?o:null}
let _EXT=null;const signupHits=new Map();
function EXT(){if(_EXT)return _EXT;const C={PLANS,ORDERS,PAYLOG,EVENTS,TENANTS,rooms,sendJson,jsonBody,persistNow,audit,token,clean,foldTxt,loginOf,passwordRecord,verifyPassword,makeSession,csvOf,tenantPublic,tenantBlock,roomUser,verifyBlob,clientIp,limited,
  signupLimited:req=>{const ip=clientIp(req);let x=signupHits.get(ip)||{t:Date.now(),n:0};if(Date.now()-x.t>3600e3)x={t:Date.now(),n:0};x.n++;signupHits.set(ip,x);if(signupHits.size>20000)signupHits.clear();return x.n>5},
  afterTenantChange:()=>{for(const t of TENANTS.values())if(t.locked||tenantExpired(t))for(const r of tenantRooms(t.id))if(t.locked)kickHosts(r,'Tài khoản khách đã bị khoá – liên hệ UDIKA')}};
 _EXT={pay:require('./pay')(C),events:require('./events')(C)};return _EXT}
function roomUser(user,r){user=liveSession(user);if(!user||!r)return false;if(user.role==='admin')return true;if(user.role==='mc')return user.pin===r.pin;if(user.role==='owner')return !!r.tenant&&r.tenant===user.tenant;return false}
/* Kho đề thuộc về MỘT CHỦ SỞ HỮU BẤT BIẾN (không theo tên MC – hai khách cùng đặt tên "mc" không thấy đề của nhau):
   khách → 't:<mã khách>' (dùng chung cho chủ tài khoản và mọi MC phòng của khách); phòng lẻ do UDIKA tạo → 'room:<mã phòng>'; Admin → 'admin'.
   Bộ đề cũ (trước bản này, chủ = tên MC) chỉ Admin thấy cho tới khi Admin bật "Dùng chung" hoặc tự xử lý. */
function libKey(user){if(user&&user.viaRouter)return user.key;user=liveSession(user);if(!user)return null;if(user.role==='admin')return 'admin';if(user.role==='owner')return 't:'+user.tenant;const r=rooms.get(user.pin);return r&&r.tenant?'t:'+r.tenant:'room:'+user.pin}
const libSees=(user,k,x)=>!!user&&user.role==='admin'||x.shared||(!!x.ownerKey&&x.ownerKey===k);
const libOwns=(user,k,x)=>user.role==='admin'||(!!x.ownerKey&&x.ownerKey===k);
function kickHosts(r,message,keepAdmin=true){for(const ws of [...r.clients]){if(ws.role==='host'&&!(keepAdmin&&ws.session?.role==='admin')){send(ws,{type:'error',message});r.clients.delete(ws);ws.role=null;ws.room=null}}}
function tenantPublic(t){const n=tenantRooms(t.id);return {id:t.id,name:t.name,login:t.login,maxRooms:t.maxRooms,maxPlayers:t.maxPlayers,expiresAt:t.expiresAt||0,locked:!!t.locked,expired:tenantExpired(t),rooms:n.length,players:n.reduce((s,r)=>s+r.players.size,0),createdAt:t.createdAt,note:t.note||''}}
function parseExpiry(v){if(v===null||v===''||v===0)return 0;if(typeof v==='number'&&v>0&&v<100000)return Date.now()+v*86400000; // số ngày
 const d=new Date(String(v));if(isNaN(d))throw Error('Ngày hết hạn không hợp lệ (dạng 2026-12-31)');if(/^\d{4}-\d{2}-\d{2}$/.test(String(v)))d.setHours(23,59,59,999);return d.getTime()}
function archiveRoom(r,by){archiveRun(r,'Lưu trữ & xoá phòng');ARCHIVE.unshift({pin:r.pin,title:r.title,tenant:r.tenant||null,mcUser:r.mcUser||'',createdAt:r.createdAt,deletedAt:Date.now(),by,players:r.players.size,questions:r.bank.length,history:JSON.parse(JSON.stringify(r.history||[]))});
 // giữ tối đa 500 phòng đã lưu trữ; phòng cũ hơn chỉ giữ thông tin tóm tắt (bảng điểm tổng, không giữ bài từng câu)
 if(ARCHIVE.length>500)ARCHIVE.length=500;ARCHIVE.forEach((a,i)=>{if(i>=50&&a.history&&a.history.length){a.history=a.history.map(h=>({...h,bank:undefined,rows:(h.rows||[]).slice(0,50).map(({ans,...x})=>x),detailTrimmed:true}));}})}
/* Lưu một tệp ảnh/video/âm thanh: nhận dạng theo NỘI DUNG (không tin đuôi tệp), giới hạn dung lượng, tên = băm nội dung */
function storeMedia(buf,only){const kind=sniffMedia(buf);if(!kind)throw Error('Chỉ nhận ảnh JPG, PNG, GIF, WEBP; video MP4, WEBM; âm thanh MP3, M4A, OGG, WAV');
 if(only&&kind.kind!==only)throw Error('không phải ảnh JPG/PNG/GIF/WEBP (ảnh EMF/WMF/SVG trong Word cần lưu lại thành PNG)');
 const lim=kind.kind==='image'?8_000_000:kind.kind==='audio'?20_000_000:60_000_000;if(buf.length>lim)throw Error(kind.kind==='image'?'Ảnh tối đa 8 MB':kind.kind==='audio'?'Âm thanh tối đa 20 MB':'Video tối đa 60 MB');
 fs.mkdirSync(MEDIA_DIR,{recursive:true});const name=crypto.createHash('sha256').update(buf).digest('hex').slice(0,24)+kind.ext;const f=path.join(MEDIA_DIR,name);
 if(!fs.existsSync(f)){fs.writeFileSync(f+'.tmp',buf);fs.renameSync(f+'.tmp',f)}return {kind:kind.kind,src:'/media/'+name,bytes:buf.length}}
function sniffMedia(b){const h=b.subarray(0,16);
 if(h[0]===0xFF&&h[1]===0xD8&&h[2]===0xFF)return {kind:'image',ext:'.jpg'};if(h.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A])))return {kind:'image',ext:'.png'};
 if(h.subarray(0,4).toString('latin1')==='GIF8')return {kind:'image',ext:'.gif'};if(h.subarray(0,4).toString('latin1')==='RIFF'&&h.subarray(8,12).toString('latin1')==='WEBP')return {kind:'image',ext:'.webp'};
 if(h.subarray(4,8).toString('latin1')==='ftyp'){const br=h.subarray(8,12).toString('latin1');return /^M4[AB] /.test(br)?{kind:'audio',ext:'.m4a'}:{kind:'video',ext:'.mp4'}}
 if(h.subarray(0,3).toString('latin1')==='ID3'||(h[0]===0xFF&&(h[1]&0xE0)===0xE0))return {kind:'audio',ext:'.mp3'};if(h.subarray(0,4).toString('latin1')==='OggS')return {kind:'audio',ext:'.ogg'};if(h.subarray(0,4).toString('latin1')==='RIFF'&&h.subarray(8,12).toString('latin1')==='WAVE')return {kind:'audio',ext:'.wav'};if(h[0]===0x1A&&h[1]===0x45&&h[2]===0xDF&&h[3]===0xA3)return {kind:'video',ext:'.webm'};return null}
const loginAttempts=new Map();
const checkAttempts=new Map();function checkLimited(ip){let x=checkAttempts.get(ip)||{time:Date.now(),count:0};if(Date.now()-x.time>60000)x={time:Date.now(),count:0};x.count++;checkAttempts.set(ip,x);if(checkAttempts.size>20000)checkAttempts.clear();return x.count>40}
function limited(ip){let x=loginAttempts.get(ip)||{time:Date.now(),count:0};if(Date.now()-x.time>60000)x={time:Date.now(),count:0};x.count++;loginAttempts.set(ip,x);return x.count>12}
/* V15 #3 LAN: địa chỉ mạng nội bộ của máy chủ để in mã QR cho điện thoại. Chỉ trả khi chạy chế độ LAN (LAN_MODE=1, "npm run lan")
   hoặc khi hỏi từ chính máy chủ (localhost) – bản chạy trên Internet không lộ địa chỉ nội bộ. */
function lanAddrs(){const out=[];for(const [name,list] of Object.entries(require('node:os').networkInterfaces()))for(const a of list||[])if(a.family==='IPv4'&&!a.internal)out.push({name,ip:a.address,private:/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)});
 return out.sort((a,b)=>(b.private-a.private)||(/^(wl|wi|en|eth)/i.test(b.name)-/^(wl|wi|en|eth)/i.test(a.name)))}
async function api(req,res,u){
 try{
  const ip=clientIp(req);
  if(u.pathname==='/api/lan-info'&&req.method==='GET'){const loop=/^(127\.|::1$|::ffff:127\.)/.test(String(req.socket.remoteAddress||''))&&!req.headers['x-forwarded-for'];const lan=process.env.LAN_MODE==='1';
   if(!lan&&!loop)return sendJson(res,200,{lan:false,urls:[]});const pub=Number(process.env.LAN_PUBLIC_PORT||PORT);const A=lanAddrs();
   return sendJson(res,200,{lan,port:pub,addrs:A,urls:A.filter(a=>a.private).concat(A.filter(a=>!a.private)).map(a=>`http://${a.ip}${pub===80?'':':'+pub}`)})}
  const origin=req.headers.origin;
  if(req.method!=='GET'&&origin){const host=new URL(origin).host;if(host!==req.headers.host)return sendJson(res,403,{error:'Origin không hợp lệ'})}
  const P=u.pathname.startsWith('/api/library')?principalOf(req):null; // MC ở nút khác: danh tính do router chuyển, đã ký
  const user=P?{role:'mc',user:P.user,pin:P.pin,key:P.key,viaRouter:true}:authRequest(req),parts=u.pathname.split('/').filter(Boolean);
  if(u.pathname==='/api/session'&&req.method==='GET'){const L=liveSession(user);const t=L&&L.role==='owner'?TENANTS.get(L.tenant):null;return sendJson(res,200,{user:L?{role:L.role,pin:L.pin||'',name:L.user,libKey:libKey(L),...(t?{tenant:tenantPublic(t),blocked:tenantBlock(t)}:{})}:null})}
  if(u.pathname==='/api/login'&&req.method==='POST'){
   if(limited(ip))return sendJson(res,429,{error:'Quá nhiều lần đăng nhập. Hãy thử lại sau.'});
   let b=await jsonBody(req),session=null;
   if(b.role==='admin'&&typeof b.password==='string'&&timingEq(crypto.createHash('sha256').update(b.password).digest('hex'),crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex')))session={role:'admin',user:'Admin UDIKA'};
   if(b.role==='mc'){let r=rooms.get(String(b.pin||''));if(r&&r.mcUser===String(b.user||'')&&verifyPassword(r.mcPassword,b.password))session={role:'mc',user:r.mcUser,pin:r.pin,mcVersion:r.mcVersion}}
   if(b.role==='owner'){const lg=loginOf(b.login);const t=[...TENANTS.values()].find(x=>x.login===lg);if(t&&verifyPassword(t.password,b.password))session={role:'owner',user:t.name,tenant:t.id,tver:t.ver}}
   if(!session)return sendJson(res,401,{error:'Tên đăng nhập hoặc mật khẩu không đúng'});
   audit(session.user,'login',session.pin||'all');
   const cookie='udika_session='+encodeURIComponent(makeSession(session))+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200'+(req.socket.encrypted||req.headers['x-forwarded-proto']==='https'?'; Secure':'');
   return sendJson(res,200,{ok:true,role:session.role,pin:session.pin||''},cookie);
  }
  if(u.pathname==='/api/logout'&&req.method==='POST')return sendJson(res,200,{ok:true},'udika_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict');
  /* Trang chủ: kiểm tra mã phòng trước khi ghi danh (công khai, giới hạn tần suất để tránh dò mã) */
  const chkM=u.pathname.match(/^\/api\/rooms\/(\d{6})\/check$/);
  if(chkM&&req.method==='GET'){
    if(checkLimited(ip))return sendJson(res,429,{error:'Bạn đã thử quá nhiều lần. Vui lòng chờ 1 phút rồi thử lại.'});
    const r=rooms.get(chkM[1]);if(!r)return sendJson(res,404,{error:'Không tìm thấy phòng thi'});
    const status=r.phase==='finished'?'finished':r.locked?'locked':r.mode==='self'?(r.phase==='self'?'self':'self_wait'):r.phase==='running'?'running':'open';
    return sendJson(res,200,{ok:true,pin:r.pin,title:r.title,status,teams:teamOn(r),count:r.players.size});
  }
  const impM=u.pathname.match(/^\/api\/rooms\/(\d{6})\/import$/);
  if(impM&&req.method==='POST'){
    const r=rooms.get(impM[1]);if(!r)return sendJson(res,404,{error:'Không tìm thấy phòng'});
    if(!roomUser(user,r))return sendJson(res,403,{error:'Chỉ Admin hoặc MC của phòng'});
    try{const b=await jsonBody(req,56_000_000);const buf=Buffer.from(String(b.data||''),'base64');if(!buf.length)throw Error('Tệp trống');if(buf.length>40_000_000)throw Error('Tệp quá lớn (tối đa 40 MB – nếu nhiều ảnh, hãy nén ảnh trong Word: Tệp → Nén ảnh)');
     const result=importQuestions(String(b.name||''),buf);
     // ảnh nhúng trong Word/Excel: lưu vào thư mục media (trùng nội dung thì dùng lại tệp cũ), thay 'asset:…' bằng /media/…
     const saved={};let nImg=0;for(const [k,data] of Object.entries(result.assets||{})){try{const m=storeMedia(data,'image');saved[k]=m.src;nImg++}catch(e){result.warnings.push({n:'–',why:`ảnh ${k.replace(/^asset:.*\//,'')}: ${e.message} – chưa nhập ảnh này`})}}
     for(const q of result.questions){if(q.media&&/^asset:/.test(q.media.src)){if(saved[q.media.src])q.media={...q.media,src:saved[q.media.src],where:'both'};else delete q.media}
      if(q.ai)q.ai=q.ai.map(x=>/^asset:/.test(x)?(saved[x]||''):x)}
     delete result.assets;result.images=nImg;audit(user.user,'import',r.pin);return sendJson(res,200,result)}
    catch(e){return sendJson(res,400,{error:String(e.message||e)})}
  }
  const hisM=u.pathname.match(/^\/api\/rooms\/(\d{6})\/history(?:\/([\w-]{4,20})\.csv)?$/);
  if(hisM&&req.method==='GET'){const r=rooms.get(hisM[1]);if(!r)return sendJson(res,404,{error:'Không tìm thấy phòng'});
    if(!roomUser(user,r))return sendJson(res,403,{error:'Chỉ Admin hoặc MC của phòng'});
    const H=r.history||[];if(!hisM[2])return sendJson(res,200,{items:H.map(h=>({eid:h.eid,at:h.at,reason:h.reason,rehearsal:!!h.rehearsal,title:h.title,count:h.count,questions:h.questions,reached:h.reached,top:h.rows.slice(0,10)}))});
    const h=H.find(x=>x.eid===hisM[2]);if(!h)return sendJson(res,404,{error:'Không có kỳ thi này trong lịch sử'});
    res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="UDIKA_lich_su_${r.pin}_${h.eid}.csv"`,'Cache-Control':'no-store'});
    return res.end(historyCsv(h))}
  const devM=u.pathname.match(/^\/api\/rooms\/(\d{6})\/devices(\.csv)?$/);
  if(devM&&req.method==='GET'){const r=rooms.get(devM[1]);if(!r)return sendJson(res,404,{error:'Không tìm thấy phòng'});if(!roomUser(user,r))return sendJson(res,403,{error:'Chỉ Admin hoặc MC của phòng'});
   const L=[...(r.devices||new Map()).values()].sort((a,b)=>({fail:0,warn:1,ok:2}[a.level]-{fail:0,warn:1,ok:2}[b.level])||b.at-a.at);
   if(!devM[2])return sendJson(res,200,{summary:deviceSummary(r),devices:L});
   const yn=v=>v===true?'đạt':v===false?'KHÔNG':'chưa thử';
   res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="UDIKA_kiem_tra_may_${r.pin}.csv"`,'Cache-Control':'no-store'});
   return res.end(csvOf([['Kết quả','Tên','Hệ điều hành','Trình duyệt','Màn hình','Mạng','Độ trễ (ms)','Dao động (ms)','Lệch giờ (ms)','Âm thanh','Gõ tiếng Việt','Lưu tạm','Giữ màn sáng','Ghi chú','Địa chỉ IP','Lúc'],
    ...L.map(d=>[{ok:'ĐẠT',warn:'CẢNH BÁO',fail:'LỖI'}[d.level],d.name,d.os,d.browser,d.screen,d.net,d.wsMs??'',d.wsJitter??'',d.clockMs??'',yn(d.audio),yn(d.typing),yn(d.storage),yn(d.wake),d.notes,d.ip,new Date(d.at).toISOString()])]))}
  const repM=u.pathname.match(/^\/api\/rooms\/(\d{6})\/report\.csv$/);
  if(repM&&req.method==='GET'){
    const r=rooms.get(repM[1]);if(!r)return sendJson(res,404,{error:'Không tìm thấy phòng'});
    if(!roomUser(user,r))return sendJson(res,403,{error:'Chỉ Admin hoặc MC của phòng'});
    const L=LETTERS,stage=['Lớp thầy đồ','Khảo hạch','Thi Hương','Thi Hội','Thi Đình'];const ranks=leader(r);
    const key=q=>{const k=q.kind||'mc';return k==='multi'?'đáp án '+q.cs.map(i=>L[i]).join('+')+(q.partial?' (chấm một phần)':' (đủ & đúng tập)'):k==='number'?`đáp án ${q.c}${q.tol?' ±'+q.tol:''}${q.unit?' '+q.unit:''}`:k==='poll'&&q.pmulti?'khảo sát nhiều lựa chọn (không tính điểm)':k==='mc'?'đáp án '+L[q.c]:k==='type'?'đáp án: '+(q.acc||[]).join(' / '):k==='order'?'thứ tự đúng '+LETTERS.slice(0,q.a.length).split('').join('→'):k==='fill'?'từ khoá: '+q.word:k==='match'?'cặp đúng: '+q.l.map((x,i)=>x+'↔'+q.r[i]).join(' · '):k==='slider'?`đáp án ${q.c}${q.tol?' ±'+q.tol:''}${q.unit?' '+q.unit:''}`:k==='poll'?'thăm dò (không tính điểm)':'đám mây từ (không tính điểm)'};
    const val=(q,a)=>a.skipped?'bỏ qua':Array.isArray(a.choices)?a.choices.map(i=>L[i]).join('+'):q.kind==='number'?String(a.text??a.value):a.choice!=null?L[a.choice]:a.text!=null?a.text:a.order?a.order.map(i=>L[i]).join('→'):a.pairs?a.pairs.map((x,i)=>(i+1)+'-'+(x+1)).join(' '):a.value!=null?String(a.value):'';
    const tb=teamOn(r)?new Map(r.teams.map(t=>[t.id,t.name])):null;
    const hasCode=[...r.players.values()].some(p=>p.code);const R=rulesOf(r);const rows=[[`UDIKA – ${r.title} – phòng ${r.pin} – kỳ thi ${r.eid}${r.rehearsal?' (TỔNG DUYỆT)':''} – bộ đề v${r.bankVer||1} – tính điểm: ${r.scoring==='accuracy'?'chính xác (không tính tốc độ)':'tốc độ'}${Object.keys(r.stageScoring||{}).length?' (luật riêng theo vòng: '+Object.entries(r.stageScoring).map(([k,v])=>stage[k]+' '+(v==='accuracy'?'chính xác':'tốc độ')).join(', ')+')':''}${r.confidence?' + tự tin':''} – xếp hạng: ${R.tie==='time'?'điểm → số câu đúng → thời gian':'điểm → số câu đúng, bằng nhau đồng hạng'} – vinh danh khi ≥${R.minCorrect} câu đúng & ≥${R.minScore} điểm`],['Hạng','Sĩ tử',...(hasCode?['Mã dự thi']:[]),...(tb?['Đội']:[]),'Tổng điểm','Số câu đúng','Thưởng chuỗi','Tổng thời gian trả lời đúng (giây)',...r.bank.map((q,i)=>`Câu ${i+1} (${stage[q.stage]} · ${KIND_NAMES[q.kind||'mc']}) – ${key(q)}${qRuleExtra(q)}`)]];
    for(const x of ranks){const p=r.players.get(x.id);const bonus=Object.values(p.answers).reduce((s,a)=>s+(a.bonus||0),0);rows.push([x.rank,p.name,...(hasCode?[p.code||'']:[]),...(tb?[tb.get(p.team)||'']:[]),p.score,p.correct,bonus,(p.totalMs/1000).toFixed(1),...r.bank.map((q,i)=>{const a=p.answers[i];return a?`${val(q,a)}${SCORED[q.kind||'mc']&&!a.skipped?' '+(a.correct?'✔':a.part?'½':'✘'):''}${a.boost?' (chắc chắn '+(a.cf>0?'+':'')+(a.cf||0)+')':''}${a.mcOk?' (MC duyệt)':''} ${a.tie?'quyết định '+(a.tiePts||0):a.points}đ ${((a.ms||0)/1000).toFixed(1)}s`:missText(p,i)})])}
    if(tb){rows.push([]);rows.push(['BẢNG XẾP HẠNG ĐỘI (điểm trung bình thành viên)']);rows.push(['Hạng','Đội','Số thành viên','Điểm đội','Tổng câu đúng']);for(const t of teamBoard(r))rows.push([t.rank,t.name,t.members,t.score,t.correct])}
    rows.push([]);rows.push(['THỐNG KÊ TỪNG CÂU']);rows.push(['Câu','Chặng','Dạng','Nội dung','Số người trả lời','Số người đúng','Tỷ lệ đúng','Kết quả thăm dò / đám mây từ']);
    r.bank.forEach((q,i)=>{const st=qStats(r,i);const scored=SCORED[q.kind||'mc'];const extra=st.counts&&(!scored||st.multi)?q.a.map((x,k)=>`${x||'(ảnh '+L[k]+')'}: ${st.counts[k]}${st.n?' ('+Math.round(st.counts[k]/st.n*100)+'%)':''}`).join(' | ')+(st.multi?` – mẫu số ${st.n} người nộp, mỗi người chọn được nhiều nên tổng có thể >100%`:''):st.words&&q.kind==='cloud'?st.words.map(w=>`${w.w} (${w.n})`).join(' | '):'';
     rows.push([i+1,stage[q.stage],KIND_NAMES[q.kind||'mc'],q.q,st.n,scored?st.right:'–',scored&&st.n?Math.round(st.right/st.n*100)+'%':'–',extra])});
    const csv=csvOf(rows);
    res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="UDIKA_ket_qua_${r.pin}.csv"`,'Cache-Control':'no-store'});return res.end(csv);
  }
  const L=user&&user.viaRouter?user:liveSession(user);
  if(u.pathname.startsWith('/api/pay/')||u.pathname.startsWith('/api/plans')||u.pathname.startsWith('/api/orders')||u.pathname==='/api/signup'){if(await EXT().pay.api(req,res,u,L))return}
  if(u.pathname.startsWith('/api/events')||u.pathname.startsWith('/api/judge/')){if(await EXT().events.api(req,res,u,L))return}
  /* khách tự đổi mật khẩu: phải nhập đúng mật khẩu cũ; mọi phiên cũ mất hiệu lực, phiên hiện tại được cấp lại */
  if(u.pathname==='/api/khach/password'&&req.method==='POST'){if(!L||L.role!=='owner')return sendJson(res,403,{error:'Chỉ chủ tài khoản khách'});if(limited(ip))return sendJson(res,429,{error:'Thử quá nhiều lần – chờ 1 phút'});
    const t=TENANTS.get(L.tenant);const b=await jsonBody(req);const nw=String(b.newPassword||'');
    if(!verifyPassword(t.password,b.oldPassword))return sendJson(res,400,{error:'Mật khẩu hiện tại không đúng'});if(nw.length<10)return sendJson(res,400,{error:'Mật khẩu mới tối thiểu 10 ký tự'});if(nw===String(b.oldPassword))return sendJson(res,400,{error:'Mật khẩu mới phải khác mật khẩu cũ'});
    const old={password:t.password,ver:t.ver};t.password=passwordRecord(nw);t.ver=token().slice(0,12);
    if(!(await persistNow())){Object.assign(t,old);return sendJson(res,503,{error:'Máy chủ CHƯA lưu được – mật khẩu chưa đổi'})}
    for(const r of tenantRooms(t.id))for(const ws of [...r.clients])if(ws.role==='host'&&ws.session?.role==='owner'){send(ws,{type:'error',message:'Mật khẩu tài khoản khách vừa được đổi – vui lòng đăng nhập lại'});r.clients.delete(ws);ws.role=null;ws.room=null}
    audit(L.user,'owner_password',t.id);const cookie='udika_session='+encodeURIComponent(makeSession({role:'owner',user:t.name,tenant:t.id,tver:t.ver}))+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200'+(req.socket.encrypted||req.headers['x-forwarded-proto']==='https'?'; Secure':'');
    return sendJson(res,200,{ok:true},cookie)}
  const tbM=u.pathname.match(/^\/api\/rooms\/(\d{6})\/teamboard$/);
  if(tbM&&req.method==='GET'){const r=rooms.get(tbM[1]);if(!r)return sendJson(res,404,{error:'Không tìm thấy phòng'});if(!roomUser(user,r))return sendJson(res,403,{error:'Không có quyền'});return sendJson(res,200,{pin:r.pin,board:EXT().events.teamBoardReal(r)})}
  if(u.pathname==='/api/rooms'&&req.method==='GET'){
    if(!L||!(L.role==='admin'||L.role==='owner'))return sendJson(res,403,{error:'Chỉ Admin hoặc chủ tài khoản khách'});
    const list=[...rooms.values()].filter(r=>L.role==='admin'||r.tenant===L.tenant);
    return sendJson(res,200,{rooms:list.map(r=>({pin:r.pin,title:r.title,mcUser:r.mcUser||'',count:r.players.size,phase:r.phase,idx:r.idx,questions:r.bank.length,createdAt:r.createdAt,tenant:r.tenant||null,tenantName:tenantOf(r)?.name||'',runs:(r.history||[]).length}))});
  }
  if(u.pathname==='/api/rooms'&&req.method==='POST'){
    if(!L||!(L.role==='admin'||L.role==='owner'))return sendJson(res,403,{error:'Chỉ Admin hoặc chủ tài khoản khách được tạo phòng'});
    let b=await jsonBody(req),title=clean(b.title,80),mcUser=clean(b.mcUser,40),password=String(b.password||'');
    let tid=L.role==='owner'?L.tenant:(b.tenant?String(b.tenant):null);const T=tid?TENANTS.get(tid):null;if(tid&&!T)return sendJson(res,404,{error:'Không thấy tài khoản khách'});
    if(T&&L.role==='owner'){const bl=tenantBlock(T);if(bl)return sendJson(res,403,{error:bl});const tc=verifyBlob(req.headers['x-udika-tenant-rooms']);const used=tc&&tc.kind==='tenant_rooms'&&tc.tenant===T.id?Math.max(tc.n,tenantRooms(T.id).length):tenantRooms(T.id).length;if(used>=T.maxRooms)return sendJson(res,409,{error:`Gói của bạn cho tối đa ${T.maxRooms} phòng cùng lúc – hãy "Lưu trữ & xoá" phòng đã thi xong (kết quả vẫn giữ trong mục Lưu trữ) hoặc liên hệ UDIKA nâng gói`})}
    if(rooms.size>=MAX_ROOMS)return sendJson(res,409,{error:'Máy chủ đã đạt giới hạn số phòng – hãy lưu trữ & xoá phòng cũ'});
    if(!title||!mcUser||password.length<10)return sendJson(res,400,{error:'Cần tên sự kiện, tên MC và mật khẩu MC tối thiểu 10 ký tự'});
    let pin=makePin(),r={pin,hostKey:token(),title,mcUser,mcPassword:passwordRecord(password),mcVersion:token(),eid:token().slice(0,10),bank:normalizeBank(questions),phase:'idle',idx:0,startedAt:0,endedAt:0,createdAt:Date.now(),players:new Map(),clients:new Set(),deadlineTimer:null};if(T)r.tenant=T.id;
    rooms.set(pin,r);if(!(await persistNow())){rooms.delete(pin);return sendJson(res,503,{error:'Máy chủ KHÔNG lưu được dữ liệu – chưa tạo phòng. Báo kỹ thuật kiểm tra ổ đĩa / cơ sở dữ liệu.'})}audit(user.user,'room_created',pin);return sendJson(res,201,{pin,title,mcUser,tenant:r.tenant||null});
  }
  if(parts.length===4&&parts[0]==='api'&&parts[1]==='rooms'&&parts[3]==='mc'&&req.method==='PATCH'){
    let r=rooms.get(parts[2]);if(!r)return sendJson(res,404,{error:'Không thấy phòng'});
    if(!L||!(L.role==='admin'||(L.role==='owner'&&r.tenant===L.tenant)))return sendJson(res,403,{error:'Chỉ Admin hoặc chủ tài khoản khách của phòng'});
    let b=await jsonBody(req),mcUser=clean(b.mcUser,40),password=String(b.password||'');if(!mcUser||password.length<10)return sendJson(res,400,{error:'Tên MC hoặc mật khẩu không hợp lệ'});
    r.mcUser=mcUser;r.mcPassword=passwordRecord(password);r.mcVersion=token();for(const ws of [...r.clients]){if(ws.role==='host'&&ws.session?.role==='mc'){send(ws,{type:'error',message:'Quyền MC đã thay đổi. Vui lòng đăng nhập lại.'});r.clients.delete(ws);ws.role=null;ws.room=null}}
    audit(user.user,'mc_changed',r.pin);if(!(await persistNow()))return sendJson(res,503,{error:'Đã đổi MC nhưng máy chủ CHƯA lưu được – báo kỹ thuật kiểm tra ổ đĩa / cơ sở dữ liệu'});return sendJson(res,200,{ok:true});
  }
  /* ===== Vòng đời phòng: "Lưu trữ & xoá" giải phóng hạn mức; kết quả các kỳ thi chuyển vào mục Lưu trữ (vẫn tải CSV được) ===== */
  if(parts.length===3&&parts[0]==='api'&&parts[1]==='rooms'&&/^\d{6}$/.test(parts[2])&&req.method==='DELETE'){
    const r=rooms.get(parts[2]);if(!r)return sendJson(res,404,{error:'Không thấy phòng'});
    if(!L||!(L.role==='admin'||(L.role==='owner'&&r.tenant===L.tenant)))return sendJson(res,403,{error:'Chỉ Admin hoặc chủ tài khoản khách được xoá phòng (MC không được xoá)'});
    if(['running','media'].includes(r.phase)||(r.mode==='self'&&r.phase==='self'))return sendJson(res,409,{error:'Phòng đang thi – kết thúc câu / đóng bài trước khi xoá'});
    archiveRoom(r,L.user);clearTimeout(r.deadlineTimer);cancelAutoReveal(r);
    for(const ws of [...r.clients]){send(ws,{type:'error',message:'Phòng thi này đã được lưu trữ và đóng.'});ws.role=null;ws.room=null;ws.playerId=null}r.clients.clear();rooms.delete(r.pin);
    if(!(await persistNow()))return sendJson(res,503,{error:'Đã đóng phòng nhưng máy chủ CHƯA lưu được dữ liệu – báo kỹ thuật kiểm tra ổ đĩa / cơ sở dữ liệu'});
    audit(L.user,'room_deleted',r.pin);return sendJson(res,200,{ok:true,archived:true})}
  if(u.pathname==='/api/archive'&&req.method==='GET'){
    if(!L||!(L.role==='admin'||L.role==='owner'))return sendJson(res,403,{error:'Chỉ Admin hoặc chủ tài khoản khách'});
    const list=ARCHIVE.filter(a=>L.role==='admin'||a.tenant===L.tenant);
    return sendJson(res,200,{items:list.map(a=>({pin:a.pin,title:a.title,tenant:a.tenant,tenantName:a.tenant?TENANTS.get(a.tenant)?.name||'':'',mcUser:a.mcUser,createdAt:a.createdAt,deletedAt:a.deletedAt,by:a.by,players:a.players,questions:a.questions,runs:(a.history||[]).map(h=>({eid:h.eid,at:h.at,reason:h.reason,rehearsal:!!h.rehearsal,count:h.count,top:(h.rows||[]).slice(0,3).map(x=>x.name)}))}))})}
  const arM=u.pathname.match(/^\/api\/archive\/(\d{6})\/([\w-]{4,20})\.csv$/);
  if(arM&&req.method==='GET'){if(!L||!(L.role==='admin'||L.role==='owner'))return sendJson(res,403,{error:'Chỉ Admin hoặc chủ tài khoản khách'});
    const a=ARCHIVE.find(x=>x.pin===arM[1]&&(L.role==='admin'||x.tenant===L.tenant)&&(x.history||[]).some(h=>h.eid===arM[2]));if(!a)return sendJson(res,404,{error:'Không có kỳ thi này trong lưu trữ'});
    const h=a.history.find(x=>x.eid===arM[2]);res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="UDIKA_luu_tru_${a.pin}_${h.eid}.csv"`,'Cache-Control':'no-store'});return res.end(historyCsv(h))}
  if(u.pathname==='/api/internal/cluster'&&req.method==='POST'){const v=verifyBlob(req.headers['x-udika-internal']);if(!v||v.kind!=='cluster'||!SESSION_SECRET)return sendJson(res,403,{error:'internal'});
   const n=x=>Math.max(0,Math.floor(Number(x)||0));CLUSTER={limit:n(v.limit),reserve:Math.min(n(v.reserve),Math.max(0,n(v.limit)-1)),others:n(v.others),at:Date.now()};return sendJson(res,200,{ok:true,online:onlinePlayers()})}
  if(u.pathname==='/api/internal/tenants'){const v=verifyBlob(req.headers['x-udika-internal']);
    if(req.method==='GET'){if(!v||v.kind!=='tenants_get')return sendJson(res,403,{error:'internal'});return sendJson(res,200,{items:[...TENANTS.values()].map(({password,...t})=>t)})}
    if(req.method==='POST'){const raw=await new Promise((ok,bad)=>{const ch=[];let n=0;req.on('data',c=>{n+=c.length;if(n>8e6){bad(Error('Dữ liệu quá lớn'));req.destroy()}else ch.push(c)});req.on('end',()=>ok(Buffer.concat(ch)));req.on('error',bad)});
     if(!v||v.kind!=='tenants_put'||v.sha!==crypto.createHash('sha256').update(raw).digest('hex')||NODE_INDEX===0)return sendJson(res,403,{error:'internal'});
     const items=JSON.parse(raw.toString('utf8')).items||[];const before=JSON.stringify([...TENANTS.values()]);TENANTS.clear();for(const t of items)if(t&&t.id)TENANTS.set(t.id,{...t,password:null});
     if(JSON.stringify([...TENANTS.values()])!==before){for(const r of rooms.values()){const t=tenantOf(r);if(t&&t.locked)kickHosts(r,'Tài khoản khách đã bị khoá – liên hệ UDIKA')}saveSoon()}return sendJson(res,200,{ok:true,n:TENANTS.size})}}
  /* ===== Tài khoản khách (doanh nghiệp tự vận hành) – CHỈ UDIKA (Admin) cấp, khoá, gia hạn, đổi gói ===== */
  if(u.pathname==='/api/tenants'&&req.method==='GET'){if(!L||L.role!=='admin')return sendJson(res,403,{error:'Chỉ Admin UDIKA'});return sendJson(res,200,{items:[...TENANTS.values()].map(tenantPublic)})}
  if(u.pathname==='/api/tenants'&&req.method==='POST'){if(!L||L.role!=='admin')return sendJson(res,403,{error:'Chỉ Admin UDIKA'});
    const b=await jsonBody(req);const name=clean(b.name,80),login=loginOf(b.login),pw=String(b.password||'');
    if(!name||!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(login)||pw.length<10)return sendJson(res,400,{error:'Cần tên khách, tên đăng nhập (3–40 ký tự a-z 0-9 . _ -) và mật khẩu tối thiểu 10 ký tự'});
    if([...TENANTS.values()].some(t=>t.login===login))return sendJson(res,409,{error:'Tên đăng nhập này đã có'});
    let exp;try{exp=parseExpiry(b.expiresAt??b.days??0)}catch(e){return sendJson(res,400,{error:e.message})}
    const t={id:'k'+token().slice(0,11),name,login,password:passwordRecord(pw),ver:token().slice(0,12),maxRooms:Math.max(1,Math.min(MAX_ROOMS*NODE_COUNT,Math.round(Number(b.maxRooms)||1))),maxPlayers:Math.max(10,Math.min(MAX_PLAYERS,Math.round(Number(b.maxPlayers)||300))),expiresAt:exp,locked:false,createdAt:Date.now(),note:clean(b.note,200)};
    TENANTS.set(t.id,t);if(!(await persistNow())){TENANTS.delete(t.id);return sendJson(res,503,{error:'Máy chủ KHÔNG lưu được dữ liệu – chưa tạo tài khoản khách'})}audit(L.user,'tenant_created',t.id);return sendJson(res,201,tenantPublic(t))}
  const tnM=u.pathname.match(/^\/api\/tenants\/([\w-]{4,20})$/);
  if(tnM&&req.method==='PATCH'){if(!L||L.role!=='admin')return sendJson(res,403,{error:'Chỉ Admin UDIKA'});const t=TENANTS.get(tnM[1]);if(!t)return sendJson(res,404,{error:'Không thấy tài khoản khách'});
    const b=await jsonBody(req);try{if('expiresAt' in b||'days' in b)t.expiresAt=parseExpiry(b.expiresAt??b.days)}catch(e){return sendJson(res,400,{error:e.message})}
    if(b.name){const n=clean(b.name,80);if(n)t.name=n}if('note' in b)t.note=clean(b.note,200);
    if('maxRooms' in b)t.maxRooms=Math.max(1,Math.min(MAX_ROOMS*NODE_COUNT,Math.round(Number(b.maxRooms)||1)));if('maxPlayers' in b)t.maxPlayers=Math.max(10,Math.min(MAX_PLAYERS,Math.round(Number(b.maxPlayers)||300)));
    let kick=null;if('locked' in b){t.locked=!!b.locked;if(t.locked)kick='Tài khoản khách đã bị khoá – liên hệ UDIKA'}
    if(b.password){const pw=String(b.password);if(pw.length<10)return sendJson(res,400,{error:'Mật khẩu tối thiểu 10 ký tự'});t.password=passwordRecord(pw);t.ver=token().slice(0,12);kick=kick||'Mật khẩu tài khoản khách đã đổi – vui lòng đăng nhập lại'}
    if(kick)for(const r of tenantRooms(t.id)){for(const ws of [...r.clients])if(ws.role==='host'&&(ws.session?.role==='owner'||(t.locked&&ws.session?.role==='mc'))){send(ws,{type:'error',message:kick});r.clients.delete(ws);ws.role=null;ws.room=null}}
    audit(L.user,'tenant_updated',t.id);if(!(await persistNow()))return sendJson(res,503,{error:'Đã cập nhật nhưng máy chủ CHƯA lưu được – báo kỹ thuật'});return sendJson(res,200,tenantPublic(t))}
  if(parts.length===4&&parts[0]==='api'&&parts[1]==='rooms'&&parts[3]==='export'&&req.method==='GET'){
    if(!user||user.role!=='admin')return sendJson(res,403,{error:'Chỉ Admin có quyền'});
    let r=rooms.get(parts[2]);if(!r)return sendJson(res,404,{error:'Không thấy phòng'});
    let rows=leader(r);res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="udika-${r.pin}.csv"`,'Cache-Control':'no-store'});
    res.end(csvOf([['Hạng','Họ tên','Điểm','Câu đúng','Tổng thời gian (ms)'],...rows.map(p=>[p.rank,p.name,p.score,p.correct,p.totalMs])]));return;
  }
  /* ===== V14: tải ảnh / video cho câu hỏi ===== */
  const medM=u.pathname.match(/^\/api\/rooms\/(\d{6})\/media$/);
  if(medM&&req.method==='POST'){
    const r=rooms.get(medM[1]);if(!r)return sendJson(res,404,{error:'Không tìm thấy phòng'});
    if(!roomUser(user,r))return sendJson(res,403,{error:'Chỉ Admin hoặc MC của phòng'});
    try{const b=await jsonBody(req,90_000_000);const buf=Buffer.from(String(b.data||''),'base64');if(!buf.length)throw Error('Tệp trống');
     const m=storeMedia(buf);audit(user.user,'media_upload',r.pin);return sendJson(res,200,m)}
    catch(e){return sendJson(res,400,{error:String(e.message||e)})}
  }
  /* ===== V14: kho đề – lưu bộ đề, dùng lại giữa các buổi ===== */
  /* Chơi thử một mình (luyện tập): CHỈ dùng bộ đề mẫu và bộ đề Admin bật "Chơi thử" – KHÔNG BAO GIỜ dùng bộ đề của phòng thi thật
     (bộ luyện tập gửi kèm đáp án cho trình duyệt tự chấm, điểm không đi vào bất kỳ kỳ thi nào). */
  if(u.pathname==='/api/practice'&&req.method==='GET'){const items=PRACTICE_SAMPLE.length?[{id:'mau',name:'Bộ luyện tập – Khoa cử Việt Nam',count:PRACTICE_SAMPLE.length}]:[];
    for(const x of LIB.values())if(x.practice)items.push({id:x.id,name:x.name,count:x.bank.length});return sendJson(res,200,{items})}
  const prM=u.pathname.match(/^\/api\/practice\/([\w-]{3,40})$/);
  if(prM&&req.method==='GET'){if(prM[1]==='mau'){if(!PRACTICE_SAMPLE.length)return sendJson(res,404,{error:'Chưa có bộ luyện tập'});return sendJson(res,200,{id:'mau',name:'Bộ luyện tập – Khoa cử Việt Nam',bank:normalizeBank(PRACTICE_SAMPLE)})}
    const it=LIB.get(prM[1]);if(!it||!it.practice)return sendJson(res,404,{error:'Bộ đề này không mở cho chơi thử'});return sendJson(res,200,{id:it.id,name:it.name,bank:it.bank})}
  if(u.pathname==='/api/library'&&req.method==='GET'){
    const K=libKey(user);if(!K)return sendJson(res,403,{error:'Cần đăng nhập (phiên cũ đã hết hiệu lực – đăng nhập lại)'});
    const list=[...LIB.values()].filter(x=>libSees(L,K,x)).sort((a,b)=>b.updatedAt-a.updatedAt)
     .map(x=>({id:x.id,name:x.name,owner:x.owner,ownerKey:L.role==='admin'?x.ownerKey||'(cũ – chưa gán chủ)':undefined,shared:!!x.shared,practice:!!x.practice,count:x.bank.length,kinds:[...new Set(x.bank.map(q=>q.kind||'mc'))],updatedAt:x.updatedAt,mine:!!x.ownerKey&&x.ownerKey===K}));
    return sendJson(res,200,{items:list});
  }
  if(u.pathname==='/api/library'&&req.method==='POST'){
    const K=libKey(user);if(!K)return sendJson(res,403,{error:'Cần đăng nhập (phiên cũ đã hết hiệu lực – đăng nhập lại)'});
    const b=await jsonBody(req,4_000_000);const name=clean(b.name,80);if(!name)return sendJson(res,400,{error:'Đặt tên cho bộ đề'});
    let bank;if(b.pin){const r=rooms.get(String(b.pin));if(!r)return sendJson(res,404,{error:'Không tìm thấy phòng'});if(!roomUser(user,r))return sendJson(res,403,{error:'Chỉ Admin hoặc MC của phòng'});bank=r.bank}else bank=b.bank;
    try{bank=normalizeBank(bank)}catch(e){return sendJson(res,400,{error:e.message})}
    let it=[...LIB.values()].find(x=>x.ownerKey===K&&foldTxt(x.name)===foldTxt(name));
    if(!it){if(LIB.size>=500)return sendJson(res,409,{error:'Kho đề đã đầy (500 bộ) – hãy xoá bớt'});it={id:token().slice(0,16),name,owner:user.user,ownerKey:K,shared:false,createdAt:Date.now()};LIB.set(it.id,it)}
    it.name=name;it.bank=JSON.parse(JSON.stringify(bank));it.updatedAt=Date.now();LIB_VER++;audit(user.user,'library_save',it.id);if(!(await persistNow()))return sendJson(res,503,{error:'Máy chủ CHƯA lưu được bộ đề vào kho – thử lại sau'});
    return sendJson(res,200,{ok:true,id:it.id,count:it.bank.length});
  }
  const bankM=u.pathname.match(/^\/api\/rooms\/(\d{6})\/bank$/);
  if(bankM){const r=rooms.get(bankM[1]);if(!r)return sendJson(res,404,{error:'Không tìm thấy phòng'});if(!user||!roomUser(user,r))return sendJson(res,403,{error:'Chỉ Admin hoặc MC của phòng'});
   if(req.method==='GET')return sendJson(res,200,{bank:r.bank,bankVer:r.bankVer||1});
   if(req.method==='POST'){const b=await jsonBody(req,4_000_000);try{if(b.mode==='append')appendQuestions(r,b.bank);else applyBank(r,b.bank)}catch(e){return sendJson(res,e.code===409?409:400,{error:e.message})}audit(user.user,'bank_'+(b.mode||'replace'),r.pin);broadcast(r);saveNowSoon();return sendJson(res,200,{ok:true,count:r.bank.length})}}
  const libM=u.pathname.match(/^\/api\/library\/([\w-]{6,40})(\/load)?$/);
  if(libM){
    const it=LIB.get(libM[1]);const K=libKey(user);if(!K)return sendJson(res,403,{error:'Cần đăng nhập (phiên cũ đã hết hiệu lực – đăng nhập lại)'});if(!it||!libSees(L,K,it))return sendJson(res,404,{error:'Không tìm thấy bộ đề'});
    if(libM[2]&&req.method==='POST'){const b=await jsonBody(req);const r=rooms.get(String(b.pin||''));if(!r)return sendJson(res,404,{error:'Không tìm thấy phòng'});if(!roomUser(user,r))return sendJson(res,403,{error:'Chỉ Admin hoặc MC của phòng'});
      try{if(b.mode==='append')appendQuestions(r,JSON.parse(JSON.stringify(it.bank)));else applyBank(r,JSON.parse(JSON.stringify(it.bank)))}catch(e){return sendJson(res,e.code===409?409:400,{error:e.message})}
      audit(user.user,'library_load',r.pin);broadcast(r);return sendJson(res,200,{ok:true,count:r.bank.length})}
    if(!libM[2]&&req.method==='GET')return sendJson(res,200,{id:it.id,name:it.name,owner:it.owner,shared:!!it.shared,bank:it.bank});
    if(!libM[2]&&req.method==='PATCH'){const b=await jsonBody(req);if(!libOwns(L,K,it))return sendJson(res,403,{error:'Chỉ người tạo hoặc Admin'});
      if('shared' in b){if(L.role!=='admin')return sendJson(res,403,{error:'Chỉ Admin được chia sẻ bộ đề cho mọi MC'});it.shared=!!b.shared}
      if('practice' in b){if(L.role!=='admin')return sendJson(res,403,{error:'Chỉ Admin được mở bộ đề cho chơi thử công khai'});it.practice=!!b.practice}
      if(b.name){const n=clean(b.name,80);if(n)it.name=n}it.updatedAt=Date.now();LIB_VER++;saveSoon();return sendJson(res,200,{ok:true})}
    if(!libM[2]&&req.method==='DELETE'){if(!libOwns(L,K,it))return sendJson(res,403,{error:'Chỉ người tạo hoặc Admin được xoá'});LIB.delete(it.id);saveSoon();audit(user.user,'library_delete',it.id);return sendJson(res,200,{ok:true})}
    return sendJson(res,405,{error:'Phương thức không hỗ trợ'});
  }
  if(u.pathname==='/api/health/ack'&&req.method==='POST'){if(!user||user.role!=='admin')return sendJson(res,403,{error:'Chỉ Admin có quyền'});const was=STARTUP_DATA_ERROR;STARTUP_DATA_ERROR=null;audit(user.user,'data_error_ack','-');return sendJson(res,200,{ok:true,cleared:was})}
  if(u.pathname==='/api/audit'&&req.method==='GET'){
    if(!user||user.role!=='admin')return sendJson(res,403,{error:'Chỉ Admin có quyền'});
    return sendJson(res,200,{events:accessLog.slice(-100).reverse()});
  }
  return sendJson(res,404,{error:'Không có chức năng này'});
 }catch(e){sendJson(res,400,{error:e.message||'Yêu cầu lỗi'})}
}
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');if(u.pathname.startsWith('/api/'))return api(req,res,u);if(u.pathname==='/health'){const healthy=persistenceReady&&!persistenceLastError&&!STARTUP_DATA_ERROR;res.writeHead(healthy?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:healthy,rooms:rooms.size,online:onlinePlayers(),onlineLimit:MAX_ONLINE,reconnectReserve:RECONNECT_RESERVE,cluster:CLUSTER.limit&&Date.now()-CLUSTER.at<=15000?{limit:CLUSTER.limit,reserve:CLUSTER.reserve,others:CLUSTER.others}:null,persistence:{mode:db?'postgresql':'temporary-file',required:REQUIRE_DATABASE,ready:persistenceReady,lastSavedAt:persistenceLastSavedAt,error:STARTUP_DATA_ERROR||(persistenceLastError?(db?'Database save failed':'File save failed')+' (check server logs)':null)}}));return}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method not allowed');return}
 let file;if(u.pathname.startsWith('/media/')){const m=u.pathname.match(/^\/media\/([\w-]{3,60}\.(jpg|png|gif|webp|mp4|webm|mp3|m4a|ogg|wav))$/);if(!m){res.writeHead(404);res.end();return}file=path.join(MEDIA_DIR,m[1])}
 else{const name=routes[u.pathname]||u.pathname.replace(/^\//,'');file=path.resolve(publicDir,name);
 if(!file.startsWith(publicDir+path.sep)){res.writeHead(403);res.end('Forbidden');return}}
 const ext=path.extname(file),head=req.method==='HEAD';
 if(ext==='.mp4'||ext==='.webm'||ext==='.m4a'||ext==='.mp3'||ext==='.ogg'||ext==='.wav'){ // phim vinh danh dựng sẵn: phát theo luồng, hỗ trợ tua (Range)
  fs.stat(file,(e,st)=>{if(e||!st.isFile()){res.writeHead(404);res.end();return}
   const base={'Content-Type':MIME[ext],'Accept-Ranges':'bytes','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'};
   const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range||'');
   if(m){let a=m[1]===''?Math.max(0,st.size-Number(m[2])):Number(m[1]),b=m[1]!==''&&m[2]!==''?Number(m[2]):st.size-1;b=Math.min(b,st.size-1);
    if(!(a<=b)){res.writeHead(416,{'Content-Range':`bytes */${st.size}`});res.end();return}
    res.writeHead(206,{...base,'Content-Range':`bytes ${a}-${b}/${st.size}`,'Content-Length':b-a+1});if(head){res.end();return}fs.createReadStream(file,{start:a,end:b}).pipe(res)}
   else{res.writeHead(200,{...base,'Content-Length':st.size});if(head){res.end();return}fs.createReadStream(file).pipe(res)}});return}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end(head?undefined:'Not found');return}res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':ext==='.woff'||ext==='.woff2'?'public, max-age=604800':'no-cache','X-Content-Type-Options':'nosniff'});res.end(head?undefined:data)})
});
// WebSocket implementation for pilot; no external packages required on Render.
const SOCKETS=new Set();
setInterval(()=>{const t=Date.now();for(const ws of SOCKETS){if(ws.closed)continue;if(t-ws.lastSeen>45000){try{ws.socket.destroy()}catch{}continue}try{if(ws.socket.writable)ws.socket.write(Buffer.from([0x89,0x00]))}catch{}}},15000).unref();
server.on('upgrade',(req,socket,head)=>{
 try{
  const u=new URL(req.url,'http://localhost');if(u.pathname!=='/ws')return socket.destroy();if(req.headers.origin){let originHost;try{originHost=new URL(req.headers.origin).host}catch{return socket.destroy()}if(originHost!==req.headers.host)return socket.destroy()}
  if(String(req.headers.upgrade||'').toLowerCase()!=='websocket'||!req.headers['sec-websocket-key'])return socket.destroy();
  const key=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+key+'\r\n\r\n');
  const ws={socket,closed:false,buffer:Buffer.alloc(0),role:null,room:null,playerId:null,connId:token().slice(0,10),session:authRequest(req),lastSeen:Date.now(),ip:clientIp(req)};socket.setNoDelay(true);socket.setKeepAlive(true,20000);
  function cleanup(){if(ws.closed)return;ws.closed=true;SOCKETS.delete(ws);if(ws.room&&ws.role==='player'&&ws.playerId&&ws.room.phase==='running'){const p=ws.room.players.get(ws.playerId);if(p&&!p.answers[ws.room.idx]){p.drop=p.drop||{};p.drop[ws.room.idx]=1}}if(ws.room&&ws.role==='watch'&&ws.led){const r=ws.room;r.clients.delete(ws);const left=ledList(r);const j=JSON.stringify({type:'leds',leds:left});
   const lost=r.phase==='media'&&(ws.ledMain||!left.length)?JSON.stringify({type:'media_alert',qid:r.qid,led:ws.led.label,message:'Màn LED "'+ws.led.label+'" vừa MẤT KẾT NỐI trong lúc phát clip – lượt trả lời chưa mở. Mở lại màn LED, hoặc bấm MỞ LƯỢT TRẢ LỜI NGAY.'}):null;
   for(const c of r.clients)if(c.role==='host'){sendRaw(c,j);if(lost)sendRaw(c,lost)}}if(ws.pend){const e=ws.pend.r.pending&&ws.pend.r.pending.get(ws.pend.k);if(e&&e.ws===ws)e.ws=null;pendingChanged(ws.pend.r);ws.pend=null}if(ws.room){ws.room.clients.delete(ws);if(ws.role==='player'){ws.room.playersDirty=true;broadcastPresenceSoon(ws.room);maybeAutoReveal(ws.room)}}}
  SOCKETS.add(ws);socket.on('close',cleanup);socket.on('error',cleanup);socket.on('end',()=>{cleanup();if(!socket.destroyed)socket.end()});
  function processPacket(){
   for(;;){const b=ws.buffer;if(b.length<2)return;const opcode=b[0]&15;const fin=!!(b[0]&128);let len=b[1]&127,ofs=2;if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);ofs=4}else if(len===127){if(b.length<10)return;const n=b.readBigUInt64BE(2);if(n>BigInt(MAX_BODY))return socket.destroy();len=Number(n);ofs=10}if(len>MAX_BODY)return socket.destroy();if(!(b[1]&128))return socket.destroy();if(b.length<ofs+4+len)return;const mask=b.subarray(ofs,ofs+4),data=Buffer.from(b.subarray(ofs+4,ofs+4+len));for(let i=0;i<data.length;i++)data[i]^=mask[i&3];ws.buffer=b.subarray(ofs+4+len);
    ws.lastSeen=Date.now();if(!fin){socket.destroy();return}if(opcode===8){const code=data.length>=2?data.subarray(0,2):Buffer.from([0x03,0xE8]);if(!ws.closeSent){ws.closeSent=true;try{socket.write(Buffer.concat([Buffer.from([0x88,code.length]),code]))}catch{}}cleanup();socket.end();return}if(opcode===9){socket.write(Buffer.concat([Buffer.from([0x8A,Math.min(125,data.length)]),data.subarray(0,125)]));continue}if(opcode===10)continue;if(opcode!==1)continue;let msg;try{msg=JSON.parse(data.toString('utf8'))}catch{err(ws,'Dữ liệu không hợp lệ');continue}const tnow=Date.now();if(tnow-(ws.mWin||0)>1000){ws.mWin=tnow;ws.mCnt=0}if(++ws.mCnt>40){err(ws,'Gửi quá nhanh – kết nối bị ngắt để bảo vệ phòng thi');socket.destroy();return} // chống công cụ gửi dồn dập (bot)
    try{onMessage(ws,msg)}catch(e){err(ws,e)}
   }
  }
  socket.on('data',chunk=>{ws.buffer=Buffer.concat([ws.buffer,chunk]);if(ws.buffer.length>MAX_BODY+100)socket.destroy();else processPacket()});if(head.length){ws.buffer=head;processPacket()}
 }catch(e){socket.destroy()}
});
load().then(()=>server.listen(PORT,HOST,()=>console.log(`UDIKA Game Hub ready on port ${PORT}. Pilot max ${MAX_PLAYERS} players per room.`))).catch(e=>{console.error('Cannot initialize persistence:',e);process.exit(1)});
process.on('SIGTERM',async()=>{clearTimeout(saveTimer);await persistNow().catch(e=>console.error(e));for(const ws of SOCKETS){try{ws.socket.end(Buffer.from([0x88,0x02,0x03,0xE9]))}catch{}}server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),5000)});
