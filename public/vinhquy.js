'use strict';
/* UDIKA V5.2 – Cảnh "Vinh quy bái tổ" phong cách tranh Đông Hồ, chi tiết & có chuyển động.
   Cờ "VINH QUY" – biển "CHÚC MỪNG TRẠNG NGUYÊN" – quan Trạng cưỡi ngựa – lọng – tàn "BÁI TỔ".
   Tên Trạng nguyên trên cuốn thư ngay trên đầu quan Trạng. */

const DH={ink:'#1c1510',red:'#b8362a',deep:'#8e2219',horse:'#a8322a',yellow:'#e2b33c',gold:'#f0c85a',green:'#2f7a4a',dgreen:'#225c38',pink:'#dca6b8',grey:'#aaa9a3',paper:'#f6eddc',skin:'#fbf1e2'};
const VNSERIF="'Udika Serif','Noto Serif','Times New Roman',serif";

function dhDefs(){
 return `<pattern id="dhTrim" width="10" height="8" patternUnits="userSpaceOnUse"><rect width="10" height="8" fill="${DH.yellow}"/><circle cx="5" cy="4" r="1.8" fill="${DH.red}"/></pattern>
 <pattern id="dhTrimR" width="10" height="8" patternUnits="userSpaceOnUse"><rect width="10" height="8" fill="${DH.red}"/><path d="M0 4h10" stroke="${DH.gold}" stroke-width="1"/><circle cx="5" cy="4" r="1.6" fill="${DH.gold}"/></pattern>
 <pattern id="dhDots" width="13" height="13" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.7" fill="#f6d8bf" opacity=".55"/><circle cx="9.5" cy="9.5" r="1.2" fill="#5e1510" opacity=".55"/></pattern>
 <pattern id="dhCloudPat" width="36" height="28" patternUnits="userSpaceOnUse"><path d="M4 18c0-6 8-8 10-3c1-6 10-7 12-1c5-1 7 6 2 7H6c-3 0-4-2-2-3z" fill="none" stroke="${DH.gold}" stroke-width="1.6"/><path d="M22 6c3-3 7-1 6 2" fill="none" stroke="${DH.gold}" stroke-width="1.4"/></pattern>
 <pattern id="dhWave" width="20" height="10" patternUnits="userSpaceOnUse"><rect width="20" height="10" fill="${DH.dgreen}"/><path d="M0 9q5-9 10 0q5-9 10 0" fill="none" stroke="${DH.gold}" stroke-width="1.6"/></pattern>
 <pattern id="dhKey" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${DH.green}"/><path d="M2 12V2h10v8H6V6h3" fill="none" stroke="${DH.gold}" stroke-width="1.6"/></pattern>
 <filter id="vqPaper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9 .06" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .36  0 0 0 0 .27  0 0 0 0 .16  .9 0 0 0 -.32"/></filter>
 <filter id="vqBlur" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>
 <filter id="vqSmoke"><feGaussianBlur stdDeviation="5"/></filter>
 <clipPath id="vqClip"><rect x="122" y="100" width="956" height="472"/></clipPath>
 <linearGradient id="vqWood" x2="1" y2="1"><stop stop-color="#cfa166"/><stop offset=".45" stop-color="#a87a40"/><stop offset="1" stop-color="#7d5427"/></linearGradient>
 <linearGradient id="vqMat" x2="0" y2="1"><stop stop-color="#245a3f"/><stop offset="1" stop-color="#173d2a"/></linearGradient>`;
}

const fold=(d,w=1.5)=>`<path d="${d}" stroke="${DH.ink}" stroke-width="${w}" fill="none" opacity=".55" stroke-linecap="round"/>`;
function dhArm(d,color){return `<path d="${d}" stroke="${DH.ink}" stroke-width="18" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${color}" stroke-width="12" fill="none" stroke-linecap="round"/>`}

function dhFace(cx,cy,r=20){
 return `<ellipse cx="${cx-r+1}" cy="${cy+3}" rx="4.5" ry="6.5" fill="${DH.skin}" stroke="${DH.ink}" stroke-width="2"/>
  <ellipse cx="${cx+r-1}" cy="${cy+3}" rx="4.5" ry="6.5" fill="${DH.skin}" stroke="${DH.ink}" stroke-width="2"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r+2}" fill="${DH.skin}" stroke="${DH.ink}" stroke-width="2.6"/>
  <path d="M${cx-r+2} ${cy-4}Q${cx-r+4} ${cy-r} ${cx} ${cy-r-1}Q${cx+r-4} ${cy-r} ${cx+r-2} ${cy-4}Q${cx+r-8} ${cy-14} ${cx} ${cy-14}Q${cx-r+8} ${cy-14} ${cx-r+2} ${cy-4}Z" fill="${DH.ink}"/>
  <path d="M${cx-12} ${cy-9}q5 -5 9 -2M${cx+3} ${cy-11}q5 -3 9 2" stroke="${DH.ink}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <g class="vqeyes" style="transform-origin:${cx}px ${cy}px"><path d="M${cx-11} ${cy+1}q4 -5 8 0M${cx+3} ${cy+1}q4 -5 8 0" stroke="${DH.ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
  <path d="M${cx} ${cy+2}q2 4 -1 5" stroke="${DH.ink}" stroke-width="1.5" fill="none"/>
  <g class="vqmouth" style="transform-origin:${cx}px ${cy+10}px"><path d="M${cx-7} ${cy+9}Q${cx} ${cy+9} ${cx+7} ${cy+9}Q${cx+6} ${cy+18} ${cx} ${cy+18}Q${cx-6} ${cy+18} ${cx-7} ${cy+9}Z" fill="#8e1f17" stroke="${DH.ink}" stroke-width="1.3"/>
   <path d="M${cx-6} ${cy+9.5}H${cx+6}" stroke="#fff" stroke-width="2"/><path d="M${cx-3} ${cy+16}q3 -3 6 0" fill="#e07a7a"/></g>
  <circle cx="${cx-12}" cy="${cy+7}" r="4.6" fill="${DH.pink}" opacity=".85"/><circle cx="${cx+12}" cy="${cy+7}" r="4.6" fill="${DH.pink}" opacity=".85"/>`;
}

function dhHead(cx,cy,hat){
 let h=`<g class="vqhead" style="transform-origin:${cx}px ${cy+22}px">`+dhFace(cx,cy);
 if(hat==='nonchop'){ // mũ chóp nhỏ màu vàng nhạt có vành (người cầm cờ, người cầm tàn trong tranh)
  h+=`<path d="M${cx-16} ${cy-8}Q${cx-20} ${cy+10} ${cx-12} ${cy+18}M${cx+16} ${cy-8}Q${cx+20} ${cy+10} ${cx+12} ${cy+18}" stroke="#b08a3a" stroke-width="1.8" fill="none"/>
   <path d="M${cx-30} ${cy-10}Q${cx} ${cy-2} ${cx+30} ${cy-10}Q${cx} ${cy-18} ${cx-30} ${cy-10}Z" fill="#eedca8" stroke="${DH.ink}" stroke-width="2.2"/>
   <path d="M${cx-20} ${cy-13}Q${cx-10} ${cy-38} ${cx} ${cy-42}Q${cx+10} ${cy-38} ${cx+20} ${cy-13}Z" fill="#e9d394" stroke="${DH.ink}" stroke-width="2.2"/>
   <path d="M${cx-14} ${cy-24}Q${cx} ${cy-30} ${cx+14} ${cy-24}" stroke="#b08a3a" stroke-width="2" fill="none"/>
   <g class="tua" style="transform-origin:${cx}px ${cy-42}px"><path d="M${cx} ${cy-42}q-6 -6 -2 -12q4 4 4 6q2 -5 6 -6q0 8 -8 12z" fill="${DH.yellow}" stroke="${DH.ink}" stroke-width="1.4"/></g>`;
 }else if(hat==='muhaitai'){ // mũ vàng hai chỏm, tóc xõa hai bên (người cầm biển trong tranh)
  h+=`<path d="M${cx-21} ${cy-6}Q${cx-30} ${cy+10} ${cx-24} ${cy+24}Q${cx-18} ${cy+10} ${cx-18} ${cy-2}ZM${cx+21} ${cy-6}Q${cx+30} ${cy+10} ${cx+24} ${cy+24}Q${cx+18} ${cy+10} ${cx+18} ${cy-2}Z" fill="${DH.yellow}" stroke="${DH.ink}" stroke-width="1.8"/>
   <path d="M${cx-22} ${cy-6}Q${cx-22} ${cy-28} ${cx} ${cy-30}Q${cx+22} ${cy-28} ${cx+22} ${cy-6}Q${cx+12} ${cy-14} ${cx} ${cy-14}Q${cx-12} ${cy-14} ${cx-22} ${cy-6}Z" fill="${DH.yellow}" stroke="${DH.ink}" stroke-width="2.2"/>
   <path d="M${cx-16} ${cy-24}L${cx-12} ${cy-40}L${cx-4} ${cy-28}ZM${cx+16} ${cy-24}L${cx+12} ${cy-40}L${cx+4} ${cy-28}Z" fill="${DH.yellow}" stroke="${DH.ink}" stroke-width="1.8"/>
   <path d="M${cx-18} ${cy-12}Q${cx} ${cy-20} ${cx+18} ${cy-12}" stroke="${DH.red}" stroke-width="2.4" fill="none"/>`;
 }else{ // búi tóc đen trên đỉnh, buộc dây (người che lọng trong tranh)
  h+=`<path d="M${cx-20} ${cy-6}Q${cx-22} ${cy-28} ${cx} ${cy-28}Q${cx+22} ${cy-28} ${cx+20} ${cy-6}Q${cx+12} ${cy-18} ${cx} ${cy-18}Q${cx-12} ${cy-18} ${cx-20} ${cy-6}Z" fill="${DH.ink}"/>
   <path d="M${cx-10} ${cy-24}q10 -6 20 0" stroke="#4a4038" stroke-width="1.4" fill="none"/>
   <ellipse cx="${cx+2}" cy="${cy-35}" rx="9" ry="8" fill="${DH.ink}"/>
   <path d="M${cx-6} ${cy-31}h16" stroke="${DH.red}" stroke-width="3"/>
   <g class="tua" style="transform-origin:${cx+10}px ${cy-31}px"><path d="M${cx+10} ${cy-31}q10 2 12 12M${cx+10} ${cy-31}q12 -2 16 6" stroke="${DH.red}" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>`;
 }
 return h+'</g>';
}

function dhLeg(lx,pants,cls){
 return `<g class="wleg ${cls}">
  <path d="M${lx-14} -100L${lx+14} -100Q${lx+24} -60 ${lx+14} -24Q${lx+8} -18 ${lx} -19Q${lx-8} -18 ${lx-14} -24Q${lx-24} -60 ${lx-14} -100Z" fill="${pants}" stroke="${DH.ink}" stroke-width="2.6"/>
  ${fold(`M${lx-6} -92q-7 26 -2 58`,1.3)}${fold(`M${lx+7} -84q4 22 0 44`,1.2)}
  <rect x="${lx-7}" y="-22" width="14" height="11" fill="${DH.skin}" stroke="${DH.ink}" stroke-width="1.8"/>
  <path d="M${lx+8} -11L${lx-12} -11Q${lx-24} -9 ${lx-26} 0L${lx+10} 0Z" fill="${DH.ink}"/>
 </g>`;
}

function pole(px,top){return `<path d="M${px} -128V${top}" stroke="${DH.ink}" stroke-width="7.5" stroke-linecap="round"/><path d="M${px} -128V${top}" stroke="#9a6a34" stroke-width="3.5"/><path d="M${px} -190v6M${px} -260v6M${px} -330v6" stroke="${DH.ink}" stroke-width="7"/>`}

function dhProp(kind){
 const px=-34;
 if(kind==='flag'){
  let flames='';for(let i=0;i<8;i++){const x=px+4+i*16;flames+=`<path d="M${x} -436q2 -14 9 -22q-1 10 7 20z" fill="${DH.ink}"/>`}
  for(let i=0;i<5;i++){const y=-428+i*18;flames+=`<path d="M${px+133} ${y}q14 -2 22 6q-10 0 -20 10z" fill="${DH.ink}"/>`}
  return `${pole(px,-445)}
   <path d="M${px-7} -449h14l-7 -16z" fill="${DH.gold}" stroke="${DH.ink}" stroke-width="2"/>
   <g class="flagcloth">${flames}
    <path d="M${px} -438Q${px+36} -452 ${px+80} -432Q${px+116} -418 ${px+135} -432L${px+135} -345Q${px+108} -335 ${px+72} -352Q${px+36} -368 ${px} -350Z" fill="${DH.yellow}" stroke="${DH.ink}" stroke-width="3"/>
    <path d="M${px+10} -425Q${px+40} -437 ${px+79} -419Q${px+108} -407 ${px+123} -419L${px+123} -357Q${px+100} -349 ${px+72} -363Q${px+40} -377 ${px+10} -361Z" fill="url(#dhKey)" stroke="${DH.ink}" stroke-width="2"/>
    <path d="M${px+20} -413Q${px+45} -423 ${px+77} -407Q${px+99} -397 ${px+112} -405L${px+112} -369Q${px+94} -363 ${px+72} -373Q${px+45} -387 ${px+20} -373Z" fill="${DH.pink}" stroke="${DH.ink}" stroke-width="1.6"/>
    <text x="${px+66}" y="-385" text-anchor="middle" font-size="14" font-weight="800" fill="${DH.deep}" font-family="${VNSERIF}" textLength="70" lengthAdjust="spacingAndGlyphs">VINH QUY</text>
   </g>`;
 }
 if(kind==='sign'){
  return `${pole(px,-378)}
   <g class="signboard">
    <path d="M${px-52} -372Q${px} -400 ${px+52} -372Z" fill="${DH.yellow}" stroke="${DH.ink}" stroke-width="3"/>
    <circle cx="${px}" cy="-392" r="5" fill="${DH.red}" stroke="${DH.ink}" stroke-width="1.8"/>
    <rect x="${px-48}" y="-372" width="96" height="132" rx="5" fill="url(#dhTrimR)" stroke="${DH.ink}" stroke-width="3"/>
    <rect x="${px-40}" y="-364" width="80" height="116" rx="3" fill="${DH.paper}" stroke="${DH.ink}" stroke-width="2"/>
    <rect x="${px-36}" y="-360" width="72" height="108" rx="2" fill="none" stroke="${DH.red}" stroke-width="1.5"/>
    <text x="${px}" y="-337" text-anchor="middle" font-size="12" font-weight="800" fill="${DH.red}" font-family="${VNSERIF}" textLength="62" lengthAdjust="spacingAndGlyphs">CHÚC MỪNG</text>
    <path d="M${px-22} -328h44" stroke="${DH.yellow}" stroke-width="2"/>
    <text x="${px}" y="-303" text-anchor="middle" font-size="19" font-weight="800" fill="${DH.deep}" font-family="${VNSERIF}" textLength="62" lengthAdjust="spacingAndGlyphs">TRẠNG</text>
    <text x="${px}" y="-273" text-anchor="middle" font-size="17" font-weight="800" fill="${DH.deep}" font-family="${VNSERIF}" textLength="64" lengthAdjust="spacingAndGlyphs">NGUYÊN</text>
    <path d="M${px-48} -240l-6 22M${px+48} -240l6 22" stroke="${DH.red}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="${px-54}" cy="-216" r="4" fill="${DH.gold}" stroke="${DH.ink}" stroke-width="1.4"/><circle cx="${px+54}" cy="-216" r="4" fill="${DH.gold}" stroke="${DH.ink}" stroke-width="1.4"/>
   </g>`;
 }
 if(kind==='parasol'){
  let ribs='';for(let i=-3;i<=3;i++)ribs+=`<path d="M${px} -452L${px+i*24} -392" stroke="${DH.ink}" stroke-width="1.6" opacity=".65"/>`;
  let sc='';for(let i=0;i<8;i++){const x=px-75+i*18.75;sc+=`<path d="M${x} -392q9.4 20 18.75 0" fill="${i%2?DH.red:DH.yellow}" stroke="${DH.ink}" stroke-width="2.2"/>`}
  let fr='';for(let i=0;i<16;i++){const x=px-72+i*9.6;fr+=`<path d="M${x} -386v${10+(i%2)*5}" stroke="${DH.red}" stroke-width="2"/>`}
  const tassel=(x)=>`<g class="tassel"><path d="M${x} -392v10" stroke="${DH.ink}" stroke-width="2"/><circle cx="${x}" cy="-382" r="3" fill="${DH.gold}" stroke="${DH.ink}" stroke-width="1.2"/><path d="M${x-6} -380Q${x} -388 ${x+6} -380Q${x+8} -358 ${x+2} -342Q${x-6} -358 ${x-6} -380Z" fill="${DH.red}" stroke="${DH.ink}" stroke-width="2"/></g>`;
  return `${pole(px,-395)}
   <g class="canopy">
    ${fr}
    <path d="M${px-75} -392Q${px} -472 ${px+75} -392Z" fill="${DH.yellow}" stroke="${DH.ink}" stroke-width="3"/>
    <path d="M${px-58} -404Q${px} -456 ${px+58} -404" stroke="${DH.red}" stroke-width="4" fill="none"/>
    ${ribs}${sc}
    <path d="M${px-8} -452h16l-8 -14z" fill="${DH.red}" stroke="${DH.ink}" stroke-width="1.8"/>
    ${tassel(px-70)}${tassel(px+70)}
   </g>`;
 }
 let fr='';for(let i=0;i<11;i++)fr+=`<path d="M${px-48+i*9.6} -370v${28+(i%2)*6}" stroke="${DH.ink}" stroke-width="1.6"/>`;
 const ribbon=(x,dir)=>`<g class="ribbon"><path d="M${x} -412Q${x+dir*14} -370 ${x+dir*4} -330Q${x-dir*6} -300 ${x+dir*8} -280L${x+dir*18} -282Q${x+dir*4} -304 ${x+dir*14} -332Q${x+dir*24} -372 ${x+dir*10} -412Z" fill="${DH.pink}" stroke="${DH.ink}" stroke-width="2"/>${fold(`M${x+dir*8} -400Q${x+dir*16} -370 ${x+dir*9} -334`,1.2)}</g>`;
 return `${pole(px,-432)}
  <g class="canopy">
   ${ribbon(px-50,-1)}${ribbon(px+50,1)}
   <path d="M${px-52} -420Q${px} -442 ${px+52} -420Z" fill="${DH.yellow}" stroke="${DH.ink}" stroke-width="3"/>
   <path d="M${px-6} -440h12l-6 -14z" fill="${DH.gold}" stroke="${DH.ink}" stroke-width="1.8"/>
   <rect x="${px-50}" y="-420" width="100" height="16" fill="url(#dhTrimR)" stroke="${DH.ink}" stroke-width="2.6"/>
   <rect x="${px-50}" y="-404" width="100" height="34" fill="${DH.green}" stroke="${DH.ink}" stroke-width="2.6"/>
   <text x="${px}" y="-381" text-anchor="middle" font-size="16" font-weight="800" fill="${DH.gold}" font-family="${VNSERIF}" textLength="64" lengthAdjust="spacingAndGlyphs">BÁI TỔ</text>
   <rect x="${px-50}" y="-370" width="100" height="10" fill="url(#dhTrim)" stroke="${DH.ink}" stroke-width="2"/>
   <rect x="${px-50}" y="-360" width="100" height="1" fill="${DH.ink}"/>
   <g fill="${DH.yellow}">${fr.replace(/stroke="[^"]+"/g,`stroke="${DH.gold}"`)}</g>
  </g>`;
}

function dhWalker(x,footY,c,prop,delay){
 return `<g transform="translate(${x} ${footY})"><g style="--wd:${delay}s">
  <ellipse cx="0" cy="1" rx="40" ry="6" fill="${DH.ink}" opacity=".14"/>
  ${dhLeg(10,c.pants,'b')}
  ${dhLeg(-10,c.pants,'a')}
  <g class="wbody"><g class="joy">
   ${dhProp(prop)}
   <path d="M-31 -170Q0 -182 31 -170Q40 -120 40 -66L8 -62L0 -84L-8 -62L-40 -66Q-40 -120 -31 -170Z" fill="${c.tunic}" stroke="${DH.ink}" stroke-width="2.8"/>
   <path d="M40 -74L8 -70L0 -90L-8 -70L-40 -74L-40 -66L-8 -62L0 -84L8 -62L40 -66Z" fill="url(#dhTrim)" stroke="${DH.ink}" stroke-width="1.6"/>
   ${fold('M-22 -156Q-28 -120 -26 -80')}${fold('M24 -150Q28 -116 26 -80')}
   <path d="M-6 -177Q0 -160 26 -146" stroke="${c.trim}" stroke-width="7" fill="none"/>
   <path d="M-6 -177Q0 -160 26 -146" stroke="${DH.ink}" stroke-width="1.4" fill="none"/>
   <circle cx="4" cy="-150" r="2.2" fill="${DH.gold}" stroke="${DH.ink}" stroke-width=".8"/><circle cx="16" cy="-146" r="2.2" fill="${DH.gold}" stroke="${DH.ink}" stroke-width=".8"/>
   <path d="M-40 -114Q0 -104 40 -114L40 -100Q0 -90 -40 -100Z" fill="${c.belt}" stroke="${DH.ink}" stroke-width="2.4"/>
   ${fold('M-30 -108Q0 -100 30 -108',1.1)}
   <path d="M10 -104q-4 -10 6 -10q10 0 6 10q-6 4 -12 0z" fill="${c.belt}" stroke="${DH.ink}" stroke-width="1.8"/>
   <g class="sash" style="transform-origin:16px -102px"><path d="M12 -100Q8 -70 14 -44L22 -46Q18 -72 20 -100Z" fill="${c.belt}" stroke="${DH.ink}" stroke-width="1.8"/><path d="M20 -100Q28 -76 34 -54L40 -58Q34 -80 26 -100Z" fill="${c.belt}" stroke="${DH.ink}" stroke-width="1.8"/><path d="M14 -46h8M34 -55l6 -3" stroke="${DH.gold}" stroke-width="3"/></g>
   ${dhArm('M24 -162Q12 -128 -30 -148',c.tunic)}
   ${dhArm('M-24 -164Q-47 -178 -34 -201',c.tunic)}
   <circle cx="-30" cy="-149" r="9" fill="${c.trim}" stroke="${DH.ink}" stroke-width="2"/>
   <circle cx="-36" cy="-196" r="9" fill="${c.trim}" stroke="${DH.ink}" stroke-width="2"/>
   <circle cx="-34" cy="-148" r="7" fill="${DH.skin}" stroke="${DH.ink}" stroke-width="2.3"/>
   <circle cx="-34" cy="-202" r="7" fill="${DH.skin}" stroke="${DH.ink}" stroke-width="2.3"/>
   ${dhHead(0,-198,c.hat)}
  </g></g>
 </g></g>`;
}

function dhHorseRider(name){
 const leg=(x,cls,fill,back)=>`<g class="hleg ${cls}"><path d="M${x-13} 450L${x+13} 450Q${x+12} ${back?482:488} ${x+(back?9:6)} 505L${x+7} 532L${x-5} 532L${x-6} 505Q${x-15} 484 ${x-13} 450Z" fill="${fill}" stroke="${DH.ink}" stroke-width="3"/>
  ${fold(`M${x-6} 470q4 14 2 30`,1.3)}<path d="M${x-7} 505h14" stroke="${DH.ink}" stroke-width="1.6"/>
  <path d="M${x-9} 524q-6 6 -4 10h22q2 -4 -4 -10z" fill="#f3ede0" stroke="${DH.ink}" stroke-width="1.6"/>
  <rect x="${x-9}" y="532" width="19" height="13" rx="3" fill="${DH.ink}"/></g>`;
 const chars=[...(name||'')].length;
 const w=name?Math.max(240,Math.min(360,chars*17+80)):240;
 const nameAttr=name&&chars*17>w-50?` textLength="${w-50}" lengthAdjust="spacingAndGlyphs"`:'';
 let mane='';for(let i=0;i<7;i++){const t=i/6,x=506+t*42,y=312+t*80;mane+=`<path d="M${x} ${y}q${14+i} -6 ${12+i} ${10}q-8 4 -10 ${8}z" fill="#5e1510" stroke="${DH.ink}" stroke-width="1.6"/>`}
 let tail='';for(let i=0;i<6;i++)tail+=`<path d="M${740+i*2} ${414+i*3}Q${758+i*4} ${446+i*3} ${752+i*3} ${484+i*2}" stroke="${DH.ink}" stroke-width="1.3" fill="none" opacity=".65"/>`;
 const bell=(x,y)=>`<circle cx="${x}" cy="${y}" r="6" fill="${DH.gold}" stroke="${DH.ink}" stroke-width="1.8"/><path d="M${x-3} ${y+2}h6" stroke="${DH.ink}" stroke-width="1.6"/>`;
 return `<g transform="translate(20 0)"><g class="horse-bob">
  ${leg(530,'p2','#86271f')}${leg(694,'p1','#86271f',1)}
  <g class="tail"><path d="M735 400Q776 404 784 442Q792 476 772 510Q762 480 754 464Q749 490 738 502Q742 456 728 425Z" fill="#f3ede0" stroke="${DH.ink}" stroke-width="3"/>${tail}<path d="M730 404q8 -6 14 2q-6 8 -14 4z" fill="${DH.red}" stroke="${DH.ink}" stroke-width="1.6"/></g>
  <path d="M505 405Q520 368 600 372Q690 368 735 395Q760 430 735 468Q690 482 620 478Q560 482 520 470Q495 448 505 405Z" fill="${DH.horse}" stroke="${DH.ink}" stroke-width="4"/>
  <path d="M505 405Q520 368 600 372Q690 368 735 395Q760 430 735 468Q690 482 620 478Q560 482 520 470Q495 448 505 405Z" fill="url(#dhDots)"/>
  ${fold('M548 398q22 36 4 70',1.8)}${fold('M692 392q34 30 14 78',1.8)}${fold('M560 474q60 8 120 0',1.4)}
  <g class="hhead">
   <path d="M505 420Q478 370 472 330L508 312Q526 350 552 392Z" fill="${DH.horse}" stroke="${DH.ink}" stroke-width="4"/>
   <path d="M505 420Q478 370 472 330L508 312Q526 350 552 392Z" fill="url(#dhDots)"/>
   <path d="M478 312Q500 300 512 318L470 362Q455 372 436 368Q420 364 424 350Q430 336 450 328Z" fill="${DH.horse}" stroke="${DH.ink}" stroke-width="4"/>
   ${fold('M470 334q-14 6 -26 18',1.3)}
   <path d="M492 306L500 284L508 310Z" fill="${DH.horse}" stroke="${DH.ink}" stroke-width="3"/>
   ${mane}
   <path d="M494 306q-14 -2 -18 10q10 -4 18 0z" fill="#5e1510" stroke="${DH.ink}" stroke-width="1.4"/>
   <ellipse cx="479" cy="326" rx="5" ry="3.6" fill="#fff" stroke="${DH.ink}" stroke-width="1.6"/><circle cx="478" cy="326" r="2.4" fill="${DH.ink}"/>
   <path d="M472 320q6 -4 12 0" stroke="${DH.ink}" stroke-width="1.6" fill="none"/>
   <ellipse cx="431" cy="355" rx="3" ry="2.2" fill="${DH.ink}"/><path d="M426 362q8 3 14 0" stroke="${DH.ink}" stroke-width="1.6" fill="none"/>
   <path d="M510 318L466 356M486 311L470 331M444 360Q446 344 470 330" stroke="${DH.gold}" stroke-width="5" fill="none"/>
   <circle cx="470" cy="331" r="4" fill="${DH.red}" stroke="${DH.ink}" stroke-width="1.4"/><circle cx="490" cy="336" r="3" fill="${DH.gold}" stroke="${DH.ink}" stroke-width="1"/>
   <path d="M500 298q-6 -14 4 -20q4 12 -4 20z" fill="${DH.red}" stroke="${DH.ink}" stroke-width="1.4"/>
  </g>
  <path d="M553 395Q530 422 506 430" stroke="${DH.gold}" stroke-width="7" fill="none" stroke-linecap="round"/>
  ${bell(536,418)}${bell(520,426)}
  <path d="M528 426q-4 16 0 26q6 -10 0 -26z" fill="${DH.red}" stroke="${DH.ink}" stroke-width="1.4"/>
  <path d="M672 392Q710 400 736 402" stroke="${DH.gold}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M700 398l4 18l6 -16z" fill="${DH.red}" stroke="${DH.ink}" stroke-width="1.4"/>
  <path d="M556 380Q612 368 676 380L684 444Q620 456 552 444Z" fill="${DH.green}" stroke="${DH.ink}" stroke-width="3"/>
  <path d="M552 444Q620 456 684 444L686 456Q620 470 550 456Z" fill="url(#dhTrim)" stroke="${DH.ink}" stroke-width="2.4"/>
  ${[560,580,600,620,640,660,680].map(x=>`<path d="M${x} ${458+(x===620?2:0)}v12" stroke="${DH.red}" stroke-width="3" stroke-linecap="round"/>`).join('')}
  ${leg(550,'p1',DH.horse)}${leg(714,'p2',DH.horse,1)}
  <path d="M452 352Q500 374 550 354" stroke="${DH.ink}" stroke-width="2.2" fill="none"/>
  <g class="rider">
   <path d="M572 385Q560 432 578 472Q620 484 654 466Q664 420 650 385Z" fill="${DH.green}" stroke="${DH.ink}" stroke-width="3"/>
   ${fold('M592 400q-6 30 2 62')}${fold('M630 398q6 30 0 62')}
   <path d="M576 470Q620 486 656 468L660 486Q620 502 574 488Z" fill="#f3ede0" stroke="${DH.ink}" stroke-width="2"/><path d="M578 462Q620 476 654 458L657 470Q620 486 576 472Z" fill="${DH.yellow}" stroke="${DH.ink}" stroke-width="2"/>
   <path d="M598 474L596 494Q592 500 578 502Q570 498 574 492Q582 494 586 490L590 474Z" fill="${DH.ink}"/>
   <path d="M574 502Q592 506 600 498" stroke="#f3e6cf" stroke-width="2.6" fill="none"/>
   <path d="M600 476q-8 18 -2 30h10" stroke="${DH.gold}" stroke-width="3" fill="none"/>
   <path d="M582 300Q612 288 642 300Q654 345 650 392Q612 400 573 390Q570 340 582 300Z" fill="${DH.green}" stroke="${DH.ink}" stroke-width="3"/>
   <path d="M600 294Q612 316 626 294" stroke="${DH.paper}" stroke-width="8" fill="none"/>
   <path d="M596 296L612 324L628 296" stroke="${DH.gold}" stroke-width="6" fill="none"/>
   <path d="M596 296L612 324L628 296" stroke="${DH.ink}" stroke-width="1.4" fill="none"/>
   <path d="M572 356Q612 368 652 356L652 370Q612 382 572 370Z" fill="${DH.red}" stroke="${DH.ink}" stroke-width="2.4"/>
   ${[582,596,628,642].map(x=>`<rect x="${x-4}" y="${x===582||x===642?358:362}" width="8" height="8" rx="1.5" fill="#cfe3d6" stroke="${DH.ink}" stroke-width="1.2"/>`).join('')}
   <circle cx="612" cy="368" r="6" fill="#7fc29b" stroke="${DH.ink}" stroke-width="1.6"/>
   <path d="M586 306Q560 322 548 350Q536 384 556 394Q570 388 566 364Q574 346 594 330Z" fill="${DH.green}" stroke="${DH.ink}" stroke-width="2.6"/>
   <path d="M548 350Q536 384 556 394" stroke="url(#dhTrim)" stroke-width="5" fill="none"/>
   ${fold('M574 330q-14 18 -16 44',1.3)}
   <circle cx="551" cy="352" r="7" fill="${DH.skin}" stroke="${DH.ink}" stroke-width="2.3"/>
   <g class="wavearm" style="transform-origin:640px 310px">
    ${dhArm('M640 310Q676 304 686 274',DH.green)}
    <circle cx="686" cy="272" r="9" fill="${DH.yellow}" stroke="${DH.ink}" stroke-width="2"/>
    <g class="wavehand" style="transform-origin:686px 266px"><ellipse cx="686" cy="260" rx="7" ry="9" fill="${DH.skin}" stroke="${DH.ink}" stroke-width="2.2"/><path d="M682 254v-6M686 253v-7M690 254v-6" stroke="${DH.ink}" stroke-width="1.4"/></g>
   </g>
   ${dhFace(612,271,22)}
   <g class="hatwing l"><path d="M594 250L582 246" stroke="${DH.ink}" stroke-width="2.6"/><path d="M584 246Q570 234 556 240Q550 248 558 254Q572 256 584 250Z" fill="${DH.ink}"/><path d="M580 247Q570 240 560 244" stroke="${DH.gold}" stroke-width="1.2" fill="none"/></g>
   <g class="hatwing r"><path d="M630 250L642 246" stroke="${DH.ink}" stroke-width="2.6"/><path d="M640 246Q654 234 668 240Q674 248 666 254Q652 256 640 250Z" fill="${DH.ink}"/><path d="M644 247Q654 240 664 244" stroke="${DH.gold}" stroke-width="1.2" fill="none"/></g>
   <path d="M596 252Q596 220 616 218Q634 220 632 246Z" fill="${DH.ink}"/>
   <path d="M588 262Q588 240 612 238Q636 240 636 262Z" fill="#26221f" stroke="${DH.ink}" stroke-width="2"/>
   <path d="M590 258Q612 250 634 258" stroke="${DH.gold}" stroke-width="2.4" fill="none"/>
   <path d="M600 230Q616 224 630 232" stroke="${DH.gold}" stroke-width="1.4" fill="none"/>
   <circle cx="612" cy="248" r="5" fill="${DH.gold}" stroke="${DH.ink}" stroke-width="1.2"/><circle cx="612" cy="248" r="2" fill="${DH.red}"/>
  </g>
  <g class="plaque">
   <rect class="plaque-glow" x="${612-w/2-22}" y="98" width="${w+44}" height="96" rx="18" fill="#ffd56b" filter="url(#vqBlur)"/>
   <path d="M612 190V226" stroke="${DH.gold}" stroke-width="3" stroke-dasharray="4 4"/>
   <path d="M${612-70} 110Q612 84 ${612+70} 110Z" fill="${DH.red}" stroke="${DH.ink}" stroke-width="2.6"/>
   <path d="M${612-50} 106Q612 90 ${612+50} 106" stroke="${DH.gold}" stroke-width="2" fill="none"/>
   <circle cx="612" cy="94" r="5" fill="${DH.gold}" stroke="${DH.ink}" stroke-width="1.6"/>
   <rect x="${612-w/2}" y="110" width="${w}" height="78" fill="${DH.red}" stroke="${DH.ink}" stroke-width="3"/>
   <rect x="${612-w/2+6}" y="116" width="${w-12}" height="66" fill="none" stroke="${DH.gold}" stroke-width="2"/>
   <rect x="${612-w/2+10}" y="120" width="${w-20}" height="58" fill="none" stroke="${DH.gold}" stroke-width=".8"/>
   <g>${[-1,1].map(d=>{const x=612+d*(w/2+9);return `<rect x="${x-10}" y="104" width="20" height="90" rx="10" fill="${DH.gold}" stroke="${DH.ink}" stroke-width="2.6"/><path d="M${x-10} 116h20M${x-10} 182h20" stroke="${DH.ink}" stroke-width="1.6"/><path d="M${x} 104q${d*10} -10 ${d*2} -16q${-d*8} 4 ${-d*2} 16z" fill="${DH.red}" stroke="${DH.ink}" stroke-width="1.6"/><path d="M${x} 194q${d*10} 10 ${d*2} 16q${-d*8} -4 ${-d*2} -16z" fill="${DH.red}" stroke="${DH.ink}" stroke-width="1.6"/>`}).join('')}</g>
   <text x="612" y="140" text-anchor="middle" font-size="14" font-weight="800" letter-spacing="3" fill="#ffe7a6" font-family="${VNSERIF}">✦ TRẠNG NGUYÊN ✦</text>
   <text x="612" y="172" text-anchor="middle" font-size="${name?28:20}" font-weight="800" fill="#fff4d6" font-family="${VNSERIF}"${nameAttr}>${escapeHtml(name||'Chờ xướng danh')}</text>
  </g>
 </g></g>`;
}

function dhCloud(x,y,s,flip){
 return `<g transform="translate(${x} ${y}) scale(${flip?-s:s} ${s})"><g class="vqcloud">
  <path d="M-6 0c-12 0-16-14-4-18c-2-14 16-20 22-8c6-12 28-8 26 6c12 0 14 16 2 20z" fill="#f3e2b0" stroke="${DH.ink}" stroke-width="2.4"/>
  <path d="M34 -2c6-2 8-8 3-10c-4-1-6 3-3 5M8 -16c3-4 9-3 9 1" stroke="${DH.ink}" stroke-width="1.6" fill="none"/>
  <path d="M-6 0c-16 2-26 12-18 22c6 6 14 0 8-6" stroke="${DH.ink}" stroke-width="2" fill="none"/>
 </g></g>`;
}

function dhFirecrackers(x,side){
 let s=`<path d="M${x} 24V400" stroke="#5a3520" stroke-width="2.5"/><circle cx="${x}" cy="26" r="7" fill="${DH.gold}" stroke="#5a3520" stroke-width="2"/><path d="M${x-6} 30l-6 18M${x+6} 30l6 18" stroke="${DH.red}" stroke-width="3"/>`;
 for(let i=0;i<16;i++){const y=44+i*22,a=(i%2?1:-1)*28*side;s+=`<g transform="translate(${x} ${y}) rotate(${a})"><rect x="-5" y="0" width="10" height="19" rx="2.5" fill="#d22b1f" stroke="#5a120c" stroke-width="1.3"/><rect x="-5" y="6" width="10" height="4" fill="${DH.gold}"/><path d="M-2 1v17" stroke="#ff8a6a" stroke-width="1.4" opacity=".7"/></g>`}
 const bursts=[[0,410,1.1,0],[side*26,360,1.4,.45],[-side*10,440,1.2,.8],[side*40,300,1.6,1.2],[side*8,250,1.3,.25],[side*30,470,1.5,.65]];
 bursts.forEach(([dx,y,d,dl])=>{
  let rays='';for(let k=0;k<12;k++){const ang=k*30*Math.PI/180,r2=k%2?24:34;rays+=`<path d="M${(Math.cos(ang)*8).toFixed(1)} ${(Math.sin(ang)*8).toFixed(1)}L${(Math.cos(ang)*r2).toFixed(1)} ${(Math.sin(ang)*r2).toFixed(1)}" stroke="${k%3===0?'#fff2b0':k%2?'#ffd35a':'#ff6a3d'}" stroke-width="3" stroke-linecap="round"/>`}
  s+=`<g transform="translate(${x+dx} ${y})"><g class="burst" style="--bd:${d}s;--bdl:${dl}s"><circle r="13" fill="#fff6c8"/><circle r="7" fill="#ffd35a"/>${rays}</g></g>`;
  s+=`<g transform="translate(${x+dx} ${y})"><circle class="smoke" r="16" fill="#d8d0c2" style="--sd:${(d*2.2).toFixed(2)}s;--sdl:${dl}s"/></g>`;
 });
 return s;
}


/* ===== V6.1 – Dùng chính nét vẽ tranh Đông Hồ "Vinh quy bái tổ" (tách từng nhân vật, cho cử động) ===== */
const DH_META={"co": [9, 19, 326, 279], "linh1": [9, 298, 219, 464], "bien": [285, 58, 166, 204], "linh2": [228, 262, 200, 507], "ngua": [415, 165, 457, 547], "dat": [300, 690, 655, 79], "long": [688, 33, 288, 193], "linh4": [842, 226, 204, 471], "tan": [1004, 46, 235, 286], "linh5": [1040, 332, 199, 437], "linh_co": [0, 0, 326, 750], "linh_tan": [0, 0, 235, 723], "linh_long": [0, 0, 358, 679]};
const dhAsset=n=>(window.__DH_ASSETS&&window.__DH_ASSETS[n])||`/assets/dongho/${n}.webp`;
const VQ={k:.56,x0:252,y0:139};
function dhSprite(n){const [x,y,w,h]=DH_META[n];return `<image href="${dhAsset(n)}" x="${(VQ.x0+x*VQ.k).toFixed(1)}" y="${(VQ.y0+y*VQ.k).toFixed(1)}" width="${(w*VQ.k).toFixed(1)}" height="${(h*VQ.k).toFixed(1)}"/>`}
const vx=x=>(VQ.x0+x*VQ.k).toFixed(1),vy=y=>(VQ.y0+y*VQ.k).toFixed(1);
function vqLabel(cx,cy,w,lines,size,color,bg){const H=lines.length*size*1.15+6;
 return `${bg?`<rect x="${(cx-w/2).toFixed(1)}" y="${(cy-H/2).toFixed(1)}" width="${w.toFixed(1)}" height="${H.toFixed(1)}" fill="${bg}" stroke="${DH.red}" stroke-width="1.2"/>`:''}${lines.map((t,i)=>`<text x="${cx.toFixed(1)}" y="${(cy-H/2+3+size*(i+.92)*1.15).toFixed(1)}" text-anchor="middle" font-size="${size}" font-weight="800" fill="${color}" font-family="${VNSERIF}" textLength="${(w-6).toFixed(1)}" lengthAdjust="spacingAndGlyphs">${t}</text>`).join('')}`}
function vqPlaque(name,cx){const chars=[...(name||'')].length;const w=name?Math.max(220,Math.min(330,chars*16+70)):220;const nameAttr=name&&chars*16>w-46?` textLength="${w-46}" lengthAdjust="spacingAndGlyphs"`:'';
 return `<g class="plaque">
  <rect class="plaque-glow" x="${cx-w/2-18}" y="96" width="${w+36}" height="84" rx="16" fill="#ffd56b" filter="url(#vqBlur)"/>
  <rect x="${cx-w/2}" y="104" width="${w}" height="66" fill="${DH.red}" stroke="${DH.ink}" stroke-width="3"/>
  <rect x="${cx-w/2+6}" y="110" width="${w-12}" height="54" fill="none" stroke="${DH.gold}" stroke-width="2"/>
  ${[-1,1].map(d=>{const x=cx+d*(w/2+8);return `<rect x="${x-9}" y="99" width="18" height="76" rx="9" fill="${DH.gold}" stroke="${DH.ink}" stroke-width="2.4"/>`}).join('')}
  <text x="${cx}" y="130" text-anchor="middle" font-size="13" font-weight="800" letter-spacing="3" fill="#ffe7a6" font-family="${VNSERIF}">✦ TRẠNG NGUYÊN ✦</text>
  <text x="${cx}" y="159" text-anchor="middle" font-size="${name?26:19}" font-weight="800" fill="#fff4d6" font-family="${VNSERIF}"${nameAttr}>${escapeHtml(name||'Chờ xướng danh')}</text></g>`}
/* Bà con vẽ theo nét tranh Đông Hồ: đứng tại chỗ vỗ tay */
const FOLK=[
 {k:'nu',ao:'#7a5236',ha:'#1d1b19',belt:'#2f7a4a',hat:'moquat'},{k:'nam',ao:'#5b4632',ha:'#e8e0cc',hat:'khan'},
 {k:'nu',ao:'#6a5a44',ha:'#1d1b19',belt:'#d9739a',hat:'quaithao'},{k:'nam',ao:'#2a2a33',ha:'#e8e0cc',hat:'khan',dai:1},
 {k:'tre',ao:'#b8362a',ha:'#3b3a46',hat:'chom'},{k:'nu',ao:'#8a6a44',ha:'#1d1b19',belt:'#e2b33c',hat:'moquat'},
 {k:'nam',ao:'#2f7a4a',ha:'#e8e0cc',hat:'bui'},{k:'gia',ao:'#3b3a46',ha:'#e8e0cc',hat:'khan',dai:1},
 {k:'nu',ao:'#5e4a3a',ha:'#1d1b19',belt:'#b8362a',hat:'quaithao'},{k:'tre',ao:'#2f7a4a',ha:'#3b3a46',hat:'chom'}];
function dhFolk(x,y,s,f,delay){const ink=DH.ink;
 const hy=-122,legs=f.dai?`<path d="M-15 -60L-17 -4H17L15 -60Z" fill="${f.ao}" stroke="${ink}" stroke-width="2"/>`:(f.k==='nu'?`<path d="M-13 -48L-15 -2H15L13 -48Z" fill="${f.ha}" stroke="${ink}" stroke-width="2"/>`:`<path d="M-12 -48L-13 -6H-2L0 -30L2 -6H13L12 -48Z" fill="${f.ha}" stroke="${ink}" stroke-width="2"/>`);
 const hat={moquat:`<path d="M-13 ${hy-2}Q-15 ${hy-16} 0 ${hy-19}Q15 ${hy-16} 13 ${hy-2}Q8 ${hy-11} 0 ${hy-12}Q-8 ${hy-11} -13 ${hy-2}Z" fill="#1d1b19"/><path d="M-4 ${hy-18}L0 ${hy-27}L4 ${hy-18}Z" fill="#1d1b19"/>`,
  quaithao:`<path d="M-12 ${hy-2}Q-12 ${hy-14} 0 ${hy-15}Q12 ${hy-14} 12 ${hy-2}Z" fill="#1d1b19"/><ellipse cx="0" cy="${hy-15}" rx="22" ry="4.5" fill="#d8c08a" stroke="${ink}" stroke-width="1.6"/><path d="M-15 ${hy-12}v7M15 ${hy-12}v7" stroke="#1d1b19" stroke-width="1.4"/>`,
  khan:`<path d="M-13 ${hy-1}Q-14 ${hy-17} 0 ${hy-18}Q14 ${hy-17} 13 ${hy-1}Q7 ${hy-8} 0 ${hy-8}Q-7 ${hy-8} -13 ${hy-1}Z" fill="#1d1b19"/><path d="M-12 ${hy-6}Q0 ${hy-12} 12 ${hy-6}M-11 ${hy-11}Q0 ${hy-16} 11 ${hy-11}" stroke="#5a4e44" stroke-width="1.2" fill="none"/>`,
  bui:`<path d="M-13 ${hy-1}Q-14 ${hy-16} 0 ${hy-17}Q14 ${hy-16} 13 ${hy-1}Q7 ${hy-10} 0 ${hy-10}Q-7 ${hy-10} -13 ${hy-1}Z" fill="#1d1b19"/><circle cx="2" cy="${hy-20}" r="5" fill="#1d1b19"/>`,
  chom:`<path d="M-3 ${hy-13}q3 -8 6 0z" fill="#1d1b19"/>`}[f.hat];
 const beard=f.k==='gia'?`<path d="M-5 ${hy+7}q5 12 10 0q-1 9 -5 11q-4 -2 -5 -11z" fill="#f4f2ec" stroke="#b9b5ac" stroke-width=".8"/>`:'';
 const yem=f.k==='nu'?`<path d="M-5 -110L0 -96L5 -110Z" fill="#c8231a"/>`:'';
 const arm=d=>`<g class="${d<0?'clapL':'clapR'}" style="transform-origin:${d*11}px -104px;animation-delay:${delay}s"><path d="M${d*11} -104Q${d*16} -90 ${d*4} -86" stroke="${ink}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M${d*11} -104Q${d*16} -90 ${d*4} -86" stroke="${f.ao}" stroke-width="6.5" fill="none" stroke-linecap="round"/><circle cx="${d*3}" cy="-86" r="3.6" fill="${DH.skin}" stroke="${ink}" stroke-width="1.3"/></g>`;
 return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s})">${legs}
  <path d="M-13 -110Q0 -115 13 -110L16 -46Q0 -42 -16 -46Z" fill="${f.ao}" stroke="${ink}" stroke-width="2"/>${yem}
  ${f.belt?`<path d="M-16 -58H16" stroke="${f.belt}" stroke-width="4"/>`:''}
  ${arm(-1)}${arm(1)}
  <ellipse cx="0" cy="${hy}" rx="11" ry="12" fill="${DH.skin}" stroke="${ink}" stroke-width="1.8"/>
  <path d="M-6 ${hy}q2 -1.4 3 0M3 ${hy}q2 -1.4 3 0" stroke="${ink}" stroke-width="1.3" fill="none"/><path d="M-2 ${hy+6}q2 1.4 4 0" stroke="#a5483a" stroke-width="1.3" fill="none"/>
  ${beard}${hat}</g>`}
function dhCrowd(){let out='',i=0;
 const rows=[{y:258,s:.34,step:22},{y:282,s:.38,step:24},{y:308,s:.42,step:27},{y:336,s:.47,step:30},{y:366,s:.52,step:33},{y:398,s:.57,step:36},{y:432,s:.62,step:40}];
 rows.forEach((r,ri)=>{for(let x=136+(ri%2)*r.step/2;x<1066;x+=r.step){const f=FOLK[(i*7+ri*3)%FOLK.length];out+=dhFolk(x+((i*13)%7)-3,r.y,r.s*(f.k==='tre'?.82:1),f,-((i*37)%11)/11*.5);i++}});
 let grass='';for(let x=140;x<1070;x+=34)grass+=`<path d="M${x} ${470+(x%3)*3}q-2 -8 -6 -10M${x} ${470+(x%3)*3}q1 -9 5 -11" stroke="#6f8f42" stroke-width="2" fill="none"/>`;
 return `<g class="vq-crowd"><path d="M124 230Q600 214 1076 230V572H124Z" fill="#e8d8b4" opacity=".7"/>${out}${grass}</g>`}
function dhProcession(name){
 const M=DH_META,fo=(n,ax,ay)=>`transform-origin:${vx(M[n][0]+M[n][2]*ax)}px ${vy(M[n][1]+M[n][3]*ay)}px`;
 const walker=(n,prop,propCls,propOrigin,delay,extra='')=>`<g class="vqwalk" style="${fo(n,.5,1)};animation-delay:${delay}s">${dhSprite(n)}<g class="${propCls}" style="${propOrigin};animation-delay:${delay}s">${dhSprite(prop)}${extra}</g></g>`;
 return `<g class="procession">${dhSprite('dat')}
  <g class="vqhorse" style="${fo('ngua',.45,1)}">${dhSprite('ngua')}</g>
  ${walker('linh2','bien','vqswing',fo('bien',.5,1),-.35,vqLabel(+vx(365),+vy(155),40,['TRẠNG','NGUYÊN'],10,DH.red,'#f2d58a'))}
  ${walker('linh1','co','vqflag',fo('co',.08,1),0,`<g transform="rotate(-6 ${vx(125)} ${vy(160)})">${vqLabel(+vx(125),+vy(160),78,['VINH QUY'],15,DH.deep,null)}</g>`)}
  ${walker('linh4','long','vqcanopy',fo('long',.55,1),-.6)}
  ${walker('linh5','tan','vqswing',fo('tan',.45,1),-.2,vqLabel(+vx(1118),+vy(165),84,['BÁI TỔ'],15,DH.gold,null))}
 </g>${vqPlaque(name,+vx(700))}`}
/* Bảng vinh danh: VINH QUY BÁI TỔ · CHÚC MỪNG TRẠNG NGUYÊN · [tên thật] · điểm */
function vqTitleCard(h,y0){const name=h?.name||'Chờ xướng danh',chars=[...name].length,W=520,x0=600-W/2,fs=chars>18?28:33,tl=chars*fs*.56>W-80?` textLength="${W-80}" lengthAdjust="spacingAndGlyphs"`:'';
 const info=h?`${fmt(h.score)} điểm · ${h.correct||0} câu đúng`:'',H=info?120:100;
 return `<g id="vqTitle" style="opacity:0"><g transform="translate(0 ${y0})">
  <rect x="${x0-14}" y="-10" width="${W+28}" height="${H+20}" rx="20" fill="#ffd56b" opacity=".35" filter="url(#vqBlurT)"/>
  <rect x="${x0}" y="0" width="${W}" height="${H}" rx="10" fill="url(#vqLacquer)" stroke="${DH.ink}" stroke-width="3"/>
  <rect x="${x0+7}" y="7" width="${W-14}" height="${H-14}" rx="7" fill="none" stroke="${DH.gold}" stroke-width="2"/><rect x="${x0+12}" y="12" width="${W-24}" height="${H-24}" rx="5" fill="none" stroke="${DH.gold}" stroke-width=".8" stroke-dasharray="4 3"/>
  ${[x0+22,x0+W-22].map(cx=>`<circle cx="${cx}" cy="21" r="4" fill="${DH.gold}"/><circle cx="${cx}" cy="${H-21}" r="4" fill="${DH.gold}"/>`).join('')}
  <text x="600" y="29" text-anchor="middle" font-size="14" font-weight="800" letter-spacing="5" fill="#ffd97a" font-family="${VNSERIF}">✦ VINH QUY BÁI TỔ ✦</text>
  <text x="600" y="50" text-anchor="middle" font-size="16" font-weight="800" letter-spacing="2" fill="#fff0cf" font-family="${VNSERIF}">CHÚC MỪNG TRẠNG NGUYÊN</text>
  <text x="600" y="86" text-anchor="middle" font-size="${fs}" font-weight="800" fill="#fff8e4" stroke="#5a120c" stroke-width=".8" paint-order="stroke" font-family="${VNSERIF}"${tl}>${escapeHtml(name)}</text>
  ${info?`<text x="600" y="106" text-anchor="middle" font-size="13" font-weight="700" fill="#ffd97a" font-family="'Udika Sans',Arial,sans-serif">${info}</text>`:''}</g></g>`}
function vqDefsExtra(){return `<linearGradient id="vqLacquer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c63a2c"/><stop offset="1" stop-color="#8a1f17"/></linearGradient>
 <radialGradient id="vqSun" cx=".82" cy=".1" r=".9"><stop offset="0" stop-color="#fff1c4" stop-opacity=".55"/><stop offset=".45" stop-color="#ffe3a0" stop-opacity=".12"/><stop offset="1" stop-color="#ffe3a0" stop-opacity="0"/></radialGradient>
 <radialGradient id="vqVig" cx=".5" cy=".55" r=".75"><stop offset=".6" stop-color="#2a1608" stop-opacity="0"/><stop offset="1" stop-color="#2a1608" stop-opacity=".32"/></radialGradient>
 <pattern id="fkBrocade" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.3" fill="#f2cf6a"/><path d="M9 6.6l1.6 2.4l-1.6 2.4l-1.6 -2.4Z" fill="#e6b84c"/></pattern>
 <radialGradient id="fkHalo"><stop offset="0" stop-color="#fff4c8" stop-opacity=".85"/><stop offset=".55" stop-color="#ffe08a" stop-opacity=".3"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient>
 <filter id="vqBlurT" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>`}
/* cờ hội trong làng (cờ đuôi nheo trên cột tre) */
function vqFestFlags(){const cols=[['#c0352a','#efc04f'],['#efc04f','#c0352a'],['#2e7a4f','#efc04f'],['#c0352a','#2e7a4f'],['#efc04f','#2e7a4f'],['#c0352a','#efc04f']];
 return [175,318,462,738,882,1028].map((x,i)=>{const [a,b]=cols[i];const top=232+(i%2)*10;
  return `<g><path d="M${x} 402V${top}" stroke="#8a6a3a" stroke-width="3.2"/><circle cx="${x}" cy="${top-3}" r="3.4" fill="#e6b84c" stroke="${DH.ink}" stroke-width=".8"/>
   <g><animateTransform attributeName="transform" type="rotate" values="-4 ${x} ${top};5 ${x} ${top};-4 ${x} ${top}" dur="${(2.2+i*.23).toFixed(2)}s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>
   <path d="M${x} ${top+2}L${x+58} ${top+14}L${x+46} ${top+20}L${x+60} ${top+28}L${x} ${top+40}Z" fill="${a}" stroke="${DH.ink}" stroke-width="1"/><path d="M${x} ${top+12}L${x+30} ${top+20}L${x} ${top+28}Z" fill="${b}"/></g></g>`}).join('')}
function vqControls(){return `<div class="vq-ctrl" role="toolbar" aria-label="Điều khiển hoạt cảnh rước Trạng nguyên">
  <span class="st">Trống hội – bà con chờ đón</span>
  <button type="button" data-vqc="pause" onclick="VQAnim.command('toggle')">⏸ Tạm dừng</button>
  <button type="button" onclick="VQAnim.command('honor')">🏆 Vinh danh</button>
  <button type="button" onclick="VQAnim.command('replay')">↺ Phát lại</button>
  <button type="button" data-vqc="sound" onclick="VQAnim.command('sound')">🔊 Âm thanh</button>
  <label class="sp">Âm lượng <input type="range" min="0" max="100" value="85" data-vqvol oninput="VQAnim.command('volume',this.value/100)"></label>
  <span class="sp">Tốc độ</span><button type="button" data-vqs="0.5" onclick="VQAnim.command('speed',0.5)">0.5×</button><button type="button" data-vqs="1" class="on" onclick="VQAnim.command('speed',1)">1×</button><button type="button" data-vqs="1.5" onclick="VQAnim.command('speed',1.5)">1.5×</button>
 </div>`}
function vinhQuyMarkup(h){
 const name=h?.name||'';
 let conf='';const cc=['#d22b1f','#f2c75a','#e88aa6','#2f7a4a','#ffdf80'];
 for(let i=0;i<28;i++){const x=(i*97)%1180+10,dl=(i*0.37)%5,du=4.5+(i%5)*.8,dx=((i%7)-3)*30;conf+=`<rect class="cf" x="${x}" y="-20" width="${8+i%3*3}" height="${12+i%4*2}" rx="2" fill="${cc[i%5]}" style="--dx:${dx}px;--cd:${du}s;--cdl:${dl}s"/>`}
 // Có phim 3D dựng sẵn → phát phim, lớp tên động lấy từ dữ liệu thật
 if(window.__VQ_VIDEO){const V=window.__VQ_VIDEO;
  return `<div class="vq-video"><video class="vqv" src="${escapeHtml(V.src)}" data-name-at="${+V.nameAt||20}" playsinline preload="auto"></video>
   <svg class="vq vq-over" viewBox="0 0 1200 675" preserveAspectRatio="xMidYMid meet" aria-label="Vinh quy bái tổ – Trạng nguyên ${escapeHtml(name)}"><defs>${vqDefsExtra()}</defs>${vqTitleCard(h,+V.nameY||40)}<g class="confetti">${conf}</g></svg></div>${vqControls()}`}
 const F=fkSceneMarkup(name);
 let road='';for(let i=0;i<26;i++){const x=130+i*37+(i%3)*6;road+=`<path d="M${x} ${468+(i%2)*3}q3 -9 6 0q2 -7 5 0" stroke="#7d9a46" stroke-width="1.6" fill="none"/>`}
 const AUD=window.__VQ_AUDIO_SRC||'/assets/vinhquy/trong_mua_lan.m4a';
 return `<audio class="vqa" src="${AUD}" preload="auto"></audio><svg class="vq" viewBox="0 0 1200 675" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Vinh quy bái tổ – Trạng nguyên ${escapeHtml(name)}">
  <defs>${dhDefs()}${vqDefsExtra()}<clipPath id="vqClipW"><rect x="122" y="100" width="956" height="474"/></clipPath></defs>
  <rect width="1200" height="675" fill="#5b2f1a"/><rect x="18" y="18" width="1164" height="639" rx="6" fill="#7a4526" stroke="#e2b85a" stroke-width="2"/>
  <g transform="translate(-100 -54.333) scale(1.16667)">
   <g clip-path="url(#vqClipW)">
    <g data-cam="1">${vqVillage(true)}
     <path d="M60 404Q600 396 1140 404V620H60Z" fill="#dccb92"/><path d="M60 404Q600 396 1140 404" stroke="${DH.ink}" stroke-width="1.2" fill="none"/>
     ${vqFestFlags()}
     <path d="M60 466Q600 458 1140 466V620H60Z" fill="#efe0b6"/><path d="M60 466Q600 458 1140 466" stroke="#b89a5c" stroke-width="2" fill="none"/>${road}
     <g class="fkcrowd">${F.crowd}</g>
     <g transform="translate(1200 0) scale(-1 1)"><g data-proc="1" transform="translate(${-FK_LAYOUT.dx0} 0)">${F.proc}</g></g>
    </g>
    <rect x="122" y="100" width="956" height="474" fill="url(#vqSun)"/><rect x="122" y="100" width="956" height="474" fill="url(#vqVig)"/>
    ${vqTitleCard(h,104)}
   </g>
   <rect x="121" y="99" width="958" height="476" fill="none" stroke="${DH.ink}" stroke-width="2.6"/>
  </g>
  <g class="confetti">${conf}</g>
 </svg>${vqControls()}`;
}
/* Phát hiện phim vinh danh 3D dựng sẵn trên máy chủ: /assets/vinhquy/vinh_quy.mp4 (+ tuỳ chọn vinh_quy.json: {"nameAt":20,"nameY":40}) */
window.__VQ_VIDEO=window.__VQ_VIDEO||null;   /* bản demo có thể đặt sẵn phim (blob) */
(function(){if(window.__VQ_VIDEO||typeof fetch!=='function'||!/^https?:/.test(location.protocol))return;const src='/assets/vinhquy/vinh_quy.mp4';
 fetch(src,{method:'HEAD'}).then(r=>{if(!r.ok||!/video/.test(r.headers.get('content-type')||''))return;const v={src,nameAt:20,nameY:40};window.__VQ_VIDEO=v;
  return fetch('/assets/vinhquy/vinh_quy.json').then(j=>j.ok?j.json():null).then(c=>{if(c){if(+c.nameAt>=0)v.nameAt=+c.nameAt;if(+c.nameY>=0)v.nameY=+c.nameY}}).catch(()=>{})
   .then(()=>{const el=document.getElementById('vinhQuy');if(el&&el.querySelector('svg.vq')&&!el.querySelector('video.vqv')&&typeof replayVinhQuy==='function')replayVinhQuy()})}).catch(()=>{})})();   /* đã vẽ hoạt cảnh trước khi dò xong phim → chuyển sang phim */
/* Gắn hoạt cảnh: bộ chạy VQAnim điều khiển các khớp nhân vật */
function mountVinhQuy3D(root){const el=root||document.getElementById('vinhQuy');if(el&&window.VQAnim)VQAnim.mount(el)}

function replayVinhQuy(){
 const el=document.getElementById('vinhQuy');if(!el)return;
 el.innerHTML=vinhQuyMarkup(window.__vqHonor||null);mountVinhQuy3D(el);
}

/* ===== V7 – Phong cảnh làng quê Bắc Bộ phía sau đoàn rước (nét mực, màu phẳng kiểu tranh Đông Hồ) =====
   Núi xa · đồng lúa · lũy tre làng · mái đình · cây đa · hàng cau · nhà tranh · cò trắng.
   Không chữ Hán, không hoạ tiết ngoại lai. */
function vqRand(seed){let x=seed>>>0||1;return()=>((x=(x*1664525+1013904223)>>>0)/4294967296)}
function vqBamboo(x,base,h,seed){const R=vqRand(seed),ink=DH.ink;let culms='',leaves='';
 for(let k=0;k<6;k++){const dx=(k-2.5)*5+R()*4,bend=(k-2.5)*9+(R()-.5)*14,top=base-h*(.82+R()*.22);
  culms+=`<path d="M${(x+dx).toFixed(1)} ${base}Q${(x+dx+bend*.25).toFixed(1)} ${((base+top)/2).toFixed(1)} ${(x+dx+bend).toFixed(1)} ${top.toFixed(1)}" stroke="#6f8f3a" stroke-width="${(2.6-k*.12).toFixed(1)}" fill="none"/>`;
  for(let j=0;j<7;j++){const t=.35+j*.1,lx=x+dx+bend*t*t,ly=base-(base-top)*t,a=(bend>0?25:-25)+(R()-.5)*60+(j%2?160:20);
   leaves+=`<path transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)}) rotate(${a.toFixed(0)})" d="M0 0q8-4 18 1q-9 3-18-1z" fill="${j%3?'#4d7a30':'#3a6326'}" stroke="${ink}" stroke-width=".7"/>`}}
 const blobs=[...Array(5)].map((_,i)=>{const bx=x+(i-2)*12+(R()-.5)*8,by=base-h*(.55+R()*.35);return `<ellipse cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" rx="${(16+R()*8).toFixed(1)}" ry="${(12+R()*6).toFixed(1)}" fill="${i%2?'#3f6b2a':'#4f7d33'}" stroke="${ink}" stroke-width="1.2"/>`}).join('');
 return `<g class="vqbamboo" style="--bd:${(2.6+R()*1.6).toFixed(2)}s">${blobs}${culms}${leaves}</g>`}
function vqAreca(x,base,h,seed){const R=vqRand(seed),ink=DH.ink,top=base-h;let rings='';for(let y=base-8;y>top+10;y-=9)rings+=`<path d="M${x-3} ${y}h6" stroke="#7d7462" stroke-width="1"/>`;
 let fr='';for(let k=0;k<9;k++){const a=-170+k*20+(R()-.5)*8,L=28+R()*10,rad=a*Math.PI/180,ex=x+Math.cos(rad)*L,ey=top+Math.sin(rad)*L*.55+L*.35;fr+=`<path d="M${x} ${top}Q${(x+Math.cos(rad)*L*.55).toFixed(1)} ${(top+Math.sin(rad)*L*.6-6).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="#3d6a28" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M${x} ${top}Q${(x+Math.cos(rad)*L*.55).toFixed(1)} ${(top+Math.sin(rad)*L*.6-6).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="#6b9a3e" stroke-width="1" fill="none" stroke-dasharray="3 2"/>`}
 return `<g class="vqareca" style="--bd:${(3+R()*1.5).toFixed(2)}s"><path d="M${x-2.6} ${base}L${x-1.6} ${top}h3.2L${x+2.6} ${base}z" fill="#b5ab92" stroke="${ink}" stroke-width="1"/>${rings}<g class="crown" style="transform-origin:${x}px ${top}px">${fr}<circle cx="${x+3}" cy="${top+7}" r="4" fill="#7c9a3a" stroke="${ink}" stroke-width=".8"/><circle cx="${x-2}" cy="${top+9}" r="3.4" fill="#d4a63a" stroke="${ink}" stroke-width=".8"/></g></g>`}
function vqDinh(cx,ye){const ink=DH.ink,yr=ye-66,half=(wr,we,lift)=>`M${cx} ${yr}H${cx+wr}Q${cx+wr+18} ${yr+40} ${cx+we} ${ye-lift}q10 -4 8 -16q4 10 -2 18Q${cx+we-30} ${ye+8} ${cx} ${ye+6}`;
 const roof=d=>`<path d="${d}" fill="#8a4b2f" stroke="${ink}" stroke-width="2"/>`;
 let tiles='';for(let i=-11;i<=11;i++){const x0=cx+i*6.2,x1=cx+i*10.6;tiles+=`<path d="M${x0.toFixed(1)} ${yr+3}L${x1.toFixed(1)} ${ye+2}" stroke="#6a3320" stroke-width="1"/>`}
 return `<g class="vqdinh"><clipPath id="vqDinhClip"><path d="M${cx-70} ${yr}H${cx+70}Q${cx+88} ${yr+40} ${cx+122} ${ye-10}Q${cx} ${ye+14} ${cx-122} ${ye-10}Q${cx-88} ${yr+40} ${cx-70} ${yr}Z"/></clipPath>
  <rect x="${cx-104}" y="${ye}" width="208" height="46" fill="#5b3b25" stroke="${ink}" stroke-width="1.6"/>
  ${[...Array(9)].map((_,i)=>`<rect x="${cx-98+i*24}" y="${ye+2}" width="6" height="44" fill="#3e2617"/>`).join('')}
  <rect x="${cx-110}" y="${ye+44}" width="220" height="8" fill="#9c8a6c" stroke="${ink}" stroke-width="1.2"/>
  ${roof(half(70,124,10))}<g transform="translate(${2*cx} 0) scale(-1 1)">${roof(half(70,124,10))}</g>
  <g clip-path="url(#vqDinhClip)">${tiles}</g>
  <path d="M${cx-78} ${yr+1}H${cx+78}" stroke="#4a2617" stroke-width="7" stroke-linecap="round"/><path d="M${cx-80} ${yr+1}q-6-2-6-10M${cx+80} ${yr+1}q6-2 6-10" stroke="#4a2617" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M${cx-118} ${ye-6}Q${cx} ${ye+12} ${cx+118} ${ye-6}" stroke="#b58a3c" stroke-width="2.2" fill="none"/></g>`}
function vqBanyan(cx,base){const ink=DH.ink;const R=vqRand(77);let canopy='';
 const C=[[0,-112,62,40],[-52,-96,44,32],[52,-98,46,32],[-26,-138,40,28],[30,-140,42,28],[-78,-74,30,22],[80,-76,32,22],[0,-78,50,26]];
 C.forEach(([dx,dy,rx,ry],i)=>{canopy+=`<ellipse cx="${cx+dx}" cy="${base+dy}" rx="${rx}" ry="${ry}" fill="${i%3===0?'#2e5a2a':i%3===1?'#3c6a30':'#477838'}" stroke="${ink}" stroke-width="1.6"/>`});
 let dots='';for(let i=0;i<46;i++){const a=R()*6.28,rr=R(),x=cx+Math.cos(a)*rr*88,y=base-100+Math.sin(a)*rr*48;dots+=`<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(R()*360).toFixed(0)})" d="M0 0q4-3 9 0q-5 3-9 0z" fill="#6f9c4a"/>`}
 let roots='';for(let i=0;i<9;i++){const x=cx-46+i*11.5+(R()-.5)*4;roots+=`<path d="M${x.toFixed(1)} ${base-70}Q${(x+(R()-.5)*8).toFixed(1)} ${base-36} ${(x+(R()-.5)*6).toFixed(1)} ${base}" stroke="#5c4030" stroke-width="${(1+R()*1.4).toFixed(1)}" fill="none"/>`}
 return `<g class="vqbanyan">${roots}<path d="M${cx-16} ${base}C${cx-12} ${base-40} ${cx-18} ${base-60} ${cx-30} ${base-84}L${cx-14} ${base-90}L${cx} ${base-70}L${cx+16} ${base-92}L${cx+30} ${base-84}C${cx+16} ${base-60} ${cx+14} ${base-40} ${cx+18} ${base}Z" fill="#6b4a33" stroke="${ink}" stroke-width="1.8"/><g class="canopy" style="transform-origin:${cx}px ${base}px">${canopy}${dots}</g></g>`}
function vqHut(x,base,w){const ink=DH.ink,h=w*.42;let hatch='';for(let i=1;i<14;i++){const t=i/14;hatch+=`<path d="M${(x+w*.18+t*w*.64).toFixed(1)} ${base-h-w*.28}L${(x+t*w).toFixed(1)} ${base-h+2}" stroke="#9c7a3e" stroke-width="1"/>`}
 return `<g><rect x="${x+w*.08}" y="${base-h}" width="${w*.84}" height="${h}" fill="#b98f5e" stroke="${ink}" stroke-width="1.4"/><rect x="${x+w*.42}" y="${base-h*.72}" width="${w*.16}" height="${h*.72}" fill="#4a3322"/>
  <path d="M${x-6} ${base-h+4}L${x+w*.18} ${base-h-w*.28}H${x+w*.82}L${x+w+6} ${base-h+4}Z" fill="#cfa85e" stroke="${ink}" stroke-width="1.6"/>${hatch}</g>`}
function vqEgret(x,y,s,d){return `<g transform="translate(${x} ${y}) scale(${s})"><g class="vqegret" style="--ed:${d}s"><path class="wl" d="M0 0Q-9 -8 -18 -4Q-10 -2 0 2Z" fill="#fbf7ec" stroke="${DH.ink}" stroke-width=".9"/><path class="wr" d="M0 0Q9 -8 18 -4Q10 -2 0 2Z" fill="#fbf7ec" stroke="${DH.ink}" stroke-width=".9"/><path d="M0 2q6 0 10 -3" stroke="${DH.ink}" stroke-width="1.1" fill="none"/><path d="M10 -1l5 -1" stroke="#d4a63a" stroke-width="1.4"/></g></g>`}
function vqVillage(full){const ink=DH.ink,B=300;
 let fields='';[[262,'#d8cf7c'],[272,'#b9c86e'],[282,'#cfc070'],[292,'#a9bf62']].forEach(([y,c],i)=>{fields+=`<path d="M122 ${y}Q600 ${y-6-i} 1078 ${y}V${y+12}H122Z" fill="${c}" stroke="${ink}" stroke-width=".6" opacity=".95"/>`});
 let bamboo='';const xs=[];for(let x=128;x<1080;x+=34)xs.push(x);xs.forEach((x,i)=>{bamboo+=vqBamboo(x+(i%3)*5,B,72+((i*37)%40),i*31+7)});
 return `<defs><linearGradient id="vqSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6ebcd"/><stop offset="1" stop-color="#f1dfb4"/></linearGradient></defs>
  <g class="vqvillage">
  <rect x="122" y="100" width="956" height="200" fill="url(#vqSky)"/>
  <circle cx="930" cy="150" r="22" fill="#f2c75a" opacity=".55"/>
  ${dhCloud(230,140,.9)}${dhCloud(1000,128,.75,1)}${dhCloud(640,118,.6)}
  <path d="M122 250L170 214L214 232L268 196L330 228L380 210L440 238L470 230L520 248L600 236L660 214L720 236L790 204L850 230L900 216L960 236L1020 206L1078 226V300H122Z" fill="#a8bba0" stroke="${ink}" stroke-width="1.4"/>
  <path d="M122 262L190 236L250 252L310 230L370 256L470 246L540 260L640 240L720 258L800 236L880 256L960 240L1078 258V300H122Z" fill="#8ea886" stroke="${ink}" stroke-width="1.2"/>
  ${fields}
  ${vqEgret(700,148,1,1.1)}${vqEgret(735,136,.85,.9)}${vqEgret(764,156,.75,1.3)}${vqEgret(300,128,.7,1)}
  ${bamboo}
  ${full?vqAreca(168,B,150,3)+vqAreca(586,B,142,5)+vqAreca(612,B,118,9)+vqAreca(808,B,156,11)+vqAreca(1052,B,140,13):''}
  ${vqHut(880,B,80)}${vqHut(968,B,66)}
  ${full?vqDinh(400,250)+vqBanyan(214,B):''}
  <rect x="122" y="100" width="956" height="200" fill="#efe2bf" opacity=".38"/>
  <rect x="122" y="${B-2}" width="956" height="${574-B+2}" fill="#e4d2a4"/>
  <path d="M122 ${B-3}${[...Array(48)].map((_,i)=>`L${122+i*20+6} ${B-9-(i*7)%6}L${122+i*20+12} ${B-2}L${122+i*20+20} ${B-3}`).join('')}V${B+8}H122Z" fill="#7fa04a" stroke="${ink}" stroke-width="1"/>
  <path d="M122 ${B+8}H1078" stroke="#c9b27c" stroke-width="3"/>
  ${[...Array(14)].map((_,i)=>`<path d="M${130+i*70} ${B+20+(i%4)*60}q20 -4 40 0" stroke="#d3bd88" stroke-width="2" fill="none"/>`).join('')}
  </g>`}

