'use strict';
let lastFocusQ='',joinedPin='',playerId='',current=null,selected=false,pending=null,joinedOk=false,draft={qkey:'',order:[],text:'',value:null},feedback=null,lastSelfKey='';
const pinFromUrl=(params.get('pin')||'').replace(/\D/g,'').slice(0,6);
qs('#pin').value=pinFromUrl;
{let info=null;try{info=JSON.parse(sessionStorage.getItem('udika_room_'+pinFromUrl)||'null')}catch{}if(pinFromUrl){const n=document.createElement('div');n.className='status';n.id='roomInfo';n.textContent=`📜 Phòng ${pinFromUrl}${info&&info.title?' · '+info.title:''} – nhập họ tên để ghi danh`;qs('#joinPanel').prepend(n);setTimeout(()=>{if(!qs('#joinPanel').classList.contains('hidden'))qs('#name').focus()},60)}}
const storageKey=pin=>`udika_player_${pin}`;
const KIND_LABEL={fill:'🔠 Điền ô chữ',match:'🔗 Ghép cặp',mc:'Trắc nghiệm',multi:'☑️ Chọn nhiều đáp án',number:'🔢 Nhập số',type:'✍️ Gõ câu trả lời',order:'↕️ Sắp xếp thứ tự',poll:'📊 Khảo sát – không tính điểm',slider:'🎚 Thanh trượt',cloud:'☁️ Đám mây từ – không tính điểm'};
const SHAPES=['▲','◆','●','■','★','⬟'];const TF_SHAPES=['✔','✘'];const PREVIEW=params.get('preview')==='1'||window.__PREVIEW===1;
function tryRestore(){if(!pinFromUrl||joinedPin)return;let saved;try{saved=JSON.parse(localStorage.getItem(storageKey(pinFromUrl))||'null')}catch{}if(saved?.playerId){joinedPin=pinFromUrl;playerId=saved.playerId;qs('#name').value=saved.name||'';emit({type:'join',pin:joinedPin,name:saved.name||'Sĩ tử',avatar:qs('#avatar').value,playerId})}}
function msgError(s){qs('#errors').textContent=s;qs('#errors').style.display='block';setTimeout(()=>qs('#errors').style.display='none',6000)}
function join(){const pin=qs('#pin').value.trim();const name=qs('#name').value.trim();if(!/^\d{6}$/.test(pin)){msgError('Vui lòng nhập mã phòng gồm 6 chữ số');return}if(!name&&!qs('#code').value.trim()){msgError('Vui lòng nhập tên sĩ tử');return}let saved=null;try{saved=JSON.parse(localStorage.getItem(storageKey(pin))||'null')}catch{}joinedPin=pin;useRoomPin(pin);emit({type:'join',pin,name,code:qs('#code').value.trim(),avatar:qs('#avatar').value,playerId:saved?.playerId||''})}
qs('#joinButton').onclick=join;
/* Câu trả lời luôn kèm mã câu hỏi (qid). Giữ lại tới khi máy chủ xác nhận ĐÃ LƯU; mất mạng thì tự gửi lại khi có mạng (máy chủ không tính trùng). */
function curQid(){const s=current;if(!s)return null;return s.mode==='self'?s.my?.self?.q?.qid||null:s.q?.qid||null}
function sendAnswer(m,type='answer'){if(PREVIEW){qs('#answerNote').textContent='👁 Xem trước – bài không được gửi. Thao tác hợp lệ: '+JSON.stringify(m).slice(0,80);return}const qid=curQid();if(!qid){msgError('Câu hỏi đã đóng');return}const sid=Date.now().toString(36)+Math.random().toString(36).slice(2,8);
 pending={payload:{type,eid:current.eid,qid,sid,...m},qid,sid,at:0,tries:0};try{sessionStorage.setItem('udika_pending',JSON.stringify(pending.payload))}catch{}pushPending()}
function pushPending(){if(!pending||!joinedOk||!socket||socket.readyState!==1)return;pending.at=Date.now();pending.tries++;socket.send(JSON.stringify(pending.payload))}
setInterval(()=>{if(pending&&pending.at&&Date.now()-pending.at>3000)pushPending();else if(pending&&!pending.at)pushPending()},500);
onOpen=()=>{qs('#connection').textContent='● Trực tuyến';if(!joinedPin)tryRestore();else{let saved=null;try{saved=JSON.parse(localStorage.getItem(storageKey(joinedPin))||'null')}catch{}emit({type:'join',pin:joinedPin,name:qs('#name').value||saved?.name||'Sĩ tử',code:playerId?'':qs('#code').value.trim(),avatar:qs('#avatar').value,playerId:playerId||saved?.playerId})}};
onClose=()=>{joinedOk=false;qs('#connection').textContent=pending?'● Mất mạng – câu trả lời đang được giữ, sẽ gửi lại':'● Đang kết nối lại'};
onEvent=msg=>{
 if(msg.type==='error'){msgError(msg.message);if(!playerId){joinedPin='';qs('#joinWait').classList.add('hidden');qs('#joinButton').disabled=false}return}
 if(msg.type==='kicked'){pending=null;joinedOk=false;try{localStorage.removeItem(storageKey(joinedPin))}catch{}playerId='';joinedPin='';current=null;qs('#playPanel').classList.add('hidden');qs('#joinPanel').classList.remove('hidden');msgError(msg.message||'Bạn đã được mời rời phòng thi');return}
 if(msg.type==='pending'){qs('#joinWait').innerHTML=`⏳ ${escapeHtml(msg.message||'Đang chờ MC duyệt tên…')}<br><small>Tên gửi duyệt: <b>${escapeHtml(msg.name||'')}</b> · giữ trang này mở, bạn sẽ tự vào phòng khi được duyệt.</small>`;qs('#joinWait').classList.remove('hidden');qs('#joinButton').disabled=true;return}
 if(msg.type==='join_denied'){qs('#joinWait').classList.add('hidden');qs('#joinButton').disabled=false;joinedPin='';msgError(msg.message||'MC chưa duyệt tên này');return}
 if(msg.type==='joined'){qs('#joinWait').classList.add('hidden');qs('#joinButton').disabled=false;if(msg.name)qs('#name').value=msg.name;joinedOk=true;setTimeout(pushPending,150);joinedPin=msg.pin;playerId=msg.playerId;try{localStorage.setItem(storageKey(joinedPin),JSON.stringify({playerId,name:qs('#name').value.trim()}))}catch{}qs('#joinPanel').classList.add('hidden');qs('#playPanel').classList.remove('hidden');return}
 if(msg.type==='answer_rejected'){if(pending&&pending.qid===msg.qid){pending=null;try{sessionStorage.removeItem('udika_pending')}catch{}if(msg.retry||msg.fix){selected=false;render();if(msg.fix){const ti=qs('#typeIn');if(ti){ti.disabled=false;ti.focus();ti.select()}}}}msgError(msg.message||'Câu trả lời không được nhận');return}
 if(msg.type==='answered'){if(pending&&(!msg.qid||pending.qid===msg.qid)){pending=null;try{sessionStorage.removeItem('udika_pending')}catch{}}selected=true;feedback=msg.reveal?{answer:msg.answer,reveal:msg.reveal}:null;if(current&&current.mode!=='self')qs('#answerNote').textContent=`✔ Đã lưu bài nộp · ${(msg.answer.ms/1000).toFixed(2)} giây · đang chờ công bố`;return}
 if(msg.type==='state'){current=msg;if(!pending){try{const sp=JSON.parse(sessionStorage.getItem('udika_pending')||'null');if(sp&&sp.qid===curQid()&&!(current.my&&current.my.answer)){pending={payload:sp,qid:sp.qid,sid:sp.sid,at:0,tries:0};selected=true}else if(sp)sessionStorage.removeItem('udika_pending')}catch{}}render()}
};
/* ---------- câu trả lời: chuỗi hiển thị ---------- */
const LET='ABCDEFGH';
// q.ids[i] = MÃ phương án gốc của ô thứ i (khi MC bật xáo trộn, thứ tự ô khác thứ tự gốc). Máy chủ chấm theo MÃ.
const posOf=(q,id)=>q.ids?q.ids.indexOf(id):id;
const optLabel=(q,id)=>{const i=posOf(q,id);return i<0?'?':`${LET[i]}. ${q.a[i]||(q.ai&&q.ai[i]?'(ảnh)':'')}`};
function answerText(q){if(!q||q.answer==null)return '';const k=q.kind;
 if(k==='mc')return optLabel(q,q.answer);if(k==='multi')return q.answer.map(id=>optLabel(q,id)).join(' + ');
 if(k==='type')return q.answer.join(' / ');if(k==='order')return q.answer.map((x,i)=>`${i+1}. ${x||'(ảnh)'}`).join('  ');
 if(k==='fill')return q.answer;if(k==='match')return q.l.map((x,i)=>`${x} ↔ ${q.answer[i]}`).join(' · ');
 if(k==='slider'||k==='number')return `${fmtNum(q.answer.c)}${q.unit?' '+q.unit:''}${q.answer.tol?` (chấp nhận ±${fmtNum(q.answer.tol)})`:''}`;return ''}
/* UI-02: hiển thị tới 9 chữ số thập phân – khớp độ chính xác máy chủ chấm (đáp án 0,123456 không bị hiện thành 0,1235) */
const fmtNum=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:9,useGrouping:false});
/* UI-01: giá trị thanh trượt bám ĐÚNG lưới min + k·bước (không phải k·bước tính từ 0), làm tròn theo số chữ số thập phân của bước – tránh 0,30000000000000004 */
const slDec=s=>{const t=String(s);if(/e-/i.test(t))return Math.min(9,Number(t.split(/e-/i)[1])||0);const i=t.indexOf('.');return i<0?0:Math.min(9,t.length-i-1)};
const slSnap=(v,q)=>{const n=Math.floor((q.max-q.min)/q.step+1e-9);const k=Math.max(0,Math.min(n,Math.round((Number(v)-q.min)/q.step)));return Number((q.min+k*q.step).toFixed(Math.max(slDec(q.step),slDec(q.min))))};

function streakNote(a){return (a&&a.correct&&a.bonus?` · 🔥 chuỗi ${a.streak} câu đúng +${a.bonus}`:'')+(a&&a.boost?` · 💪 chắc chắn ${a.cf>0?'+':''}${a.cf||0}`:'')}
function mediaHtml(m,live){if(!m)return '';const onPhone=m.where!=='led';
 if(m.kind==='image'&&m.hide&&m._hidden)return '<div class="q-media-note big">🙈 Ảnh đã ẩn – hãy nhớ lại những gì bạn vừa thấy!</div>';
 if(m.kind==='image')return onPhone?`<button type="button" class="q-media-btn" data-zoom="${escapeHtml(m.src)}" aria-label="Phóng to ảnh câu hỏi"><img class="q-media" src="${escapeHtml(m.src)}" alt="${escapeHtml(m.alt||'Hình minh hoạ câu hỏi')}"><span class="zoom-hint">🔍 Chạm để phóng to</span></button>`:'<div class="q-media-note">🖼 Ảnh của câu hỏi đang chiếu trên màn hình lớn</div>';
 if(!onPhone||!live)return `<div class="q-media-note">${m.kind==='audio'?'🔊 Hãy nghe âm thanh từ loa hội trường':'🎬 Hãy xem video trên màn hình lớn'}</div>`;
 if(m.kind==='youtube')return `<div class="q-video"><iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(m.src)}?start=${Math.floor(m.start||0)}${m.end?'&end='+Math.floor(m.end):''}&rel=0&playsinline=1" allow="autoplay; encrypted-media" allowfullscreen title="Video câu hỏi"></iframe></div>`;
 const frag=m.start||m.end?`#t=${m.start||0}${m.end?','+m.end:''}`:'';
 return m.kind==='audio'?`<audio class="q-audio" src="${escapeHtml(m.src)}${frag}" controls></audio>`:`<video class="q-media" src="${escapeHtml(m.src)}${frag}" controls playsinline></video>`}
const isLetter=c=>/[\p{L}\p{N}]/u.test(c);
const optInner=(q,i)=>`${q.ai&&q.ai[i]?`<img class="opt-img" src="${escapeHtml(q.ai[i])}" alt="Phương án ${LET[i]}${q.a[i]?': '+escapeHtml(q.a[i]):''}" loading="lazy">`:''}${q.a[i]?`<span class="tile-t">${escapeHtml(q.a[i])}</span>`:''}`;
/* ---------- ô trả lời theo dạng câu ---------- */
function inputHtml(q,locked,ans,phase){
 const k=q.kind||'mc',key=(current.mode==='self'?'s':'l')+q.index+':'+(q.qid||q.deadline||0);
 if(draft.qkey!==key)draft={qkey:key,order:[...Array((q.a||[]).length).keys()],picks:[],text:'',value:k==='slider'?slSnap((q.min+q.max)/2,q):null,boost:false,pairs:k==='match'?q.l.map(()=>-1):[],selL:-1};
 const reveal=phase==='reveal'&&q.answer!=null;const ids=q.ids||(q.a||[]).map((_,i)=>i);
 if(k==='mc'||(k==='poll'&&!q.pmulti)){return `<div class="choices tiles ${reveal?'revealed':''} ${q.ai?'with-img':''}" role="group" aria-label="Các phương án">${q.a.map((x,i)=>{const id=ids[i],ok=reveal&&id===q.answer;
  return `<button class="choice tile c${i%6} ${q.tf?'tf':''} ${ans?.choice===id?'selected':''} ${ok?'correct':''} ${reveal&&!ok?'wrong':''}" ${locked?'disabled':''} data-id="${id}" aria-label="Phương án ${LET[i]}${x?': '+escapeHtml(x):''}"><span class="shape">${q.tf?TF_SHAPES[i]:SHAPES[i%6]}</span>${optInner(q,i)}${ok?'<span class="tick">✔</span>':''}</button>`}).join('')}</div>`}
 if(k==='multi'||k==='poll'){const mine=ans?ans.choices||[]:draft.picks;const want=reveal&&Array.isArray(q.answer)?q.answer:[];
  return `${!ans&&!locked?`<p class="meta">${k==='multi'?`Chọn <b>tất cả</b> đáp án đúng${q.need?` (có ${q.need} đáp án đúng)`:''} rồi bấm NỘP BÀI – được đổi lựa chọn trước khi nộp.`:'Chọn một hoặc nhiều ý kiến rồi bấm GỬI.'}</p>`:''}
  <div class="choices tiles multi ${reveal?'revealed':''} ${q.ai?'with-img':''}" role="group" aria-label="Các phương án (chọn nhiều)">${q.a.map((x,i)=>{const id=ids[i],on=mine.includes(id),ok=want.includes(id);
   return `<button class="choice tile c${i%6} ${on?'selected':''} ${reveal&&k==='multi'?(ok?'correct':'wrong'):''}" ${locked||ans?'disabled':''} data-pick="${id}" role="checkbox" aria-checked="${on}" aria-label="Phương án ${LET[i]}${x?': '+escapeHtml(x):''}"><span class="shape">${on?'☑':'☐'}</span>${optInner(q,i)}${reveal&&ok?'<span class="tick">✔</span>':''}</button>`}).join('')}</div>
  ${ans||locked?'':`<button class="btn primary submit-btn" id="pickGo" type="button" ${draft.picks.length?'':'disabled'}>${k==='multi'?'NỘP BÀI':'GỬI Ý KIẾN'} (${draft.picks.length} đã chọn)</button>`}`}
 if(k==='type'||k==='cloud'||k==='number'){if(ans)return `<div class="typed-answer">Bạn đã gửi: <b>${escapeHtml(ans.text??fmtNum(ans.value))}</b></div>`;if(locked)return '';
  const num=k==='number';return `<div class="type-box"><label class="sr-only" for="typeIn">Câu trả lời</label><input id="typeIn" class="input" ${num?'inputmode="decimal"':''} maxlength="${k==='cloud'?40:num?24:80}" placeholder="${k==='cloud'?'Một từ hoặc cụm từ ngắn':num?'Nhập số, ví dụ 12 hoặc 12,5':'Gõ câu trả lời của bạn'}" value="${escapeHtml(draft.text)}" autocomplete="off" autocapitalize="off" spellcheck="false">${num&&q.unit?`<span class="unit">${escapeHtml(q.unit)}</span>`:''}<button class="btn primary" id="typeGo" type="button">NỘP</button></div>
  ${num?'<p class="meta">Dấu thập phân "," hoặc "." · không dùng dấu phân cách hàng nghìn · không nhập phép tính.</p>':k==='type'&&q.rule?`<p class="meta">${q.rule.loose?'Chấp nhận gõ không dấu':'Cần gõ đúng dấu tiếng Việt'}${q.rule.caseOn?' · phân biệt HOA/thường':''}.</p>`:''}`}
 if(k==='order'){if(ans&&!reveal)return `<div class="typed-answer">✔ Đã nộp thứ tự của bạn.</div>`;
  if(reveal){const right=q.answer;return `<ol class="order-reveal">${right.map((x,i)=>`<li>${q.answerImg&&q.answerImg[i]?`<img class="opt-img" src="${escapeHtml(q.answerImg[i])}" alt="">`:''}${escapeHtml(x)}</li>`).join('')}</ol>`}
  if(locked)return '';
  return `<p class="meta" id="orderHelp"><b>Kéo ⠿</b> để đổi chỗ (hoặc dùng nút ▲ ▼ / phím mũi tên), xếp từ trên xuống theo đúng thứ tự, rồi bấm NỘP.</p><ol class="order-list" aria-describedby="orderHelp">${draft.order.map((d,pos)=>`<li class="order-item" data-d="${d}"><span class="order-grip" title="Giữ và kéo để đổi chỗ" aria-hidden="true">⠿</span><span class="order-no">${pos+1}</span><span class="order-t" tabindex="0" data-okey="${pos}">${optInner(q,d)}</span><span class="order-btns"><button type="button" class="btn chip" data-up="${pos}" ${pos===0?'disabled':''} aria-label="Đưa mục ${pos+1} lên">▲</button><button type="button" class="btn chip" data-down="${pos}" ${pos===draft.order.length-1?'disabled':''} aria-label="Đưa mục ${pos+1} xuống">▼</button></span></li>`).join('')}</ol><button class="btn primary submit-btn" id="orderGo" type="button">NỘP THỨ TỰ</button>`}
 if(k==='fill'){const letters=Array.from(String(reveal?q.answer:'')),typed=Array.from((ans?ans.text:draft.text)||'').filter(isLetter);let t=0,ri=0;
  const cells=q.mask.map((m,i)=>{if(m&&m.s!=null)return `<span class="fill-sep">${m.s==='-'?'-':''}</span>`;const c=reveal?letters[i]:m&&m.h?m.h:(ans?'':typed[t++]||'');
   return `<span class="fill-cell ${m&&m.h?'hint':''} ${reveal?'shown':''} ${!reveal&&!m?.h&&c?'typed':''}">${escapeHtml(c||'')}</span>`}).join('').replace(/(<span class="fill-cell[^]*?)(?=<span class="fill-sep|$)/g,'<span class="fill-word">$1</span>');
  const blanks=q.mask.filter(m=>m===null).length;
  if(ans||locked)return `<div class="fill-cells play" aria-label="Ô chữ">${cells}</div>${ans?`<div class="typed-answer">Bạn đã gửi: <b>${escapeHtml(ans.text)}</b></div>`:''}`;
  return `<div class="fill-cells play" id="fillCellsP" aria-hidden="true">${cells}</div><div class="type-box"><label class="sr-only" for="fillIn">Các chữ còn thiếu</label><input id="fillIn" class="input" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="${blanks*3+10}" placeholder="Gõ ${blanks} chữ còn thiếu theo thứ tự…" value="${escapeHtml(draft.text)}"><button class="btn primary" id="fillGo" type="button">NỘP</button></div>
   <p class="meta">Chỉ gõ các chữ ở ô trống, theo thứ tự từ trái sang phải (không gõ khoảng trắng). ${q.rule&&q.rule.loose?'Không cần gõ dấu.':'Cần gõ đúng dấu tiếng Việt.'}</p>`}
 if(k==='match'){const n=q.l.length,mine=ans&&Array.isArray(ans.pairs)?ans.pairs:null;
  if(reveal)return `<ol class="match-reveal">${q.l.map((x,i)=>`<li class="${mine?(mine[i]===i?'ok':'bad'):''}"><b>${escapeHtml(x)}</b> ↔ ${escapeHtml(q.answer[i])}${mine?(mine[i]===i?' ✔':' ✘'):''}</li>`).join('')}</ol>`;
  if(ans)return `<div class="typed-answer">✔ Đã nộp ${n} cặp ghép của bạn.</div>`;if(locked)return '';
  const used=new Map(draft.pairs.map((r,i)=>[r,i]).filter(([r])=>r>=0)),done=draft.pairs.every(x=>x>=0);
  return `<p class="meta" id="matchHelp">Chạm một mục <b>bên trái</b>, rồi chạm mục <b>bên phải</b> tương ứng để ghép. Chạm lại để đổi. Ghép đủ ${n} cặp rồi bấm NỘP.</p>
   <div class="match-grid" aria-describedby="matchHelp"><div class="match-col">${q.l.map((x,i)=>`<button type="button" class="match-item left ${draft.selL===i?'sel':''} ${draft.pairs[i]>=0?'paired p'+(i%6):''}" data-ml="${i}" aria-pressed="${draft.selL===i}"><span class="match-no">${i+1}</span>${escapeHtml(x)}</button>`).join('')}</div>
   <div class="match-col">${q.r.map((x,j)=>{const li=used.has(j)?used.get(j):-1;return `<button type="button" class="match-item right ${li>=0?'paired p'+(li%6):''}" data-mr="${j}" aria-label="${escapeHtml(x)}${li>=0?' – đang ghép với mục '+(li+1):''}">${li>=0?`<span class="match-no">${li+1}</span>`:'<span class="match-no empty">·</span>'}${escapeHtml(x)}</button>`}).join('')}</div></div>
   <button class="btn primary submit-btn" id="matchGo" type="button" ${done?'':'disabled'}>NỘP BÀI (${draft.pairs.filter(x=>x>=0).length}/${n} cặp)</button>`}
 if(k==='slider'){if(ans)return `<div class="typed-answer">Bạn chọn: <b>${fmtNum(ans.value)} ${escapeHtml(q.unit||'')}</b></div>`;if(locked)return '';
  return `<div class="slider-box"><div class="slider-val"><b id="slVal">${fmtNum(draft.value)}</b> ${escapeHtml(q.unit||'')}</div><input id="slIn" type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${draft.value}" aria-label="Chọn giá trị"><div class="row meta"><span>${fmtNum(q.min)}</span><span>${fmtNum(q.max)}</span></div>
   <div class="row"><button class="btn" type="button" data-sl="-1" aria-label="Giảm">−</button><button class="btn primary" id="slGo" type="button">CHỐT GIÁ TRỊ</button><button class="btn" type="button" data-sl="1" aria-label="Tăng">+</button></div></div>`}
 return ''}
function boostHtml(q){if(!current.confidence||!['mc','multi','type','number','order','slider'].includes(q.kind)||(q.pts===0))return '';const lv=current.my?.cf||1;
 return `<label class="boost ${draft.boost?'on':''}"><input type="checkbox" id="boostIn" ${draft.boost?'checked':''}> 💪 Chắc chắn – cược <b>±${[50,75,100][lv-1]}</b> điểm (đúng được cộng, sai bị trừ)</label>`}
function wireInputs(q,send0){
 const k=q.kind||'mc',box=qs('#choices');const send=m=>send0(current.confidence&&draft.boost?{...m,boost:true}:m);
 const bi=qs('#boostIn');if(bi)bi.onchange=()=>{draft.boost=bi.checked;bi.parentElement.classList.toggle('on',bi.checked)};
 for(const b of box.querySelectorAll('[data-id]'))b.onclick=()=>{if(selected)return;selected=true;send({choice:Number(b.dataset.id)});for(const c of box.querySelectorAll('[data-id]'))c.disabled=true;b.classList.add('selected');qs('#answerNote').textContent='Đã gửi câu trả lời. Chờ máy chủ xác nhận...'};
 for(const b of box.querySelectorAll('[data-pick]'))b.onclick=()=>{const id=Number(b.dataset.pick),p=draft.picks.indexOf(id);if(p>=0)draft.picks.splice(p,1);else draft.picks.push(id);render();const again=qs(`#choices [data-pick="${id}"]`);if(again)again.focus()};
 const pg=qs('#pickGo');if(pg)pg.onclick=()=>{if(selected||!draft.picks.length)return;selected=true;pg.disabled=true;send({choices:draft.picks.slice().sort((a,b)=>a-b)})};
 const ti=qs('#typeIn');if(ti){ti.oninput=()=>{draft.text=ti.value};let composing=false;ti.addEventListener('compositionstart',()=>composing=true);ti.addEventListener('compositionend',()=>{composing=false;draft.text=ti.value});
  const go=()=>{const v=ti.value.normalize('NFC').trim();if(!v)return msgError('Hãy nhập câu trả lời');if(k==='number'&&!/^[+\-−]?\d+([.,]\d+)?(\s*\S+)?$/.test(v))return msgError('Hãy nhập một số, ví dụ 12 hoặc 12,5');if(selected)return;selected=true;send({text:v});qs('#typeGo').disabled=true;ti.disabled=true};
  qs('#typeGo').onclick=go;ti.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing&&!composing){e.preventDefault();go()}};if(current.mode==='self'||document.activeElement===document.body)setTimeout(()=>ti.focus(),50)}
 const fi=qs('#fillIn');if(fi){const paint=()=>{const typed=Array.from(fi.value.normalize('NFC')).filter(isLetter);let t=0;for(const c of qs('#fillCellsP').querySelectorAll('.fill-cell:not(.hint)')){const v=typed[t++]||'';c.textContent=v;c.classList.toggle('typed',!!v)}};
  fi.oninput=()=>{draft.text=fi.value;paint();qs('#errors').style.display='none'};const goF=()=>{const typed=Array.from(fi.value.normalize('NFC')).filter(isLetter),need=q.mask.filter(m=>m===null).length;if(typed.length!==need)return msgError(`Cần đúng ${need} chữ cho ${need} ô trống (đang có ${typed.length})`);if(selected)return;let t=0;const full=q.mask.map(m=>m&&m.s!=null?m.s:m&&m.h?m.h:typed[t++]).join('');selected=true;send({text:full});fi.disabled=true;qs('#fillGo').disabled=true};
  qs('#fillGo').onclick=goF;fi.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();goF()}};if(document.activeElement===document.body)setTimeout(()=>fi.focus(),50)}
 for(const b of box.querySelectorAll('[data-ml]'))b.onclick=()=>{const i=+b.dataset.ml;draft.selL=i;render();const f=qs(`#choices [data-ml="${i}"]`);if(f)f.focus()};
 for(const b of box.querySelectorAll('[data-mr]'))b.onclick=()=>{const j=+b.dataset.mr;let i=draft.selL;if(i<0){const owner=draft.pairs.indexOf(j);if(owner>=0){draft.pairs[owner]=-1;draft.selL=owner;render()}else msgError('Chạm một mục bên trái trước');return}
  const prev=draft.pairs.indexOf(j);if(prev>=0)draft.pairs[prev]=-1;draft.pairs[i]=j;const nx=draft.pairs.findIndex(x=>x<0);draft.selL=nx;render()};
 const mg=qs('#matchGo');if(mg)mg.onclick=()=>{if(selected||draft.pairs.some(x=>x<0))return;selected=true;mg.disabled=true;send({pairs:draft.pairs.slice()})};
 const move=(pos,d)=>{const j=pos+d;if(j<0||j>=draft.order.length)return;[draft.order[pos],draft.order[j]]=[draft.order[j],draft.order[pos]];render();const t=qs(`#choices [data-okey="${j}"]`);if(t)t.focus()};
 for(const b of box.querySelectorAll('[data-up]'))b.onclick=()=>move(+b.dataset.up,-1);for(const b of box.querySelectorAll('[data-down]'))b.onclick=()=>move(+b.dataset.down,1);
 for(const t of box.querySelectorAll('[data-okey]'))t.onkeydown=e=>{if(e.key==='ArrowUp'){e.preventDefault();move(+t.dataset.okey,-1)}else if(e.key==='ArrowDown'){e.preventDefault();move(+t.dataset.okey,1)}};
 // kéo thả bằng ngón tay / chuột (Pointer Events): giữ ⠿ hoặc giữ cả mục, kéo lên/xuống; thả ra là chốt thứ tự mới
 const list=box.querySelector('.order-list');if(list)for(const it of list.querySelectorAll('.order-item')){
  const start=e=>{if(e.target.closest('button'))return;if(e.pointerType==='mouse'&&e.button!==0)return;const fromGrip=!!e.target.closest('.order-grip');
   let dragging=false,startY=e.clientY,tm=null;const begin=()=>{dragging=true;it.classList.add('dragging');list.classList.add('drag-on');try{it.setPointerCapture(e.pointerId)}catch{}if(navigator.vibrate)try{navigator.vibrate(15)}catch{}};
   if(fromGrip||e.pointerType==='mouse')begin();else tm=setTimeout(begin,220); // chạm giữ ngắn ở thân mục để kéo (không cản cuộn trang)
   const mv=ev=>{if(!dragging){if(Math.abs(ev.clientY-startY)>8){clearTimeout(tm);cleanup()}return}ev.preventDefault();const y=ev.clientY;it.style.transform=`translateY(${y-startY}px)`;
    const sibs=[...list.querySelectorAll('.order-item')];const idx=sibs.indexOf(it);const prev=sibs[idx-1],next=sibs[idx+1];
    if(prev){const r=prev.getBoundingClientRect();if(y<r.top+r.height/2){const h=it.getBoundingClientRect().height+8;list.insertBefore(it,prev);startY-=h;it.style.transform=`translateY(${y-startY}px)`}}
    if(next){const r=next.getBoundingClientRect();if(y>r.top+r.height/2){const h=it.getBoundingClientRect().height+8;list.insertBefore(next,it);startY+=h;it.style.transform=`translateY(${y-startY}px)`}}};
   const up=()=>{clearTimeout(tm);const was=dragging;cleanup();if(!was)return;draft.order=[...list.querySelectorAll('.order-item')].map(x=>Number(x.dataset.d));render();const t=qs(`#choices .order-item[data-d="${it.dataset.d}"] .order-t`);if(t)t.focus()};
   function cleanup(){it.classList.remove('dragging');list.classList.remove('drag-on');it.style.transform='';it.removeEventListener('pointermove',mv);it.removeEventListener('pointerup',up);it.removeEventListener('pointercancel',up)}
   it.addEventListener('pointermove',mv,{passive:false});it.addEventListener('pointerup',up);it.addEventListener('pointercancel',up)};
  it.addEventListener('pointerdown',start)}
 const og=qs('#orderGo');if(og)og.onclick=()=>{if(selected)return;selected=true;og.disabled=true;send({order:draft.order.slice()})};
 const sl=qs('#slIn');if(sl){const upd=v=>{draft.value=slSnap(v,q);sl.value=draft.value;qs('#slVal').textContent=fmtNum(draft.value)};sl.oninput=()=>upd(Number(sl.value));
  for(const b of box.querySelectorAll('[data-sl]'))b.onclick=()=>upd(Number(draft.value)+Number(b.dataset.sl)*q.step);qs('#slGo').onclick=()=>{if(selected)return;selected=true;send({value:Number(draft.value)});qs('#slGo').disabled=true}}
}
/* phóng to ảnh câu hỏi / phương án trên điện thoại */
document.addEventListener('click',e=>{const z=e.target.closest&&e.target.closest('[data-zoom]');if(!z)return;const box=qs('#zoom');box.innerHTML=`<img src="${escapeHtml(z.dataset.zoom)}" alt="Ảnh phóng to"><button type="button" class="btn" id="zoomClose">✖ Đóng</button>`;box.classList.remove('hidden');qs('#zoomClose').focus();qs('#zoomClose').onclick=()=>box.classList.add('hidden')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')qs('#zoom')?.classList.add('hidden')});
function myRankLine(s){const m=s.my;if(!m||!m.rank||!['reveal','intermission','finished'].includes(s.phase))return '';const tot=s.progress?.scoredDone||0;
 /* hiệu ứng vượt hạng: so với hạng ở lần công bố trước (lưu trên máy) – câu có tắt hiệu ứng thì bỏ qua */
 let up='';if(s.phase==='reveal'&&s.q){const key='udika_rank_'+(s.pin||'')+'_'+(s.eid||''),idx=s.q.index;let o=null;try{o=JSON.parse(sessionStorage.getItem(key)||'null')}catch{}
  if(o&&o.idx<idx&&o.rank>m.rank&&!s.q.noFx)up=` <span class="rank-up" role="status">🚀 vượt lên ${o.rank-m.rank} hạng!</span>`;if(!o||o.idx!==idx){try{sessionStorage.setItem(key,JSON.stringify({idx,rank:m.rank,up}))}catch{}}else if(o.up)up=o.up}
 return `🏅 Bạn xếp hạng <b>${fmt(m.rank)}/${fmt(s.count)}</b> — đúng <b>${m.correct}/${tot}</b> câu — <b>${fmt(m.score)}</b> điểm${m.teamRank?` · đội hạng ${m.teamRank}`:''}${up}`}
function teamHtml(s){if(!s.teams?.length||!s.my)return '';const mine=s.teams.find(t=>t.id===s.my.team);const canPick=['idle','ready'].includes(s.phase)||(s.mode==='self'&&!s.my.self?.cur&&!s.my.self?.started);
 return `<div class="team-pick"><b>Đội của bạn:</b> ${mine?`<span class="team-chip" style="--tc:${mine.color}">${escapeHtml(mine.name)}</span>`:'chưa có'}${s.my.teamRank?` · hạng đội: <b>${s.my.teamRank}</b>`:''}
  ${canPick?`<div class="team-list">${s.teams.map(t=>`<button class="team-chip ${t.id===s.my.team?'on':''}" style="--tc:${t.color}" data-team="${t.id}" type="button">${escapeHtml(t.name)}</button>`).join('')}</div>`:''}</div>`}
/* ---------- vẽ màn hình ---------- */
function render(){if(!current)return;const s=current;
 qs('#myName').textContent=s.my?`${s.my.avatar} ${s.my.name}`:'';qs('#myScore').textContent=fmt(s.my?.score)+' điểm'+(s.my?.streak>=2?` · 🔥${s.my.streak}`:'');
 qs('#teamBox').innerHTML=teamHtml(s);for(const b of qs('#teamBox').querySelectorAll('[data-team]'))b.onclick=()=>emit({type:'team_pick',team:b.dataset.team});
 if(s.mode==='self'&&s.phase!=='finished'){renderSelf(s);return}
 qs('#selfBar').classList.add('hidden');
 const q=s.q;
 qs('#stage').textContent=q?stageNames[q.stage]:'TRƯỜNG THI KHOA BẢNG';
 qs('#progress').innerHTML=s.progress&&s.progress.total?`<div class="self-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${s.progress.total}" aria-valuenow="${q?q.index:s.progress.idx}"><div style="width:${Math.round((q?q.index:s.progress.idx)/s.progress.total*100)}%"></div></div>`:'';
 qs('#myRankLine').innerHTML=myRankLine(s);
 qs('#qNumber').textContent=q?`Câu ${q.index}/${q.total} · ${KIND_LABEL[q.kind||'mc']}${q.pts>1?' · ×'+q.pts+' điểm':q.pts===0?' · không tính điểm':''}${q.tie?' · ⚖ câu quyết định khi bằng điểm':''}`:s.phase==='idle'?'Chưa khai trường':'Chờ câu tiếp theo';
 qs('#timer').textContent=s.phase==='running'?timeLeft(q):s.phase==='media'?'🎬':s.phase==='ready'?'--':'—';
 qs('#question').textContent=s.phase==='finished'?'Khoa thi đã kết thúc':s.phase==='ready'?'Quan trường đang chuẩn bị phát đề...':q?q.q:'MC chưa mở kỳ thi';
 {const hid=!!(q&&q.media&&q.media.kind==='image'&&q.media.hide&&s.phase==='running'&&q.deadline&&Date.now()>q.deadline-(q.t+(q.extra||0))*1000+q.media.hide*1000);const mk=q&&q.media?JSON.stringify([q.qid,q.media,s.phase==='reveal',hid]):'';if(qs('#qMedia').dataset.k!==mk){qs('#qMedia').dataset.k=mk;qs('#qMedia').innerHTML=q&&['running','reveal','media'].includes(s.phase)?mediaHtml(hid?{...q.media,_hidden:true}:q.media,true):''}
  if(q&&q.media&&q.media.hide&&s.phase==='running'&&!hid){clearTimeout(window._hideT);window._hideT=setTimeout(()=>{if(current===s)render()},Math.max(50,q.deadline-(q.t+(q.extra||0))*1000+q.media.hide*1000-Date.now()+30))}}
 if(q&&q.qid&&lastFocusQ!==q.qid&&s.phase==='running'){lastFocusQ=q.qid;setTimeout(()=>{const h=qs('#question');h.setAttribute('tabindex','-1');if(!document.activeElement||document.activeElement===document.body)h.focus({preventScroll:true})},30)}
 const ans=s.my?.answer;selected=!!ans;
 const show=q&&['running','reveal'].includes(s.phase);if(s.phase==='media')selected=false;
 qs('#choices').innerHTML=s.phase==='media'?'<div class="q-media-note big">🎬 Clip đang phát trên màn hình lớn – lượt trả lời sẽ mở ngay khi clip kết thúc. Hãy xem và nghe thật kỹ!</div>':show?(s.phase==='running'&&!selected?boostHtml(q):'')+inputHtml(q,s.phase!=='running'||selected,ans,s.phase):'';
 if(show&&s.phase==='running'&&!selected)wireInputs(q,m=>sendAnswer(m));
 const k=q?.kind||'mc';
 qs('#answerNote').textContent=s.phase==='running'?(ans?`✔ Đã lưu bài nộp · ${(ans.ms/1000).toFixed(2)} giây`:pending?'⏳ Đang lưu câu trả lời… (mất mạng sẽ tự gửi lại)':selected?'Đã gửi, đang đợi xác nhận...':(k==='mc'||(k==='poll'&&!q.pmulti)?'Chạm đáp án để nộp bài':'Trả lời rồi bấm NỘP')+(q.scoring==='accuracy'?' · Vòng này chấm theo ĐỘ CHÍNH XÁC (không tính tốc độ)':q.scoring==='speed'&&s.scoring==='accuracy'?' · Vòng này có THƯỞNG TỐC ĐỘ':''))
  :s.phase==='reveal'?(k==='poll'||k==='cloud'?'Cảm ơn bạn đã chia sẻ ý kiến!':`Đáp án đúng: ${answerText(q)} · ${ans?(ans.correct?'✔ Bạn đúng':ans.part?`◐ Đúng một phần (${Math.round(ans.part*100)}%)`:'✘ Bạn chưa đúng'):'Bạn chưa trả lời'} · ${fmt(ans?.points||0)} điểm${streakNote(ans)}${q.note?' · 💡 '+q.note:''}`):s.phase==='media'?'Lượt trả lời chưa mở':'Chờ quan trường điều khiển';
 qs('#stateNote').textContent=s.phase==='idle'?'Đã ghi danh. Chờ MC khai trường.':s.phase==='media'?'🎬 Đang phát clip của câu hỏi':s.phase==='running'?'⏳ Câu hỏi đang diễn ra'+(q&&q.extra?` · MC đã cộng thêm ${q.extra} giây`:''):s.phase==='reveal'?'🏅 Đã công bố bảng vàng – chờ MC chuyển câu':s.phase==='finished'?'📯 Xướng danh Tam khôi':s.phase==='intermission'?'🎉 Quan trường đang chúc mừng kết thúc chặng thi':'Chờ MC mở câu hỏi tiếp theo';
 const stagePanel=qs('#stagePassedPanel');stagePanel.classList.toggle('hidden',s.phase!=='intermission');if(s.phase==='intermission'){const result=s.my?.passedStage;stagePanel.innerHTML=result?(result.passed?'<div class="personal-main">🎉 CHÚC MỪNG BẠN ĐÃ THI ĐỖ!</div>':'<div class="personal-main">📜 BẠN ĐÃ HOÀN THÀNH CHẶNG THI</div>')+'<div class="personal-title">'+escapeHtml(stageNames[result.stage])+'</div><p>'+escapeHtml(result.passed?'Gia đình, họ hàng và thầy đồ vô cùng tự hào về bạn!':'Hãy cố gắng hơn ở chặng thi tiếp theo!')+'</p><p>Trả lời đúng '+result.correct+'/'+result.total+' câu</p>':'';}
 renderFinal(s);
}
function renderFinal(s){qs('#finalPanel').classList.toggle('hidden',s.phase!=='finished');if(s.phase!=='finished')return;
 qs('#finalRanks').innerHTML=renderRanks(s.leaderboard,10)+(s.teamBoard?.length?'<h3>🏳 Bảng xếp hạng đội</h3>'+renderTeams(s.teamBoard):'');
 if(s.boardHeld){qs('#finalRanks').innerHTML='';qs('#myHonorMessage').innerHTML='<div class="personal-main">🥁 KHOA THI ĐÃ KẾT THÚC</div><div>Xin chờ quan trường xướng danh Tam khôi trên màn hình lớn…</div>';return}
 const honor=(s.honors||[]).find(p=>p.rank===s.my?.finalRank);
 qs('#myHonorMessage').innerHTML=honor?`<div class="personal-med">${scholarFigure(honor.rank===1?'trang-nguyen':honor.rank===2?'bang-nhan':'tham-hoa')}</div><div class="personal-main">CHÚC MỪNG SĨ TỬ ${escapeHtml(honor.name)}</div><div class="personal-title">BẠN ĐÃ THI ĐỖ ${escapeHtml(honor.title.toUpperCase())}!</div><div>Đạt ${fmt(honor.score)} điểm · ${honor.correct} câu trả lời đúng</div><div class="personal-footer">📯 VINH QUY BÁI TỔ · RẠNG DANH KHOA BẢNG</div>`:`<div class="personal-main">KHOA THI ĐÃ KHÉP LẠI</div><div>Cảm ơn sĩ tử ${escapeHtml(s.my?.name||'')} đã tham gia${s.my?.finalRank?` – bạn xếp hạng <b>${s.my.finalRank}</b>`:''}. Hãy xem bảng vàng để biết kết quả!</div>`;
}
/* ---------- chế độ tự làm bài (giao bài về nhà) ---------- */
function renderSelf(s){const v=s.my?.self;if(!v)return;qs('#selfBar').classList.remove('hidden');qs('#finalPanel').classList.add('hidden');qs('#stagePassedPanel').classList.add('hidden');
 const dl=v.deadline?new Date(v.deadline).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}):'không giới hạn';
 qs('#selfBar').innerHTML=`<div class="self-progress"><div style="width:${Math.round(v.cur/v.total*100)}%"></div></div><div class="row meta"><span>📝 Bài tự làm · ${v.cur}/${v.total} câu</span><span>⏰ Hạn nộp: ${escapeHtml(dl)}</span></div>`;
 const q=v.q;qs('#stage').textContent=q?stageNames[q.stage]:'BÀI TỰ LÀM';
 if(s.phase!=='self'){qs('#qNumber').textContent='Bài chưa mở';qs('#question').textContent='MC chưa mở bài tự làm. Hãy quay lại sau.';qs('#choices').innerHTML='';qs('#qMedia').innerHTML='';qs('#timer').textContent='—';qs('#answerNote').textContent='';qs('#stateNote').textContent='Đã ghi danh – chờ mở bài';return}
 if(v.done&&v.hidden){qs('#qNumber').textContent='Đã hoàn thành';qs('#timer').textContent='✔';qs('#qMedia').innerHTML='';qs('#question').textContent=`Bạn đã nộp đủ ${v.total} câu.`;qs('#choices').innerHTML='<div class="personal-honor"><div class="personal-main">🔒 KẾT QUẢ ĐANG ĐƯỢC GIỮ KÍN</div><div>Điểm, đáp án đúng và thứ hạng sẽ công bố khi MC đóng bài – để không ai chuyền được đáp án cho người làm sau.</div></div>';qs('#answerNote').textContent='';qs('#stateNote').textContent='🎉 Đã nộp toàn bộ bài';return}
 if(v.done){qs('#qNumber').textContent='Đã hoàn thành';qs('#timer').textContent='✔';qs('#qMedia').innerHTML='';qs('#question').textContent=`Bạn đã làm xong ${v.total} câu · ${fmt(s.my.score)} điểm · ${s.my.correct} câu đúng`;
  qs('#choices').innerHTML=(s.my.rank?`<div class="personal-honor"><div class="personal-main">XẾP HẠNG TẠM THỜI: ${s.my.rank}/${s.count}</div><div>Bảng vàng chính thức được xướng danh khi MC đóng bài.</div></div>`:'')+renderRanks(s.leaderboard,10);
  qs('#answerNote').textContent='';qs('#stateNote').textContent='🎉 Đã nộp toàn bộ bài';return}
 if(!q){const last=v.last;const lk='last'+v.cur;
  qs('#qNumber').textContent=`Câu ${v.cur+1}/${v.total}`;qs('#timer').textContent='▶';qs('#qMedia').innerHTML='';
  qs('#question').textContent=last?(last.skipped?'Bạn đã bỏ qua câu vừa rồi.':last.poll?'Đã ghi nhận ý kiến của bạn.':last.hidden?'✔ Đã lưu câu trả lời. Đáp án và điểm công bố khi MC đóng bài.':last.correct?`✔ Chính xác! +${fmt(last.points)} điểm${streakNote(last)}`:'✘ Chưa đúng.'):'Sẵn sàng làm bài? Mỗi câu có đồng hồ riêng, bắt đầu khi bạn bấm nút.';
  qs('#choices').innerHTML=(last&&!last.poll&&last.reveal?.answer!=null?`<div class="reveal-box">Đáp án đúng: <b>${escapeHtml(answerText(last.reveal))}</b>${last.reveal.note?`<div class="meta">💡 ${escapeHtml(last.reveal.note)}</div>`:''}</div>`:'')+`<button class="btn primary" id="selfGo" type="button" style="width:100%">${last?'▶ CÂU TIẾP THEO':'▶ BẮT ĐẦU LÀM BÀI'} (câu ${v.cur+1})</button>`;
  qs('#selfGo').onclick=()=>{qs('#selfGo').disabled=true;emit({type:'self_start'})};qs('#answerNote').textContent='';qs('#stateNote').textContent='Tự làm bài – không cần MC';return}
 qs('#qNumber').textContent=`Câu ${q.index}/${q.total} · ${KIND_LABEL[q.kind||'mc']}`;qs('#timer').textContent=timeLeft(q);qs('#question').textContent=q.q;qs('#qMedia').innerHTML=q.media?mediaHtml({...q.media,where:'both'},true):'';
 const key='q'+q.index+':'+q.deadline;if(lastSelfKey!==key){lastSelfKey=key;selected=false}
 qs('#choices').innerHTML=(selected?'':boostHtml(q))+inputHtml(q,selected,null,'running')+`<button class="btn secondary" id="selfSkip" type="button">Bỏ qua câu này</button>`;
 if(!selected)wireInputs(q,m=>sendAnswer(m));qs('#selfSkip').onclick=()=>{if(selected)return;selected=true;sendAnswer({},'self_skip')};
 qs('#answerNote').textContent=selected?'Đã gửi…':'Trả lời trước khi hết giờ';qs('#stateNote').textContent='⏳ Đang làm câu '+q.index;
}
function selfVideo(m){if(m.kind==='youtube')return `<div class="q-video"><iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(m.src)}?start=${m.start||0}&rel=0" allow="autoplay; encrypted-media" allowfullscreen title="Video câu hỏi"></iframe></div>`;return `<video class="q-media" src="${escapeHtml(m.src)}" controls playsinline></video>`}
function renderTeams(tb){return tb.map(t=>`<div class="rank"><span class="no" style="color:${t.color}">${['🥇','🥈','🥉'][t.rank-1]||t.rank}</span><div><b>${escapeHtml(t.name)}</b><div class="meta">${t.members} thành viên · ${t.correct} câu đúng</div></div><span class="pts">${fmt(t.score)} điểm TB</span></div>`).join('')}
setInterval(()=>{const s=current;if(!s)return;let q=null;if(s.mode==='self'&&s.phase==='self')q=s.my?.self?.q;else if(s.phase==='running')q=s.q;
 if(q){const sec=timeLeft(q);qs('#timer').textContent=sec;qs('#timer').classList.toggle('hot',sec<=5);if(s.mode==='self'&&sec<=0&&!selected){selected=true;sendAnswer({},'self_skip')}}},170);
if(PREVIEW){qs('#joinPanel').classList.add('hidden');qs('#playPanel').classList.remove('hidden');qs('#connection').textContent='👁 Xem trước';
 window.addEventListener('message',e=>{if((e.origin!==location.origin&&window.__PREVIEW!==1)||!e.data||e.data.type!=='udika_preview')return;current=e.data.state;selected=false;draft={qkey:''};render()})}
else connect();

{const a=document.getElementById('checkLink');const pp=(new URLSearchParams(location.search).get('pin')||'').replace(/\D/g,'');if(a&&/^\d{6}$/.test(pp))a.href='/kiem-tra?pin='+pp}
