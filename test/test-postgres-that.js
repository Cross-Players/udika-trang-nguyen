'use strict';
// V15 #1: chạy server.js trên PostgreSQL 16 THẬT (initdb tạm, cổng 18970). Kiểm: tạo bảng, ghi nhật ký + ảnh chụp, tắt đột ngột (kill -9)
// rồi khởi động lại → phòng, sĩ tử, điểm, tài khoản khách còn nguyên; CSDL sập giữa chừng → /health báo 503, MC không được báo "đã lưu";
// CSDL sống lại → tự lưu tiếp. Máy kiểm thử không cài được gói npm "pg" (mạng chặn) nên dùng test/_pgshim (gọi psql thật – xem ghi chú trong tệp).
// Có gói pg thật (CI) thì đặt PG_REAL=1 để chạy bằng gói thật. Chạy: node test/test-postgres-that.js
const assert=require('node:assert/strict');const {spawn,spawnSync,execFileSync}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');const BIN=process.env.PG_BIN||'/usr/lib/postgresql/16/bin';const PGPORT=18970,PORT=18971,PASS='test-admin-password-strong';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const ok=s=>console.log('PASS',s);
if(!fs.existsSync(BIN+'/initdb')){console.log((process.env.UDIKA_STRICT==='1'?'FAIL ':'BỎ QUA: ')+'không có PostgreSQL ('+BIN+') – cài postgresql-16 hoặc đặt PG_BIN');process.exit(process.env.UDIKA_STRICT==='1'?1:0)}
const REAL=process.env.PG_REAL==='1'||(process.env.PG_REAL!=='0'&&(()=>{try{require.resolve('pg',{paths:[ROOT]});return true}catch{return false}})());
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-pg-'));const data=path.join(dir,'data');
const asPg=process.getuid&&process.getuid()===0?['runuser','-u','postgres','--']:[];
const run=(cmd,args)=>{const r=spawnSync(asPg[0]||cmd,asPg.length?[...asPg.slice(1),cmd,...args]:args,{encoding:'utf8'});if(r.status!==0)throw Error(cmd+' '+args.join(' ')+'\n'+r.stdout+r.stderr);return r.stdout};
if(asPg.length)execFileSync('chown',['postgres:postgres',dir]);
const pgStart=()=>run(BIN+'/pg_ctl',['-D',data,'-l',path.join(dir,'pg.log'),'-o',`-p ${PGPORT} -k ${dir} -c listen_addresses=127.0.0.1`,'-w','start']);
const pgStop=(mode='fast')=>run(BIN+'/pg_ctl',['-D',data,'-m',mode,'-w','stop']);
const URL_=`postgresql://udika@127.0.0.1:${PGPORT}/udika`;
const psql=q=>execFileSync('psql',['-X','-q','-A','-t','-d',URL_,'-c',q],{encoding:'utf8'}).trim();
function server(){const env={...process.env,PORT:String(PORT),ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATABASE_URL:URL_,REQUIRE_DATABASE:'1',DATA_FILE:path.join(dir,'unused.json')};
 if(!REAL)env.NODE_PATH=path.join(__dirname,'_pgshim','node_modules');
 const app=spawn(process.execPath,['server.js'],{cwd:ROOT,env});let out='';app.stdout.on('data',x=>out+=x);app.stderr.on('data',x=>out+=x);app.out=()=>out;return app}
const url='http://127.0.0.1:'+PORT;
async function waitUp(app){for(let i=0;i<150;i++){if(app.exitCode!=null)throw Error('server thoát: '+app.out());try{if((await fetch(url+'/health')).ok)return}catch{}await sleep(100)}throw Error('server không lên: '+app.out())}
async function req(method,p,body,cookie){const r=await fetch(url+p,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});let d=null;try{d=await r.json()}catch{}return {status:r.status,data:d,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(cookie){const ws=new WebSocket(`ws://127.0.0.1:${PORT}/ws`,cookie?{headers:{Cookie:cookie}}:undefined);let W=[];const C={last:null,log:[]};
 ws.onmessage=e=>{const m=JSON.parse(e.data);C.log.push(m);if(m.type==='state')C.last=m;W=W.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};C.ready=new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 C.raw=m=>ws.send(JSON.stringify(m));C.next=(p,l,ms=10000)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+l)),ms);W.push({p,r:m=>{clearTimeout(t);r(m)}})});C.close=()=>ws.close();return C}
let app=null;
(async()=>{try{
 run(BIN+'/initdb',['-D',data,'-U','udika','-A','trust','-E','UTF8','--locale=C.UTF-8']);pgStart();run(BIN+'/createdb',['-h','127.0.0.1','-p',String(PGPORT),'-U','udika','udika']);
 const ver=psql('SHOW server_version');ok('PostgreSQL '+ver+' thật đã khởi động (initdb tạm, cổng '+PGPORT+')');
 app=server();await waitUp(app);const h=await (await fetch(url+'/health')).json();assert.equal(h.persistence.mode,'postgresql');assert.equal(h.persistence.ready,true);
 assert.match(psql("SELECT string_agg(table_name,',' ORDER BY table_name) FROM information_schema.tables WHERE table_schema='public'"),/udika_journal.*udika_snapshot|udika_snapshot.*udika_journal/);
 ok('server.js tự tạo bảng udika_snapshot + udika_journal trên PostgreSQL thật, /health báo postgresql sẵn sàng');
 const A=(await req('POST','/api/login',{role:'admin',password:PASS})).cookie;const pin=(await req('POST','/api/rooms',{title:'Thử CSDL thật',mcUser:'mcpg',password:'password-test-0123'},A)).data.pin;
 const T=await req('POST','/api/tenants',{name:'Công ty CSDL',login:'khachpg',password:'password-khach-pg01',maxRooms:2,days:30},A);assert.equal(T.status,201,JSON.stringify(T.data));
 const c=client(A);await c.ready;let w=c.next(m=>m.type==='state','host');c.raw({type:'host_auth',pin});await w;
 w=c.next(m=>m.type==='bank_saved'||m.type==='error','bank');c.raw({type:'bank_set',bank:[{q:'Ai đỗ Trạng nguyên năm 1463?',a:['Lương Thế Vinh','Nguyễn Trãi'],c:0,t:30},{q:'Câu 2',a:['A','B'],c:1,t:30}]});
 const bs=await w;assert.equal(bs.type,'bank_saved',JSON.stringify(bs));ok('MC lưu bộ đề → chỉ báo "đã lưu" sau khi PostgreSQL ghi xong');
 w=c.next(m=>m.type==='state','opt');c.raw({type:'set_option',autoReveal:false});await w;
 const p=client();await p.ready;w=p.next(m=>m.type==='state'&&m.my,'join');p.raw({type:'join',pin,name:'Lê Thị Hoa'});const me=(await w).my;
 const wr=p.next(m=>m.type==='state'&&m.phase==='running','run');w=c.next(m=>m.type==='state'&&m.phase==='running','start');c.raw({type:'start'});await w;const s=await wr;
 w=p.next(m=>m.type==='answered'||m.type==='answer_rejected','ans');p.raw({type:'answer',eid:s.eid,qid:s.q.qid,sid:'pg1',choice:0});assert.equal((await w).type,'answered');
 w=c.next(m=>m.type==='state'&&m.phase==='reveal','rev');c.raw({type:'reveal'});const rv=await w;const score=rv.leaderboard[0].score;assert.ok(score>0);
 await sleep(400);const jn=+psql('SELECT count(*) FROM udika_journal')+ +psql('SELECT count(*) FROM udika_snapshot');assert.ok(jn>=1);
 // tắt đột ngột – không kịp lưu ảnh chụp
 app.kill('SIGKILL');await new Promise(r=>app.once('exit',r));c.close();p.close();
 app=server();await waitUp(app);const A2=(await req('POST','/api/login',{role:'admin',password:PASS})).cookie;const c2=client(A2);await c2.ready;w=c2.next(m=>m.type==='state','host2');c2.raw({type:'host_auth',pin});const st=await w;
 assert.equal(st.phase,'reveal');assert.equal(st.leaderboard[0].name,'Lê Thị Hoa');assert.equal(st.leaderboard[0].score,score);assert.equal(st.bank.length,2);
 const K=await req('POST','/api/login',{role:'owner',login:'khachpg',password:'password-khach-pg01'});assert.equal(K.status,200);
 ok(`kill -9 rồi khởi động lại: phòng ${pin}, sĩ tử, điểm ${score}, bộ đề, tài khoản khách đều khôi phục từ PostgreSQL`);
 const p2=client();await p2.ready;w=p2.next(m=>m.type==='state'&&m.my,'rejoin');p2.raw({type:'join',pin,playerId:me.id});assert.equal((await w).my.id,me.id);ok('sĩ tử vào lại đúng tài khoản sau khi máy chủ khởi động lại');
 // CSDL sập giữa chừng
 pgStop('immediate');w=c2.next(m=>m.type==='bank_saved'||m.type==='error'||m.type==='save_failed'||m.type==='persist_error','bank-down',15000);c2.raw({type:'bank_set',bank:[{q:'Câu khi CSDL sập',a:['A','B'],c:0,t:30}]});
 const r1=await w.catch(e=>({type:'timeout'}));assert.notEqual(r1.type,'bank_saved',JSON.stringify(r1));
 let bad=null;for(let i=0;i<40;i++){const r=await fetch(url+'/health');if(r.status===503){bad=await r.json();break}await sleep(250)}assert.ok(bad,'health phải 503');
 ok('PostgreSQL sập: MC KHÔNG được báo "đã lưu" ('+r1.type+'), /health trả 503 – '+(bad.persistence&&bad.persistence.error));
 pgStart();let good=false;for(let i=0;i<80;i++){if((await fetch(url+'/health')).status===200){good=true;break}await sleep(250)}assert.ok(good,'phải tự hồi phục');
 w=c2.next(m=>m.type==='bank_saved'||m.type==='error','bank-up');c2.raw({type:'bank_set',bank:[{q:'Câu sau khi CSDL sống lại',a:['A','B'],c:0,t:30}]});assert.equal((await w).type,'bank_saved');
 app.kill('SIGKILL');await new Promise(r=>app.once('exit',r));app=server();await waitUp(app);const A3=(await req('POST','/api/login',{role:'admin',password:PASS})).cookie;const c3=client(A3);await c3.ready;w=c3.next(m=>m.type==='state','host3');c3.raw({type:'host_auth',pin});
 assert.equal((await w).bank[0].q,'Câu sau khi CSDL sống lại');c3.close();c2.close();p2.close();
 ok('PostgreSQL sống lại → máy chủ tự lưu tiếp, /health về 200; kill -9 lần nữa vẫn giữ bộ đề mới nhất');
 console.log('\nKẾT QUẢ: PostgreSQL thật – ĐẠT'+(REAL?' (gói pg thật)':' (qua psql – tầng giao thức gói pg kiểm ở CI)'));
}catch(e){console.error('FAIL',e);if(app)console.error(app.out().slice(-1500));process.exitCode=1}
finally{try{app&&app.kill('SIGKILL')}catch{}try{pgStop('immediate')}catch{}fs.rmSync(dir,{recursive:true,force:true})}})();
