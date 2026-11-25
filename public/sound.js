'use strict';
/* UDIKA V5 – Âm thanh màn LED, tổng hợp bằng Web Audio (không cần file âm thanh).
   start: trống mở câu · tick: mõ đếm 5 giây cuối · timeup: chiêng hết giờ
   reveal: chuông công bố · stage: hồi trống chúc mừng · celebrate: pháo nổ + trống hội (không có tiếng reo hò) */
const Sfx=(()=>{
 let ctx=null,master=null,noiseBuf=null,muted=false,listeners=[];
 try{muted=localStorage.getItem('udika_mute')==='1'}catch{}
 function init(){
  if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
   ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:.9;
   const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;
   master.connect(comp);comp.connect(ctx.destination);
   noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
   ctx.onstatechange=notify;}
  if(ctx.state==='suspended')ctx.resume().then(notify).catch(()=>{});
  return ctx;
 }
 const ready=()=>ctx&&ctx.state==='running';
 function notify(){listeners.forEach(f=>{try{f(state())}catch{}})}
 function state(){return {unlocked:!!ready(),muted}}
 function env(g,t,a,peak,dec){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec)}
 function tone(f,t,dur,type='sine',vol=.3,f2){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);env(g,t,.005,vol,dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.05)}
 function noise(t,dur,vol,type,freq,Q=1,dest=master){const s=ctx.createBufferSource();s.buffer=noiseBuf;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=Q;const g=ctx.createGain();env(g,t,.002,vol,dur);s.connect(f);f.connect(g);g.connect(dest);s.start(t,Math.random()*1.5);s.stop(t+dur+.05)}
 // nhạc cụ
 const drum=(t,v=.9)=>{tone(120,t,.45,'sine',v,42);noise(t,.12,v*.5,'lowpass',260)};
 const rim=(t,v=.35)=>{tone(1150,t,.06,'square',v*.25);noise(t,.04,v,'bandpass',2600,4)};
 const wood=(t,v=.5)=>{tone(980,t,.08,'sine',v);tone(1960,t,.04,'sine',v*.3)};
 function gong(t,v=.35){[1,1.48,2.09,2.76,3.9].forEach((m,i)=>tone(150*m,t,3.2-i*.4,'sine',v/(i+1)));noise(t,.3,v*.3,'lowpass',500)}
 function bell(f,t,v=.22){tone(f,t,1.4,'triangle',v);tone(f*2.01,t,.8,'sine',v*.35)}
 function firecrackers(t0,dur){
  let t=t0;while(t<t0+dur){const dense=Math.random()<.85;t+=dense?.02+Math.random()*.05:.12+Math.random()*.2;
   const v=.25+Math.random()*.45;noise(t,.015+Math.random()*.04,v,'highpass',900+Math.random()*2200,.7);
   if(Math.random()<.06){noise(t,.28,.9,'lowpass',700);tone(95,t,.35,'sine',.7,38)}}
 }
 function crowd(t0,dur){
  // nền đám đông
  const s=ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=950;bp.Q.value=.6;
  const g=ctx.createGain();g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(.22,t0+.9);g.gain.setValueAtTime(.22,t0+dur-1.4);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
  const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=2.3;lg.gain.value=.06;lfo.connect(lg);lg.connect(g.gain);
  s.connect(bp);bp.connect(g);g.connect(master);s.start(t0);s.stop(t0+dur+.1);lfo.start(t0);lfo.stop(t0+dur+.1);
  // tiếng hô "hoan hô", "a…"
  const vowels=[[800,1200],[500,880],[450,1900],[700,1100]];
  for(let i=0;i<26;i++){
   const st=t0+.3+Math.random()*(dur-1.6),d=.6+Math.random()*1.1,f0=Math.random()<.5?150+Math.random()*90:260+Math.random()*160;
   const o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f0,st);o.frequency.linearRampToValueAtTime(f0*1.3,st+d*.35);o.frequency.linearRampToValueAtTime(f0*1.05,st+d);
   const vib=ctx.createOscillator(),vg=ctx.createGain();vib.frequency.value=5+Math.random()*2;vg.gain.value=f0*.03;vib.connect(vg);vg.connect(o.frequency);
   const [F1,F2]=vowels[i%vowels.length],a=ctx.createBiquadFilter(),b=ctx.createBiquadFilter();a.type=b.type='bandpass';a.frequency.value=F1;b.frequency.value=F2;a.Q.value=b.Q.value=7;
   const vg2=ctx.createGain();vg2.gain.setValueAtTime(.0001,st);vg2.gain.exponentialRampToValueAtTime(.075,st+.09);vg2.gain.setValueAtTime(.075,st+d*.6);vg2.gain.exponentialRampToValueAtTime(.0001,st+d);
   o.connect(a);o.connect(b);a.connect(vg2);b.connect(vg2);vg2.connect(master);o.start(st);o.stop(st+d+.05);vib.start(st);vib.stop(st+d+.05);
  }
  // vỗ tay
  let t=t0+.4;while(t<t0+dur-.5){t+=.025+Math.random()*.05;noise(t,.025,.12+Math.random()*.12,'bandpass',1300+Math.random()*900,1.2)}
 }
 /* ---- nhạc cụ lễ hội dân gian (V11) ---- */
 function partials(base,list,t,v,dec,type='sine',dest=master,bend=0){list.forEach(([m,a,dk],i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(base*m,t);if(bend)o.frequency.linearRampToValueAtTime(base*m*(1+bend),t+dec*.6);
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v*a,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dec*(dk||1));o.connect(g);g.connect(dest);o.start(t);o.stop(t+dec*(dk||1)+.05)})}
 const F={
  // trống hội: tiếng ùng trầm, có hơi da trống
  trong(t,v=.8){tone(88,t,.7,'sine',v,46);tone(150,t,.18,'sine',v*.5,80);noise(t,.16,v*.55,'lowpass',200);noise(t,.03,v*.18,'bandpass',900,2)},
  // trống con gõ nhịp
  trongcon(t,v=.45){tone(210,t,.16,'sine',v,120);noise(t,.05,v*.5,'bandpass',1400,2)},
  // thanh la: tiếng đồng sáng, rung nhẹ
  thanhla(t,v=.3){partials(860,[[1,.9,1],[1.007,.5,1],[2.01,.35,.7],[2.93,.25,.5],[4.12,.15,.35],[5.4,.08,.25]],t,v*.5,1.25,'sine');noise(t,.05,v*.5,'highpass',4000,.7)},
  // chiêng: ngân dài, hơi uốn tiếng
  chieng(t,v=.35){partials(96,[[1,1,1],[1.006,.6,1],[1.51,.45,.8],[2.02,.32,.65],[2.43,.2,.5],[3.13,.12,.4]],t,v*.6,4.2,'sine',master,.03);noise(t,.35,v*.25,'lowpass',420)},
  // não bạt: tiếng xoè đồng
  naobat(t,v=.3){noise(t,1.3,v*.55,'highpass',3200,.6);noise(t,.9,v*.35,'bandpass',6400,1.2);partials(420,[[1,.3,.6],[2.76,.25,.5],[5.43,.2,.4]],t,v*.25,.9,'square')},
  rim:(t,v=.3)=>rim(t,v),
  // vỗ tay đám đông: mật độ và độ lớn tuỳ chỉnh
  votay(t0,dur,v=.12,dens=1){let t=t0;while(t<t0+dur){t+=(.018+Math.random()*.04)/dens;const k=Math.min(1,(t-t0)/.25)*Math.min(1,(t0+dur-t)/.6);noise(t,.022,(v*.6+Math.random()*v*.6)*Math.max(.05,k),'bandpass',1100+Math.random()*1300,1.3)}},
  // tiếng "ồ" reo vui của đám đông (vừa phải)
  reo(t0,dur,v=.06){const vowels=[[520,920],[600,1000],[480,860],[700,1150]];for(let i=0;i<18;i++){const st=t0+Math.random()*.35,d=dur*(.6+Math.random()*.4),f0=Math.random()<.5?140+Math.random()*80:240+Math.random()*140;
   const o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f0,st);o.frequency.linearRampToValueAtTime(f0*1.35,st+d*.3);o.frequency.linearRampToValueAtTime(f0*1.08,st+d);
   const [F1,F2]=vowels[i%4],a=ctx.createBiquadFilter(),b=ctx.createBiquadFilter();a.type=b.type='bandpass';a.frequency.value=F1;b.frequency.value=F2;a.Q.value=b.Q.value=6;
   const g=ctx.createGain();g.gain.setValueAtTime(.0001,st);g.gain.exponentialRampToValueAtTime(v,st+.12);g.gain.setValueAtTime(v,st+d*.55);g.gain.exponentialRampToValueAtTime(.0001,st+d);o.connect(a);o.connect(b);a.connect(g);b.connect(g);g.connect(master);o.start(st);o.stop(st+d+.05)}
   noise(t0,dur,v*.9,'bandpass',900,.6)},
  // sáo trúc: hơi thổi + rung (vibrato)
  sao(t,f,dur,v=.09){const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;
   o.type='sine';o2.type='triangle';o.frequency.setValueAtTime(f*.985,t);o.frequency.linearRampToValueAtTime(f,t+.06);o2.frequency.setValueAtTime(f*2,t);
   const vib=ctx.createOscillator(),vg=ctx.createGain();vib.frequency.value=5.2;vg.gain.setValueAtTime(0,t);vg.gain.linearRampToValueAtTime(f*.012,t+Math.min(.35,dur*.6));vib.connect(vg);vg.connect(o.frequency);
   const g2=ctx.createGain();g2.gain.value=.12;o2.connect(g2);g2.connect(g);o.connect(g);
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.05);g.gain.setValueAtTime(v*.85,t+dur*.7);g.gain.exponentialRampToValueAtTime(.0001,t+dur);g.connect(lp);lp.connect(master);
   [o,o2,vib].forEach(x=>{x.start(t);x.stop(t+dur+.05)});noise(t,Math.min(.12,dur),v*.35,'bandpass',f*2.2,3)},
  phao(t,dur=4){firecrackers(t,dur)}
 };
 const SOUNDS={
  start(t){drum(t);drum(t+.38);drum(t+.76,1);rim(t+1.05,.6)},
  tick(t){wood(t,.5)},
  timeup(t){gong(t,.4)},
  reveal(t){[523,659,784,1047].forEach((f,i)=>bell(f,t+i*.11,.2));bell(1568,t+.5,.14)},
  stage(t){for(let i=0;i<14;i++)drum(t+i*.09,.25+i*.04);drum(t+1.35,1);gong(t+1.35,.3);[587,698,880].forEach((f,i)=>bell(f,t+1.5+i*.12,.16))},
  celebrate(t){
   firecrackers(t,8.5);
   [0,.45,.9,1.2,1.5,2.1,2.55,3,3.3,3.6,4.2,4.65,5.1,5.4,5.7].forEach(x=>drum(t+x,.75));
   [.9,3,5.1].forEach(x=>rim(t+x+.2,.5));gong(t+.05,.35);
  }
 };
 return {
  unlock(){init()},
  isReady:()=>!!ready(),
  isMuted:()=>muted,
  onChange(f){listeners.push(f);f(state())},
  toggle(){init();muted=!muted;try{localStorage.setItem('udika_mute',muted?'1':'0')}catch{};if(master)master.gain.setTargetAtTime(muted?0:.9,ctx.currentTime,.05);notify();return !muted},
  fxd(delay,name,...a){if(!ctx||muted||ctx.state!=='running')return;const f=F[name];if(f)try{f(ctx.currentTime+.02+Math.max(0,delay),...a)}catch(e){console.warn(e)}},
  fx(name,...a){if(!ctx||muted||ctx.state!=='running')return;const f=F[name];if(f)try{f(ctx.currentTime+.02,...a)}catch(e){console.warn(e)}},
  /* xuất âm thanh hoạt cảnh ra tệp (dùng khi dựng video): log=[[giây,tên,...tham số]] → WAV base64 */
  async renderLog(log,dur,sr=48000){const OC=window.OfflineAudioContext;const keep=[ctx,master,noiseBuf];
   const oc=new OC(2,Math.ceil(dur*sr),sr);ctx=oc;master=oc.createGain();master.gain.value=.78;const comp=oc.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;master.connect(comp);comp.connect(oc.destination);
   noiseBuf=oc.createBuffer(1,sr*2,sr);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
   try{for(const [t,n,...a] of log){const f=F[n];if(f&&t<dur)f(t+.02,...a)}}finally{}
   const buf=await oc.startRendering();[ctx,master,noiseBuf]=keep;
   const n=buf.length,L=buf.getChannelData(0),R=buf.getChannelData(1),out=new DataView(new ArrayBuffer(44+n*4));const w=(o,str)=>{for(let i=0;i<str.length;i++)out.setUint8(o+i,str.charCodeAt(i))};
   w(0,'RIFF');out.setUint32(4,36+n*4,true);w(8,'WAVEfmt ');out.setUint32(16,16,true);out.setUint16(20,1,true);out.setUint16(22,2,true);out.setUint32(24,sr,true);out.setUint32(28,sr*4,true);out.setUint16(32,4,true);out.setUint16(34,16,true);w(36,'data');out.setUint32(40,n*4,true);
   for(let i=0;i<n;i++){out.setInt16(44+i*4,Math.max(-1,Math.min(1,L[i]))*32767,true);out.setInt16(46+i*4,Math.max(-1,Math.min(1,R[i]))*32767,true)}
   let bin='';const u=new Uint8Array(out.buffer);for(let i=0;i<u.length;i+=32768)bin+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(bin)},
  play(name){if(!ctx||muted)return;if(ctx.state!=='running'){init();if(ctx.state!=='running')return}const f=SOUNDS[name];if(f)try{f(ctx.currentTime+.03)}catch(e){console.warn(e)}}
 };
})();
document.addEventListener('pointerdown',e=>{if(e.target&&e.target.closest&&e.target.closest('#soundBtn'))return;Sfx.unlock()},{capture:true});
document.addEventListener('keydown',()=>Sfx.unlock(),{capture:true});
window.Sfx=Sfx;
