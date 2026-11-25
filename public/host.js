'use strict';
var OPT=['A','B','C','D','E','F','G','H'];var fillHint=new Set();var editAi=['','','','','','','',''],editCs=new Set(),draft=null,importPending=null,saveState='',imgSlot=-1;
let roomPin=(params.get('pin')||'').replace(/\D/g,''),room=null,bank=[],editIndex=0,liveTimeDirty=false,liveIdx=-1;
qs('#recoverPin').value=roomPin;
function error(s){qs('#errors').style.display='block';qs('#errors').textContent=s;setTimeout(()=>qs('#errors').style.display='none',6000)}
function authenticate(){if(roomPin)emit({type:'host_auth',pin:roomPin})}
function enableRoom(){qs('#beforeRoom').classList.add('hidden');qs('#roomPanel').classList.remove('hidden');qs('#controlPanel').style.display='block';qs('#bankPanel').style.display='block';qs('#pin').textContent=roomPin;const join=pubOrigin()+'/join?pin='+roomPin;qs('#joinLink').href=join;qs('#ledLink').href=location.origin+'/led?pin='+roomPin;qs('#copy').onclick=()=>navigator.clipboard?.writeText(join).then(()=>alert('Đã sao chép đường link tham gia')).catch(()=>prompt('Sao chép link:',join));if(qs('#qrBox').dataset.url!==join){qs('#qrBox').dataset.url=join;qs('#qrBox').innerHTML=`<div class="qr-wrap">${QR.svg(join,{size:180,label:'Mã QR tham gia phòng '+roomPin})}</div>`}qs('#roomSettings').style.display='block';qs('#playersPanel').style.display='block';qs('#qrNote').textContent='Quét QR hoặc mở '+join}
qs('#recover').onclick=async()=>{try{const pin=qs('#recoverPin').value.trim(),user=qs('#mcLoginName').value.trim(),password=qs('#mcLoginPass').value;if(!/^\d{6}$/.test(pin))return error('Nhập mã phòng 6 chữ số');let response=await fetch('/api/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'mc',pin,user,password})}),data=await response.json();if(!response.ok)throw Error(data.error||'Đăng nhập thất bại');qs('#mcLoginPass').value='';roomPin=pin;if(wsPin!==pin)useRoomPin(pin);else if(socket?.readyState===1)socket.close();else connect();}catch(e){error(e.message)}};
qs('#start').onclick=()=>{const t=Number(qs('#liveTime').value);if(!Number.isInteger(t)||t<5||t>300)return error('Thời gian cần từ 5 đến 300 giây');emit({type:'start',t})};
qs('#timeChips').innerHTML=[10,15,20,30,45,60,90].map(x=>`<button class="btn chip" data-t="${x}" type="button">${x}s</button>`).join('');
for(const b of document.querySelectorAll('#timeChips [data-t]'))b.onclick=()=>{qs('#liveTime').value=b.dataset.t;liveTimeDirty=true};
qs('#liveTime').oninput=()=>{liveTimeDirty=true};
qs('#timeApply').onclick=()=>{const t=Number(qs('#liveTime').value);if(!Number.isInteger(t)||t<5||t>300)return error('Thời gian cần từ 5 đến 300 giây');liveTimeDirty=false;emit({type:'set_time',t})};
qs('#timeAll').onclick=()=>{const t=Number(qs('#liveTime').value);if(!Number.isInteger(t)||t<5||t>300)return error('Thời gian cần từ 5 đến 300 giây');if(!confirm(`Đặt ${t} giây cho tất cả các câu hỏi? (Không mất điểm sĩ tử)`))return;liveTimeDirty=false;emit({type:'set_time',t,all:true})};
for(const b of document.querySelectorAll('#extendRow [data-add]'))b.onclick=()=>emit({type:'extend',add:Number(b.dataset.add)});qs('#reveal').onclick=()=>emit({type:'reveal'});qs('#next').onclick=()=>emit({type:'next'});qs('#openNow').onclick=()=>emit({type:'open'});qs('#reset').onclick=()=>{if(confirm('Đặt lại điểm của tất cả sĩ tử trong phòng?'))emit({type:'reset'})};
onOpen=()=>authenticate();onClose=()=>{qs('#phase').textContent='Mất kết nối, đang kết nối lại...'};
onEvent=msg=>{
 if(msg.type==='error'){error(msg.message);if(importPending){setImportStatus('⚠ Máy chủ từ chối: '+msg.message+' – bản xem trước vẫn được giữ để bạn sửa.','err');importPending=null}if(draft&&draft.state==='saving'){draft.state='draft';draft.err=msg.message;renderDraft()}if(saveState==='saving'){saveState='error';renderSaveState(msg.message)}return}
 if(msg.type==='bank_saved'){if(importPending){importPending=null;importList=[];qs('#importResult').innerHTML='';error(`✔ Đã thay bộ đề: ${msg.n} câu (phiên bản ${msg.ver})`)}if(draft&&msg.draftId===draft.id){draft=null;renderDraft();error(`✔ Đã áp dụng bản nháp – bộ đề phiên bản ${msg.ver}`)}return}
 if(msg.type==='media_alert'){error('⚠ '+(msg.led?msg.led+': ':'')+msg.message);return}
 if(msg.type==='devices'){renderDevices(msg.summary);return}
 if(msg.type==='accept_ok'){error(msg.n?`✔ Đã ${msg.on?'chấp nhận':'bỏ chấp nhận'} cho ${msg.n} sĩ tử – bảng điểm đã cập nhật`:'Không có bài nào cần đổi');return}
 if(msg.type==='leds'){if(room)room.leds=msg.leds;renderLeds();return}
 if(msg.type==='vq_ok'){vqLog(`📤 Lệnh "${VQ_NAME[msg.cmd]||msg.cmd}" đã gửi tới ${msg.sent} màn LED${msg.sent?'':' – ⚠ KHÔNG có màn LED nào đang kết nối!'}`);return}
 if(msg.type==='led_ack'){vqLog(`${msg.ok?'✅':'⚠️'} ${escapeHtml(msg.led)}: ${escapeHtml(VQ_NAME[msg.cmd]||msg.cmd)} – ${escapeHtml(msg.note||(msg.ok?'đã thực hiện':'không thực hiện được'))}`);return}
 if(msg.type==='host_ok'){roomPin=msg.pin;enableRoom();return}
 if(msg.type==='q_saved'){qdClear(savedFrom||editMode);saveState='saved';renderSaveState();if(importPending==='append'){importPending=null;importList=[];qs('#importResult').innerHTML=''}setTimeout(()=>{if(msg.added){error(`✔ Đã thêm ${msg.added} câu vào bộ đề – điểm sĩ tử giữ nguyên.`);renderEditor()}else{if(bank[msg.i]&&(!savedFrom||editMode===savedFrom))openEdit(msg.i);else renderEditor();error('✔ Đã lưu bộ câu hỏi – điểm sĩ tử giữ nguyên.')}savedFrom=null},120);return}
 if(msg.type==='presence'){if(!room)return;Object.assign(room,{count:msg.count,online:msg.online,answeredCount:msg.answered,selfDone:msg.done});if(msg.stats&&room.q)room.q.stats=msg.stats;if(room.self)room.self.done=msg.done;renderCounts();return}
 if(msg.type==='pending_list'){if(!room)return;room.pending=msg.items;room.pendingCount=msg.count;renderEntry(room);return}
 if(msg.type==='roster'){if(!rosterDirty)qs('#rosterText').value=(msg.rows||[]).map(x=>x.code?`${x.code}, ${x.name}`:x.name).join('\n');rosterLoaded=true;return}
 if(msg.type==='roster_ok'){error(`✔ Đã lưu danh sách dự kiến: ${msg.count} người`);return}
 if(msg.type==='pending_ok'){if(msg.n)error(`${msg.allow?'✔ Đã duyệt':'✖ Đã từ chối'} ${msg.n} người`);return}
 if(msg.type==='state'){room=msg;bank=msg.bank||bank;if(!roomPin)roomPin=msg.pin;enableRoom();render();if(msg.devices)renderDevices(msg.devices);renderReview(msg.review)}
};
function render(){const s=room;if(!s)return;qs('#phase').textContent='Trạng thái: '+({media:'ĐANG PHÁT CLIP – CHƯA NHẬN BÀI',self:'BÀI TỰ LÀM ĐANG MỞ',idle:'CHƯA KHAI TRƯỜNG',running:'ĐANG NHẬN BÀI',reveal:'CÔNG BỐ BẢNG VÀNG',ready:'CHỜ MỞ CÂU TIẾP',intermission:'CHÚC MỪNG VƯỢT CHẶNG THI',finished:'VINH QUY BÁI TỔ'})[s.phase]+(s.rehearsal?' · 🎬 TỔNG DUYỆT':'');renderCounts();const q=s.q;qs('#stage').textContent=q?stageNames[q.stage]:stageNames[bank[s.idx]?.stage||0];qs('#question').textContent=s.phase==='intermission'?'🎊 ĐÃ HIỆN MÀN CHÚC MỪNG TRÊN LED – MC CHỜ TRƯỚC KHI CHUYỂN CHẶNG':s.phase==='finished'?'👑 ĐÃ HIỆN MÀN XƯỚNG DANH TAM KHÔI TRÊN LED':q?q.q:bank[s.idx]?.q||'Đang chuẩn bị kỳ thi';qs('#clock').textContent=s.phase==='running'?timeLeft(q):bank[s.idx]?.t||'--';if(s.answeredCount==null)s.answeredCount=(s.players||[]).filter(x=>x.answered).length;qs('#qInfo').textContent=s.mode==='self'?`📝 Chế độ tự làm bài · ${s.phase==='self'?'đang mở':'chưa mở'} · đã hoàn thành ${s.self?.done||0}/${s.count} sĩ tử`:`Câu ${s.idx+1}/${bank.length} · ${KIND_NAME[bank[s.idx]?.kind||'mc']} · Thời gian: ${bank[s.idx]?.t||0} giây · Đã nộp: ${s.answeredCount}/${s.online??s.count} đang trực tuyến`+liveStats(s);qs('#leaders').innerHTML=renderRanks(s.leaderboard,10);qs('#top20').innerHTML=(['reveal','intermission','finished'].includes(s.phase))?'<h3>🏅 Bảng vàng sau câu này</h3>'+renderRanks(s.leaderboard,20):'';qs('#start').disabled=s.mode==='self'||!['idle','ready','intermission'].includes(s.phase);
if(liveIdx!==s.idx){liveTimeDirty=false;liveIdx=s.idx}
if(!liveTimeDirty&&document.activeElement!==qs('#liveTime'))qs('#liveTime').value=bank[s.idx]?.t||20;
renderSettings(s);renderPlayers(s);renderEntry(s);renderFlow(s);{const w=qs('#leakWarn');if(w){w.classList.toggle('hidden',!s.publicOverlap);if(s.publicOverlap)w.textContent=`⚠ CHỐNG LỘ ĐỀ: ${s.publicOverlap} câu trong bộ đề này trùng với bộ đề đang CÔNG KHAI ở chế độ chơi thử (ai cũng xem được đáp án). Đừng dùng cho thi có giải – hãy thay câu hoặc nhờ Admin tắt "Chơi thử công khai".`}}if(document.activeElement?.tagName!=='INPUT'&&document.activeElement?.tagName!=='TEXTAREA'&&document.activeElement?.tagName!=='SELECT')renderEditor()}
const STAGE_LABEL=['Lớp thầy đồ','Khảo hạch','Thi Hương','Thi Hội','Thi Đình'];
let editMode=null; // {kind:'edit',i} | {kind:'new',stage}
function isLocked(i){const s=room;if(!s)return true;if(s.phase==='finished')return true;return !(i>s.idx||(i===s.idx&&['idle','ready'].includes(s.phase)))}
function renderEditor(){
 const box=qs('#stageBank');if(!box)return;
 box.innerHTML=STAGE_LABEL.map((name,st)=>{const items=bank.map((q,i)=>({q,i})).filter(x=>x.q.stage===st);
  return `<div class="stage-group"><div class="stage-head"><b>${escapeHtml(name)}</b><span class="tag">${items.length} câu</span><button class="btn chip" type="button" data-add="${st}">➕ Thêm câu</button></div>
   <div class="questionlist">${items.map(({q,i})=>`<button type="button" class="${editMode?.kind==='edit'&&editMode.i===i?'active':''} ${isLocked(i)?'locked':''}" data-i="${i}" title="${escapeHtml(q.q)}">${isLocked(i)?'🔒 ':''}${KIND_ICON[q.kind||'mc']} Câu ${i+1} · ${q.t}s${q.media?' 🖼':''}</button>`).join('')||'<span class="meta">Chưa có câu nào</span>'}</div></div>`}).join('');
 for(const b of box.querySelectorAll('[data-i]'))b.onclick=()=>openEdit(Number(b.dataset.i));
 for(const b of box.querySelectorAll('[data-add]'))b.onclick=()=>openNew(Number(b.dataset.add));
}
function setType(n){if(n===2){qs('#editKind').value='tf';showKind();return}qs('#editKind').value='mc';showKind();if(n===3){qs('#editD').value='';if(Number(qs('#editCorrect').value)>2)qs('#editCorrect').value=0}}
qs('#typeTF').onclick=()=>setType(2);qs('#typeMC3').onclick=()=>setType(3);qs('#typeMC4').onclick=()=>qs('#editC').focus();
document.querySelectorAll('[data-vq]').forEach(b=>b.onclick=()=>{emit({type:'vq',cmd:b.dataset.vq,v:+(b.dataset.v||1)});b.classList.add('sent');setTimeout(()=>b.classList.remove('sent'),600)});
{const vv=document.getElementById('vqVol');if(vv)vv.onchange=()=>emit({type:'vq',cmd:'volume',v:+vv.value/100})}
qs('#report').onclick=()=>{if(!roomPin)return;location.href='/api/rooms/'+roomPin+'/report.csv'};
let editMedia=null,savedFrom=null; // savedFrom: câu đang mở lúc bấm LƯU – mạng chậm mà MC đã chuyển sang câu khác thì không kéo form về câu cũ
function uiKind(q){const k=q.kind||'mc';if(k==='mc'&&q.tf)return 'tf';if((k==='mc'||k==='multi')&&Array.isArray(q.ai)&&q.ai.length>=2&&q.ai.every(Boolean)&&!(q.a||[]).some(Boolean))return 'img';return k}
function fillForm(q){const k=q.kind||'mc';qs('#editKind').value=uiKind(q);qs('#editImgMulti').checked=k==='multi';qs('#editTF').value=k==='mc'&&q.tf?String(q.c||0):'0';qs('#editQuestion').value=q.q;qs('#editStage').value=q.stage;qs('#editTime').value=q.t;OPT.forEach((x,i)=>qs('#edit'+x).value=(q.a||[])[i]||'');qs('#editCorrect').value=Number.isInteger(q.c)&&k==='mc'?q.c:0;
 editAi=OPT.map((_,i)=>(q.ai||[])[i]||'');editCs=new Set(k==='multi'?q.cs||[]:[]);qs('#editPartial').checked=!!(k==='multi'&&q.partial);qs('#editPartialO').checked=!!(k==='order'&&q.partial);qs('#editPmulti').checked=!!q.pmulti;qs('#editShuffle').checked=!!q.shuffle;qs('#editPts').value=String(q.pts??1);
 qs('#editCaseOn').checked=!!q.caseOn;qs('#editPunct').checked=!!q.punct;qs('#editNum').value=k==='number'&&Number.isFinite(q.c)?String(q.c).replace('.',','):'';qs('#editNumTol').value=k==='number'?q.tol||0:0;qs('#editNumUnit').value=k==='number'?q.unit||'':'';
 qs('#editAcc').value=(q.acc||[]).join('\n');qs('#editLoose').checked=!!q.loose;qs('#editMin').value=q.min??0;qs('#editMax').value=q.max??100;qs('#editStep').value=q.step??1;qs('#editVal').value=k==='slider'?q.c:50;qs('#editTol').value=q.tol??0;qs('#editUnit').value=q.unit||'';qs('#editNote').value=q.note||'';
 editMedia=q.media?{...q.media}:null;qs('#mediaKind').value=editMedia?.kind||'';qs('#mediaUrl').value=editMedia?(editMedia.kind==='youtube'?'https://youtu.be/'+editMedia.src:editMedia.src.startsWith('https://')?editMedia.src:''):'';qs('#mediaStart').value=editMedia?.start||0;qs('#mediaEnd').value=editMedia?.end||'';qs('#mediaWhere').value=editMedia?.where||(editMedia?.kind==='image'?'both':'led');qs('#mediaGate').checked=editMedia?.gate!==false;qs('#mediaSilentOk').checked=!!editMedia?.silentOk;qs('#mediaAlt').value=editMedia?.alt||'';qs('#mediaHide').value=editMedia?.hide||0;
 qs('#editWord').value=k==='fill'?q.word||'':'';fillHint=new Set(k==='fill'?q.hint||[]:[]);qs('#editFillLoose').checked=!!(k==='fill'&&q.loose);
 for(let i=1;i<=6;i++){qs('#editML'+i).value=k==='match'?(q.l||[])[i-1]||'':'';qs('#editMR'+i).value=k==='match'?(q.r||[])[i-1]||'':''}
 qs('#editProx').checked=!!q.prox;qs('#editHideLive').checked=!!q.hideLive;qs('#editMaxPts').value=q.maxPts||1000;qs('#editScoring').value=q.scoring||'';qs('#editNoStreak').checked=!!q.noStreak;qs('#editTie').checked=!!q.tie;qs('#editHideBoard').checked=!!q.hideBoard;qs('#editNoFx').checked=!!q.noFx;
 qs('#qRules').open=!!(q.maxPts||q.scoring||q.noStreak||q.tie||q.hideBoard||q.noFx||q.pts===3);showKind();showMedia()}
function showKind(){const k=qs('#editKind').value;const keys=[k];if(k==='img')keys.push(qs('#editImgMulti').checked?'img-multi':'img-one');for(const el of document.querySelectorAll('#editorBox [data-k]'))el.style.display=el.dataset.k.split(' ').some(x=>keys.includes(x))?'':'none';if(k==='fill')renderFillCells();
 const ord=k==='order';OPT.forEach((x,i)=>{const l=document.querySelector('.lbl-'+x);if(l)l.textContent=ord?`Mục ${i+1}${i>=3?' (có thể để trống)':''}`:k==='poll'?`Lựa chọn ${x}${i>=2?' (có thể để trống)':''}`:k==='img'?`Chú thích ảnh ${x} (không bắt buộc)`:`${x}${i>=2?' (có thể để trống)':''}`});renderOptExtras();rulesSum()}
function rulesSum(){const x=[];const p=qs('#editPts').value;if(p!=='1')x.push('×'+p);if(qs('#editScoring').value)x.push(qs('#editScoring').value==='speed'?'tốc độ':'cố định');if(Number(qs('#editMaxPts').value)!==1000)x.push('tối đa '+qs('#editMaxPts').value);if(qs('#editNoStreak').checked)x.push('không thưởng chuỗi');if(qs('#editTie').checked)x.push('QUYẾT ĐỊNH KHI BẰNG ĐIỂM');if(qs('#editHideBoard').checked)x.push('giữ bảng');if(qs('#editNoFx').checked)x.push('tắt hiệu ứng');qs('#qRulesSum').textContent=x.length?'– '+x.join(' · '):'– theo luật chung'}
for(const id of ['editPts','editScoring','editMaxPts','editNoStreak','editTie','editHideBoard','editNoFx'])qs('#'+id).addEventListener('change',rulesSum);
qs('#editWord').addEventListener('input',renderFillCells);qs('#editImgMulti').addEventListener('change',showKind);
qs('#editKind').onchange=()=>{const k=qs('#editKind').value;if(k==='order'&&!qs('#editC').value)qs('#editC').focus();showKind()};
function showMedia(){const k=qs('#mediaKind').value;for(const el of document.querySelectorAll('#editorBox [data-m]'))el.style.display=el.dataset.m.split(' ').includes(k)?'':'none';qs('#mediaUrl').style.display=k?'':'none';
 const m=editMedia&&editMedia.kind===k?editMedia:null;qs('#mediaPreview').innerHTML=!m?'':m.kind==='audio'?`<audio src="${escapeHtml(m.src)}" controls></audio>`:m.kind==='image'?`<img src="${escapeHtml(m.src)}" alt="Ảnh minh hoạ">`:m.kind==='video'?`<video src="${escapeHtml(m.src)}" controls muted></video>`:`<div class="meta">▶ YouTube: ${escapeHtml(m.src)} (bắt đầu từ giây ${m.start||0}) – chiếu trên màn LED, cần Internet</div>`}
qs('#mediaKind').onchange=()=>{if(!qs('#mediaKind').value)editMedia=null;showMedia()};
qs('#mediaUrl').onchange=()=>{const u=qs('#mediaUrl').value.trim(),k=qs('#mediaKind').value;if(!u){editMedia=null;return showMedia()}
 if(k==='youtube'){const m=u.match(/(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/)||u.match(/^([\w-]{11})$/);if(!m)return error('Link YouTube chưa đúng');editMedia={kind:'youtube',src:m[1],start:Number(qs('#mediaStart').value)||0}}
 else{if(!/^https:\/\//.test(u))return error('Đường dẫn ảnh/video cần bắt đầu bằng https://');editMedia={kind:k,src:u}}showMedia()};
qs('#mediaStart').onchange=()=>{if(editMedia?.kind==='youtube')editMedia.start=Math.max(0,Number(qs('#mediaStart').value)||0)};
qs('#mediaFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const k=qs('#mediaKind').value;if(f.size>(k==='image'?8e6:k==='audio'?2e7:6e7))return error(k==='image'?'Ảnh tối đa 8 MB':k==='audio'?'Âm thanh tối đa 20 MB':'Video tối đa 60 MB');
 qs('#mediaPreview').innerHTML='<span class="meta">⏳ Đang tải lên…</span>';
 try{const buf=new Uint8Array(await f.arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=0x8000)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));
  const r=await fetch('/api/rooms/'+roomPin+'/media',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.name,data:btoa(bin)})});const d=await r.json();if(!r.ok)throw Error(d.error||'Không tải lên được');
  editMedia={kind:d.kind,src:d.src};qs('#mediaKind').value=d.kind;qs('#mediaUrl').value='';showMedia();error('✔ Đã tải lên – bấm LƯU CÂU NÀY để gắn vào câu hỏi')}catch(err){qs('#mediaPreview').innerHTML='';error(err.message)}};
function openEdit(i){const q=bank[i];if(!q)return;editMode={kind:'edit',i,id:q.id,orig:JSON.parse(JSON.stringify(q))};fillForm(q);const lock=isLocked(i);
 qs('#editorTitle').textContent=`Câu ${i+1} · ${STAGE_LABEL[q.stage]}`+(lock?' (đã thi – chỉ xem)':'');
 qs('#qSave').disabled=lock;qs('#qDelete').disabled=lock;qs('#qDelete').style.display='';qs('#qSave').textContent='💾 LƯU CÂU NÀY';
 qs('#editorNote').textContent=lock?'Câu đã thi hoặc đang thi nên không sửa/xóa được để giữ đúng điểm của sĩ tử.':'Lưu sẽ áp dụng ngay, không ảnh hưởng điểm đã có.';renderEditor()}
function openNew(stage){editMode={kind:'new',stage};fillForm({q:'',stage,kind:qs('#editKind').value||'mc',t:Number(qs('#liveTime')?.value)||20,a:['','','',''],c:0});
 qs('#editorTitle').textContent='➕ Câu mới cho chặng '+STAGE_LABEL[stage];qs('#qSave').disabled=false;qs('#qSave').textContent='➕ THÊM VÀO CHẶNG';qs('#qDelete').style.display='none';
 qs('#editorNote').textContent='Câu mới được xếp vào cuối chặng đã chọn.';qs('#editQuestion').focus();renderEditor()}
function readForm(){const ui=qs('#editKind').value;let k=ui==='tf'?'mc':ui==='img'?(qs('#editImgMulti').checked?'multi':'mc'):ui;
 const max=k==='order'?8:6;let a=OPT.slice(0,max).map(x=>qs('#edit'+x).value.trim());const ai=editAi.slice(0,max);if(ui==='tf')a=['Đúng','Sai'];while(a.length&&!a[a.length-1]&&!ai[a.length-1]){a.pop()}
 const q={stage:Number(qs('#editStage').value),kind:k,q:qs('#editQuestion').value.trim(),t:Number(qs('#editTime').value)};const note=qs('#editNote').value.trim();if(note)q.note=note;
 const mk=qs('#mediaKind').value;if(mk&&editMedia&&editMedia.kind===mk){q.media={...editMedia,where:qs('#mediaWhere').value};if(mk!=='image'){q.media.start=Math.max(0,Number(qs('#mediaStart').value)||0);const en=Number(qs('#mediaEnd').value)||0;if(en&&en>q.media.start)q.media.end=en;else delete q.media.end;q.media.gate=qs('#mediaGate').checked;if(mk!=='audio'&&qs('#mediaSilentOk').checked)q.media.silentOk=true;else delete q.media.silentOk}else{const alt=qs('#mediaAlt').value.trim();if(alt)q.media.alt=alt;else delete q.media.alt;const hd=Math.round(Number(qs('#mediaHide').value)||0);if(hd>0)q.media.hide=Math.min(120,hd);else delete q.media.hide}}else if(mk)return error('Hãy tải tệp lên hoặc dán đường dẫn cho ảnh/video (hoặc chọn "Không có")'),null;
 if(!q.q)return error('Nhập nội dung câu hỏi'),null;if(!Number.isInteger(q.t)||q.t<5||q.t>300)return error('Thời gian 5–300 giây'),null;
 const SC=['mc','multi','type','number','order','slider','fill','match'];
 const pts=Number(qs('#editPts').value);if(pts!==1&&SC.includes(k))q.pts=pts;
 if(['mc','multi','poll','order'].includes(k)){q.a=a;const imgs=ui==='tf'?[]:ai.slice(0,a.length);if(imgs.some(Boolean))q.ai=imgs;if(a.some((x,i)=>!x&&!imgs[i]))return error('Điền các mục liền nhau từ A (mỗi mục cần chữ hoặc ảnh; mục cuối có thể để trống)'),null;
  if(ui==='img'&&!(imgs.length>=2&&imgs.every(Boolean)))return error('Câu chọn hình ảnh: mỗi phương án cần một ảnh (ít nhất 2 ảnh)'),null;
  if(k==='order'&&a.length<3)return error('Câu sắp xếp cần 3–8 mục'),null;if(k!=='order'&&a.length<2)return error('Cần ít nhất 2 lựa chọn'),null;
  if(k!=='order'&&ui!=='tf'&&qs('#editShuffle').checked)q.shuffle=true;
  if(ui==='tf'){q.c=Number(qs('#editTF').value);q.tf=true}
  else if(k==='mc'){q.c=Number(qs('#editCorrect').value);if(q.c>=a.length)return error('Đáp án đúng phải là một trong các đáp án đã điền'),null}
  if(k==='multi'){q.cs=[...editCs].filter(i=>i<a.length).sort();if(!q.cs.length)return error('Đánh dấu ít nhất 1 đáp án đúng'),null;if(qs('#editPartial').checked)q.partial=true}
  if(k==='order'&&qs('#editPartialO').checked)q.partial=true;if(k==='poll'&&qs('#editPmulti').checked)q.pmulti=true;if(k==='poll'&&qs('#editHideLive').checked)q.hideLive=true}
 if(k==='number'){const v=qs('#editNum').value.trim().replace(',','.');if(!/^[+-]?\d+(\.\d+)?$/.test(v))return error('Đáp án số chưa đúng dạng (ví dụ 1075 hoặc 12,5)'),null;q.c=Number(v);q.tol=Math.max(0,Number(qs('#editNumTol').value)||0);q.unit=qs('#editNumUnit').value.trim();if(qs('#editProx').checked){if(!q.tol)return error('Ước lượng "càng gần càng nhiều điểm" cần sai số chấp nhận > 0'),null;q.prox=true}}
 if(k==='type'){q.acc=qs('#editAcc').value.split(/\n|\|/).map(x=>x.trim()).filter(Boolean);q.loose=qs('#editLoose').checked;q.caseOn=qs('#editCaseOn').checked;q.punct=qs('#editPunct').checked;if(!q.acc.length)return error('Nhập ít nhất 1 đáp án được chấp nhận'),null}
 if(k==='fill'){q.word=qs('#editWord').value.normalize('NFC').replace(/\s+/g,' ').trim();const ch=Array.from(q.word),slots=ch.filter(isLetter).length;if(slots<2)return error('Từ khoá cần ít nhất 2 chữ cái'),null;if(ch.some(c=>!isLetter(c)&&c!==' '&&c!=='-'))return error('Từ khoá chỉ gồm chữ, số, khoảng trắng hoặc gạch nối'),null;
  q.hint=[...fillHint].filter(i=>i<ch.length&&isLetter(ch[i])).sort((x,y)=>x-y);if(q.hint.length>=slots)return error('Phải chừa ít nhất 1 ô để sĩ tử điền'),null;if(qs('#editFillLoose').checked)q.loose=true}
 if(k==='match'){q.l=[];q.r=[];for(let i=1;i<=6;i++){const l=qs('#editML'+i).value.trim(),r=qs('#editMR'+i).value.trim();if(!l&&!r)continue;if(!l||!r)return error(`Cặp ${i} còn thiếu một vế`),null;q.l.push(l);q.r.push(r)}if(q.l.length<3)return error('Ghép cặp cần ít nhất 3 cặp'),null}
 if(k==='slider'){Object.assign(q,{min:Number(qs('#editMin').value),max:Number(qs('#editMax').value),step:Number(qs('#editStep').value),c:Number(qs('#editVal').value),tol:Number(qs('#editTol').value)||0,unit:qs('#editUnit').value.trim()});
  if(!(q.max>q.min))return error('Giá trị lớn nhất phải lớn hơn nhỏ nhất'),null;if(!(q.step>0))return error('Bước nhảy phải lớn hơn 0'),null;if(q.c<q.min||q.c>q.max)return error('Đáp án phải nằm trong khoảng'),null}
 if(SC.includes(k)){const mp=Math.round(Number(qs('#editMaxPts').value)||1000);if(mp<100||mp>5000)return error('Điểm tối đa 100–5000'),null;if(mp!==1000)q.maxPts=mp;const sc=qs('#editScoring').value;if(sc)q.scoring=sc;if(qs('#editNoStreak').checked)q.noStreak=true;if(qs('#editTie').checked)q.tie=true}
 if(qs('#editHideBoard').checked)q.hideBoard=true;if(qs('#editNoFx').checked)q.noFx=true;
 return q}
const isLetter=c=>/[\p{L}\p{N}]/u.test(c);
function renderFillCells(){const box=qs('#fillCells');if(!box)return;const ch=Array.from(qs('#editWord').value.normalize('NFC').replace(/\s+/g,' ').trim());
 box.innerHTML=ch.length?ch.map((c,i)=>isLetter(c)?`<button type="button" class="fill-cell ${fillHint.has(i)?'hint':''}" data-fh="${i}" aria-pressed="${fillHint.has(i)}" title="${fillHint.has(i)?'Đang hiện sẵn – bấm để ẩn':'Bấm để hiện sẵn chữ này'}">${escapeHtml(c)}</button>`:`<span class="fill-sep">${c==='-'?'-':''}</span>`).join(''):'<span class="meta">Nhập từ khoá ở trên</span>';
 for(const b of box.querySelectorAll('[data-fh]'))b.onclick=()=>{const i=+b.dataset.fh;fillHint.has(i)?fillHint.delete(i):fillHint.add(i);renderFillCells()}}
qs('#qSave').onclick=()=>{if(!editMode)return error('Chọn câu hỏi hoặc bấm ➕ Thêm câu');const q=readForm();if(!q)return;
 saveState='saving';renderSaveState();savedFrom=editMode;if(editMode.kind==='new')emit({type:'q_add',q});else{const at=bank.findIndex(x=>x.id===editMode.id);emit({type:'q_update',i:at>=0?at:editMode.i,id:editMode.id,orig:editMode.orig,q})}};
qs('#qDelete').onclick=()=>{if(editMode?.kind!=='edit')return;if(!confirm(`Xóa câu ${editMode.i+1}? (Không mất điểm sĩ tử)`))return;const at=bank.findIndex(x=>x.id===editMode.id);emit({type:'q_delete',i:at>=0?at:editMode.i,id:editMode.id,orig:editMode.orig})};
qs('#qCancel').onclick=()=>{editMode=null;qs('#editorTitle').textContent='Chọn một câu để sửa';qs('#editorNote').textContent='';renderEditor()};
function commitEditor(){return true}
qs('#save').onclick=()=>{if(!draft)return error('Chưa có bản nháp: hãy bấm ⬆ Nhập JSON trước');if(!confirm(`Áp dụng BẢN NHÁP "${draft.name}" (${draft.bank.length} câu) thay bộ đề hiện tại (phiên bản ${room?.bankVer||1}) và ĐẶT LẠI ĐIỂM?`))return;draft.state='saving';renderDraft();emit({type:'bank_set',bank:draft.bank,baseVer:draft.baseVer,draftId:draft.id})};
qs('#export').onclick=()=>{const blob=new Blob([JSON.stringify({schemaVersion:15,exportedAt:new Date().toISOString(),bankVer:room?.bankVer||1,questions:bank},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='UDIKA_cau_hoi.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
qs('#import').onchange=async e=>{const f=e.target.files[0];e.target.value='';try{const raw=JSON.parse(await f.text());const x=Array.isArray(raw)?raw:Array.isArray(raw?.questions)?raw.questions:null;if(!x)throw Error('File cần là danh sách câu hỏi (hoặc {schemaVersion, questions:[…]})');if(raw.schemaVersion&&raw.schemaVersion>15)throw Error(`Bộ đề phiên bản ${raw.schemaVersion} mới hơn phần mềm – hãy cập nhật UDIKA`);
 draft={id:Math.random().toString(36).slice(2,10),name:f.name,bank:x,baseVer:room?.bankVer||1,state:'draft'};renderDraft();error('Đã mở BẢN NHÁP – bộ đề đang thi KHÔNG bị thay cho tới khi bạn bấm ♻ Áp dụng.')}catch(e){error(e.message)}};
setInterval(()=>{if(room?.phase==='running'&&room.q){const s=timeLeft(room.q);qs('#clock').textContent=s;qs('#clock').classList.toggle('hot',s<=5)}},150);
connect();

/* ---- Nhập đề từ Word / Excel ---- */
let importList=[];
qs('#importFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>40e6)return error('Tệp quá lớn (tối đa 40 MB)');
 qs('#importResult').innerHTML='<p class="meta">⏳ Đang đọc tệp…</p>';
 try{const buf=new Uint8Array(await f.arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=0x8000)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));
  const r=await fetch('/api/rooms/'+roomPin+'/import',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.name,data:btoa(bin)})});const d=await r.json();if(!r.ok)throw Error(d.error||'Không đọc được tệp');
  importList=d.questions;renderImport(d.errors,f.name,d.warnings||[])}catch(err){qs('#importResult').innerHTML='';error(err.message)}};
function renderImport(errors,name,warnings=[]){
 const counts=STAGE_LABEL.map((_,st)=>importList.filter(q=>q.stage===st).length);const nImg=importList.reduce((n,q)=>n+(q.media&&q.media.kind==='image'?1:0)+(q.ai||[]).filter(Boolean).length,0);
 qs('#importResult').innerHTML=`<div class="status">✔ Đọc được <b>${importList.length}</b> câu từ <b>${escapeHtml(name||'')}</b> · ${STAGE_LABEL.map((n,i)=>`${escapeHtml(n)}: ${counts[i]}`).join(' · ')}${nImg?` · 🖼 <b>${nImg}</b> ảnh`:''}${errors.length?` · ⚠ ${errors.length} câu cần sửa trong tệp (chưa nhập)`:''}${warnings.length?` · ⚠ ${warnings.length} cảnh báo`:''}</div><div id="importStatus" class="meta" aria-live="polite"></div>
 ${warnings.length?`<div class="callout warn"><b>Cảnh báo – hãy kiểm tra trước khi thêm:</b>${warnings.map(x=>`<div>Câu ${x.n}: ${escapeHtml(x.why)}</div>`).join('')}</div>`:''}
 ${errors.length?`<details open><summary>Xem ${errors.length} câu cần sửa (giữ nguyên văn, không tự cắt)</summary>${errors.map(x=>`<div class="meta">Câu ${x.n}: ${escapeHtml(x.q)} – <b>${escapeHtml(x.why)}</b></div>`).join('')}</details>`:''}
 <div class="import-table"><table><thead><tr><th>#</th><th>Câu hỏi</th><th>Đáp án đúng</th><th>Thời gian</th><th>Chặng</th></tr></thead><tbody>
 ${importList.map((q,i)=>`<tr><td>${i+1}</td><td>${q.media&&q.media.kind==='image'?`<img class="imp-q-img" src="${escapeHtml(q.media.src)}" alt="Ảnh câu ${i+1}">`:''}${KIND_ICON[q.kind||'mc']} ${escapeHtml(q.q)}<div class="meta imp-opts">${(q.a||[]).map((x,k)=>`<span>${'ABCDEF'[k]}. ${q.ai&&q.ai[k]?`<img class="imp-opt-img" src="${escapeHtml(q.ai[k])}" alt="Ảnh phương án ${'ABCDEF'[k]}">`:''}${escapeHtml(x)}</span>`).join(' · ')}</div></td><td><b>${escapeHtml(keyText(q))}</b></td>
 <td><input type="number" min="5" max="300" value="${q.t}" data-t="${i}" class="input mini">${q.autoTime?'<span class="meta">tự đặt</span>':''}</td>
 <td><select data-st="${i}" class="input mini">${STAGE_LABEL.map((n,st)=>`<option value="${st}" ${st===q.stage?'selected':''}>${escapeHtml(n)}</option>`).join('')}</select>${q.autoStage?'<span class="meta">tự xếp</span>':''}</td></tr>`).join('')}
 </tbody></table></div>
 <button class="btn primary" id="importAppend" type="button">➕ Thêm ${importList.length} câu vào bộ đề (giữ điểm)</button><button class="btn red" id="importReplace" type="button">♻ Thay toàn bộ bộ đề (đặt lại điểm)</button><button class="btn secondary" id="importCancel" type="button">✖ Bỏ</button>`;
 for(const el of qs('#importResult').querySelectorAll('[data-st]'))el.onchange=()=>{importList[+el.dataset.st].stage=+el.value};
 for(const el of qs('#importResult').querySelectorAll('[data-t]'))el.onchange=()=>{importList[+el.dataset.t].t=Math.max(5,Math.min(300,parseInt(el.value)||20))};
 const clean=()=>importList.map(({autoStage,autoTime,...q})=>q).sort((x,y)=>x.stage-y.stage);
 qs('#importAppend').onclick=()=>{importPending='append';setImportStatus('⏳ Đang lưu vào bộ đề…','');emit({type:'q_add_many',list:clean()})};
 qs('#importReplace').onclick=()=>{if(!confirm('Thay toàn bộ bộ đề bằng các câu vừa nhập và ĐẶT LẠI ĐIỂM?'))return;importPending='replace';setImportStatus('⏳ Đang thay bộ đề…','');emit({type:'bank_set',bank:clean(),baseVer:room?.bankVer||1})};
 qs('#importCancel').onclick=()=>{qs('#importResult').innerHTML='';importList=[]};
}

/* ===== V14: dạng câu, thiết lập phòng, quản lý sĩ tử, đội, tự làm bài, kho đề ===== */
const KIND_NAME={fill:'Điền ô chữ',match:'Ghép cặp',mc:'Trắc nghiệm',multi:'Chọn nhiều đáp án',type:'Gõ đáp án chữ',number:'Nhập đáp án số',order:'Sắp xếp thứ tự',poll:'Khảo sát',slider:'Thanh trượt',cloud:'Đám mây từ'};
const KIND_ICON={fill:'🔠',match:'🔗',mc:'🔘',multi:'☑️',type:'✍️',number:'🔢',order:'↕️',poll:'📊',slider:'🎚',cloud:'☁️'};
function keyText(q){const k=q.kind||'mc',L='ABCDEFGH';if(k==='fill')return q.word+(q.loose?' (không dấu được)':'');if(k==='match')return (q.l||[]).map((x,i)=>x+'↔'+q.r[i]).join(' · ');if(k==='mc'&&q.tf)return q.c===0?'Đúng':'Sai';return k==='multi'?(q.cs||[]).map(i=>L[i]).join(', ')+(q.partial?' (chấm một phần)':''):k==='number'?`${q.c}${q.tol?' ±'+q.tol:''}${q.unit?' '+q.unit:''}`:k==='mc'?L[q.c]:k==='type'?(q.acc||[]).join(' / '):k==='order'?'theo thứ tự ghi':k==='slider'?`${q.c}${q.tol?' ±'+q.tol:''}`:'—'}
function liveStats(s){const q=s.q;if(!q||!q.stats)return '';const st=q.stats;if(st.counts)return ' · '+st.counts.map((n,i)=>`${'ABCDEFGH'[i]}: ${n}`).join(' ')+(st.multi?` (mẫu số ${st.n} người nộp)`:'');if(st.words)return ' · '+st.words.slice(0,5).map(w=>`${w.w} (${w.n})`).join(', ');if(st.avg!=null)return ` · trung bình ${st.avg}`;if(st.avgPairs!=null)return ` · trung bình ${st.avgPairs} cặp đúng`;return ''}
const toLocalInput=ms=>{if(!ms)return '';const d=new Date(ms-new Date().getTimezoneOffset()*60000);return d.toISOString().slice(0,16)};
let lastSettingsKey='';
function renderSettings(s){
 for(const b of document.querySelectorAll('[data-mode]'))b.classList.toggle('on',(s.mode||'live')===b.dataset.mode);
 qs('#selfBox').classList.toggle('hidden',s.mode!=='self');if(document.activeElement!==qs('#optSelfHide'))qs('#optSelfHide').checked=s.selfHide!==false;
 if(document.activeElement!==qs('#optStreak'))qs('#optStreak').checked=s.streakOn!==false;if(document.activeElement!==qs('#optAuto'))qs('#optAuto').checked=s.autoReveal!==false;if(document.activeElement!==qs('#optBigQr'))qs('#optBigQr').value=s.bigQr||'auto';{const lobby=s.phase==='idle'||(s.phase==='ready'&&s.idx===0)||(s.mode==='self'&&['idle','self'].includes(s.phase));const on=s.bigQr==='on'||(s.bigQr!=='off'&&lobby);const b=qs('#bigQrBtn');b.dataset.on=on?'1':'0';b.textContent=on?'📱 Ẩn QR lớn trên LED':'📱 Chiếu QR lớn lên LED';b.classList.toggle('primary',!on)}if(document.activeElement!==qs('#optLock'))qs('#optLock').checked=!!s.locked;
 if(s.mode==='self'){qs('#selfOpen').disabled=s.phase==='self';qs('#selfClose').disabled=s.phase!=='self';qs('#selfDl').disabled=s.phase!=='self';
  if(document.activeElement!==qs('#selfDeadline')&&s.self?.deadline)qs('#selfDeadline').value=toLocalInput(s.self.deadline);
  qs('#selfInfo').textContent=s.phase==='self'?`Đang mở · ${s.self?.done||0}/${s.count} sĩ tử đã làm xong · hạn nộp: ${s.self?.deadline?new Date(s.self.deadline).toLocaleString('vi-VN'):'không giới hạn'}`:s.phase==='finished'?'Đã đóng bài – bảng vàng đã xướng danh. Bấm MỞ BÀI để giao lại (điểm sẽ đặt lại).':'Chưa mở bài.'}
 const key=JSON.stringify(s.teams||[]);if(key!==lastSettingsKey){lastSettingsKey=key;if(document.activeElement!==qs('#teamNames'))qs('#teamNames').value=(s.teams||[]).map(t=>t.name).join('\n');if((s.teams||[]).length)qs('#teamDetails').open=true}
 qs('#teamBoardHost').innerHTML=(s.teamBoard||[]).length?'<h3>Bảng xếp hạng đội</h3>'+s.teamBoard.map(t=>`<div class="rank"><span class="no" style="color:${t.color}">${t.rank}</span><div><b>${escapeHtml(t.name)}</b><div class="meta">${t.members} thành viên · ${t.correct} câu đúng</div></div><span class="pts">${fmt(t.score)} điểm TB</span></div>`).join(''):'';
}
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{if(room&&(room.mode||'live')===b.dataset.mode)return;if(room&&room.phase==='finished'&&!confirm('Đổi hình thức thi sẽ đặt lại điểm của sĩ tử. Tiếp tục?'))return;emit({type:'set_mode',mode:b.dataset.mode})};
qs('#optStreak').onchange=()=>emit({type:'set_option',streak:qs('#optStreak').checked});
qs('#optAuto').onchange=()=>emit({type:'set_option',autoReveal:qs('#optAuto').checked});
qs('#optBigQr').onchange=()=>emit({type:'set_option',bigQr:qs('#optBigQr').value});
qs('#bigQrBtn').onclick=()=>{const on=qs('#bigQrBtn').dataset.on==='1';emit({type:'set_option',bigQr:on?'off':'on'})};
qs('#optLock').onchange=()=>emit({type:'lock',on:qs('#optLock').checked});
qs('#showBoard').onclick=()=>emit({type:'show_board'});qs('#optHoldBoard').onchange=()=>emit({type:'set_option',holdBoard:qs('#optHoldBoard').checked});
qs('#optSelfHide').onchange=()=>emit({type:'set_option',selfHide:qs('#optSelfHide').checked});
const readDeadline=()=>{const v=qs('#selfDeadline').value;return v?new Date(v).getTime():0};
qs('#selfOpen').onclick=()=>{const dl=readDeadline();if(room?.phase==='finished'&&!confirm('Mở lại bài sẽ đặt lại điểm. Tiếp tục?'))return;emit({type:'self_open',deadline:dl})};
qs('#selfClose').onclick=()=>{if(confirm('Đóng bài và xướng danh Tam khôi ngay? Sĩ tử chưa làm xong sẽ không làm tiếp được.'))emit({type:'self_close'})};
qs('#selfDl').onclick=()=>emit({type:'self_deadline',deadline:readDeadline()});
qs('#teamApply').onclick=()=>{const names=qs('#teamNames').value.split('\n').map(x=>x.trim()).filter(Boolean);if(names.length<2)return error('Cần ít nhất 2 đội');emit({type:'teams_set',names})};
qs('#teamOff').onclick=()=>{if(confirm('Tắt chơi theo đội?'))emit({type:'teams_set',names:[]})};
let lastPlayersKey='';
function renderPlayers(s){const list=s.players||[],f=(qs('#playerFilter').value||'').trim().toLowerCase();const teams=s.teams||[];
 const shown=list.filter(p=>!f||p.name.toLowerCase().includes(f)||(p.code||'').toLowerCase().includes(f)).slice(0,200);
 const key=JSON.stringify([f,shown.map(p=>[p.id,p.score,p.team,p.online,p.done,p.cur,p.streak]),teams,s.bannedNames]);if(key===lastPlayersKey)return;lastPlayersKey=key;
 qs('#playerList').innerHTML=(shown.length?shown.map(p=>`<div class="player-row"><span class="dot ${p.online?'on':''}" title="${p.online?'đang kết nối':'mất kết nối'}"></span><b>${escapeHtml(p.avatar||'')} ${escapeHtml(p.name)}</b>${p.code?` <span class="code" title="Mã dự thi (chỉ MC thấy)">${escapeHtml(p.code)}</span>`:''}
  <span class="meta">${fmt(p.score)} điểm${p.streak>=2?' · 🔥'+p.streak:''}${s.mode==='self'?` · ${p.done?'✔ xong':'câu '+(p.cur+1)}`:''}</span>
  ${teams.length?`<select class="input mini" data-move="${p.id}">${teams.map(t=>`<option value="${t.id}" ${t.id===p.team?'selected':''}>${escapeHtml(t.name)}</option>`).join('')}</select>`:''}
  <button class="btn chip" type="button" data-kick="${p.id}">Mời rời phòng</button><button class="btn chip red" type="button" data-ban="${p.id}">Mời rời + chặn tên</button></div>`).join(''):'<p class="meta">Chưa có sĩ tử.</p>')+(list.length>shown.length?`<p class="meta">Đang hiện ${shown.length}/${list.length} – gõ tên để tìm.</p>`:'');
 qs('#bannedList').innerHTML=(s.bannedNames||[]).length?'<h3>Tên đã chặn</h3>'+s.bannedNames.map(n=>`<span class="tag">${escapeHtml(n)} <button class="link-btn" type="button" data-unban="${escapeHtml(n)}">bỏ chặn</button></span>`).join(' '):'';
 for(const b of qs('#playerList').querySelectorAll('[data-kick]'))b.onclick=()=>{const p=list.find(x=>x.id===b.dataset.kick);if(p&&confirm(`Mời "${p.name}" rời phòng? (Có thể vào lại)`))emit({type:'kick',id:p.id})};
 for(const b of qs('#playerList').querySelectorAll('[data-ban]'))b.onclick=()=>{const p=list.find(x=>x.id===b.dataset.ban);if(p&&confirm(`Mời "${p.name}" rời phòng và CHẶN tên này?`))emit({type:'kick',id:p.id,ban:true})};
 for(const el of qs('#playerList').querySelectorAll('[data-move]'))el.onchange=()=>emit({type:'team_move',id:el.dataset.move,team:el.value});
 for(const b of qs('#bannedList').querySelectorAll('[data-unban]'))b.onclick=()=>emit({type:'unban',name:b.dataset.unban});
}
qs('#playerFilter').oninput=()=>{lastPlayersKey='';if(room)renderPlayers(room)};
/* ---- kho đề ---- */
async function libApi(url,opt={}){const r=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...opt});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||'Không thực hiện được');return d}
async function libLoad(){try{const d=await libApi('/api/library');qs('#libList').innerHTML=d.items.length?`<table class="lib-table"><thead><tr><th>Bộ đề</th><th>Số câu</th><th>Người tạo</th><th></th></tr></thead><tbody>${d.items.map(x=>`<tr><td><b>${escapeHtml(x.name)}</b>${x.shared?' <span class="tag">dùng chung</span>':''}<div class="meta">${x.kinds.map(k=>KIND_ICON[k]).join(' ')} · cập nhật ${new Date(x.updatedAt).toLocaleString('vi-VN')}</div></td><td>${x.count}</td><td>${escapeHtml(x.owner)}</td>
  <td><button class="btn chip" type="button" data-lload="${x.id}">♻ Nạp (thay bộ đề)</button><button class="btn chip" type="button" data-lappend="${x.id}">➕ Thêm vào bộ đề</button>${x.mine?`<button class="btn chip red" type="button" data-ldel="${x.id}">🗑</button>`:''}</td></tr>`).join('')}</tbody></table>`:'<p class="meta">Kho đề chưa có bộ đề nào.</p>';
 for(const b of qs('#libList').querySelectorAll('[data-lload]'))b.onclick=async()=>{if(!confirm('Thay toàn bộ bộ đề của phòng bằng bộ đề này và ĐẶT LẠI ĐIỂM?'))return;try{const r=await libApi('/api/library/'+b.dataset.lload+'/load',{method:'POST',body:JSON.stringify({pin:roomPin,mode:'replace'})});error(`✔ Đã nạp ${r.count} câu từ kho đề`)}catch(e){error(e.message)}};
 for(const b of qs('#libList').querySelectorAll('[data-lappend]'))b.onclick=async()=>{try{const r=await libApi('/api/library/'+b.dataset.lappend+'/load',{method:'POST',body:JSON.stringify({pin:roomPin,mode:'append'})});error(`✔ Đã thêm vào bộ đề – hiện có ${r.count} câu, điểm giữ nguyên`)}catch(e){error(e.message)}};
 for(const b of qs('#libList').querySelectorAll('[data-ldel]'))b.onclick=async()=>{if(!confirm('Xoá bộ đề này khỏi kho?'))return;try{await libApi('/api/library/'+b.dataset.ldel,{method:'DELETE'});libLoad()}catch(e){error(e.message)}};
}catch(e){qs('#libList').innerHTML=`<p class="meta">${escapeHtml(e.message)}</p>`}}
qs('#libSave').onclick=async()=>{const name=qs('#libName').value.trim();if(!name)return error('Đặt tên cho bộ đề');try{const r=await libApi('/api/library',{method:'POST',body:JSON.stringify({name,pin:roomPin})});error(`✔ Đã lưu ${r.count} câu vào kho đề "${name}"`);libLoad()}catch(e){error(e.message)}};
qs('#libRefresh').onclick=libLoad;
{let loaded=false;const t=setInterval(()=>{if(room&&!loaded){loaded=true;libLoad();clearInterval(t)}},500)}
showKind();showMedia();

function renderCounts(){const s=room;if(!s)return;qs('#count').innerHTML=`${fmt(s.count)}<div class="meta count-sub">🟢 ${fmt(s.online??s.count)} đang trực tuyến${s.mode==='self'?` · ✔ ${fmt(s.self?.done||s.selfDone||0)} làm xong`:s.phase==='running'?` · 📝 ${fmt(s.answeredCount||0)} đã nộp`:''}</div>`;
 if(s.mode!=='self'&&s.q)qs('#qInfo').textContent=`Câu ${s.idx+1}/${bank.length} · ${KIND_NAME[bank[s.idx]?.kind||'mc']}${s.q.pts>1?' · ×'+s.q.pts+' điểm':s.q.pts===0?' · không tính điểm':''}${s.q.tie?' · ⚖ CÂU QUYẾT ĐỊNH KHI BẰNG ĐIỂM':''}${s.q.maxPts?' · tối đa '+s.q.maxPts:''}${s.q.scoring&&bank[s.idx]?.scoring?(s.q.scoring==='accuracy'?' · điểm cố định':' · theo tốc độ'):''} · Thời gian: ${bank[s.idx]?.t||0} giây${s.q.extra?` (+${s.q.extra}s gia hạn nộp bài, thang điểm tốc độ giữ ${bank[s.idx]?.t} giây)`:''} · Đã nộp: ${fmt(s.answeredCount||0)}/${fmt(s.online??s.count)} đang trực tuyến (${fmt(s.count)} đã ghi danh)`+liveStats(s)}

/* ===== V15: phương án có ảnh, chọn nhiều, luồng công bố, LED, luật điểm, lịch sử, kiểm tra đề ===== */

const VQ_NAME={start:'bắt đầu',pause:'tạm dừng',resume:'tiếp tục',toggle:'tạm dừng/tiếp tục',honor:'chuyển vinh danh',replay:'phát lại đoàn rước',speed:'đổi tốc độ',sound:'bật/tắt âm thanh',volume:'âm lượng',preload:'tải sẵn phim',test:'thử tiếng',rehearse:'tổng duyệt vinh danh',stop_rehearse:'thoát tổng duyệt'};
function setImportStatus(t,cls){const el=qs('#importStatus');if(el){el.textContent=t;el.className='meta '+(cls||'')}}
function renderSaveState(msg){const el=qs('#editorNote');if(!el)return;if(saveState==='saving')el.textContent='⏳ Đang lưu…';else if(saveState==='saved')el.textContent='✔ Đã lưu lên máy chủ.';else if(saveState==='error')el.textContent='⚠ Lưu lỗi: '+(msg||'')+' – nội dung bạn đang sửa vẫn còn nguyên trên màn hình, sửa rồi bấm Lưu lại.'}
function renderDraft(){const el=qs('#draftInfo');if(!el)return;if(!draft){el.classList.add('hidden');el.textContent='';return}el.classList.remove('hidden');
 el.innerHTML=`📝 <b>Bản nháp:</b> ${escapeHtml(draft.name)} – ${draft.bank.length} câu · dựa trên bộ đề phiên bản ${draft.baseVer}${room&&room.bankVer!==draft.baseVer?` <b class="warn">⚠ bộ đề trên máy chủ đã đổi sang phiên bản ${room.bankVer}</b>`:''}${draft.state==='saving'?' · ⏳ đang áp dụng…':''}${draft.err?`<div class="warn">⚠ ${escapeHtml(draft.err)}</div>`:''} <button class="btn chip" type="button" id="draftDrop">Bỏ bản nháp</button>`;
 qs('#draftDrop').onclick=()=>{draft=null;renderDraft()}}
function renderOptExtras(){const k=qs('#editKind').value;const n=k==='order'?8:6;
 qs('#optImgs').innerHTML=OPT.slice(0,n).map((x,i)=>`<span class="opt-img-cell">${k==='order'?'Mục '+(i+1):x}: ${editAi[i]?`<img src="${escapeHtml(editAi[i])}" alt="Ảnh phương án ${x}"><button type="button" class="link-btn" data-imgdel="${i}">xoá</button>`:`<button type="button" class="btn chip" data-imgup="${i}">🖼 Thêm ảnh</button>`}</span>`).join('');
 for(const b of qs('#optImgs').querySelectorAll('[data-imgup]'))b.onclick=()=>{imgSlot=+b.dataset.imgup;qs('#optImgFile').click()};
 for(const b of qs('#optImgs').querySelectorAll('[data-imgdel]'))b.onclick=()=>{editAi[+b.dataset.imgdel]='';renderOptExtras()};
 qs('#multiBoxes').innerHTML=OPT.slice(0,6).map((x,i)=>`<label class="switch"><input type="checkbox" data-cs="${i}" ${editCs.has(i)?'checked':''}> ${x}</label>`).join(' ');
 for(const c of qs('#multiBoxes').querySelectorAll('[data-cs]'))c.onchange=()=>{c.checked?editCs.add(+c.dataset.cs):editCs.delete(+c.dataset.cs)}}
async function uploadFile(f){const buf=new Uint8Array(await f.arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=0x8000)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));
 const r=await fetch('/api/rooms/'+roomPin+'/media',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.name,data:btoa(bin)})});const d=await r.json();if(!r.ok)throw Error(d.error||'Không tải lên được');return d}
qs('#optImgFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||imgSlot<0)return;if(f.size>8e6)return error('Ảnh tối đa 8 MB');try{const d=await uploadFile(f);if(d.kind!=='image')throw Error('Phương án chỉ nhận ảnh');editAi[imgSlot]=d.src;renderOptExtras();error('✔ Đã tải ảnh – bấm LƯU CÂU NÀY')}catch(err){error(err.message)}};
function renderFlow(s){const A=s.actions||{};const t=s.q?.kind;{const b=qs('#showBoard');b.classList.toggle('hidden',!s.boardHeld);b.textContent=s.phase==='finished'?'🏆 XƯỚNG DANH TAM KHÔI':s.phase==='intermission'?'📜 HIỆN BẢNG VÀNG CHẶNG':'📜 HIỆN BẢNG ĐIỂM'}if(document.activeElement!==qs('#optHoldBoard'))qs('#optHoldBoard').checked=!!s.holdBoard;qs('#start').disabled=!A.start;qs('#reveal').disabled=!A.reveal;qs('#next').disabled=!A.next;
 qs('#openNow').classList.toggle('hidden',!A.open);qs('#extendRow').style.display=A.extend?'flex':'none';qs('#timeApply').disabled=!A.start;
 qs('#next').textContent=A.nextLabel?'⏭ '+A.nextLabel:'⏭ TIẾP TỤC';qs('#reveal').textContent=s.phase==='media'?'🔒 HUỶ CLIP & CÔNG BỐ':'🔒 KHOÁ BÀI & CÔNG BỐ ĐÁP ÁN';
 qs('#flowHint').textContent=s.phase==='media'?'🎬 Clip đang phát trên LED – lượt trả lời tự mở khi clip kết thúc (hoặc bấm MỞ LƯỢT TRẢ LỜI NGAY nếu LED không phát được).':s.phase==='reveal'?'Đáp án đã công bố cho mọi màn hình. Bấm '+(A.nextLabel||'TIẾP TỤC')+'.':s.phase==='intermission'?'Đang tổng kết chặng trên LED và điện thoại.':s.phase==='finished'?'Đã xướng danh chung cuộc.':'Quy trình: Mở câu → (phát clip) → nhận bài → Khoá & công bố → Tổng kết chặng / Xướng danh → Câu tiếp.';
 renderLeds();renderRules(s);renderHistory(s)}
function vqLog(html){const el=qs('#vqLog');if(!el)return;el.innerHTML=`<div>${new Date().toLocaleTimeString('vi-VN')} ${html}</div>`+el.innerHTML.split('</div>').slice(0,6).join('</div>')}
document.querySelectorAll('[data-vq]').forEach(b=>b.onclick=()=>{emit({type:'vq',cmd:b.dataset.vq,v:+(b.dataset.v||1),cid:Math.random().toString(36).slice(2,10)});b.classList.add('sent');setTimeout(()=>b.classList.remove('sent'),600)});
function renderLeds(){const el=qs('#ledStatus');if(!el||!room)return;const L=room.leds||[];setTimeout(()=>el.querySelectorAll('[data-mainled]').forEach(b=>b.onclick=()=>emit({type:'set_main_led',conn:b.dataset.mainled||null})),0);
 el.innerHTML='<b>🖥 Màn LED:</b> '+(L.length?L.map(l=>`<span class="tag ${l.ready?'ok':''}">${escapeHtml(l.label)}: ${l.ready?'✅ sẵn sàng':'⏳ đang chuẩn bị'} · ${l.sound==='on'?'🔊 có tiếng':l.sound==='blocked'?'🔇 TRÌNH DUYỆT CHẶN TIẾNG – bấm vào màn LED':'🔇 đang tắt tiếng'} · 🎬 ${l.film==='ready'?'phim đã tải':l.film==='loading'?'đang tải phim '+(l.filmPct??0)+'%':l.film==='error'?'⚠ LỖI TẢI PHIM':'chưa tải phim'}${l.clean?' · chế độ sân khấu':''} · ${l.main?'<b>★ MÀN CHÍNH (đã ghép đôi)</b>':`${l.trusted?'':' · <b class="warn">chưa ghép đôi – không tự mở lượt</b> '}<button class="link-btn" type="button" data-mainled="${escapeHtml(l.conn||'')}">đặt làm màn chính</button>`}</span>`).join(' ')+(L.some(l=>l.main)?' <button class="link-btn" type="button" data-mainled="">bỏ chọn màn chính</button>':''):'<span class="meta warn">⚠ chưa có màn LED nào kết nối – lệnh hoạt cảnh sẽ không có nơi thực hiện</span>')}
/* luật điểm & xếp hạng (công bố trước) */
let rulesKey='';
function renderRules(s){const box=qs('#rulesBox');if(!box)return;const R=s.rules||{};const key=JSON.stringify([s.scoring,s.confidence,R,s.rehearsal,s.bankLocked,s.phase,s.stageScoring]);if(key===rulesKey)return;rulesKey=key;
 if(document.activeElement?.closest?.('#rulesBox'))return;
 document.querySelectorAll('[data-stsc]').forEach(x=>x.value=(s.stageScoring||{})[x.dataset.stsc]||'');qs('#optScoring').value=s.scoring||'speed';qs('#optConf').checked=!!s.confidence;qs('#optTie').value=R.tie||'time';qs('#optMinCorrect').value=R.minCorrect??1;qs('#optMinScore').value=R.minScore??1;qs('#optRehearsal').checked=!!s.rehearsal;qs('#optBankLock').checked=!!s.bankLocked;
 qs('#rulesText').textContent=`Đang áp dụng: ${s.scoring==='accuracy'?'CHÍNH XÁC – mỗi câu đúng 1.000 điểm, không tính tốc độ':'TỐC ĐỘ – đúng được 300–1.000 điểm theo thời gian (gia hạn không đổi thang điểm)'}${s.confidence?' · TỰ TIN: chọn "Chắc chắn" đúng +50/75/100, sai −50/75/100':''} · Xếp hạng: điểm → số câu đúng${R.tie==='time'?' → tổng thời gian trả lời đúng (bằng cả ba là đồng hạng)':' (bằng nhau là đồng hạng)'} · Vinh danh khi ≥ ${R.minCorrect} câu đúng và ≥ ${R.minScore} điểm.`
 {const st=s.stageScoring||{},N=['Lớp thầy đồ','Khảo hạch','Thi Hương','Thi Hội','Thi Đình'];const ov=Object.keys(st).map(k=>`${N[k]}: ${st[k]==='accuracy'?'Chính xác':'Tốc độ'}`);if(ov.length)qs('#rulesText').textContent+=' · Luật riêng theo vòng – '+ov.join(', ')}}
function sendRules(){emit({type:'set_option',rules:{tie:qs('#optTie').value,minCorrect:Number(qs('#optMinCorrect').value)||0,minScore:Number(qs('#optMinScore').value)||0}})}
function renderHistory(s){const el=qs('#historyBox');if(!el)return;const H=s.history||[];const key=JSON.stringify(H.map(h=>h.eid));if(el.dataset.k===key)return;el.dataset.k=key;
 el.innerHTML=H.length?H.map(h=>`<div class="rank"><div><b>${new Date(h.at).toLocaleString('vi-VN')}</b> · ${escapeHtml(h.reason)}${h.rehearsal?' · 🎬 tổng duyệt':''}<div class="meta">${h.count} sĩ tử · dẫn đầu: ${h.top.map(escapeHtml).join(', ')||'—'}</div></div><a class="btn chip" href="/api/rooms/${roomPin}/history/${encodeURIComponent(h.eid)}.csv">⬇ CSV</a></div>`).join(''):'<p class="meta">Chưa có kỳ thi nào được lưu. Mỗi lần làm lại / thay đề / đổi chế độ, kết quả cũ được lưu tự động vào đây trước khi xoá điểm.</p>'}
(function mountV15(){const cp=qs('#controlPanel');if(!cp||qs('#rulesBox'))return;const d=document.createElement('details');d.className='rules-box';d.id='rulesBox';
 d.innerHTML=`<summary>⚖️ Luật điểm, xếp hạng & vinh danh (công bố trước khi thi)</summary>
 <div class="time-row"><b>Cách tính điểm:</b><select id="optScoring" class="input mini"><option value="speed">Tốc độ (như Kahoot Classic)</option><option value="accuracy">Chính xác – không tính tốc độ</option></select>
 <label class="switch"><input type="checkbox" id="optConf"> Chế độ Tự tin (sĩ tử chọn "Chắc chắn" để cược điểm)</label></div>
 <div class="time-row"><b>Luật theo vòng:</b>${['Lớp thầy đồ','Khảo hạch','Thi Hương','Thi Hội','Thi Đình'].map((n,k)=>`<label class="meta">${n}<select class="input mini" data-stsc="${k}"><option value="">theo luật chung</option><option value="speed">Tốc độ</option><option value="accuracy">Chính xác</option></select></label>`).join(' ')}</div>
 <div class="time-row"><b>Đồng điểm:</b><select id="optTie" class="input mini"><option value="time">Xét số câu đúng, rồi thời gian trả lời đúng</option><option value="shared">Chỉ xét số câu đúng – bằng nhau là đồng hạng</option></select></div>
 <div class="time-row"><b>Điều kiện vinh danh:</b> tối thiểu <input id="optMinCorrect" type="number" min="0" class="input mini" value="1"> câu đúng và <input id="optMinScore" type="number" min="0" class="input mini" value="1"> điểm <button class="btn chip" type="button" id="rulesApply">✔ Áp dụng luật</button></div>
 <div class="time-row"><label class="switch"><input type="checkbox" id="optRehearsal"> 🎬 Đây là buổi TỔNG DUYỆT (kết quả lưu riêng, ghi rõ trong báo cáo)</label> <label class="switch"><input type="checkbox" id="optBankLock"> 🔐 Khoá bộ đề đã duyệt (chặn sửa nhầm)</label> <button class="btn chip" type="button" id="bankCheck">🔎 Kiểm tra chương trình trước giờ diễn (media, tiếng, LED)</button></div>
 <div class="callout" id="rulesText"></div><div id="checkResult"></div>
 <h3>🗂 Lịch sử kỳ thi của phòng</h3><div id="historyBox"></div>`;
 cp.appendChild(d);
 qs('#optScoring').onchange=()=>emit({type:'set_option',scoring:qs('#optScoring').value});qs('#optConf').onchange=()=>emit({type:'set_option',confidence:qs('#optConf').checked});
 document.querySelectorAll('[data-stsc]').forEach(el=>el.onchange=()=>{const o={};document.querySelectorAll('[data-stsc]').forEach(x=>{if(x.value)o[x.dataset.stsc]=x.value});emit({type:'set_option',stageScoring:o})});
 qs('#rulesApply').onclick=sendRules;qs('#optTie').onchange=sendRules;qs('#optRehearsal').onchange=()=>{const on=qs('#optRehearsal').checked;const n=room?.count||0; // tổng duyệt là kỳ thi riêng: bật/tắt = lưu kỳ hiện tại vào lịch sử + bắt đầu lại từ 0 điểm
  if(!confirm(on?`BẬT TỔNG DUYỆT?\n\nKỳ thi hiện tại (nếu đã có bài nộp) được lưu vào Lịch sử, điểm ${n} sĩ tử về 0 và bắt đầu lại từ câu 1. Kết quả tổng duyệt được lưu riêng, có nhãn.`:`TẮT TỔNG DUYỆT – VÀO THI THẬT?\n\nKết quả tổng duyệt được lưu vào Lịch sử (nhãn TỔNG DUYỆT), điểm ${n} sĩ tử về 0, thi thật bắt đầu từ câu 1.`)){qs('#optRehearsal').checked=!on;return}
  emit({type:'set_option',rehearsal:on})};
 qs('#optBankLock').onchange=()=>emit({type:'bank_lock',on:qs('#optBankLock').checked});qs('#bankCheck').onclick=checkBank})();
/* Kiểm tra đề trước khi chạy: tệp media có tải được không, câu/tên quá dài, câu cần LED nhưng chưa có LED */
/* ===== Màn KIỂM TRA TRƯỚC GIỜ DIỄN (đề xuất từ phản ánh người dùng Kahoot) =====
   Từng câu có media: tải được không, trình duyệt GIẢI MÃ được không (thử nạp thật), cần tiếng hay không, LED nào sẵn sàng / bị chặn tiếng,
   và phương án dự phòng khi không phát được. */
function probeMedia(kind,src){return new Promise(res=>{let done=false;const fin=(ok,why)=>{if(done)return;done=true;res({ok,why})};setTimeout(()=>fin(false,'quá 10 giây không nạp được'),10000);
 if(kind==='image'){const im=new Image();im.onload=()=>fin(im.naturalWidth>0,im.naturalWidth?'':'ảnh rỗng');im.onerror=()=>fin(false,'không mở được ảnh');im.src=src;return}
 const el=document.createElement(kind==='audio'?'audio':'video');el.preload='metadata';el.muted=true;el.onloadedmetadata=()=>fin(true,(el.duration&&isFinite(el.duration))?`dài ${Math.round(el.duration)} giây`:'');el.onerror=()=>fin(false,'trình duyệt không giải mã được tệp');el.src=src})}
async function checkBank(){const box=qs('#checkResult');const rows=[];const leds=room?.leds||[];
 box.innerHTML='<p class="meta">⏳ Đang kiểm tra từng câu…</p>';
 for(let i=0;i<bank.length;i++){const q=bank[i],m=q.media;
  if(q.q.length>200)rows.push([i+1,'Nội dung','⚠ dài '+q.q.length+' ký tự – kiểm tra hiển thị trên LED','Rút gọn câu hỏi']);
  if(q.ai&&q.ai.some(Boolean)&&q.ai.some((x,k)=>!x&&!q.a[k]))rows.push([i+1,'Ảnh phương án','❌ có phương án trống (không chữ, không ảnh)','Thêm ảnh hoặc chữ']);
  for(const [k,u] of (q.ai||[]).entries())if(u){const r=await probeMedia('image',u);if(!r.ok)rows.push([i+1,'Ảnh phương án '+'ABCDEF'[k],'❌ '+r.why,'Tải lại ảnh'])}
  if(!m)continue;
  if(m.kind==='youtube'){rows.push([i+1,'YouTube','⚠ cần Internet tại hội trường; không kiểm tra trước được',m.gate!==false?'Nếu không phát: bấm ⏩ MỞ LƯỢT TRẢ LỜI NGAY':'Lượt trả lời mở ngay, clip chỉ minh hoạ']);continue}
  const r=await probeMedia(m.kind,m.src);const need=m.kind==='audio'||(m.kind==='video'&&!m.silentOk);
  rows.push([i+1,m.kind==='image'?'Ảnh câu hỏi':m.kind==='audio'?'Âm thanh':'Video',r.ok?('✅ sẵn sàng'+(r.why?' – '+r.why:'')+(m.kind!=='image'&&m.gate!==false?(need?' · phát xong CÓ TIẾNG mới mở lượt':' · phát xong mới mở lượt (không cần tiếng)'):'')):'❌ '+r.why,
   m.kind==='image'?(r.ok?'':'Tải lại ảnh'):(m.gate!==false?'Nếu LED không phát được / phát tắt tiếng: bấm vào LED để bật tiếng & phát lại, hoặc ⏩ MỞ LƯỢT TRẢ LỜI NGAY':'')])}
 const hasClip=bank.some(q=>q.media&&q.media.kind!=='image');
 const ledRows=leds.length?leds.map(l=>`${escapeHtml(l.label)}${l.main?' ★ màn chính':''}: ${l.sound==='on'?'🔊 có tiếng':l.sound==='blocked'?'🔇 BỊ CHẶN TIẾNG – bấm một lần vào màn LED':'🔇 đang tắt tiếng'} · 🎬 phim vinh danh ${l.film==='ready'?'đã tải & giải mã được':l.film==='error'?'⚠ LỖI':'chưa tải (bấm ⬇ Tải sẵn phim)'}`):[hasClip?'⚠ CHƯA có màn LED nào kết nối – câu có clip sẽ phải mở lượt thủ công':'Chưa có màn LED kết nối'];
 if(leds.length>1&&!leds.some(l=>l.main))ledRows.push('⚠ Có nhiều màn LED: nên chọn ★ màn chính để chỉ màn đó quyết định mở lượt');
 const bad=rows.filter(r=>/^❌/.test(r[2])).length,warn=rows.filter(r=>/^⚠/.test(r[2])).length;
 box.innerHTML=`<div class="callout ${bad?'warn':''}"><b>${bad?`❌ ${bad} vấn đề phải xử lý`:'✅ Không có lỗi media'}${warn?` · ⚠ ${warn} lưu ý`:''}</b> – ${bank.length} câu, ${bank.filter(q=>q.media).length} câu có media</div>
  <h4>🖥 Màn LED</h4><ul>${ledRows.map(x=>`<li>${x}</li>`).join('')}</ul>
  ${rows.length?`<table class="check-table"><tr><th>Câu</th><th>Media</th><th>Trạng thái</th><th>Phương án dự phòng</th></tr>${rows.map(r=>`<tr class="${/^❌/.test(r[2])?'bad':/^⚠/.test(r[2])?'warn':''}"><td>${r[0]}</td><td>${escapeHtml(r[1])}</td><td>${escapeHtml(r[2])}</td><td>${escapeHtml(r[3])}</td></tr>`).join('')}</table>`:''}`}
renderOptExtras();
/* ===== Ảnh câu hỏi kiểu Kahoot: khung lớn ngay dưới nội dung câu hỏi – bấm chọn, kéo thả, dán (Ctrl+V); ảnh phương án cũng kéo thả/dán được ===== */
function renderQiz(){const k=qs('#mediaKind').value,img=editMedia&&editMedia.kind==='image'&&k==='image'?editMedia:null;
 qs('#qizEmpty').classList.toggle('hidden',!!img||(k&&k!=='image'));qs('#qizFull').classList.toggle('hidden',!img);if(img)qs('#qizImg').src=img.src;
 qs('#mediaEdit').classList.toggle('hidden',!k);qs('#qImageZone').classList.toggle('compact',!!k&&k!=='image')}
const _showMedia=showMedia;showMedia=function(){_showMedia();renderQiz()};
const isImg=f=>f&&/^image\/(jpeg|png|gif|webp)$/.test(f.type);
async function setQuestionImage(f){if(!isImg(f))return error('Chỉ nhận ảnh JPG, PNG, GIF, WEBP');if(f.size>8e6)return error('Ảnh tối đa 8 MB');
 qs('#qizEmpty').classList.add('busy');qs('#qizEmpty').querySelector('.qiz-title').textContent='⏳ ĐANG TẢI ẢNH LÊN…';
 try{const d=await uploadFile(f);if(d.kind!=='image')throw Error('Tệp không phải ảnh');qs('#mediaKind').value='image';editMedia={kind:'image',src:d.src,where:qs('#mediaWhere').value||'both'};qs('#mediaWhere').value=editMedia.where;showMedia();error('✔ Đã gắn ảnh cho câu hỏi – nhớ bấm LƯU CÂU NÀY')}
 catch(e){error(e.message)}finally{qs('#qizEmpty').classList.remove('busy');qs('#qizEmpty').querySelector('.qiz-title').textContent='THÊM ẢNH CHO CÂU HỎI'}}
async function setOptionImage(slot,f){if(!isImg(f))return error('Phương án chỉ nhận ảnh JPG, PNG, GIF, WEBP');if(f.size>8e6)return error('Ảnh tối đa 8 MB');
 try{const d=await uploadFile(f);if(d.kind!=='image')throw Error('Tệp không phải ảnh');editAi[slot]=d.src;renderOptExtras();error(`✔ Đã gắn ảnh cho phương án ${OPT[slot]} – nhớ bấm LƯU CÂU NÀY`)}catch(e){error(e.message)}}
qs('#qizEmpty').onclick=e=>{if(e.target.closest('[data-qiz]'))return;qs('#qizFile').click()};
qs('#qizEmpty').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target===qs('#qizEmpty')){e.preventDefault();qs('#qizFile').click()}};
qs('#qizChange').onclick=()=>qs('#qizFile').click();
qs('#qizRemove').onclick=()=>{editMedia=null;qs('#mediaKind').value='';showMedia()};
qs('#qizFile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)setQuestionImage(f)};
for(const b of document.querySelectorAll('[data-qiz]'))b.onclick=()=>{const v=b.dataset.qiz;qs('#mediaKind').value=v==='url'?'image':v;if(editMedia&&editMedia.kind!==qs('#mediaKind').value)editMedia=null;showMedia();if(v==='url'||v==='youtube'){qs('#qizEmpty').classList.add('hidden');qs('#mediaEdit').classList.remove('hidden');qs('#mediaUrl').focus()}};
// kéo thả
const zone=qs('#qImageZone');['dragenter','dragover'].forEach(t=>zone.addEventListener(t,e=>{e.preventDefault();zone.classList.add('drag')}));['dragleave','drop'].forEach(t=>zone.addEventListener(t,()=>zone.classList.remove('drag')));
zone.addEventListener('drop',e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)return setQuestionImage(f);const u=(e.dataTransfer.getData('text/uri-list')||e.dataTransfer.getData('text/plain')||'').trim();if(/^https:\/\/\S+\.(jpe?g|png|gif|webp)(\?\S*)?$/i.test(u)){qs('#mediaKind').value='image';editMedia={kind:'image',src:u,where:'both'};showMedia()}});
function optSlotOf(el){const inp=el&&el.closest&&el.closest('label')?.querySelector('input[id^="edit"]');const m=inp&&inp.id.match(/^edit([A-F])$/);if(m)return OPT.indexOf(m[1]);const c=el&&el.closest&&el.closest('.opt-img-cell');return c?Number(c.dataset.slot):-1}
qs('#editorBox').addEventListener('dragover',e=>{if(optSlotOf(e.target)>=0)e.preventDefault()});
qs('#editorBox').addEventListener('drop',e=>{const s=optSlotOf(e.target);if(s<0)return;e.preventDefault();const f=e.dataTransfer.files[0];if(f)setOptionImage(s,f)});
// dán ảnh: đang ở ô phương án → ảnh phương án; còn lại → ảnh câu hỏi
document.addEventListener('paste',e=>{const box=qs('#editorBox');if(!box||box.offsetParent===null)return;const f=[...(e.clipboardData?.files||[])].find(isImg);if(!f)return;
 const ae=document.activeElement;if(ae&&ae!==document.body&&!box.contains(ae))return;e.preventDefault();const s=optSlotOf(ae);if(s>=0)setOptionImage(s,f);else setQuestionImage(f)});
// ô ảnh phương án: ghi số thứ tự để kéo thả trúng ô
const _renderOptExtras=renderOptExtras;renderOptExtras=function(){_renderOptExtras();qs('#optImgs').querySelectorAll('.opt-img-cell').forEach((c,i)=>{c.dataset.slot=i;c.title='Bấm "Thêm ảnh", kéo thả ảnh vào đây, hoặc đặt con trỏ vào ô phương án rồi dán (Ctrl+V)'})};
renderOptExtras();showMedia();

/* ===== 4.6 Ghi danh, duyệt tên, danh sách dự kiến ===== */
let rosterLoaded=false,rosterDirty=false;qs('#rosterText').addEventListener('input',()=>{rosterDirty=true});const ENTRY_NOTE={open:'',approve:'Mọi người vào phòng sẽ chờ bạn duyệt.',roster:'Người có trong danh sách vào ngay; người ngoài danh sách chờ duyệt.',roster_only:'Chỉ người trong danh sách vào được.'};
function parseRosterText(t){return t.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const parts=l.split(/\t|,|;/).map(x=>x.trim()).filter(Boolean);return parts.length>=2?{code:parts[0],name:parts.slice(1).join(' ')}:{name:parts[0]||''}}).filter(x=>x.name&&!/^(mã|ma|stt|họ tên|ho ten)$/i.test(x.name))}
function renderEntry(s){if(!s||!qs('#entryMode'))return;
 if(document.activeElement!==qs('#entryMode'))qs('#entryMode').value=s.entry||'open';if(document.activeElement!==qs('#lateMode'))qs('#lateMode').value=s.late||'allow';
 const R=s.roster;qs('#rosterStat').textContent=R?`· ${R.joined}/${R.total} đã vào`:'· chưa có';
 qs('#rosterMissing').innerHTML=R?(R.missing.length?`<b>Chưa vào (${R.total-R.joined}):</b> ${R.missing.map(escapeHtml).join(' · ')}${R.total-R.joined>R.missing.length?' …':''}`:'✔ Tất cả người trong danh sách đã vào phòng'):'';
 const items=s.pending||[],n=s.pendingCount||items.length;qs('#pendingBox').classList.toggle('hidden',!n);
 qs('#pendingTitle').textContent=`⏳ ${n} người chờ duyệt`+(ENTRY_NOTE[s.entry]?' – '+ENTRY_NOTE[s.entry]:'');
 qs('#pendingList').innerHTML=items.map(p=>`<div class="pending-row"><b>${escapeHtml(p.name)}</b><span class="meta">${p.ok?'đã duyệt – chờ kết nối lại':p.online?'đang chờ':'mất kết nối'}</span>${p.ok?'':`<button class="btn chip primary" type="button" data-ap="${p.id}">✔ Duyệt</button><button class="btn chip" type="button" data-dn="${p.id}">✖ Từ chối</button><button class="btn chip red" type="button" data-db="${p.id}">⛔ Từ chối + chặn tên</button>`}</div>`).join('')+(n>items.length?`<p class="meta">Đang hiện ${items.length}/${n}.</p>`:'');
 for(const b of qs('#pendingList').querySelectorAll('[data-ap]'))b.onclick=()=>emit({type:'approve',ids:[b.dataset.ap]});
 for(const b of qs('#pendingList').querySelectorAll('[data-dn]'))b.onclick=()=>emit({type:'deny',ids:[b.dataset.dn]});
 for(const b of qs('#pendingList').querySelectorAll('[data-db]'))b.onclick=()=>{if(confirm('Từ chối và chặn tên này trong phòng?'))emit({type:'deny',ids:[b.dataset.db],ban:true})}}
qs('#entryMode').onchange=()=>{const v=qs('#entryMode').value;if(v==='open'&&(room?.pendingCount||0)&&!confirm(`Chuyển về "Mở" sẽ cho ${room.pendingCount} người đang chờ vào luôn. Tiếp tục?`)){qs('#entryMode').value=room.entry;return}emit({type:'entry_set',entry:v})};
qs('#lateMode').onchange=()=>emit({type:'entry_set',late:qs('#lateMode').value});
qs('#approveAll').onclick=()=>emit({type:'approve',all:true});
qs('#denyAll').onclick=()=>{if(confirm(`Từ chối tất cả ${room?.pendingCount||0} người đang chờ?`))emit({type:'deny',all:true})};
qs('#rosterDetails').addEventListener('toggle',()=>{if(qs('#rosterDetails').open&&!rosterLoaded)emit({type:'roster_get'})});
qs('#rosterSave').onclick=()=>{const rows=parseRosterText(qs('#rosterText').value);if(!rows.length)return error('Danh sách đang trống');emit({type:'roster_set',rows});rosterDirty=false};
qs('#rosterClear').onclick=()=>{if(confirm('Xoá danh sách dự kiến? (Người đã vào vẫn ở trong phòng)')){qs('#rosterText').value='';emit({type:'roster_set',rows:[]})}};

/* ===== Tự lưu NHÁP soạn câu trên máy MC (phản ánh người dùng Kahoot: "đã lưu nháp mà không tìm thấy") =====
   Mỗi lần gõ/sửa trong khung soạn → lưu ngay vào bộ nhớ trình duyệt (localStorage) theo phòng + mã câu.
   Tải lại trang / mất mạng / đóng nhầm tab → mở lại câu đó sẽ được hỏi KHÔI PHỤC bản nháp. Chỉ xoá nháp khi máy chủ báo đã lưu.
   Dòng trạng thái luôn ghi rõ: bản nháp trên máy này (chưa gửi) hay đã lưu lên máy chủ. */
const QD=()=>editMode?`udika_qdraft_${roomPin}_${editMode.kind==='edit'?editMode.id:'new_'+editMode.stage}`:null;
function qdSnap(){const o={};document.querySelectorAll('#editorBox input,#editorBox select,#editorBox textarea').forEach(el=>{if(!el.id||el.type==='file')return;o[el.id]=el.type==='checkbox'?el.checked:el.value});return {f:o,media:editMedia,ai:editAi.slice(),cs:[...editCs]}}
function qdApply(d){for(const [k,v] of Object.entries(d.f||{})){const el=document.getElementById(k);if(!el)continue;if(el.type==='checkbox')el.checked=v;else el.value=v}
 editMedia=d.media||null;if(Array.isArray(d.ai))editAi=d.ai.slice();editCs=new Set(d.cs||[]);try{showKind()}catch{}try{showMedia()}catch{}try{renderOptExtras()}catch{}}
let qdTimer=null;
function qdSave(){const k=QD();if(!k)return;try{localStorage.setItem(k,JSON.stringify({at:Date.now(),...qdSnap()}));const t=new Date().toLocaleTimeString('vi-VN');const n=qs('#editorNote');if(n&&saveState!=='saving')n.textContent=`📝 Nháp tự lưu trên máy này lúc ${t} – CHƯA lưu lên máy chủ (bấm 💾 LƯU CÂU NÀY)`}catch{}}
function qdClear(mode){if(!mode)return;try{localStorage.removeItem(`udika_qdraft_${roomPin}_${mode.kind==='edit'?mode.id:'new_'+mode.stage}`)}catch{}}
function qdOffer(){const k=QD();if(!k)return;let d=null;try{d=JSON.parse(localStorage.getItem(k)||'null')}catch{}const n=qs('#editorNote');if(!d||!n)return;
 n.innerHTML=`📝 Có bản nháp CHƯA LƯU của câu này trên máy này (lúc ${escapeHtml(new Date(d.at).toLocaleString('vi-VN'))}). <button class="btn chip primary" type="button" id="qdRestore">↩ Khôi phục nháp</button><button class="btn chip" type="button" id="qdDrop">🗑 Bỏ nháp</button>`;
 qs('#qdRestore').onclick=()=>{qdApply(d);n.textContent='↩ Đã khôi phục bản nháp – kiểm tra rồi bấm 💾 LƯU CÂU NÀY'};qs('#qdDrop').onclick=()=>{try{localStorage.removeItem(k)}catch{}n.textContent='Đã bỏ bản nháp'}}
(function(){const box=qs('#editorBox');if(!box)return;const h=()=>{if(!editMode)return;clearTimeout(qdTimer);qdTimer=setTimeout(qdSave,300)};box.addEventListener('input',h);box.addEventListener('change',h)})();
{const _oe=openEdit;openEdit=function(i){_oe(i);qdOffer()};const _on=openNew;openNew=function(st){_on(st);qdOffer()}}
/* Bản nháp bộ đề (nhập JSON) cũng được giữ trên máy này tới khi máy chủ báo đã áp dụng – tải lại trang không mất */
{const _rd=renderDraft;renderDraft=function(){_rd();if(!roomPin)return;const k='udika_bankdraft_'+roomPin;try{if(draft)localStorage.setItem(k,JSON.stringify({...draft,state:draft.state==='saving'?'draft':draft.state}));else localStorage.removeItem(k)}catch{}}
 const _er=enableRoom;let restored=false;enableRoom=function(){_er();if(restored||!roomPin)return;restored=true;try{const d=JSON.parse(localStorage.getItem('udika_bankdraft_'+roomPin)||'null');if(d&&!draft&&Array.isArray(d.bank)){draft={...d,restored:true};renderDraft();const el=qs('#draftInfo');if(el)el.insertAdjacentHTML('afterbegin','<div class="meta">↩ Bản nháp được khôi phục từ máy này sau khi tải lại trang.</div>')}}catch{}}}

window.addEventListener('udika-origin',()=>{if(typeof roomPin!=='undefined'&&roomPin&&!qs('#roomPanel').classList.contains('hidden'))enableRoom()});

/* V15 #1: tổng hợp kết quả "kiểm tra máy" của sĩ tử (trang /kiem-tra) */
function renderDevices(d){const el=qs('#devSum');if(!el||!d)return;el.textContent=d.total?`${d.total} máy${d.fail?' · ❌ '+d.fail+' lỗi':''}${d.warn?' · ⚠ '+d.warn:''}`:'chưa có';
 const a=qs('#devLink');if(a&&roomPin)a.href='/api/rooms/'+roomPin+'/devices.csv';if(a)a.classList.toggle('warn',!!d.fail)}

/* MC duyệt tay câu VIẾT CÂU TRẢ LỜI: sau khi khoá câu, liệt kê các cách viết (chưa đúng trước) – bấm Chấp nhận để tính đúng cho mọi người viết như vậy */
function renderReview(rv){let box=qs('#reviewBox');if(!rv||!rv.items||!rv.items.length){if(box)box.remove();return}
 if(!box){box=document.createElement('div');box.id='reviewBox';box.className='callout review-box';const anchor=qs('#qInfo');(anchor&&anchor.parentElement||document.body).insertBefore(box,anchor?anchor.nextSibling:null)}
 const wrong=rv.items.filter(x=>!x.ok).length;
 box.innerHTML=`<b>✍️ Duyệt tay câu ${rv.idx+1}</b> – ${wrong?wrong+' cách viết đang bị chấm sai':'mọi cách viết đã đúng'}. Chấp nhận một cách viết sẽ tính đúng (theo thời gian trả lời) cho <b>tất cả</b> sĩ tử viết như vậy.
 <div class="review-list">${rv.items.map((x,i)=>`<span class="review-item ${x.ok?'ok':''}">${escapeHtml(x.text)} <span class="meta">(${x.n})</span> ${x.ok?(x.mc?`✔ MC đã duyệt <button type="button" class="link-btn" data-rv="${i}" data-on="0">bỏ</button>`:'✔'):`<button type="button" class="btn chip" data-rv="${i}" data-on="1">✔ Chấp nhận</button>`}</span>`).join('')}</div>`;
 for(const b of box.querySelectorAll('[data-rv]'))b.onclick=()=>{const it=rv.items[+b.dataset.rv],on=b.dataset.on==='1';if(!confirm(`${on?'Chấp nhận':'Bỏ chấp nhận'} "${it.text}" cho ${it.n} sĩ tử?`))return;emit({type:'accept_text',idx:rv.idx,text:it.text,on})}}
/* XEM TRƯỚC câu đang soạn (chưa lưu): dựng trạng thái giống máy chủ gửi (KHÔNG có đáp án khi đang thi) rồi hiển thị bằng đúng trang điện thoại & LED thật */
function previewQ(q,show){const k=q.kind||'mc',n=(q.a||[]).length,o={index:1,total:1,stage:q.stage,kind:k,q:q.q,a:q.a||[],t:q.t,qid:'preview'};
 if(q.media)o.media=q.media;if(q.pts!=null&&q.pts!==1)o.pts=q.pts;
 if(['mc','multi','poll','order'].includes(k)){let ids=[...Array(n).keys()];if(k==='order'||q.shuffle){ids=ids.sort(()=>Math.random()-.5)}o.ids=k==='order'?ids.map((_,i)=>i):ids;o.a=ids.map(i=>q.a[i]);if(q.ai)o.ai=ids.map(i=>q.ai[i]||'')}
 if(k==='poll'&&q.pmulti)o.pmulti=true;if(k==='multi')o.need=q.cs.length;if(k==='slider'){o.min=q.min;o.max=q.max;o.step=q.step;o.unit=q.unit||''}
 if(k==='number'){o.unit=q.unit||'';if(q.prox)o.prox=true}if(k==='mc'&&q.tf)o.tf=true;
 if(k==='fill'){const ch=Array.from(q.word);o.mask=ch.map((c,i)=>!isLetter(c)?{s:c}:q.hint.includes(i)?{h:c}:null);o.rule={loose:!!q.loose}}
 if(k==='match'){const p=[...q.r.keys()].sort(()=>Math.random()-.5);o.l=q.l;o.r=show?q.r:p.map(i=>q.r[i])}
 for(const f of ['maxPts','scoring','noStreak','tie','hideBoard','noFx','hideLive'])if(q[f]!=null)o[f]=q[f];
 if(k==='type')o.rule={caseOn:!!q.caseOn,loose:!!q.loose,punct:!!q.punct};if(q.partial||k==='match')o.partial=true;
 o.answer=null;if(show){o.answer=k==='mc'?q.c:k==='multi'?q.cs:k==='order'?q.a:k==='type'?q.acc:k==='number'||k==='slider'?{c:q.c,tol:q.tol}:k==='fill'?q.word:k==='match'?q.r:null;if(q.note)o.note=q.note}
 const N=24;if(show||(k==='poll'&&!q.hideLive)||k==='cloud'){const st={n:N,right:Math.round(N*.6)};if(['mc','multi','poll'].includes(k))st.counts=q.a.map((_,i)=>k==='mc'&&i===q.c?14:Math.round(N/(n+1)));if(k==='multi'||q.pmulti)st.multi=true;
  if(k==='type'||k==='fill')st.words=[{w:k==='fill'?q.word:(q.acc||[''])[0],n:14,ok:true},{w:'(ví dụ cách viết sai)',n:6,ok:false}];if(k==='match')st.pairs=q.l.map((_,i)=>N-3*i),st.avgPairs=Math.max(0,q.l.length-1);
  if(k==='number'||k==='slider')st.avg=q.c;if(k==='slider')st.bins=[1,2,3,5,8,5,3,2,1,0];if(k==='cloud')st.words=[{w:'Ví dụ',n:5},{w:'Ý kiến',n:3}];o.stats=st}
 o.deadline=Date.now()+q.t*1000;o.extra=0;o.scoring=q.scoring||'speed';
 const names=['Nguyễn Văn An','Trần Thị Bình','Lê Hoàng Cường','Phạm Thu Dung','Hoàng Minh Đức'];
 return {pin:roomPin||'000000',eid:'preview',title:(room&&room.title)||'Xem trước',phase:show?'reveal':'running',mode:'live',idx:0,count:N,locked:false,scoring:'speed',stageScoring:{},rules:{},progress:{idx:0,total:1,scoredDone:1},candidates:[],recentJoins:[],q:o,
  leaderboard:show?names.map((x,i)=>({rank:i+1,name:x,avatar:'📜',score:3000-i*350,correct:3-Math.floor(i/2)})):[],honors:[],teamBoard:[],boardHeld:false,holdBoard:false,
  my:show?{name:'Bạn (xem trước)',avatar:'📜',score:2300,correct:1,rank:3,answer:null}:{name:'Bạn (xem trước)',avatar:'📜',score:0,correct:0,answer:null}}}
let pvQ=null;function pvSend(){if(!pvQ)return;const st=previewQ(pvQ,qs('#previewAns').checked);for(const id of ['previewPhone','previewLed']){const f=qs('#'+id);try{f.contentWindow.postMessage({type:'udika_preview',state:st},location.origin==='null'?'*':location.origin)}catch{}}}
qs('#qPreview').onclick=()=>{const q=readForm();if(!q)return;pvQ=q;const m=qs('#previewModal');m.classList.remove('hidden');
 const ph=qs('#previewPhone'),led=qs('#previewLed');let n=0;const ready=()=>{if(++n>=2)pvSend()};
 if(!ph.dataset.on){ph.dataset.on='1';ph.onload=ready;led.onload=ready;const D=window.parent!==window&&parent.__demo&&parent.__demo.page;if(D){ph.srcdoc=parent.__demo.page('player');led.srcdoc=parent.__demo.page('led')}else{ph.src='/join?preview=1';led.src='/led?preview=1'}}else pvSend();qs('#previewClose').focus()};
qs('#previewAns').onchange=pvSend;qs('#previewClose').onclick=()=>qs('#previewModal').classList.add('hidden');
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!qs('#previewModal').classList.contains('hidden'))qs('#previewModal').classList.add('hidden')});
qs('#addSamples').onclick=async()=>{try{const r=await fetch('/mau_tro_choi.json',{cache:'no-store'});const list=await r.json();if(!confirm(`Thêm ${list.length} câu mẫu trò chơi vào cuối các chặng? (không xoá câu hiện có, không đổi điểm)`))return;importPending='append';emit({type:'q_add_many',list})}catch(e){error('Không tải được bộ câu mẫu: '+e.message)}};
