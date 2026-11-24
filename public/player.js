'use strict';
let joinedPin='',playerId='',current=null,selected=false;
const pinFromUrl=(params.get('pin')||'').replace(/\D/g,'').slice(0,6);
qs('#pin').value=pinFromUrl;
const storageKey=pin=>`udika_player_${pin}`;
let pending=null,choicesKey='';
function loadSaved(pin){try{return JSON.parse(localStorage.getItem(storageKey(pin))||'null')}catch{return null}}
function storeSaved(pin,v){try{localStorage.setItem(storageKey(pin),JSON.stringify(v))}catch{}}
function tryRestore(){if(!pinFromUrl||joinedPin)return;const saved=loadSaved(pinFromUrl);if(saved?.playerId){joinedPin=pinFromUrl;playerId=saved.playerId;qs('#name').value=saved.name||'';emit({type:'join',pin:joinedPin,name:saved.name||'Sĩ tử',avatar:qs('#avatar').value,playerId})}}
function msgError(s){qs('#errors').textContent=s;qs('#errors').style.display='block';setTimeout(()=>qs('#errors').style.display='none',6000)}
function join(){const pin=qs('#pin').value.trim();const name=qs('#name').value.trim();if(!/^\d{6}$/.test(pin)){msgError('Vui lòng nhập mã phòng gồm 6 chữ số');return}if(!name){msgError('Vui lòng nhập tên sĩ tử');return}const saved=loadSaved(pin);joinedPin=pin;emit({type:'join',pin,name,avatar:qs('#avatar').value,playerId:saved?.playerId||''})}
qs('#joinButton').onclick=join;
onOpen=()=>{qs('#connection').textContent='● Trực tuyến';if(!joinedPin)tryRestore();else if(joinedPin){const saved=loadSaved(joinedPin);emit({type:'join',pin:joinedPin,name:qs('#name').value||saved?.name||'Sĩ tử',avatar:qs('#avatar').value,playerId:playerId||saved?.playerId})}};
onClose=()=>{qs('#connection').textContent='● Đang kết nối lại'};
onEvent=msg=>{
 if(msg.type==='error'){msgError(msg.message);return}
 if(msg.type==='joined'){joinedPin=msg.pin;playerId=msg.playerId;storeSaved(joinedPin,{playerId,name:qs('#name').value.trim()});qs('#joinPanel').classList.add('hidden');qs('#playPanel').classList.remove('hidden');return}
 if(msg.type==='answered'){selected=true;qs('#answerNote').textContent=`Đã nộp bài · ${Math.round(msg.answer.ms)/1000} giây · đang chờ công bố`;return}
 if(msg.type==='state'){current=msg;render()}
};
function render(){if(!current)return;const s=current;const q=s.q;
 qs('#myName').textContent=s.my?`${s.my.avatar} ${s.my.name}`:'';qs('#myScore').textContent=fmt(s.my?.score)+' điểm';
 qs('#stage').textContent=q?stageNames[q.stage]:'TRƯỜNG THI KHOA BẢNG';
 qs('#qNumber').textContent=q?`Câu ${q.index}/${q.total}`:s.phase==='idle'?'Chưa khai trường':'Chờ câu tiếp theo';
 qs('#timer').textContent=s.phase==='running'?timeLeft(q):s.phase==='ready'?'--':'—';
 qs('#question').textContent=s.phase==='finished'?'Khoa thi đã kết thúc':s.phase==='ready'?'Quan trường đang chuẩn bị phát đề...':q?q.q:'MC chưa mở kỳ thi';
 const ans=s.my?.answer;
 // Keep a pending tap across state broadcasts that arrive before the server's 'answered' reply.
 if(pending&&pending.idx!==s.idx)pending=null;
 selected=!!ans||!!pending;
 const shown=ans?.choice??pending?.choice;
 const show=q&&['running','reveal'].includes(s.phase);
 // Rebuild buttons only when question/phase changes, so taps are not lost to frequent re-renders.
 const key=show?`${s.idx}|${s.phase}`:'';
 if(key!==choicesKey){choicesKey=key;
  qs('#choices').innerHTML=show?q.a.map((x,i)=>`<button class="choice" data-i="${i}"><b>${'ABCD'[i]}.</b> ${escapeHtml(x)}</button>`).join(''):'';
  for(const b of qs('#choices').querySelectorAll('button'))b.onclick=()=>{if(selected||current?.phase!=='running')return;selected=true;pending={idx:current.idx,choice:Number(b.dataset.i)};emit({type:'answer',choice:pending.choice});render()};
 }
 for(const b of qs('#choices').querySelectorAll('button')){const i=Number(b.dataset.i);b.classList.toggle('selected',shown===i);b.classList.toggle('correct',s.phase==='reveal'&&i===q.answer);b.disabled=s.phase!=='running'||selected}
 qs('#answerNote').textContent=s.phase==='running'?(ans?`Đã nộp bài trong ${(ans.ms/1000).toFixed(2)} giây`:selected?'Đã gửi, đang đợi xác nhận...':'Chạm đáp án để nộp bài') :s.phase==='reveal'?`Đáp án đúng: ${'ABCD'[q.answer]}. ${q.a[q.answer]} · Bạn được ${ans?.points||0} điểm`:'Chờ quan trường điều khiển';
 qs('#stateNote').textContent=s.phase==='idle'?'Đã ghi danh. Chờ MC khai trường.':s.phase==='running'?'⏳ Câu hỏi đang diễn ra':s.phase==='reveal'?'🏅 Đã công bố bảng vàng – chờ MC chuyển câu':s.phase==='finished'?'📯 Xướng danh Tam khôi':s.phase==='intermission'?'🎉 Quan trường đang chúc mừng kết thúc chặng thi':'Chờ MC mở câu hỏi tiếp theo';
 const stagePanel=qs('#stagePassedPanel');stagePanel.classList.toggle('hidden',s.phase!=='intermission');if(s.phase==='intermission'){const result=s.my?.passedStage;stagePanel.innerHTML=result?(result.passed?'<div class="personal-main">🎉 CHÚC MỪNG BẠN ĐÃ THI ĐỖ!</div>':'<div class="personal-main">📜 BẠN ĐÃ HOÀN THÀNH CHẶNG THI</div>')+'<div class="personal-title">'+escapeHtml(stageNames[result.stage])+'</div><p>'+escapeHtml(result.passed?'Gia đình, họ hàng và thầy đồ vô cùng tự hào về bạn!':'Hãy cố gắng hơn ở chặng thi tiếp theo!')+'</p><p>Trả lời đúng '+result.correct+'/'+result.total+' câu</p>':'';}qs('#finalPanel').classList.toggle('hidden',s.phase!=='finished');if(s.phase==='finished'){
 qs('#finalRanks').innerHTML=renderRanks(s.leaderboard,10);
 const honor=(s.honors||[]).find(p=>p.rank===s.my?.finalRank);
 qs('#myHonorMessage').innerHTML=honor?`<div class="personal-med">${scholarFigure(honor.rank===1?'trang-nguyen':honor.rank===2?'bang-nhan':'tham-hoa')}</div><div class="personal-main">CHÚC MỪNG SĨ TỬ ${escapeHtml(honor.name)}</div><div class="personal-title">BẠN ĐÃ THI ĐỖ ${escapeHtml(honor.title.toUpperCase())}!</div><div>Đạt ${fmt(honor.score)} điểm · ${honor.correct} câu trả lời đúng</div><div class="personal-footer">📯 VINH QUY BÁI TỔ · RẠNG DANH KHOA BẢNG</div>`:`<div class="personal-main">KHOA THI ĐÃ KHÉP LẠI</div><div>Cảm ơn sĩ tử ${escapeHtml(s.my?.name||'')} đã tham gia. Hãy xem bảng vàng để biết kết quả!</div>`;
} 
}
setInterval(()=>{if(current?.phase==='running'&&current.q){const sec=timeLeft(current.q);qs('#timer').textContent=sec;qs('#timer').classList.toggle('hot',sec<=5)}},170);
connect();
