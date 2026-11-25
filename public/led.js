'use strict';
let lastSea={figs:-1,per:1};try{new ResizeObserver(()=>{if(lastSea.figs>=0)drawCrowdSea(qs('#crowdSea'),lastSea.figs)}).observe(qs('#crowdSea'))}catch{}
let pin=(params.get('pin')||'').replace(/\D/g,''),current=null,joined=false,lastScene=null,lastCrowd='',lastPhase=null,lastIdx=null,lastTick=null,lastVQ='';
qs('#pinInput').value=pin;
function enter(){pin=qs('#pinInput').value.trim();if(!/^\d{6}$/.test(pin)){qs('#error').textContent='Mã phòng gồm 6 chữ số';qs('#error').style.display='block';return}joined=true;useRoomPin(pin);emit({type:'watch',pin})}
qs('#enterBtn').onclick=enter;
onOpen=()=>{if(joined)emit({type:'watch',pin})};
onEvent=msg=>{if(msg.type==='vq'){if(msg.cmd==='replay'||msg.cmd==='rehearse')vqPending=null;if(window.VQAnim)VQAnim.command(msg.cmd,msg.v);return}if(msg.type==='vq_sync'){vqSync(msg);return}if(msg.type==='error'){qs('#error').textContent=msg.message;qs('#error').style.display='block';return}if(msg.type==='state'){current=msg;qs('#enter').classList.add('hidden');qs('#display').classList.remove('hidden');render()}};
function render(){const s=current,q=s.q;
{const prev=lastPhase,prevIdx=lastIdx;lastPhase=s.phase;lastIdx=s.idx;
 if(prev!==null){if(s.phase==='running'&&(prev!=='running'||prevIdx!==s.idx)){Sfx.play('start');lastTick=null}
  else if(s.phase==='reveal'&&prev!=='reveal')Sfx.play('reveal');
  else if(s.phase==='intermission'&&prev!=='intermission')Sfx.play('stage');
  }}
{const vq=qs('#vinhQuy');if(vq.dataset.rehearsal){}else if(s.phase==='finished'&&!s.boardHeld){const h=(s.honors||[])[0]||null;const key=JSON.stringify(h);if(key!==lastVQ){window.__vqHonor=h;vq.innerHTML=vinhQuyMarkup(h);lastVQ=key;if(typeof mountVinhQuy3D==='function')mountVinhQuy3D(vq)}vq.classList.remove('hidden')}else{vq.classList.add('hidden');if(window.__vq3d){window.__vq3d.stop();window.__vq3d=null}vq.innerHTML='';lastVQ=''}}
qs('#pin').textContent='MÃ PHÒNG '+s.pin;qs('#count').textContent=s.count+' sĩ tử';qs('#round').textContent=`Câu ${s.idx+1}`;qs('#stage').textContent=q?stageNames[q.stage]:'TRƯỜNG THI KHOA BẢNG';
const sceneKey=q?.stage||0;if(lastScene!==sceneKey){qs('#landscape').innerHTML=sceneMarkup(sceneKey);lastScene=sceneKey;qs('#ledScene').className='led-scene st'+sceneKey}
qs('#qcount').textContent=q?`CÂU ${q.index}/${q.total} · ${q.tf?'ĐÚNG – SAI':KIND_UP[q.kind||'mc']||'CÂU HỎI'}${q.pts>1?' · ×'+q.pts+' ĐIỂM':''}${q.tie?' · CÂU QUYẾT ĐỊNH':''}${q.scoring&&q.scoring!==s.scoring?(q.scoring==='accuracy'?' · VÒNG CHÍNH XÁC':' · VÒNG TỐC ĐỘ'):''}`:s.mode==='self'?'TỰ LÀM BÀI':'ĐÓN SĨ TỬ';
qs('#phase').textContent=s.phase==='media'?'ĐANG PHÁT CLIP':s.phase==='running'?'ĐANG THI':s.phase==='reveal'?'CÔNG BỐ ĐÁP ÁN':s.phase==='finished'?'VINH QUY BÁI TỔ':s.phase==='intermission'?'CHÚC MỪNG VƯỢT KỲ THI':'CHỜ MỞ CÂU';
const showQ=q&&!['finished','intermission'].includes(s.phase);
qs('#timer').textContent=s.phase==='running'?timeLeft(q):s.phase==='media'?'🎬':q?.t||'--';qs('#timer').classList.toggle('hidden',!showQ);
const qText=s.mode==='self'&&s.phase==='self'?'📝 BÀI TỰ LÀM ĐANG MỞ – QUÉT MÃ QR ĐỂ LÀM BÀI':s.mode==='self'&&s.phase==='idle'?'📝 BÀI TỰ LÀM – CHỜ MC MỞ BÀI':s.phase==='finished'?'XƯỚNG DANH TAM KHÔI':s.phase==='intermission'?'HOÀN THÀNH '+(stageNames[s.completedStage]||'MỘT CHẶNG KHOA BẢNG'):q?q.q:'Quan trường đang chuẩn bị kỳ thi';
qs('#question').textContent=qText;
const board=qs('#examBoard');board.classList.toggle('long',qText.length>110);board.classList.toggle('xlong',qText.length>180);board.classList.toggle('announce',!showQ);
qs('#choices').innerHTML=showQ?ledChoices(s,q):s.mode==='self'&&s.phase==='self'?selfBoard(s):'';ledMedia(showQ&&['running','reveal','media'].includes(s.phase)?q:null,s.phase);
qs('#note').textContent=ledNote(s,q);
const upMap=rankUps(s);qs('#leaders').innerHTML=renderRanks(s.leaderboard,10,upMap);ledTeams(s);ledQr(s);ledGate(s);qs('#standings').style.display=(['reveal','intermission','finished'].includes(s.phase))?'block':'none';qs('#top10').innerHTML=renderRanks(s.leaderboard,10,upMap);qs('#joinUrl').textContent=location.origin+'/join?pin='+s.pin;
const cands=s.candidates||[];const hl={};
if(['reveal','intermission','finished'].includes(s.phase))(s.leaderboard||[]).slice(0,3).forEach((p,i)=>{if(p.score>0&&!hl[p.name])hl[p.name]=p.rank||i+1});
const crowdKey=JSON.stringify([cands.map(c=>c.name),hl,sceneKey]);
const sea=seaPlan(Math.max(0,(s.count||0)-cands.length)),seaOn=sea.figs>0;
if(crowdKey+seaOn!==lastCrowd){qs('#crowdBooths').innerHTML=crowdMarkup(cands,hl,sceneKey,seaOn?0.72:1);lastCrowd=crowdKey+seaOn}
if(sea.figs!==lastSea.figs){lastSea=sea;drawCrowdSea(qs('#crowdSea'),sea.figs)}else lastSea=sea;
qs('#crowdEmpty').classList.toggle('hidden',cands.length>0);
qs('#candidateNames').textContent=`${fmt(s.count)} sĩ tử dự thi`+(s.count>cands.length?` · trên sân có tên: ${cands.length} người ${s.stageMode==='top'?'dẫn đầu':'mới vào'}`+(sea.per>1?` · mỗi bóng phía sau = ${sea.per} người`:''):'');
qs('#candidateBanner').classList.toggle('hidden',!s.count);
const sc=qs('#stageCelebration');sc.classList.toggle('hidden',s.phase!=='intermission');if(s.phase==='intermission'){qs('#stageCongrats').textContent='CHÚC MỪNG ĐÃ HOÀN THÀNH '+(stageNames[s.completedStage]||'CHẶNG THI');
 qs('#stageWish').textContent=s.stageWish||'Họ hàng nhà bạn rất tự hào về bạn!';
 qs('#stageLeaders').innerHTML=(s.stageLeaders||[]).slice(0,3).map((p,i)=>`<div class="stage-leader"><b>${['🥇','🥈','🥉'][(p.rank||i+1)-1]||'📜'}</b><span>${escapeHtml(p.name)}</span><strong>${fmt(p.score)} điểm</strong></div>`).join('')||'<div class="stage-leader empty">Khoa thi đã hoàn thành – chờ các sĩ tử ghi danh bảng vàng.</div>';}
const ceremony=qs('#finalCeremony');ceremony.classList.toggle('hidden',s.phase!=='finished');
if(s.phase==='finished'){
 const honors=(s.honors||[]);const KIND=r=>r===1?'trang-nguyen':r===2?'bang-nhan':'tham-hoa',SYM=r=>['👑','🥈','🥉'][r-1]||'📜';
 // ĐỒNG HẠNG được xướng danh cùng danh hiệu; người chưa đạt điều kiện vinh danh (luật MC công bố) không lên bảng
 const order=honors.length===3&&new Set(honors.map(h=>h.rank)).size===3?[honors[1],honors[0],honors[2]]:honors;
 qs('#honors').innerHTML=honors.length?order.map(p=>`<div class="honor-card ${p.rank===1?'champion':''}"><div class="honor-med">${SYM(p.rank)}</div><div class="honor-title">${escapeHtml(p.title.toUpperCase())}</div><div class="honor-avatar">${scholarFigure(KIND(p.rank))}</div><div class="honor-name">${escapeHtml(p.name)}</div><div class="honor-score">${fmt(p.score)} điểm · ${p.correct} câu đúng</div><div class="honor-wish">Chúc mừng đã thi đỗ!</div></div>`).join(''):'<div class="empty-honors">Khoa thi kết thúc – chưa có sĩ tử đạt điều kiện xướng danh theo luật đã công bố.</div>';
 qs('#congratsBottom').textContent=honors.length?'📯 Xin chúc mừng các sĩ tử đỗ đầu khoa bảng. Vinh quy bái tổ!':'';
}}
setInterval(()=>{if(current?.phase==='running'&&current.q){const s=timeLeft(current.q);qs('#timer').textContent=s;qs('#timer').classList.toggle('hot',s<=5);
 if(s!==lastTick){if(s<=5&&s>0)Sfx.play('tick');else if(s===0&&lastTick!==null&&lastTick>0)Sfx.play('timeup');lastTick=s}}},170);
{const sb=qs('#soundBtn');sb.onclick=e=>{e.stopPropagation();if(!Sfx.isReady()){Sfx.unlock();if(Sfx.isMuted())Sfx.toggle()}else Sfx.toggle()};
 const upd=()=>{const r=Sfx.isReady(),m=Sfx.isMuted();sb.textContent=m?'🔈 Âm thanh: TẮT':r?'🔊 Âm thanh: BẬT':'🔇 Bấm để bật âm thanh';sb.classList.toggle('need',!r&&!m)};
 Sfx.onChange(upd);setInterval(upd,1000);}
/* ===== V14: hiển thị theo dạng câu, ảnh/video, thống kê, đám mây từ, bảng đội, QR ===== */
const KIND_UP={fill:'ĐIỀN Ô CHỮ',match:'GHÉP CẶP',mc:'TRẮC NGHIỆM',multi:'CHỌN NHIỀU ĐÁP ÁN',number:'NHẬP SỐ',type:'GÕ ĐÁP ÁN',order:'SẮP XẾP THỨ TỰ',poll:'KHẢO SÁT',slider:'THANH TRƯỢT',cloud:'ĐÁM MÂY TỪ'};
const nf=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:9,useGrouping:false}); // UI-02: tới 9 chữ số thập phân như máy chủ chấm
const SHAPES=['▲','◆','●','■','★','⬟'],TF_SHAPES=['✔','✘'];
const LET='ABCDEFGH';const PREVIEW=params.get('preview')==='1'||window.__PREVIEW===1;let tfNow=false;
function tile(i,x,extra='',img=''){return `<span class="shape">${tfNow?TF_SHAPES[i]:SHAPES[i%6]}</span>${img?`<img class="opt-img" src="${escapeHtml(img)}" alt="Phương án ${LET[i]}">`:''}${x?`<span class="tile-t">${escapeHtml(x)}</span>`:''}${extra}`}
const idsOf=q=>q.ids||(q.a||[]).map((_,i)=>i);
function bars(q,st,correct){const tot=Math.max(1,st.n),ids=idsOf(q),ok=id=>Array.isArray(correct)?correct.includes(id):correct!=null&&id===correct,has=correct!=null&&!(Array.isArray(correct)&&!correct.length);
 return `<div class="choices tiles ${q.ai?'with-img':''}">${q.a.map((x,i)=>{const id=ids[i],n=st.counts?.[id]||0,p=Math.round(n/tot*100);return `<div class="choice tile bar c${i%6} ${has&&ok(id)?'correct':''} ${has&&!ok(id)?'dim':''}" style="--p:${p}%">${tile(i,x,`<span class="bar-n">${has&&ok(id)?'✔ ':''}${n} · ${p}%</span>`,q.ai&&q.ai[i])}</div>`}).join('')}</div>${st.multi?`<div class="board-sub">Mỗi người chọn được nhiều phương án – tỷ lệ tính trên ${st.n||0} người đã nộp nên tổng có thể vượt 100%</div>`:''}`}
function cloud(words){if(!words||!words.length)return '<div class="cloud empty">Chưa có câu trả lời…</div>';const mx=Math.max(...words.map(w=>w.n));const col=['#a33329','#2e7a4f','#2f5d9a','#b07a12','#7d3c98','#16797b'];
 return `<div class="cloud">${words.map((w,i)=>`<span style="font-size:${(1.1+2.1*Math.sqrt(w.n/mx)).toFixed(2)}cqw;color:${col[i%col.length]}">${escapeHtml(w.w)}${w.n>1?`<sup>${w.n}</sup>`:''}</span>`).join(' ')}</div>`}
function ledChoices(s,q){const k=q.kind||'mc',rev=s.phase==='reveal',st=q.stats||{};tfNow=!!q.tf;
 if(s.phase==='media')return `<div class="board-sub big-sub">${q.media&&q.media.kind==='audio'?'🔊 Mời nghe đoạn âm thanh':'🎬 Mời xem đoạn clip'} – lượt trả lời mở ngay khi phát xong</div>`;
 if(k==='mc'||k==='multi')return rev?bars(q,st,q.answer):`<div class="choices tiles ${q.ai?'with-img':''}">${q.a.map((x,i)=>`<div class="choice tile c${i%6} ${q.tf?'tf':''}">${tile(i,x,'',q.ai&&q.ai[i])}</div>`).join('')}</div>${k==='multi'?`<div class="board-sub">☑ Chọn TẤT CẢ đáp án đúng rồi bấm NỘP trên điện thoại</div>`:''}`;
 if(k==='poll')return q.hideLive&&!rev?`<div class="choices tiles ${q.ai?'with-img':''}">${q.a.map((x,i)=>`<div class="choice tile c${i%6}">${tile(i,x,'',q.ai&&q.ai[i])}</div>`).join('')}</div><div class="board-sub">🔒 Kết quả bình chọn được giữ kín – MC sẽ công bố</div>`:bars(q,st,null);
 if(k==='fill'){const L=Array.from(rev?String(q.answer):'');const cells=q.mask.map((m,i)=>m&&m.s!=null?`<span class="fill-sep">${m.s==='-'?'-':''}</span>`:`<span class="fill-cell ${m&&m.h?'hint':''} ${rev?'shown':''}">${escapeHtml(rev?L[i]:m&&m.h?m.h:'')}</span>`).join('').replace(/(<span class="fill-cell[^]*?)(?=<span class="fill-sep|$)/g,'<span class="fill-word">$1</span>');
  return `<div class="fill-cells led">${cells}</div>`+(rev?`<div class="type-led">${(st.words||[]).map(w=>`<span class="word-chip ${w.ok?'ok':''}">${w.ok?'✔':'✘'} ${escapeHtml(w.w)} · ${w.n}</span>`).join('')}</div><div class="board-sub">${st.right||0}/${st.n||0} sĩ tử điền đúng</div>`:`<div class="board-sub">🔠 Điền ${q.mask.filter(m=>m===null).length} ô còn thiếu trên điện thoại${q.rule&&q.rule.loose?' – không cần dấu':''}</div>`)}
 if(k==='match'){if(rev){const tot=Math.max(1,st.n||0);return `<div class="match-led">${q.l.map((x,i)=>`<div class="choice correct"><b>${escapeHtml(x)}</b> <span class="arrow">↔</span> ${escapeHtml(q.answer[i])} <span class="bar-n">${(st.pairs||[])[i]||0}/${st.n||0} · ${Math.round(((st.pairs||[])[i]||0)/tot*100)}%</span></div>`).join('')}</div><div class="board-sub">${st.right||0}/${st.n||0} sĩ tử ghép đúng tất cả · trung bình ${st.avgPairs!=null?nf(st.avgPairs):'–'}/${q.l.length} cặp</div>`}
  return `<div class="match-grid led"><div class="match-col">${q.l.map((x,i)=>`<div class="match-item left"><span class="match-no">${i+1}</span>${escapeHtml(x)}</div>`).join('')}</div><div class="match-col">${q.r.map((x,j)=>`<div class="match-item right"><span class="match-no empty">${LET[j]}</span>${escapeHtml(x)}</div>`).join('')}</div></div><div class="board-sub">🔗 Ghép mỗi mục bên trái với một mục bên phải trên điện thoại</div>`}
 if(k==='order')return rev?`<div class="order-led">${q.answer.map((x,i)=>`<div class="choice correct"><b>${i+1}.</b> ${q.answerImg&&q.answerImg[i]?`<img class="opt-img" src="${escapeHtml(q.answerImg[i])}" alt="">`:''}${escapeHtml(x)}</div>`).join('')}</div><div class="board-sub">${st.right||0}/${st.n||0} sĩ tử sắp xếp đúng hoàn toàn${st.partial?` · ${st.partial} đúng một phần`:''}</div>`:`<div class="order-led">${q.a.map((x,i)=>`<div class="choice">◆ ${q.ai&&q.ai[i]?`<img class="opt-img" src="${escapeHtml(q.ai[i])}" alt="">`:''}${escapeHtml(x)}</div>`).join('')}</div><div class="board-sub">Sắp xếp các mục theo đúng thứ tự trên điện thoại</div>`;
 if(k==='type')return rev?`<div class="type-led"><div class="choice correct"><b>Đáp án:</b> ${escapeHtml((q.answer||[]).join(' / '))}</div>${(st.words||[]).map(w=>`<span class="word-chip ${w.ok?'ok':''}">${w.ok?'✔':'✘'} ${escapeHtml(w.w)} · ${w.n}</span>`).join('')}</div><div class="board-sub">${st.right||0}/${st.n||0} sĩ tử trả lời đúng</div>`:'<div class="board-sub big-sub">✍️ Sĩ tử gõ câu trả lời trên điện thoại</div>';
 if(k==='number'){const u=q.unit?' '+escapeHtml(q.unit):'';if(!rev&&q.prox)return `<div class="board-sub big-sub">🎯 Ước lượng: nhập một số${u?' (đơn vị:'+u+')':''} – càng gần đáp án càng nhiều điểm</div>`;return rev?`<div class="choice correct"><b>Đáp án:</b> ${nf(q.answer.c)}${u}${q.answer.tol?` (chấp nhận ±${nf(q.answer.tol)})`:''}</div><div class="board-sub">Trung bình các câu trả lời: ${st.avg!=null?nf(st.avg):'–'}${u} · ${st.right||0}/${st.n||0} sĩ tử đúng</div>`:`<div class="board-sub big-sub">🔢 Sĩ tử nhập một số${u?' (đơn vị:'+u+')':''} trên điện thoại</div>`}
 if(k==='slider'){const u=q.unit?' '+escapeHtml(q.unit):'';if(!rev)return `<div class="board-sub big-sub">🎚 Kéo thanh trượt chọn giá trị từ ${nf(q.min)} đến ${nf(q.max)}${u}</div>`;
  const B=st.bins||[],mx=Math.max(1,...B);return `<div class="choice correct"><b>Đáp án:</b> ${nf(q.answer.c)}${u}${q.answer.tol?` (chấp nhận ±${nf(q.answer.tol)})`:''}</div><div class="hist">${B.map(n=>`<i style="height:${Math.round(n/mx*100)}%"></i>`).join('')}</div><div class="board-sub">${nf(q.min)} … ${nf(q.max)} · trung bình ${st.avg!=null?nf(st.avg):'–'}${u} · ${st.right||0}/${st.n||0} trong sai số</div>`}
 if(k==='cloud')return cloud(st.words)+`<div class="board-sub">${st.n||0} ý kiến</div>`;
 return ''}
function ledNote(s,q){const k=q?.kind||'mc';if(s.boardHeld)return s.phase==='finished'?'🥁 Quan trường chuẩn bị xướng danh Tam khôi…':'📜 Bảng điểm sẽ được quan trường công bố';if(s.mode==='self'&&s.phase==='self')return `📝 Đã có ${s.self?.done||0}/${s.count} sĩ tử làm xong${s.self?.deadline?' · hạn nộp '+new Date(s.self.deadline).toLocaleString('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}):''}`;
 if(s.phase==='reveal'){const ids=idsOf(q);if(k==='mc'){const i=ids.indexOf(q.answer);return `✅ Đáp án đúng: ${LET[i]}${q.a[i]?' · '+q.a[i]:''}`+(q.note?` · 💡 ${q.note}`:'')}
  if(k==='multi')return '✅ Đáp án đúng: '+q.answer.map(id=>LET[ids.indexOf(id)]).join(' + ')+(q.note?` · 💡 ${q.note}`:'');if(k==='poll'||k==='cloud')return '📊 Kết quả ý kiến của các sĩ tử'+(q.note?` · 💡 ${q.note}`:'');return q.note?'💡 '+q.note:'✅ Đã công bố đáp án'}
 if(s.phase==='media')return '🎬 Đang phát nội dung của câu hỏi';
 return s.phase==='running'?(k==='poll'||k==='cloud'?'⏳ Đang ghi nhận ý kiến – kết quả cập nhật trực tiếp':'⏳ Sĩ tử đang làm bài'+(q&&q.extra?` · đã cộng thêm ${q.extra} giây`:'')):s.phase==='finished'?'📯 Mời xem bảng vàng Tam khôi bên dưới':s.phase==='intermission'?'🥁 Chúc mừng các sĩ tử đã vượt qua chặng thi':'📯 Chờ hiệu lệnh quan trường'}
function selfBoard(s){return `<div class="board-sub big-sub">Mỗi sĩ tử tự làm từng câu trên điện thoại, đồng hồ riêng từng câu.</div><div class="self-progress led"><div style="width:${s.count?Math.round((s.self?.done||0)/s.count*100):0}%"></div></div>`}
/* ===== Media câu hỏi (5.4): một trạng thái âm thanh chung (L07), báo trình duyệt chặn tiếng, phát xong báo máy chủ mở lượt trả lời ===== */
let mediaKey='',mediaEl=null,mediaDoneSent='',ytTimer=null,mediaBlocked=false,mediaMuted=false; // mediaMuted: đoạn đang phát đã có lúc bị TẮT TIẾNG → không tự mở lượt (7.1)
function wantSound(){return !(window.Sfx&&Sfx.isMuted())}
function applySound(){const on=wantSound();for(const el of document.querySelectorAll('#ledMedia video,#ledMedia audio,#vinhQuy video'))el.muted=!on;
 const f=document.getElementById('ytFrame');if(f)try{f.contentWindow.postMessage(JSON.stringify({event:'command',func:on?'unMute':'mute',args:[]}),'*')}catch{} // 7.3: YouTube cũng theo trạng thái tiếng chung
 if(!on&&current&&current.phase==='media')mediaMuted=true;ledStatusSoon()}
function mediaDone(q){if(!current||current.phase!=='media'||!q||mediaDoneSent===q.qid)return;mediaDoneSent=q.qid;
 const needSound=q.media&&(q.media.kind==='audio'||!q.media.silentOk);emit({type:'media_done',qid:q.qid,muted:mediaMuted});
 if(mediaMuted&&needSound){const b=qs('#mediaBlocked');if(b){b.textContent='🔇 Đoạn vừa rồi phát KHÔNG CÓ TIẾNG – lượt trả lời chưa mở. Bấm vào đây để bật tiếng và PHÁT LẠI';b.classList.remove('hidden')}}}
function playEl(el,q){el.muted=!wantSound();if(el.muted)mediaMuted=true;const p=el.play();if(p&&p.catch)p.catch(()=>{mediaBlocked=true;mediaMuted=true;el.muted=true;el.play().then(()=>{showBlocked(true)}).catch(()=>showBlocked(true));ledStatusSoon()})}
function showBlocked(on){let b=qs('#mediaBlocked');if(!b)return;b.classList.toggle('hidden',!on)}
function ledMedia(q,phase){const box=qs('#ledMedia'),m=q&&q.media;const key=m?q.qid+':'+m.kind+':'+m.src:'';
 if(key===mediaKey){if(mediaEl&&phase==='reveal'&&!mediaEl.paused&&m&&m.kind!=='image')mediaEl.pause();if(m&&m.kind==='image'&&m.hide&&phase==='reveal'&&box.querySelector('.media-hidden')){clearTimeout(window._ledHide);box.innerHTML=`<img src="${escapeHtml(m.src)}" alt="">`}return}
 mediaKey=key;clearInterval(ytTimer);mediaEl=null;mediaMuted=false;qs('#examBoard').classList.toggle('has-media',!!m);
 if(!m){box.innerHTML='';box.classList.add('hidden');return}box.classList.remove('hidden');
 const st=m.start||0,en=m.end||0,frag=st||en?`#t=${st}${en?','+en:''}`:'';
 if(m.kind==='image'){box.innerHTML=`<img src="${escapeHtml(m.src)}" alt="${escapeHtml(m.alt||'Hình minh hoạ câu hỏi')}">`;if(m.hide&&phase==='running'&&q.deadline){const at=q.deadline-(q.t+(q.extra||0))*1000+m.hide*1000;clearTimeout(window._ledHide);window._ledHide=setTimeout(()=>{if(mediaKey===key)box.innerHTML='<div class="media-hidden">🙈 Ảnh đã ẩn – sĩ tử hãy nhớ lại!</div>'},Math.max(0,at-Date.now()))}return}
 if(m.kind==='youtube'){box.innerHTML=`<iframe id="ytFrame" src="https://www.youtube-nocookie.com/embed/${escapeHtml(m.src)}?autoplay=1&enablejsapi=1&start=${Math.floor(st)}${en?'&end='+Math.floor(en):''}&rel=0&modestbranding=1${wantSound()?'':'&mute=1'}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen title="Video câu hỏi"></iframe>`;
  // nghe trạng thái phát của YouTube (0 = đã phát xong) qua postMessage, không cần tải thư viện ngoài
  if(!wantSound())mediaMuted=true;const f=qs('#ytFrame');ytTimer=setInterval(()=>{try{f.contentWindow.postMessage(JSON.stringify({event:'listening',id:1}),'*')}catch{}},1000);return}
 box.innerHTML=`${m.kind==='audio'?'<div class="audio-vis">🔊 ĐANG PHÁT ÂM THANH<div class="eq"><i></i><i></i><i></i><i></i><i></i></div></div>':''}<${m.kind==='audio'?'audio':'video'} id="qMediaEl" src="${escapeHtml(m.src)}${frag}" playsinline preload="auto" ${m.kind==='video'?'':''}></${m.kind==='audio'?'audio':'video'}><button type="button" id="mediaBlocked" class="media-blocked hidden">🔇 Trình duyệt chặn tiếng – bấm vào đây để bật âm thanh</button>`;
 mediaEl=qs('#qMediaEl');const qq=q;
 mediaEl.addEventListener('ended',()=>mediaDone(qq));mediaEl.addEventListener('timeupdate',()=>{if(!mediaEl.paused&&(mediaEl.muted||mediaEl.volume===0))mediaMuted=true;if(en&&mediaEl.currentTime>=en-0.05){mediaEl.pause();mediaDone(qq)}});
 mediaEl.addEventListener('error',()=>{box.insertAdjacentHTML('beforeend','<div class="media-err">⚠ Không phát được tệp media – MC hãy bấm MỞ LƯỢT TRẢ LỜI NGAY</div>');ledStatusSoon()});
 qs('#mediaBlocked').onclick=()=>{if(window.Sfx){Sfx.unlock();if(Sfx.isMuted())Sfx.toggle()}mediaBlocked=false;mediaEl.muted=false;
  if(mediaMuted&&current&&current.phase==='media'){mediaMuted=false;mediaDoneSent='';try{mediaEl.currentTime=st}catch{}} // phát lại TỪ ĐẦU đoạn, lần này có tiếng
  mediaEl.play().catch(()=>{});showBlocked(false);ledStatusSoon()};
 if(phase==='media'||phase==='running')playEl(mediaEl,q);
 else mediaEl.controls=true}
window.addEventListener('message',e=>{if(!/youtube/.test(e.origin))return;let d;try{d=typeof e.data==='string'?JSON.parse(e.data):e.data}catch{return}
 const ps=d&&d.info&&(d.info.playerState??(d.event==='onStateChange'?d.info:null));if(ps===0&&current&&current.q)mediaDone(current.q)});
function ledTeams(s){const tb=s.teamBoard||[];qs('#teamPanel').classList.toggle('hidden',!tb.length);if(!tb.length)return;const mx=Math.max(1,...tb.map(t=>t.score));
 qs('#teamBoard').innerHTML=tb.map(t=>`<div class="team-row"><span class="team-rank">${['🥇','🥈','🥉'][t.rank-1]||t.rank}</span><div class="team-main"><b style="color:${t.color}">${escapeHtml(t.name)}</b><div class="team-bar"><i style="width:${Math.round(t.score/mx*100)}%;background:${t.color}"></i></div><div class="meta">${t.members} thành viên · ${t.correct} câu đúng</div></div><span class="pts">${fmt(t.score)}</span></div>`).join('')}
let qrFor='';function ledQr(s){const url=pubOrigin()+'/join?pin='+s.pin;if(qrFor===url)return;qrFor=url;qs('#joinQr').innerHTML=QR.svg(url,{size:220,label:'Quét để vào phòng '+s.pin})}

/* ===== 4.2 / 4.3 / 4.7: màn LED báo trạng thái thật cho MC, xác nhận từng lệnh, tải sẵn phim, thử tiếng, tổng duyệt, chế độ sân khấu ===== */
/* UI-03: mã màn LED lưu theo TỪNG THẺ trình duyệt (sessionStorage) – hai thẻ trên cùng máy là hai màn khác nhau, không cùng thành "màn chính".
   Quyền màn chính do máy chủ cấp (token bí mật khi MC bấm "đặt làm màn chính"); tải lại trang → gửi lại token để giữ quyền. */
const LED_ID=(()=>{try{let x=sessionStorage.getItem('udika_led_id');if(!x){x=Math.random().toString(36).slice(2,8);sessionStorage.setItem('udika_led_id',x)}return x}catch{return Math.random().toString(36).slice(2,8)}})();
const mainTokKey=()=>'udika_led_main_'+pin;let mainToken=(()=>{try{return sessionStorage.getItem(mainTokKey())||''}catch{return ''}})();
const LED_LABEL=(params.get('label')||'').slice(0,24)||('LED '+LED_ID.slice(0,3).toUpperCase());
let film={state:'none',pct:null},statusTimer=null,lastStatus='';
function soundState(){if(window.Sfx&&Sfx.isMuted())return 'muted';if(mediaBlocked||(window.Sfx&&!Sfx.isReady()))return 'blocked';return 'on'}
function ledStatus(){if(!joined||!socket||socket.readyState!==1)return;const s={id:LED_ID,label:LED_LABEL,...(mainToken?{mainToken}:{}),ready:!!current,sound:soundState(),film:film.state,filmPct:film.pct,clean:document.body.classList.contains('led-clean')};
 const k=JSON.stringify(s);if(k===lastStatus)return;lastStatus=k;emit({type:'led_status',s})}
function ledStatusSoon(){clearTimeout(statusTimer);statusTimer=setTimeout(ledStatus,150)}
setInterval(()=>{lastStatus='';ledStatus()},10000);
const _onOpenLed=onOpen;onOpen=()=>{_onOpenLed&&_onOpenLed();lastStatus='';setTimeout(ledStatus,300)};
if(window.Sfx&&Sfx.onChange)Sfx.onChange(()=>{applySound();ledStatusSoon()});
function ack(cid,cmd,ok,note){emit({type:'led_ack',cid,cmd,ok,note})}
/* tải sẵn phim vinh danh: đọc trọn tệp để trình duyệt giữ trong bộ nhớ đệm, báo tiến độ cho MC */
async function preloadFilm(){const src=window.__VQ_VIDEO?.src||'/assets/vinhquy/vinh_quy.mp4';if(film.state==='ready'||film.state==='loading')return film.state==='ready';
 if(/^blob:/.test(src)){film={state:'ready',pct:100};ledStatusSoon();return true}
 film={state:'loading',pct:0};ledStatusSoon();
 try{const r=await fetch(src);if(!r.ok)throw Error('HTTP '+r.status);const total=+r.headers.get('content-length')||0;const rd=r.body.getReader();let got=0,last=0;
  for(;;){const {done,value}=await rd.read();if(done)break;got+=value.length;const p=total?Math.floor(got/total*100):null;if(p!==null&&p-last>=5){last=p;film.pct=p;ledStatusSoon()}}
  if(!(await canDecode(src)))throw Error('không giải mã được');
  film={state:'ready',pct:100};ledStatusSoon();return true}catch(e){film={state:'error',pct:null};ledStatusSoon();return false}}
/* 7.2: "đã tải" chưa đủ – thử nạp phim vào thẻ video để chắc trình duyệt GIẢI MÃ được (có khung hình đầu) */
function canDecode(src){return new Promise(res=>{const v=document.createElement('video');v.muted=true;v.preload='auto';let done=false;const fin=ok=>{if(done)return;done=true;v.removeAttribute('src');try{v.load()}catch{}res(ok)};
 v.onloadeddata=()=>fin(true);v.onerror=()=>fin(false);setTimeout(()=>fin(false),8000);v.src=src})}
/* 7.2: xác nhận lệnh phát bằng trạng thái media THẬT: chờ thẻ video của phim chạy được (thời gian tăng); không có phim → hoạt cảnh dự phòng */
function verifyFilm(timeout=4000){return new Promise(res=>{const t0=Date.now();const v=document.querySelector('#vinhQuy video');if(!v)return res({ok:true,note:'đang chạy hoạt cảnh (không dùng tệp phim)'});const c0=v.currentTime;
 const tick=()=>{if(!v.isConnected)return res({ok:false,note:'phim đã bị đóng'});if(!v.paused&&v.currentTime>c0+0.05)return res({ok:true,note:v.muted?'phim ĐANG PHÁT nhưng TẮT TIẾNG (trình duyệt chặn tiếng – bấm vào màn LED)':'phim đang phát có tiếng'});
  if(Date.now()-t0>timeout)return res({ok:false,note:v.error?'⚠ phim LỖI GIẢI MÃ – không phát được':'⚠ phim KHÔNG CHẠY sau '+Math.round(timeout/1000)+' giây (bị chặn tự phát? bấm vào màn LED)'});setTimeout(tick,200)};tick()})}
function testSound(){if(!window.Sfx)return {ok:false,note:'không có bộ âm thanh'};Sfx.unlock();if(Sfx.isMuted())return {ok:false,note:'LED đang TẮT tiếng – bấm nút âm thanh trên LED hoặc gửi lệnh Bật/tắt âm thanh'};
 if(!Sfx.isReady())return {ok:false,note:'trình duyệt CHẶN tiếng – cần một lần bấm chuột/chạm vào màn LED'};Sfx.play('start');setTimeout(()=>Sfx.play('reveal'),900);return {ok:true,note:'đã phát tiếng trống thử'}}
function rehearse(on){const vq=qs('#vinhQuy');if(on){const h={rank:1,name:'Nguyễn Văn Mẫu',score:12345,correct:10,title:'Trạng nguyên'};window.__vqHonor=h;vq.innerHTML=vinhQuyMarkup(h)+'<div class="rehearsal-badge">🎬 TỔNG DUYỆT – TÊN MẪU, KHÔNG PHẢI KẾT QUẢ THẬT</div>';if(typeof mountVinhQuy3D==='function')mountVinhQuy3D(vq);vq.classList.remove('hidden');vq.dataset.rehearsal='1';lastVQ='rehearsal'}
 else{delete vq.dataset.rehearsal;lastVQ='';if(window.__vq3d){window.__vq3d.stop();window.__vq3d=null}vq.innerHTML='';vq.classList.add('hidden');if(current)render()}}
const _onEventLed=onEvent;onEvent=async msg=>{
 if(msg.type==='led_main'){mainToken=msg.token||'';try{if(mainToken)sessionStorage.setItem(mainTokKey(),mainToken);else sessionStorage.removeItem(mainTokKey())}catch{}document.body.classList.toggle('led-is-main',!!mainToken);lastStatus='';ledStatus();return}
 if(msg.type==='vq'){const cid=msg.cid||'',cmd=msg.cmd;if(cmd==='replay'||cmd==='rehearse')vqPending=null;
  if(cmd==='preload'){ack(cid,cmd,true,'đang tải phim…');const ok=await preloadFilm();ack(cid,cmd,ok,ok?'phim đã tải xong 100%':'⚠ không tải được phim vinh danh – sẽ dùng hoạt cảnh dự phòng');return}
  if(cmd==='test'){const r=testSound();ack(cid,cmd,r.ok,r.note);ledStatusSoon();return}
  if(cmd==='board'){const on=document.body.classList.toggle('show-board');ack(cid,cmd,true,on?'đang chiếu bảng vàng Tam khôi':'đã ẩn bảng vàng');return}
  if(cmd==='rehearse'){rehearse(true);const v=await verifyFilm();ack(cid,cmd,v.ok,'tổng duyệt vinh danh với tên mẫu – '+v.note);return}
  if(cmd==='stop_rehearse'){rehearse(false);ack(cid,cmd,true,'đã thoát tổng duyệt');return}
  const vq=qs('#vinhQuy');const onScreen=vq&&!vq.classList.contains('hidden')&&window.VQAnim;
  if(!onScreen){ack(cid,cmd,false,'LED chưa ở phần vinh danh – lệnh chưa có tác dụng');return}
  if(['start','replay'].includes(cmd)){try{VQAnim.command(cmd,msg.v)}catch(e){ack(cid,cmd,false,String(e.message||e));return}const v=await verifyFilm();ack(cid,cmd,v.ok,v.note);return}
  try{VQAnim.command(cmd,msg.v);if(cmd==='sound')applySound();ack(cid,cmd,true,cmd==='sound'?(soundState()==='on'?'âm thanh BẬT':soundState()==='muted'?'âm thanh TẮT':'trình duyệt chặn tiếng'):'đã thực hiện')}catch(e){ack(cid,cmd,false,String(e.message||e))}
  ledStatusSoon();return}
 return _onEventLed(msg)};
/* 4.7 chế độ sân khấu: chỉ còn khung LED 16:9, không còn thanh tiêu đề/cột bên; vùng an toàn theo ?safe=… (%) */
function setClean(on){document.body.classList.toggle('led-clean',on);const safe=Math.max(0,Math.min(10,Number(params.get('safe'))||0));document.documentElement.style.setProperty('--led-safe',safe+'%');ledStatusSoon();try{localStorage.setItem('udika_led_clean',on?'1':'0')}catch{}}
{const b=document.createElement('button');b.type='button';b.className='clean-btn';b.id='cleanBtn';b.textContent='🖥 Chế độ sân khấu';b.title='Ẩn thanh tiêu đề và cột bên, phóng khung LED toàn màn hình (phím F)';
 b.onclick=()=>{const on=!document.body.classList.contains('led-clean');setClean(on);if(on&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{})};
 document.body.appendChild(b);document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA/.test(document.activeElement?.tagName||''))return;if(e.key==='f'||e.key==='F')b.click();if(e.key==='b'||e.key==='B')document.body.classList.toggle('show-board')});
 let pref=null;try{pref=localStorage.getItem('udika_led_clean')}catch{}if(params.get('clean')==='1'||pref==='1')setClean(true)}

/* hiệu ứng VƯỢT HẠNG: so bảng điểm lần công bố này với lần công bố câu trước (theo tên + biểu tượng) */
let rkPrev=null,rkIdx=-1,rkUps=null;function rankUps(s){if(s.phase!=='reveal'||!s.q||!Array.isArray(s.leaderboard)||!s.leaderboard.length)return s.phase==='reveal'?rkUps:null;
 const idx=s.q.index,cur=new Map(s.leaderboard.map(p=>[p.name+'|'+p.avatar,p.rank]));
 if(idx!==rkIdx){rkUps=null;if(rkPrev&&!s.q.noFx){const m=new Map();for(const [k,r] of cur){const o=rkPrev.get(k);if(o&&o>r)m.set(k,o-r)}rkUps=m.size?m:null}rkPrev=cur;rkIdx=idx}return rkUps}
if(PREVIEW){joined=false;qs('#enter')&&qs('#enter').classList.add('hidden');qs('#display').classList.remove('hidden');window.addEventListener('message',e=>{if((e.origin!==location.origin&&window.__PREVIEW!==1)||!e.data||e.data.type!=='udika_preview')return;current=e.data.state;render()})}
else{connect();if(pin)enter();}

/* Cổng ghi danh cỡ lớn trên LED: mã QR to + mã phòng khổng lồ để khán giả quét từ xa (kiểu sảnh chờ Kahoot) */
let gateKey='',gateQr='';
function gateOn(s){if(s.bigQr==='off')return false;if(s.bigQr==='on')return s.phase!=='finished';
 return s.phase==='idle'||(s.phase==='ready'&&s.idx===0)||(s.mode==='self'&&['idle','self'].includes(s.phase))} // tự động: chỉ khi CHỜ KHAI TRƯỜNG, không che màn giữa các câu
function ledGate(s){const box=qs('#joinGate'),on=gateOn(s);box.classList.toggle('hidden',!on);qs('#ledScene').classList.toggle('gate-on',on);if(!on)return;
 const url=pubOrigin()+'/join?pin='+s.pin,host=pubOrigin().replace(/^https?:\/\//,'').replace(/^www\./,'');
 if(gateQr!==url){gateQr=url;gateKey=''}
 const cands=s.candidates||[],n=s.count??cands.length,recent=s.recentJoins||cands.slice(-12).reverse();
 const key=JSON.stringify([url,s.title,n,recent.map(c=>c.name),s.phase,s.mode,s.locked]);if(key===gateKey)return;gateKey=key;
 const pinTxt=String(s.pin).replace(/^(\d{3})(\d{3})$/,'$1 $2');
 const sub=s.locked?'MC đã khoá phòng – chỉ sĩ tử đã ghi danh vào lại được':s.mode==='self'?'Bài tự làm: quét mã là làm bài ngay trên điện thoại':'Mở camera điện thoại quét mã QR – hoặc vào địa chỉ ở trên rồi nhập mã phòng';
 box.innerHTML=`<div class="jg-qr"><div class="jg-qr-frame">${QR.svg(url,{size:600,label:'Mã QR vào phòng '+s.pin})}</div><div class="jg-scan">📷 QUÉT MÃ ĐỂ VÀO TRƯỜNG THI</div></div>
 <div class="jg-info"><div class="jg-kicker">${escapeHtml(s.title||'AI LÀ TRẠNG NGUYÊN?')}</div>
 <div class="jg-label">Vào <b>${escapeHtml(host)}/join</b> · nhập mã phòng</div>
 <div class="jg-pin" aria-label="Mã phòng ${s.pin}">${pinTxt}</div>
 <div class="jg-sub">${sub}</div>
 <div class="jg-count"><b>${n.toLocaleString('vi-VN')}</b> sĩ tử đã ghi danh</div>
 <div class="jg-names">${recent.map((c,i)=>`<span style="--i:${i}">${escapeHtml(c.avatar||'')} ${escapeHtml(c.name)}</span>`).join('')}</div></div>`}

/* V15 #4: màn LED tải lại trang giữa lúc chiếu phim vinh danh → chạy tiếp đúng chỗ (máy chủ giữ vị trí màn chính báo 2 giây/lần) */
let vqPending=null; /* giữ vị trí nhận được tới khi đúng loại phim được dựng (dò thấy tệp phim muộn → dựng lại phim → áp lại vị trí) */
function vqSync(msg){vqPending={msg,got:Date.now()};vqApply()}
function vqApply(){const P=vqPending;if(!P)return;if(Date.now()-P.got>30000){vqPending=null;return}
 const vq=qs('#vinhQuy');if(!vq||vq.dataset.rehearsal||vq.classList.contains('hidden')||!window.VQAnim||!VQAnim.seek)return;
 if(P.msg.key&&P.msg.key!==lastVQ){vqPending=null;return} /* khác người vinh danh (ván mới) → bỏ */
 const el=(+P.msg.elapsed||0)+(P.msg.s&&P.msg.s.paused?0:(Date.now()-P.got)/1000*(+P.msg.s.speed||1));
 try{if(VQAnim.seek(P.msg.s,el)){window.__vqResumed={at:Date.now(),s:P.msg.s,elapsed:el};if((P.msg.s||{}).kind==='video'||!window.__VQ_VIDEO)vqPending=null}}catch(e){}}
if(typeof mountVinhQuy3D==='function'){const _mvq=mountVinhQuy3D;mountVinhQuy3D=function(el){_mvq(el);if(vqPending)setTimeout(vqApply,0)}}
setInterval(()=>{if(!joined||!socket||socket.readyState!==1||!window.VQAnim||!VQAnim.snapshot)return;const vq=qs('#vinhQuy');
 if(!vq||vq.dataset.rehearsal||vq.classList.contains('hidden'))return;const s=VQAnim.snapshot();if(s)emit({type:'vq_pos',s,key:lastVQ})},2000);

window.addEventListener('udika-origin',()=>{if(current)render()});
