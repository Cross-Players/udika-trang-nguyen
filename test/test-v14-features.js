'use strict';
// Kiểm thử V14: dạng câu hỏi mới, thưởng chuỗi, chơi theo đội, loại/chặn/khoá, lọc tên, tự làm bài, kho đề, ảnh/video (Node >= 22)
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const port=18977,dir=fs.mkdtempSync(path.join(os.tmpdir(),'udika-v14-'));const PASS='test-admin-password-strong';
const env={...process.env,PORT:String(port),ADMIN_PASSWORD:PASS,SESSION_SECRET:'test-session-secret-must-be-long-enough',DATA_FILE:path.join(dir,'rooms.json')};
let app=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env});
const url='http://127.0.0.1:'+port;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(){for(let i=0;i<80;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await sleep(100)}throw Error('no start')}
async function req(method,p,body,cookie){const r=await fetch(url+p,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await r.json()}catch{}return {status:r.status,data,cookie:(r.headers.get('set-cookie')||'').split(';')[0]}}
function client(cookie){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,cookie?{headers:{Cookie:cookie}}:undefined);let waiters=[],log=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state'){if(m.eid)ws.__eid=m.eid;const q=(m.my&&m.my.self&&m.my.self.q)||m.q;if(q&&q.qid)ws.__qid=q.qid};log.push(m);waiters=waiters.filter(w=>{if(w.p(m)){w.r(m);return false}return true})};
 return {ready:new Promise(r=>ws.onopen=r),send:m=>{if(m.type==='answer'||m.type==='self_skip'){const go=()=>ws.send(JSON.stringify({eid:ws.__eid,sid:'s'+Math.random().toString(36).slice(2),...m,qid:m.qid===undefined?ws.__qid:m.qid}));if(m.qid===undefined||!ws.__eid)setTimeout(go,60);else go();return}ws.send(JSON.stringify(m))},log,next:(p,l)=>new Promise((r,j)=>{const t=setTimeout(()=>j(Error('Timeout '+l)),5000);waiters.push({p,r:m=>{clearTimeout(t);r(m)}})}),close:()=>ws.close()}}
const ok=s=>console.log('PASS',s);
(async()=>{try{await wait();
 const A=await req('POST','/api/login',{role:'admin',password:PASS});const pin=(await req('POST','/api/rooms',{title:'Thử V14',mcUser:'mcv14',password:'password-test-0123'},A.cookie)).data.pin;
 const M=await req('POST','/api/login',{role:'mc',pin,user:'mcv14',password:'password-test-0123'});
 const c=client(M.cookie);await c.ready;let w=c.next(m=>m.type==='state','s');c.send({type:'host_auth',pin});let s=await w;
 const cmd=async(m,pred=()=>true,l)=>{const w=c.next(x=>(x.type==='state'&&pred(x))||x.type==='error',l||m.type);c.send(m);const r=await w;if(r.type==='error')throw Error(m.type+': '+r.message);return r};
 const cmdErr=async m=>{const w=c.next(x=>x.type==='error','err '+m.type);c.send(m);return (await w).message};
 // ---- bộ đề nhiều dạng ----
 const bank=[
  {stage:0,kind:'mc',q:'Trắc nghiệm?',a:['A','B','C','D'],c:2,t:20,media:{kind:'youtube',src:'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5',start:5}},
  {stage:0,kind:'type',q:'Thủ đô Việt Nam?',acc:['Hà Nội','Ha Noi'],t:20},
  {stage:0,kind:'order',q:'Xếp theo thứ tự khoa thi',a:['Thi Hương','Thi Hội','Thi Đình'],t:20},
  {stage:0,kind:'poll',q:'Bạn thích chặng nào?',a:['Hương','Hội','Đình'],t:15},
  {stage:0,kind:'slider',q:'Năm có khoa thi đầu tiên?',min:1000,max:1100,step:1,c:1075,tol:5,unit:'',t:20},
  {stage:0,kind:'cloud',q:'Một từ về Trạng nguyên',t:15},
  {stage:3,kind:'mc',q:'Đúng/Sai?',a:['Đúng','Sai'],c:0,t:15}];
 assert.match(await cmdErr({type:'bank_set',bank:[{kind:'slider',q:'x',min:5,max:1,c:2,t:10}]}),/lớn nhất phải lớn hơn/);
 assert.match(await cmdErr({type:'bank_set',bank:[{kind:'order',q:'x',a:['1','2'],t:10}]}),/3–8 mục/);
 assert.match(await cmdErr({type:'bank_set',bank:[{kind:'type',q:'x',acc:[],t:10}]}),/ít nhất 1 đáp án/);
 ok('chặn câu hỏi sai cấu hình cho từng dạng (thanh trượt, sắp xếp, gõ đáp án)');
 s=await cmd({type:'bank_set',bank},x=>x.bank.length===7);
 assert.deepEqual(s.bank.map(q=>q.kind),['mc','type','order','poll','slider','cloud','mc']);assert.deepEqual(s.bank[0].media,{kind:'youtube',src:'dQw4w9WgXcQ',where:'led',start:5,gate:true});ok('nhận đủ 6 dạng câu hỏi + video YouTube');
 // ---- lọc tên, trùng tên, chặn, khoá ----
 const join=async(name,extra={})=>{const p=client();await p.ready;const w=p.next(m=>m.type==='joined'||m.type==='error','join '+name);p.send({type:'join',pin,name,...extra});const r=await w;p.joined=r;return p};
 for(const bad of ['Địt mẹ','dm may','f*ck you','Đ.M','con cặc','DCMM 123','shiiit']){const p=await join(bad);assert.equal(p.joined.type,'error',bad);assert.match(p.joined.message,/chưa phù hợp/);p.close()}
 for(const good of ['Nguyễn Các','Lê Văn Lớn','Đinh Thị Mến','Hoàng Đức']){const p=await join(good);assert.equal(p.joined.type,'joined',good);p.close()}
 ok('lọc tên phản cảm (có dấu, không dấu, viết lách) mà không chặn nhầm tên thật (Các, Lớn, Mến, Đức)');
 const dup=await join('nguyen cac');assert.match(dup.joined.message,/đã có người dùng/);dup.close();ok('chặn trùng tên (không phân biệt hoa thường / dấu)');
 // đội
 s=await cmd({type:'teams_set',names:['Đội Hồng','Đội Lam']},x=>x.teams.length===2);
 const P1=await join('Sĩ tử Một',{team:'d1'}),P2=await join('Sĩ tử Hai',{team:'d1'}),P3=await join('Sĩ tử Ba',{team:'d2'});
 // các người thử tên ở trên được tự xếp đội
 s=await cmd({type:'lock',on:true},x=>x.locked===true);const L=await join('Người đến muộn');assert.match(L.joined.message,/khoá phòng/);L.close();ok('khoá phòng: không nhận người mới');
 s=await cmd({type:'lock',on:false},x=>x.locked===false);
 const victim=await join('Kẻ phá rối');s=await c.next(x=>x.type==='state'&&x.players.some(p=>p.name==='Kẻ phá rối'),'vic');
 const vid=s.players.find(p=>p.name==='Kẻ phá rối').id;const kw=victim.next(m=>m.type==='kicked','kicked');c.send({type:'kick',id:vid,ban:true});assert.match((await kw).message,/rời phòng/);
 s=await c.next(x=>x.type==='state'&&!x.players.some(p=>p.name==='Kẻ phá rối'),'gone');const again=await join('kẻ phá rối');assert.match(again.joined.message,/bị MC chặn/);again.close();
 ok('loại sĩ tử khỏi phòng + chặn tên vào lại');
 const ans=async(p,m)=>{const w=p.next(x=>x.type==='answered'||x.type==='error'||x.type==='answer_rejected','ans');p.send({type:'answer',...m});const r=await w;if(r.type!=='answered')throw Error(r.message);return r.answer};
 const res=async p=>{await sleep(250);const st=[...p.log].reverse().find(m=>m.type==='state'&&m.my&&m.phase!=='running');return st.my.answer};
 const run=async()=>{s=await cmd({type:'start'},x=>x.phase==='running'||x.phase==='media');if(s.phase==='media'){assert.equal(s.q.waitMedia,true);s=await cmd({type:'open'},x=>x.phase==='running')}return s};
 const reveal=async()=>{s=await cmd({type:'reveal'},x=>x.phase!=='running');return s};
 const next=async()=>{s=await cmd({type:'next'},x=>x.phase==='ready');return s};
 // câu 1 trắc nghiệm
 await run();assert.equal(s.q.answer,null);assert.equal(s.q.media.kind,'youtube');let a1=await ans(P1,{choice:2}),a2=await ans(P2,{choice:2}),a3=await ans(P3,{choice:0});
 assert.ok(a1.saved&&a1.correct===undefined&&a1.points===undefined,'đang chạy: giữ kín đúng/sai và điểm');ok('khi câu còn chạy, điện thoại chỉ nhận "đã lưu", không biết đúng/sai, điểm, chuỗi');await reveal();a1=await res(P1);a3=await res(P3);assert.ok(a1.correct&&a1.bonus===0&&a1.streak===1);assert.ok(!a3.correct);assert.deepEqual(s.q.stats.counts,[1,0,2,0]);await next();
 // câu 2 gõ đáp án (không dấu vẫn đúng)
 await run();assert.equal(s.q.kind,'type');assert.equal(s.q.answer,null);assert.equal(s.q.a.length,0);
 a1=await ans(P1,{text:'  ha noi '});a2=await ans(P2,{text:'Huế'});a3=await ans(P3,{text:'HÀ NỘI!'});
 await reveal();a1=await res(P1);a2=await res(P2);a3=await res(P3);assert.ok(a1.correct&&a1.streak===2&&a1.bonus===100,'chuỗi 2 → +100');assert.ok(!a2.correct&&a2.streak===0);assert.ok(a3.correct);assert.deepEqual(s.q.answer,['Hà Nội','Ha Noi']);assert.ok(s.q.stats.words.length>=2);ok('câu gõ đáp án: chấp nhận không dấu / hoa thường / dấu câu; thưởng chuỗi +100 ở câu đúng thứ 2');await next();
 // câu 3 sắp xếp: thứ tự hiển thị bị xáo, gửi theo chỉ số hiển thị
 await run();assert.equal(s.q.kind,'order');const shown=s.q.a;assert.notDeepEqual(shown,['Thi Hương','Thi Hội','Thi Đình']);
 const right=['Thi Hương','Thi Hội','Thi Đình'].map(x=>shown.indexOf(x));a1=await ans(P1,{order:right});a2=await ans(P2,{order:[0,1,2].every((x,i)=>right[i]===x)?[2,1,0]:[0,1,2]});
 await assert.rejects(ans(P3,{order:[0,0,1]}),/Thứ tự không hợp lệ/);a3=await ans(P3,{order:right});
 await reveal();a1=await res(P1);a2=await res(P2);assert.ok(a1.correct&&a1.streak===3&&a1.bonus===200);assert.ok(!a2.correct);assert.deepEqual(s.q.answer,['Thi Hương','Thi Hội','Thi Đình']);ok('câu sắp xếp: xáo thứ tự hiển thị, chấm đúng, chặn thứ tự sai cấu trúc; chuỗi 3 → +200');await next();
 // câu 4 thăm dò: không tính điểm, không cắt chuỗi, thống kê trực tiếp
 await run();const before=s.leaderboard;a1=await ans(P1,{choice:1});a3=await ans(P3,{choice:1});
 {const pr=await c.next(x=>x.type==='presence'&&x.stats&&x.stats.n===2,'pollstats');assert.deepEqual(pr.stats.counts,[0,2,0]);assert.equal(pr.answered,2)}
 await reveal();await next();ok('thăm dò ý kiến: 0 điểm, thống kê trực tiếp trên LED trong lúc trả lời');
 // câu 5 thanh trượt: trong sai số được điểm theo độ gần, ngoài sai số 0 (P2 không trả lời)
 await run();assert.equal(s.q.min,1000);a1=await ans(P1,{value:1075});a3=await ans(P3,{value:1079});
 await assert.rejects(ans(P2,{value:5000}),/ngoài khoảng/);await reveal();assert.deepEqual(s.q.answer,{c:1075,tol:5});a1=await res(P1);a3=await res(P3);
 assert.ok(a1.correct&&a1.streak===4,'chuỗi P1 vẫn giữ qua câu thăm dò');assert.ok(a3.correct&&a3.points<a1.points);assert.equal(s.q.stats.n,2);ok('thanh trượt: đúng tuyệt đối điểm cao hơn gần đúng (±5); chuỗi giữ qua câu không tính điểm');
 await next();
 // câu 6 đám mây từ
 await run();await ans(P1,{text:'Vinh quy'});await ans(P2,{text:'vinh quy'});await ans(P3,{text:'đụ má'});
 {const pr=await c.next(x=>x.type==='presence'&&x.stats&&x.stats.n===3,'cloud');assert.deepEqual(pr.stats.words.map(w=>[w.w,w.n]),[['Vinh quy',2]])}ok('đám mây từ: gộp từ trùng, ẩn từ phản cảm');
 await reveal();
 // câu 7 – P2 trước đó không trả lời câu thanh trượt → chuỗi = 0
 const stP2=(await cmd({type:'set_option',streak:true})).players.find(p=>p.name==='Sĩ tử Hai');assert.equal(stP2.streak,0);ok('không trả lời câu tính điểm → mất chuỗi');
 // bảng đội
 assert.equal(s.teamBoard.length,2);const red=s.teamBoard.find(t=>t.name==='Đội Hồng');assert.ok(red.members>=2&&red.score===Math.round(red.total/red.members));ok('bảng xếp hạng đội tính theo điểm trung bình thành viên');
 // báo cáo
 const rep=await fetch(`${url}/api/rooms/${pin}/report.csv`,{headers:{Cookie:M.cookie}});const csv=(await rep.text());assert.ok(csv.includes('Gõ câu trả lời')&&csv.includes('Đội')&&csv.includes('BẢNG XẾP HẠNG ĐỘI')&&csv.includes('Thưởng chuỗi'));assert.ok(csv.includes('Hương: 0 (0%) | Hội: 2 (100%) | Đình: 0 (0%)'));ok('báo cáo Excel có dạng câu, đội, thưởng chuỗi, kết quả thăm dò');
 // ---- kho đề ----
 let r=await req('POST','/api/library',{name:'Bộ đề V14',pin},M.cookie);assert.equal(r.status,200);const libId=r.data.id;
 r=await req('GET','/api/library',null,M.cookie);assert.equal(r.data.items[0].name,'Bộ đề V14');assert.equal(r.data.items[0].count,7);
 const pin2=(await req('POST','/api/rooms',{title:'Phòng 2',mcUser:'mc2',password:'password-test-0123'},A.cookie)).data.pin;const M2=await req('POST','/api/login',{role:'mc',pin:pin2,user:'mc2',password:'password-test-0123'});
 r=await req('GET','/api/library',null,M2.cookie);assert.equal(r.data.items.length,0,'MC khác không thấy bộ đề riêng');
 r=await req('PATCH','/api/library/'+libId,{shared:true},M.cookie);assert.equal(r.status,403);r=await req('PATCH','/api/library/'+libId,{shared:true},A.cookie);assert.equal(r.status,200);
 r=await req('GET','/api/library',null,M2.cookie);assert.equal(r.data.items.length,1);r=await req('POST',`/api/library/${libId}/load`,{pin:pin2},M2.cookie);assert.equal(r.status,200);assert.equal(r.data.count,7);
 r=await req('DELETE','/api/library/'+libId,null,M2.cookie);assert.equal(r.status,403);ok('kho đề: lưu, chỉ chủ sở hữu thấy, Admin chia sẻ, MC khác nạp vào phòng, không xoá được của người khác');
 // ---- ảnh / video tải lên ----
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
 r=await req('POST',`/api/rooms/${pin}/media`,{name:'a.png',data:png.toString('base64')},M.cookie);assert.equal(r.status,200);assert.equal(r.data.kind,'image');
 const img=await fetch(url+r.data.src);assert.equal(img.status,200);assert.equal(img.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await img.arrayBuffer()),png);
 r=await req('POST',`/api/rooms/${pin}/media`,{name:'x.exe',data:Buffer.from('MZ this is not media').toString('base64')},M.cookie);assert.equal(r.status,400);
 r=await req('POST',`/api/rooms/${pin}/media`,{name:'a.png',data:png.toString('base64')},M2.cookie);assert.equal(r.status,403);
 assert.equal((await fetch(url+'/media/../server.js')).status,404);ok('tải ảnh lên (kiểm tra đúng định dạng thật), phát lại ảnh, chặn tệp lạ / sai quyền / đường dẫn vượt thư mục');
 // ---- tự làm bài ----
 assert.match(await cmdErr({type:'self_open'}),/Tự làm bài/);
 s=await cmd({type:'reset'},x=>x.phase==='idle');s=await cmd({type:'set_mode',mode:'self'},x=>x.mode==='self');assert.match(await cmdErr({type:'start'}),/tự làm bài/);
 s=await cmd({type:'set_option',selfHide:false},x=>x.selfHide===false); // bộ này kiểm tra chế độ HIỆN đáp án ngay (luyện tập); chế độ giữ kín mặc định được kiểm ở test-audit-v15.js
 assert.match(await cmdErr({type:'self_open',deadline:Date.now()+1000}),/ít nhất 1 phút/);
 s=await cmd({type:'self_open',deadline:Date.now()+3600e3},x=>x.phase==='self');
 const H=await join('Học sinh tự làm');await sleep(200);let ps=H.log.find(m=>m.type==='state'&&m.my);assert.equal(ps.my.self.cur,0);assert.equal(ps.my.self.q,null);
 const step=async m=>{const w=H.next(x=>x.type==='state'&&x.my,'self state');H.send(m);return (await w).my.self};
 let sv=await step({type:'self_start'});assert.equal(sv.q.index,1);assert.equal(sv.q.answer,null);
 let w2=H.next(x=>x.type==='answered','sa');H.send({type:'answer',choice:2});let ra=await w2;assert.ok(ra.answer.correct);assert.equal(ra.reveal.answer,2);
 sv=(await H.next(x=>x.type==='state'&&x.my,'after')).my.self;assert.equal(sv.cur,1);assert.equal(sv.last.correct,true);
 sv=await step({type:'self_start'});w2=H.next(x=>x.type==='answered','sb');H.send({type:'self_skip'});ra=await w2;assert.equal(ra.answer.skipped,true);
 for(let k=2;k<7;k++){await step({type:'self_start'});const q=s.bank[k];const m=q.kind==='order'?null:q.kind==='slider'?{value:1075}:q.kind==='mc'||q.kind==='poll'?{choice:0}:{text:'Vinh quy'};
  if(q.kind==='order'){const st=(await step({type:'self_start'}));m&&0;const order=['Thi Hương','Thi Hội','Thi Đình'].map(x=>st.q.a.indexOf(x));w2=H.next(x=>x.type==='answered','o');H.send({type:'answer',order});assert.ok((await w2).answer.correct)}
  else{w2=H.next(x=>x.type==='answered','x'+k);H.send({type:'answer',...m});await w2}}
 {const isDone=x=>x.type==='state'&&x.my&&x.my.self.done; // trạng thái "xong" có thể tới TRƯỚC gói xác nhận câu cuối → xem cả các tin đã nhận (tránh chờ hụt)
  const got=H.log.find(isDone);sv=(got||await H.next(isDone,'done')).my.self}assert.equal(sv.cur,7);
 await c.next(x=>x.type==='presence'&&x.done===1,'host self');ok('tự làm bài: tự mở từng câu, chấm ngay, xem đáp án đúng, bỏ qua câu, hoàn thành 7/7, MC theo dõi tiến độ');
 // hạn nộp: đổi hạn sát giờ rồi đóng bài
 s=await cmd({type:'self_close'},x=>x.phase==='finished');assert.equal(s.honors[0].name!==undefined,true);ok('MC đóng bài tự làm → xướng danh Tam khôi');
 // lưu và khôi phục sau khi khởi động lại máy chủ
 await sleep(700);app.kill();await sleep(400);app=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env});await wait();
 r=await req('GET','/api/library',null,A.cookie);assert.equal(r.data.items.length,1);const c2=client(M.cookie);await c2.ready;w=c2.next(m=>m.type==='state','re');c2.send({type:'host_auth',pin});s=await w;
 assert.equal(s.mode,'self');assert.equal(s.teams.length,2);assert.ok(s.bannedNames.length===1);ok('khởi động lại máy chủ: giữ kho đề, chế độ, đội, danh sách chặn');
 c2.close();c.close();[P1,P2,P3,H].forEach(p=>p.close());
}catch(e){console.error('FAIL',e);process.exitCode=1}finally{app.kill()}})();
