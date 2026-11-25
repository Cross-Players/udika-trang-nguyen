'use strict';
/* UI-01: giá trị thanh trượt bám ĐÚNG lưới min + k·bước (không phải k·bước tính từ 0), làm tròn theo số chữ số thập phân của bước – tránh 0,30000000000000004 */
const slDec=s=>{const t=String(s);if(/e-/i.test(t))return Math.min(9,Number(t.split(/e-/i)[1])||0);const i=t.indexOf('.');return i<0?0:Math.min(9,t.length-i-1)};
const slSnap=(v,q)=>{const n=Math.floor((q.max-q.min)/q.step+1e-9);const k=Math.max(0,Math.min(n,Math.round((Number(v)-q.min)/q.step)));return Number((q.min+k*q.step).toFixed(Math.max(slDec(q.step),slDec(q.min))))};

/* UDIKA – Chơi thử một mình với đối thủ ảo (luyện tập).
   Chạy hoàn toàn trên trình duyệt với bộ đề LUYỆN TẬP (bộ mẫu hoặc bộ Admin bật "Chơi thử công khai"); không gửi điểm lên máy chủ,
   không liên quan tới bất kỳ phòng thi thật nào. Cách chấm giống máy chủ (chế độ Tốc độ + thưởng chuỗi). */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:9});const LET='ABCDEF',SHAPES=['▲','◆','●','■'];
const BOT_NAMES=['Lê Minh Châu','Phạm Đức Dũng','Hoàng Gia Huy','Vũ Ngọc Lan','Đặng Quốc Khánh','Bùi Thu Hà','Đỗ Hải Nam','Ngô Bảo Ngọc','Trịnh Văn Long','Phan Thảo My','Lý Thanh Tùng','Mai Anh Thư','Tạ Quang Vinh','Cao Thị Hiền','Lâm Tuấn Kiệt','Dương Khánh Linh','Hồ Minh Triết','Kiều Phương Anh','Tống Gia Bảo','Quách Hữu Phước'];
let SETS=[],game=null,timer=null;
/* ---- chấm điểm: giống máy chủ ---- */
/* giống máy chủ (server.js): giữ dấu có nghĩa, so số theo thập phân chính xác */
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
function parseNum(text,unit){let s=String(text??'').normalize('NFC').trim().replace(/−/g,'-');if(unit&&s.toLowerCase().endsWith(unit.toLowerCase()))s=s.slice(0,s.length-unit.length).trim();
 const m=/^([+-]?)(\d+)(?:([.,])(\d+))?$/.exec(s);if(!m)throw Error('Hãy nhập một số, ví dụ 12 hoặc 12,5');if(m[4]&&m[4].length===3&&Number(m[2])!==0)throw Error(`"${s}" không rõ là số thập phân hay hàng nghìn – hãy viết lại`);
 return Number(m[1]+m[2]+(m[4]?'.'+m[4]:''))}
function judge(q,ans){const k=q.kind||'mc';
 if(k==='mc')return ans.choice===q.c;
 if(k==='multi'){const a=[...ans.choices].sort((x,y)=>x-y);return a.length===q.cs.length&&a.every((x,i)=>x===q.cs[i])}
 if(k==='type'){const me=normAnswer(ans.text,q);return !!me&&q.acc.some(x=>normAnswer(x,q)===me)}
 if(k==='number')return numClose(ans.value,q.c,q.tol||0);
 if(k==='order')return ans.order.every((x,i)=>x===i);
 if(k==='slider')return numClose(ans.value,q.c,q.tol||0);return false}
const speedPts=(ms,T,mult)=>Math.round(Math.max(300,1000*(.3+.7*(1-Math.min(ms,T)/T)))*mult);
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function answerText(q){const k=q.kind||'mc';if(k==='mc')return `${LET[q.c]}. ${q.a[q.c]||'(ảnh)'}`;if(k==='multi')return q.cs.map(i=>`${LET[i]}. ${q.a[i]||'(ảnh)'}`).join(' + ');
 if(k==='type')return q.acc.join(' / ');if(k==='number'||k==='slider')return `${fmt(q.c)}${q.unit?' '+q.unit:''}${q.tol?` (±${fmt(q.tol)})`:''}`;if(k==='order')return q.a.map((x,i)=>`${i+1}. ${x}`).join('  ');return ''}
/* ---- chuẩn bị ---- */
async function load(){try{const r=await fetch('/api/practice');const d=await r.json();SETS=d.items||[];
 $('#pSet').innerHTML=SETS.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${s.count} câu</option>`).join('');
 if(!SETS.length){$('#pSet').innerHTML='<option value="">Chưa có bộ luyện tập nào</option>';$('#pStart').disabled=true;$('#pMsg').textContent='Hiện chưa có bộ đề luyện tập. Ban tổ chức cần bật "Chơi thử công khai" cho một bộ đề trong trang Quản trị.'}}catch{$('#pSet').innerHTML='<option value="">Không tải được danh sách bộ đề</option>'}
 try{const n=localStorage.getItem('udika_practice_name');if(n)$('#pName').value=n}catch{}}
$('#pStart').onclick=async()=>{const name=$('#pName').value.normalize('NFC').trim();if(!name){$('#pMsg').textContent='Hãy nhập tên của bạn';$('#pName').focus();return}
 try{localStorage.setItem('udika_practice_name',name)}catch{}
 $('#pMsg').textContent='⏳ Đang tải bộ đề…';$('#pStart').disabled=true;
 try{const r=await fetch('/api/practice/'+encodeURIComponent($('#pSet').value));const d=await r.json();if(!r.ok)throw Error(d.error||'Không tải được bộ đề');
  let qs=d.bank.filter(q=>!['poll','cloud'].includes(q.kind||'mc')&&(q.pts??1)>0);const n=Number($('#pCount').value);if(n)qs=shuffle(qs).slice(0,n);
  if(!qs.length)throw Error('Bộ đề không có câu tính điểm');start(name,d.name,qs)}catch(e){$('#pMsg').textContent='⚠ '+e.message}finally{$('#pStart').disabled=false}};
function start(name,setName,qs,isReview){const nb=Number($('#pBots').value),lv=Number($('#pLevel').value);
 game={name,setName,qs,i:0,score:0,correct:0,streak:0,wrong:[],review:!!isReview,lastRank:null,
  bots:shuffle(BOT_NAMES).slice(0,isReview?0:nb).map(n=>({name:'🤖 '+n,skill:Math.min(.97,Math.max(.15,lv+(Math.random()-.5)*.3)),speed:.25+Math.random()*.5,score:0,correct:0,streak:0}))};
 $('#setup').classList.add('hidden');$('#end').classList.add('hidden');$('#play').classList.remove('hidden');ask()}
/* ---- một câu ---- */
let cur=null;
function ask(){const q=game.qs[game.i];const T=q.t*1000;const ids=q.shuffle&&q.kind!=='order'?shuffle(q.a.map((_,i)=>i)):q.a.map((_,i)=>i);
 cur={q,T,start:performance.now(),done:false,ids,picks:[],order:q.kind==='order'?shuffle(q.a.map((_,i)=>i)):null,value:q.kind==='slider'?slSnap((q.min+q.max)/2,q):null};
 if(cur.order&&cur.order.every((x,i)=>x===i)&&cur.order.length>1)[cur.order[0],cur.order[1]]=[cur.order[1],cur.order[0]];
 $('#qNo').textContent=`Câu ${game.i+1}/${game.qs.length}`;$('#qScore').textContent=fmt(game.score)+' điểm';$('#qBar').style.width=Math.round(game.i/game.qs.length*100)+'%';
 $('#qText').textContent=q.q;$('#qFeedback').classList.add('hidden');$('#qFeedback').innerHTML='';
 $('#qMedia').innerHTML=q.media&&q.media.kind==='image'?`<button class="pr-img" type="button" data-zoom="${esc(q.media.src)}" aria-label="Phóng to ảnh"><img src="${esc(q.media.src)}" alt="${esc(q.media.alt||'Ảnh của câu hỏi')}"><span>🔍 Chạm để phóng to</span></button>`:q.media?'<p class="pr-note">🎬 Câu gốc có video/âm thanh – bản chơi thử chỉ hiện nội dung chữ.</p>':'';
 renderInput();$('#qText').focus({preventScroll:true});clearInterval(timer);tick();timer=setInterval(tick,200)}
function tick(){const left=Math.max(0,cur.T-(performance.now()-cur.start));$('#qTimer').textContent=Math.ceil(left/1000);$('#qTimer').classList.toggle('low',left<5000);if(left<=0&&!cur.done)finish(null)}
const optHtml=(q,i)=>`${q.ai&&q.ai[i]?`<img src="${esc(q.ai[i])}" alt="Phương án ${LET[i]}">`:''}${q.a[i]?`<span>${esc(q.a[i])}</span>`:''}`;
function renderInput(){const q=cur.q,k=q.kind||'mc',box=$('#qInput');
 if(k==='mc'||k==='multi'){box.innerHTML=`${k==='multi'?`<p class="pr-note">Chọn <b>tất cả</b> đáp án đúng (${q.cs.length} đáp án) rồi bấm NỘP.</p>`:''}<div class="pr-tiles ${q.ai?'img':''}">${cur.ids.map((id,pos)=>`<button type="button" class="pr-tile t${pos%4} ${cur.picks.includes(id)?'on':''}" data-id="${id}" ${k==='multi'?`role="checkbox" aria-checked="${cur.picks.includes(id)}"`:''}><b>${k==='multi'?(cur.picks.includes(id)?'☑':'☐'):SHAPES[pos%4]}</b>${optHtml(q,id)}</button>`).join('')}</div>${k==='multi'?`<button class="pr-btn" id="goMulti" type="button" ${cur.picks.length?'':'disabled'}>NỘP (${cur.picks.length} đã chọn)</button>`:''}`;
  box.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{if(cur.done)return;const id=Number(b.dataset.id);if(k==='mc')return finish({choice:id});const p=cur.picks.indexOf(id);p>=0?cur.picks.splice(p,1):cur.picks.push(id);renderInput()});
  const g=$('#goMulti');if(g)g.onclick=()=>finish({choices:cur.picks.slice()});return}
 if(k==='type'||k==='number'){box.innerHTML=`<div class="pr-type"><input id="tIn" class="pr-input" ${k==='number'?'inputmode="decimal"':''} autocomplete="off" placeholder="${k==='number'?'Nhập số, ví dụ 12 hoặc 12,5':'Gõ câu trả lời'}">${q.unit?`<span>${esc(q.unit)}</span>`:''}<button id="tGo" class="pr-btn" type="button">NỘP</button></div><p class="pr-note" id="tMsg" role="alert"></p>`;
  const go=()=>{const v=$('#tIn').value.trim();if(!v)return;if(k==='number'){try{finish({value:parseNum(v,q.unit),text:v})}catch(e){$('#tMsg').textContent=e.message}}else finish({text:v})};
  $('#tGo').onclick=go;$('#tIn').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();go()}};setTimeout(()=>$('#tIn').focus(),30);return}
 if(k==='order'){box.innerHTML=`<p class="pr-note">Dùng ▲▼ xếp từ trên xuống theo đúng thứ tự, rồi bấm NỘP.</p><ol class="pr-order">${cur.order.map((d,pos)=>`<li><b>${pos+1}</b><span>${optHtml(q,d)}</span><button type="button" data-u="${pos}" ${pos?'':'disabled'} aria-label="Lên">▲</button><button type="button" data-d="${pos}" ${pos<cur.order.length-1?'':'disabled'} aria-label="Xuống">▼</button></li>`).join('')}</ol><button class="pr-btn" id="goOrder" type="button">NỘP THỨ TỰ</button>`;
  const mv=(p,d)=>{const j=p+d;[cur.order[p],cur.order[j]]=[cur.order[j],cur.order[p]];renderInput()};box.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>mv(+b.dataset.u,-1));box.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>mv(+b.dataset.d,1));
  $('#goOrder').onclick=()=>finish({order:cur.order.slice()});return}
 if(k==='slider'){box.innerHTML=`<div class="pr-slider"><div><b id="sV">${fmt(cur.value)}</b> ${esc(q.unit||'')}</div><input id="sIn" type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${cur.value}" aria-label="Chọn giá trị"><button class="pr-btn" id="goS" type="button">CHỐT GIÁ TRỊ</button></div>`;
  $('#sIn').oninput=()=>{cur.value=slSnap($('#sIn').value,q);$('#sV').textContent=fmt(cur.value)};$('#goS').onclick=()=>finish({value:cur.value});return}}
/* ---- chấm, đối thủ ảo, phản hồi ---- */
function finish(ans){if(cur.done)return;cur.done=true;clearInterval(timer);const q=cur.q,mult=q.pts??1,ms=performance.now()-cur.start;
 const ok=ans?judge(q,ans):false;let pts=0,bonus=0;if(ok){pts=speedPts(ms,cur.T,mult);game.streak++;bonus=Math.min(game.streak-1,5)*100*(mult>0?1:0);game.correct++}else{game.streak=0;game.wrong.push(q)}
 game.score+=pts+bonus;
 for(const b of game.bots){if(Math.random()<b.skill){b.streak++;b.correct++;b.score+=speedPts(cur.T*(b.speed+(Math.random()-.5)*.3),cur.T,mult)+Math.min(b.streak-1,5)*100}else b.streak=0}
 const board=[{name:game.name+' (bạn)',score:game.score,correct:game.correct,me:true},...game.bots].sort((a,b)=>b.score-a.score||b.correct-a.correct);const rank=board.findIndex(x=>x.me)+1;
 const move=game.lastRank?game.lastRank-rank:0;game.lastRank=rank;
 // đánh dấu đúng/sai trên các ô
 $('#qInput').querySelectorAll('[data-id]').forEach(b=>{const id=Number(b.dataset.id);const right=q.kind==='mc'?id===q.c:q.cs?q.cs.includes(id):false;b.classList.add(right?'right':'wrong');b.disabled=true});
 $('#qInput').querySelectorAll('button,input').forEach(x=>x.disabled=true);
 const top=board.slice(0,5);const meIn=top.some(x=>x.me);
 $('#qFeedback').innerHTML=`<div class="pr-verdict ${ok?'ok':ans?'no':'late'}">${ok?`✔ Chính xác! +${fmt(pts)}${bonus?` · 🔥 chuỗi ${game.streak} +${bonus}`:''}`:ans?'✘ Chưa đúng':'⏰ Hết giờ!'}</div>
  ${ok?'':`<p><b>Đáp án đúng:</b> ${esc(answerText(q))}</p>`}${q.note?`<p class="pr-note">💡 ${esc(q.note)}</p>`:''}
  ${game.review?'':`<div class="pr-me" role="status">🏅 Bạn đang xếp hạng <b>${rank}/${board.length}</b> — đúng ${game.correct}/${game.i+1} câu — <b>${fmt(game.score)}</b> điểm${move>0?` · <span class="up">▲ Tăng ${move} hạng</span>`:move<0?` · <span class="down">▼ Giảm ${-move} hạng</span>`:''}</div>
  <ol class="pr-board">${top.map((x,i)=>`<li class="${x.me?'me':''}"><b>${i+1}</b><span>${esc(x.name)}</span><em>${fmt(x.score)}</em></li>`).join('')}${meIn?'':`<li class="me gap"><b>${rank}</b><span>${esc(game.name)} (bạn)</span><em>${fmt(game.score)}</em></li>`}</ol>`}
  <button class="pr-btn" id="nextQ" type="button">${game.i+1<game.qs.length?'CÂU TIẾP ▶':'XEM KẾT QUẢ 🏆'}</button>`;
 $('#qFeedback').classList.remove('hidden');$('#qScore').textContent=fmt(game.score)+' điểm';$('#nextQ').focus();game.board=board;game.rank=rank;
 $('#nextQ').onclick=()=>{game.i++;if(game.i<game.qs.length)ask();else end()}}
function end(){$('#play').classList.add('hidden');const g=game,b=g.board||[],medal=g.review?'':g.rank===1?'🥇':g.rank===2?'🥈':g.rank===3?'🥉':'📜';
 $('#end').innerHTML=`<div class="pr-medal">${medal||'📝'}</div><h2>${g.review?'Đã ôn xong các câu sai':g.rank<=3?['Trạng nguyên','Bảng nhãn','Thám hoa'][g.rank-1]+' của lượt chơi thử!':'Hoàn thành lượt chơi thử'}</h2>
  ${g.review?'':`<p class="pr-me">Bạn xếp hạng <b>${g.rank}/${b.length}</b> — đúng <b>${g.correct}/${g.qs.length}</b> câu — <b>${fmt(g.score)}</b> điểm</p>`}
  ${g.wrong.length?`<details class="pr-wrong" open><summary>Ôn lại ${g.wrong.length} câu chưa đúng</summary>${g.wrong.map(q=>`<div><b>${esc(q.q)}</b><br>Đáp án: ${esc(answerText(q))}${q.note?`<br><span class="pr-note">💡 ${esc(q.note)}</span>`:''}</div>`).join('')}</details>`:'<p>🎉 Bạn trả lời đúng tất cả!</p>'}
  <p class="pr-note">Đây là lượt LUYỆN TẬP: điểm chỉ lưu trên máy bạn, không tính vào kỳ thi nào.</p>
  <div class="pr-row">${g.wrong.length?'<button class="pr-btn" id="redoWrong" type="button">🔁 Làm lại câu sai</button>':''}<button class="pr-btn alt" id="again" type="button">🎮 Chơi lại</button><a class="pr-btn alt" href="/">🏮 Vào phòng thi thật</a></div>`;
 $('#end').classList.remove('hidden');$('#end h2').setAttribute('tabindex','-1');$('#end h2').focus();
 $('#again').onclick=()=>{$('#end').classList.add('hidden');$('#setup').classList.remove('hidden')};
 const rw=$('#redoWrong');if(rw)rw.onclick=()=>start(g.name,g.setName,g.wrong.slice(),true);
 try{const h=JSON.parse(localStorage.getItem('udika_practice_hist')||'[]');h.unshift({at:Date.now(),set:g.setName,score:g.score,correct:g.correct,total:g.qs.length,rank:g.rank,players:b.length});localStorage.setItem('udika_practice_hist',JSON.stringify(h.slice(0,20)))}catch{}}
document.addEventListener('click',e=>{const z=e.target.closest&&e.target.closest('[data-zoom]');if(!z)return;$('#zoom').innerHTML=`<img src="${esc(z.dataset.zoom)}" alt="Ảnh phóng to"><button type="button" class="pr-btn" id="zc">✖ Đóng</button>`;$('#zoom').classList.remove('hidden');$('#zc').focus();$('#zc').onclick=()=>$('#zoom').classList.add('hidden')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#zoom').classList.add('hidden')});
load();
