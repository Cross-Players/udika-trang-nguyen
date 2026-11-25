'use strict';
/* ĐO ĐỘ ỔN ĐỊNH: chạy LẶP các bộ kiểm thử lõi nhiều vòng (mỗi lần đúng 1 lần, không chạy lại) để bắt lỗi "lúc được lúc không",
   cộng nhiều buổi diễn tập có sự cố với kịch bản ngẫu nhiên khác nhau. Kết quả: KET_QUA_DO_ON_DINH.txt
   Dùng: node test/do-on-dinh.js [số vòng=5] [số buổi diễn tập=3] */
const {spawnSync}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');const ROOT=path.resolve(__dirname,'..');
const ROUNDS=Number(process.argv[2]||5),DRILLS=Number(process.argv[3]||3);
const core=['smoke-prod.js','test-time-v5.js','test-questions-v5.js','test-import-report-v6.js','test-vq-control-v8.js','test-v14-features.js','test-v14-auto-reveal.js','test-v14-reliability.js','test-v15-core.js','test-router.js','test-audit-v15.js','test-release-v15.js','test-khach-v15.js','test-thanh-toan.js','test-lien-hoan.js','test-gioi-han-cum.js','test-postgres-that.js','test-dang-cau-moi.js'];
const res=new Map(core.map(f=>[f,{ok:0,n:0,why:[]}]));const t0=Date.now();
const run=(args,env={})=>{const r=spawnSync(process.execPath,args,{cwd:ROOT,encoding:'utf8',timeout:15*60e3,maxBuffer:64e6,env:{...process.env,...env}});const out=(r.stdout||'')+(r.stderr||'');return {ok:r.status===0,out,why:(out.match(/^(FAIL|AssertionError|Error).*$/m)||['mã '+r.status])[0].slice(0,200)}};
for(let k=1;k<=ROUNDS;k++){for(const f of core){const x=run(['test/'+f]);const s=res.get(f);s.n++;if(x.ok)s.ok++;else{s.why.push(`vòng ${k}: ${x.why}`);fs.appendFileSync(path.join(ROOT,'test','last-failures.log'),`\n===== ĐO ỔN ĐỊNH ${new Date().toISOString()} · ${f} · vòng ${k} =====\n${x.out.slice(-6000)}\n`)}}
 console.log(`vòng ${k}/${ROUNDS}: `+core.map(f=>res.get(f)).filter(s=>s.ok<s.n).length+' bộ có lần hỏng')}
const drills=[];for(let k=1;k<=DRILLS;k++){const seed=String(1000+k*7919);const x=run(['test/test-dien-tap-on-dinh.js','300'],{DIEN_TAP_SEED:seed});drills.push({seed,ok:x.ok,why:x.why,line:(x.out.match(/^Đối soát .*$/m)||[''])[0]});console.log(`diễn tập ${k}/${DRILLS} (hạt ${seed}): ${x.ok?'ĐẠT':'KHÔNG ĐẠT – '+x.why}`)}
const lines=[`ĐO ĐỘ ỔN ĐỊNH – UDIKA Khoa Bảng · ${new Date().toISOString()} · Node ${process.version} · ${((Date.now()-t0)/60000).toFixed(1)} phút`,
 `Mỗi bộ lõi chạy ${ROUNDS} vòng, mỗi lần đúng 1 lần (không chạy lại). Lỗi "lúc được lúc không" sẽ hiện thành tỉ lệ < ${ROUNDS}/${ROUNDS}.`,'',
 ...core.map(f=>{const s=res.get(f);return `[${s.ok===s.n?'ỔN ĐỊNH':'CHẬP CHỜN'}] ${f}: ${s.ok}/${s.n}${s.why.length?'\n   '+s.why.join('\n   '):''}`}),'',
 `Diễn tập buổi thi có sự cố (300 sĩ tử × 12 câu, kill -9, rớt mạng, gửi trễ, bấm trùng), ${DRILLS} kịch bản ngẫu nhiên khác nhau:`,
 ...drills.map(d=>`[${d.ok?'ĐẠT':'KHÔNG ĐẠT'}] hạt ${d.seed}${d.line?' – '+d.line:''}${d.ok?'':' – '+d.why}`),'',
 `TỔNG: ${[...res.values()].filter(s=>s.ok===s.n).length}/${core.length} bộ lõi ổn định qua ${ROUNDS} vòng · ${drills.filter(d=>d.ok).length}/${DRILLS} buổi diễn tập đạt`];
fs.writeFileSync(path.join(ROOT,'KET_QUA_DO_ON_DINH.txt'),lines.join('\n')+'\n');console.log('\n'+lines.join('\n'));process.exitCode=[...res.values()].every(s=>s.ok===s.n)&&drills.every(d=>d.ok)?0:1;
