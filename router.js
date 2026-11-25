'use strict';
/* UDIKA – BỘ ĐỊNH TUYẾN NHIỀU TIẾN TRÌNH / NHIỀU MÁY CHỦ
   Nguyên tắc: MỖI PHÒNG THUỘC TRỌN MỘT NÚT (một tiến trình server.js). Nút giữ phòng có mã: mã % NODE_COUNT = NODE_INDEX.
   Bộ định tuyến không giữ trạng thái thi – chỉ chuyển tiếp HTTP/WebSocket tới đúng nút, nên có thể chạy nhiều bộ định tuyến song song
   (sau một bộ cân bằng tải TCP) để phục vụ rất nhiều phòng cùng lúc.

   Chạy trên MỘT máy nhiều nhân:   LOCAL_WORKERS=4 PORT=3000 ADMIN_PASSWORD=… SESSION_SECRET=… node router.js
   Nhiều máy (mỗi máy chạy server.js với NODE_INDEX/NODE_COUNT riêng):
        NODES=http://10.0.0.11:4000,http://10.0.0.12:4000,… PORT=3000 node router.js   (thứ tự NODES = NODE_INDEX 0,1,2…)
   Kho đề (thư viện) nằm ở nút 0. Tệp ảnh/âm thanh: dùng chung một thư mục (MEDIA_DIR) hoặc kho lưu trữ chung khi chạy nhiều máy. */
const http=require('node:http');const net=require('node:net');const path=require('node:path');const {spawn}=require('node:child_process');
const PORT=Number(process.env.PORT||3000),HOST=process.env.HOST||'0.0.0.0';
let NODES=String(process.env.NODES||'').split(',').map(x=>x.trim()).filter(Boolean).map(u=>{const x=new URL(u);return {host:x.hostname,port:Number(x.port||80)}});
const children=[];
if(!NODES.length){const n=Math.max(1,Number(process.env.LOCAL_WORKERS||require('node:os').availableParallelism?.()||2));const base=Number(process.env.WORKER_BASE_PORT||PORT+100);
 const dataFile=process.env.DATA_FILE||path.join(__dirname,'data','rooms.json');const mediaDir=process.env.MEDIA_DIR||path.join(path.dirname(dataFile),'media');
 for(let i=0;i<n;i++){const env={...process.env,PORT:String(base+i),HOST:'127.0.0.1',NODE_INDEX:String(i),NODE_COUNT:String(n),DATA_FILE:dataFile.replace(/(\.json)?$/,`.n${i}.json`),MEDIA_DIR:mediaDir,
   MAX_ROOMS:String(Math.ceil(Number(process.env.MAX_ROOMS||30*n)/n)),TRUST_PROXY:'1'};
  const start=()=>{const c=spawn(process.execPath,[path.join(__dirname,'server.js')],{env,stdio:['ignore','inherit','inherit']});children[i]=c;
   c.on('exit',code=>{if(stopping)return;console.error(`[router] nút ${i} dừng (mã ${code}) – khởi động lại sau 1 giây (dữ liệu khôi phục từ nhật ký)`);setTimeout(start,1000)})};start();
  NODES.push({host:'127.0.0.1',port:base+i})}}
const N=NODES.length;let rr=0,stopping=false;
const nodeOf=pin=>NODES[Number(pin)%N];const node0=NODES[0];
const pinFromUrl=u=>{const m=u.pathname.match(/^\/api\/rooms\/(\d{6})(\/|$)/);if(m)return m[1];const q=u.searchParams.get('pin');return /^\d{6}$/.test(q||'')?q:null};
function fwdHeaders(req,extra={}){const h={...req.headers,...extra};const ip=String(req.socket.remoteAddress||'');h['x-forwarded-for']=(req.headers['x-forwarded-for']?req.headers['x-forwarded-for']+', ':'')+ip;
 if(!h['x-forwarded-proto'])h['x-forwarded-proto']=req.socket.encrypted?'https':'http';return h}
function proxy(req,res,target,body){const h=fwdHeaders(req);if(body!=null){h['content-length']=Buffer.byteLength(body);delete h['transfer-encoding']}
 const p=http.request({host:target.host,port:target.port,method:req.method,path:req.url,headers:h},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res)});
 p.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:'Nút máy chủ đang khởi động lại – thử lại sau vài giây'}))});
 if(body!=null)p.end(body);else req.pipe(p)}
function call(target,method,p,headers,body){return new Promise((ok,bad)=>{const h={...headers};delete h['content-length'];delete h['transfer-encoding'];if(body!=null){h['content-type']='application/json';h['content-length']=Buffer.byteLength(body)}
 const r=http.request({host:target.host,port:target.port,method,path:p,headers:h},x=>{let d='';x.setEncoding('utf8');x.on('data',c=>d+=c);x.on('end',()=>{let j=null;try{j=JSON.parse(d)}catch{}ok({status:x.statusCode,json:j,text:d,headers:x.headers})})});r.on('error',bad);r.end(body)})}
const readBody=req=>new Promise((ok,bad)=>{let n=0;const ch=[];req.on('data',c=>{n+=c.length;if(n>8_000_000){bad(Error('too big'));req.destroy()}else ch.push(c)});req.on('end',()=>ok(Buffer.concat(ch).toString('utf8')));req.on('error',bad)});
/* ===== Tài khoản khách & kho đề khi chạy nhiều nút =====
   Sổ tài khoản khách nằm ở nút 0; bộ định tuyến chép sang các nút khác (mỗi 5 giây và ngay sau mỗi lần Admin sửa) để mọi nút kiểm được
   phiên của chủ khách, hạn dùng, khoá, số sĩ tử theo gói. Thông tin chuyển giữa các nút được KÝ bằng SESSION_SECRET (nút kiểm chữ ký). */
const crypto=require('node:crypto');const SECRET=process.env.SESSION_SECRET||'';
if(!SECRET&&N>1)console.warn('[router] THIẾU SESSION_SECRET – không đồng bộ được tài khoản khách / kho đề giữa các nút. Đặt SESSION_SECRET giống các nút.');
function signBlob(o){const d=Buffer.from(JSON.stringify({...o,exp:Date.now()+30000})).toString('base64url');return d+'.'+crypto.createHmac('sha256','udika-internal|'+SECRET).update(d).digest('base64url')}
// đọc phần dữ liệu của cookie phiên CHỈ để chọn nút (không tin nội dung – nút đích tự kiểm chữ ký phiên)
function sessOf(req){try{const m=String(req.headers.cookie||'').match(/(?:^|;\s*)udika_session=([^;]+)/);if(!m)return null;return JSON.parse(Buffer.from(decodeURIComponent(m[1]).split('.')[0],'base64url'))}catch{return null}}
async function syncTenants(){if(N<2||!SECRET)return;try{const g=await call(node0,'GET','/api/internal/tenants',{'x-udika-internal':signBlob({kind:'tenants_get'})});if(g.status!==200)return;
 const body=JSON.stringify({items:g.json.items||[]});const h={'x-udika-internal':signBlob({kind:'tenants_put',sha:crypto.createHash('sha256').update(body).digest('hex')})};
 await Promise.all(NODES.slice(1).map(n=>call(n,'POST','/api/internal/tenants',h,body).catch(()=>null)))}catch{}}
setInterval(syncTenants,5000).unref();setTimeout(syncTenants,1500).unref();
/* V15 #5: GIỚI HẠN KẾT NỐI CHUNG CẢ CỤM – CLUSTER_MAX_ONLINE=tổng số điện thoại tối đa (mọi nút cộng lại); CLUSTER_RESERVE=chỗ dành người vào lại
   (mặc định 5%). Cứ 2 giây hỏi /health từng nút, gửi cho mỗi nút (có chữ ký) số người đang kết nối ở CÁC NÚT KHÁC. Nút nào không trả lời
   → tính bằng số lần cuối biết (không coi là 0, tránh vượt trần khi nút chỉ chậm). */
const CMAX=Math.max(0,Math.floor(Number(process.env.CLUSTER_MAX_ONLINE)||0));
const CRES=CMAX?Math.max(0,Math.min(CMAX-1,process.env.CLUSTER_RESERVE!=null&&process.env.CLUSTER_RESERVE!==''?Math.floor(Number(process.env.CLUSTER_RESERVE)):Math.ceil(CMAX*0.05))):0;
const lastOnline=NODES.map(()=>0);let clusterAt=0;
async function syncCluster(){if(!CMAX||!SECRET)return;const h=await Promise.all(NODES.map((n,i)=>call(n,'GET','/health',{}).then(x=>{if(x.json&&Number.isFinite(x.json.online))lastOnline[i]=x.json.online}).catch(()=>null)));
 const total=lastOnline.reduce((a,b)=>a+b,0);await Promise.all(NODES.map((n,i)=>call(n,'POST','/api/internal/cluster',{'x-udika-internal':signBlob({kind:'cluster',limit:CMAX,reserve:CRES,others:total-lastOnline[i]})}).then(x=>{if(x.json&&Number.isFinite(x.json.online))lastOnline[i]=x.json.online}).catch(()=>null)));clusterAt=Date.now()}
if(CMAX){if(!SECRET)console.warn('[router] CLUSTER_MAX_ONLINE cần SESSION_SECRET giống các nút – chưa bật giới hạn chung.');setInterval(syncCluster,2000).unref();setTimeout(syncCluster,500).unref()}
async function allRooms(req){const all=await Promise.all(NODES.map(n=>call(n,'GET','/api/rooms',fwdHeaders(req)).catch(()=>({status:502,json:null}))));const bad=all.find(x=>x.status!==200);return bad?{bad}:{rooms:all.flatMap(x=>x.json.rooms||[])}}
// MC ở nút ≠ 0 dùng kho đề (nút 0): hỏi nút giữ phòng xác minh phiên MC, rồi chuyển danh tính đã ký sang nút 0
async function principalHeader(req){const s=sessOf(req);if(!s||s.role!=='mc'||!/^\d{6}$/.test(String(s.pin||''))||nodeOf(s.pin)===node0||!SECRET)return {};
 const g=await call(nodeOf(s.pin),'GET','/api/session',fwdHeaders(req)).catch(()=>null);const u=g&&g.json&&g.json.user;if(!u||u.role!=='mc'||!u.libKey)return null;
 return {'x-udika-principal':signBlob({kind:'principal',role:'mc',user:u.name,pin:u.pin,key:u.libKey})}}
function proxyH(req,res,target,body,extra){const h={...fwdHeaders(req),...extra};if(body!=null){h['content-length']=Buffer.byteLength(body);delete h['transfer-encoding']}
 const p=http.request({host:target.host,port:target.port,method:req.method,path:req.url,headers:h},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res)});
 p.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:'Nút máy chủ đang khởi động lại – thử lại sau vài giây'}))});if(body!=null)p.end(body);else req.pipe(p)}
const json=(res,st,o)=>{res.writeHead(st,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://x');const P=u.pathname;
 if(P==='/router/health'||P==='/health'){const all=await Promise.all(NODES.map(n=>call(n,'GET','/health',{}).catch(()=>({status:0,json:null}))));
  const ok=all.every(x=>x.status===200);return json(res,ok?200:503,{ok,nodes:all.map((x,i)=>({node:i,ok:x.status===200,rooms:x.json?.rooms??null,online:x.json?.online??null,persistence:x.json?.persistence?.mode||null,pid:children[i]?.pid||null})),rooms:all.reduce((s,x)=>s+(x.json?.rooms||0),0),online:all.reduce((s,x)=>s+(x.json?.online||0),0),clusterLimit:CMAX||null,clusterReserve:CMAX?CRES:null})}
 if(P==='/api/rooms'&&req.method==='GET'){const all=await Promise.all(NODES.map(n=>call(n,'GET',req.url,fwdHeaders(req))));const bad=all.find(x=>x.status!==200);if(bad)return json(res,bad.status,bad.json||{error:'Lỗi nút máy chủ'});
  return json(res,200,{...all[0].json,rooms:all.flatMap(x=>x.json.rooms||[])})}
 if(P==='/api/rooms'&&req.method==='POST'){const body=await readBody(req);const counts=await Promise.all(NODES.map(n=>call(n,'GET','/health',{}).then(x=>x.json?.rooms??1e9).catch(()=>1e9)));
  let best=0;for(let i=1;i<N;i++)if(counts[i]<counts[best])best=i;
  const s=sessOf(req);if(s&&s.role==='owner'&&SECRET&&N>1){const a=await allRooms(req);if(a.bad)return json(res,a.bad.status,a.bad.json||{error:'Lỗi nút máy chủ'});return proxyH(req,res,NODES[best],body,{'x-udika-tenant-rooms':signBlob({kind:'tenant_rooms',tenant:s.tenant,n:a.rooms.length})})}
  return proxy(req,res,NODES[best],body)}
 if(P.startsWith('/api/tenants')){if(req.method==='GET'&&P==='/api/tenants'){const g=await call(node0,'GET',req.url,fwdHeaders(req));if(g.status!==200||N<2)return json(res,g.status,g.json||{});
   const a=await allRooms(req);if(!a.bad)for(const t of g.json.items||[]){const mine=a.rooms.filter(r=>r.tenant===t.id);t.rooms=mine.length;t.players=mine.reduce((x,r)=>x+(r.count||0),0)}return json(res,200,g.json)}
  const body=await readBody(req);const g=await call(node0,req.method,req.url,fwdHeaders(req),body);if(g.status<300)await syncTenants();return json(res,g.status,g.json||{})}
 if(P==='/api/archive'&&req.method==='GET'){const all=await Promise.all(NODES.map(n=>call(n,'GET',req.url,fwdHeaders(req)).catch(()=>({status:502,json:null}))));const bad=all.find(x=>x.status!==200);if(bad)return json(res,bad.status,bad.json||{error:'Lỗi nút máy chủ'});
  return json(res,200,{items:all.flatMap(x=>x.json.items||[]).sort((a,b)=>b.deletedAt-a.deletedAt)})}
 {const am=P.match(/^\/api\/archive\/(\d{6})\//);if(am)return proxy(req,res,nodeOf(am[1]))}
 if(P==='/api/session'&&req.method==='GET'){const s=sessOf(req);if(s&&s.role==='mc'&&/^\d{6}$/.test(String(s.pin||'')))return proxy(req,res,nodeOf(s.pin));
  if(s&&s.role==='owner'&&N>1){const g=await call(node0,'GET',req.url,fwdHeaders(req));const t=g.json&&g.json.user&&g.json.user.tenant;if(t){const a=await allRooms(req);if(!a.rooms)return json(res,g.status,g.json);t.rooms=a.rooms.length;t.players=a.rooms.reduce((x,r)=>x+(r.count||0),0)}return json(res,g.status,g.json||{})}}
 if(P==='/api/login'&&req.method==='POST'){const body=await readBody(req);let b={};try{b=JSON.parse(body)}catch{}return proxy(req,res,/^\d{6}$/.test(String(b.pin||''))?nodeOf(b.pin):node0,body)}
 if(P==='/api/library'&&req.method==='POST'){const body=await readBody(req);let b={};try{b=JSON.parse(body)}catch{}
  const ph=await principalHeader(req);if(!ph)return json(res,403,{error:'Cần đăng nhập (phiên cũ đã hết hiệu lực – đăng nhập lại)'});
  if(/^\d{6}$/.test(String(b.pin||''))&&nodeOf(b.pin)!==node0){const g=await call(nodeOf(b.pin),'GET',`/api/rooms/${b.pin}/bank`,fwdHeaders(req));if(g.status!==200)return json(res,g.status,g.json||{});
   return proxyH(req,res,node0,JSON.stringify({name:b.name,bank:g.json.bank}),ph)}return proxyH(req,res,node0,body,ph)}
 const lm=P.match(/^\/api\/library\/([\w-]{6,40})\/load$/);
 if(lm&&req.method==='POST'){const body=await readBody(req);let b={};try{b=JSON.parse(body)}catch{}if(!/^\d{6}$/.test(String(b.pin||'')))return json(res,400,{error:'Thiếu mã phòng'});
  if(nodeOf(b.pin)===node0)return proxy(req,res,node0,body);
  const ph=await principalHeader(req);if(!ph)return json(res,403,{error:'Cần đăng nhập (phiên cũ đã hết hiệu lực – đăng nhập lại)'});
  const g=await call(node0,'GET','/api/library/'+lm[1],{...fwdHeaders(req),...ph});if(g.status!==200)return json(res,g.status,g.json||{});
  const r=await call(nodeOf(b.pin),'POST',`/api/rooms/${b.pin}/bank`,fwdHeaders(req),JSON.stringify({bank:g.json.bank,mode:b.mode==='append'?'append':'replace'}));return json(res,r.status,r.json||{})}
 /* bán gói, đơn hàng, thanh toán, chương trình liên hoàn, trọng tài: nằm ở nút 0; xong việc thì chép ngay sổ khách sang các nút */
 const evI=P.match(/^\/api\/events\/(e[\w-]{6,14})\/import$/);
 if(evI&&req.method==='POST'&&N>1){const body=await readBody(req);let b={};try{b=JSON.parse(body)}catch{}
  const g=await call(node0,'GET','/api/events/'+evI[1],fwdHeaders(req));if(g.status!==200)return json(res,g.status,g.json||{});const a=(g.json.activities||[]).find(x=>x.id===b.act&&x.kind==='quiz');
  if(!a||!/^\d{6}$/.test(String(a.pin||''))||nodeOf(a.pin)===node0)return proxy(req,res,node0,body);
  const tb=await call(nodeOf(a.pin),'GET',`/api/rooms/${a.pin}/teamboard`,fwdHeaders(req));if(tb.status!==200)return json(res,tb.status,tb.json||{});
  const nb=JSON.stringify({act:b.act,board:tb.json.board||[]});
  return proxyH(req,res,node0,nb,{'x-udika-teamboard':signBlob({kind:'teamboard',pin:a.pin,sha:crypto.createHash('sha256').update(JSON.stringify(tb.json.board||[])).digest('hex')})})}
 if(P.startsWith('/api/pay/')||P.startsWith('/api/plans')||P.startsWith('/api/orders')||P==='/api/signup'||P==='/api/khach/password'||P.startsWith('/api/events')||P.startsWith('/api/judge/')){
  if(P!=='/api/events'&&!P.startsWith('/api/events/'))res.on('finish',()=>{if(req.method!=='GET'||P.startsWith('/api/pay/vnpay/ipn'))syncTenants()});return proxy(req,res,node0)}
 if(P.startsWith('/api/library')){const ph=await principalHeader(req);if(!ph)return json(res,403,{error:'Cần đăng nhập (phiên cũ đã hết hiệu lực – đăng nhập lại)'});const body=req.method==='GET'||req.method==='HEAD'?null:await readBody(req);return proxyH(req,res,node0,body,ph)}
 if(P.startsWith('/api/practice')||P==='/api/session'||P==='/api/logout'||P==='/api/audit')return proxy(req,res,node0);
 const pin=pinFromUrl(u);if(pin)return proxy(req,res,nodeOf(pin));
 if(P.startsWith('/media/'))return proxy(req,res,node0); // thư mục media dùng chung
 return proxy(req,res,NODES[(rr++)%N]);
}catch(e){json(res,500,{error:'Lỗi bộ định tuyến'})}});
/* WebSocket: đọc mã phòng trong đường dẫn /ws?pin=… rồi nối thẳng luồng TCP tới nút giữ phòng */
server.on('upgrade',(req,sock,head)=>{const u=new URL(req.url,'http://x');const pin=u.searchParams.get('pin');const t=/^\d{6}$/.test(pin||'')?nodeOf(pin):node0;
 const up=net.connect(t.port,t.host,()=>{const h=fwdHeaders(req);let raw=`${req.method} ${req.url} HTTP/1.1\r\n`;for(const [k,v] of Object.entries(h))raw+=`${k}: ${Array.isArray(v)?v.join(', '):v}\r\n`;up.write(raw+'\r\n');if(head&&head.length)up.write(head);sock.pipe(up);up.pipe(sock)});
 up.setNoDelay(true);sock.setNoDelay(true);const kill=()=>{sock.destroy();up.destroy()};up.on('error',kill);sock.on('error',kill);up.on('close',()=>sock.destroy());sock.on('close',()=>up.destroy())});
server.keepAliveTimeout=65000;server.headersTimeout=66000;
server.listen(PORT,HOST,()=>console.log(`UDIKA router: cổng ${PORT} → ${N} nút (${NODES.map(n=>n.host+':'+n.port).join(', ')}). Phòng có mã % ${N} = i thuộc nút i.`));
const stop=()=>{stopping=true;for(const c of children)try{c.kill('SIGTERM')}catch{}setTimeout(()=>process.exit(0),1500)};process.on('SIGTERM',stop);process.on('SIGINT',stop);
