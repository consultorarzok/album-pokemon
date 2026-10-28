/* Las 7 figuritas especiales en la Arena: ataques exclusivos (más fuertes), aura oscura de Lugia/Ho-Oh Apex. */
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
const IDS=[...require('fs').readFileSync('/root/pokemon/app.js','utf8').matchAll(/\{ id: '([^']+)'/g)].map(m=>m[1]);
const SHOTS=process.env.SHOTS||'/tmp';
let ok=0,fail=0;const check=(n,c)=>{c?ok++:fail++;console.log((c?'  ✅ ':'  ❌ ')+n);};
(async()=>{const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
await ctx.route('**://n8n.consultorarz.com/**',r=>r.abort());
await ctx.addInitScript((IDS)=>{ if(sessionStorage.getItem('s'))return; sessionStorage.setItem('s','1');
 localStorage.setItem('album-kanto-regalos',JSON.stringify(IDS)); localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador','Tester');
 const st={};for(let i=1;i<=151;i++)st[i]={got:i<=14,dup:0};
 const esp={};[10150,10151,10152,10153,10154,10155].forEach(i=>esp[i]={f:90,c:'ABCD'});
 localStorage.setItem('album-kanto-progreso',JSON.stringify({coins:300,state:st,especiales:esp}));},IDS);
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///root/pokemon/index.html');await p.click('#portadaEntrar',{force:true});await p.waitForTimeout(1200);
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>e.classList.remove('show')));
const mv=await p.evaluate(()=>{const M=window.__arenaMovs; return [10150,10151,10152,10153,10154,10155].map(i=>{const e=ESPECIAL_POR_ID[i];const m=M.movsDe(e,'x');return i+':'+['corto','medio','largo'].map(a=>m[a].n+'/'+m[a].pot).join(',');});});
console.log(mv.join('\n'));
check('los 7 tienen 3 ataques exclusivos con pot>1', mv.every(l=>l.split(',').length===3 && !/\/undefined|\/1(,|$)/.test(l)));
for(const [id,aura] of [[10150,false],[10151,true],[10152,true],[10153,false],[10154,false],[10155,false]]){
  await p.click('#battleBtn');await p.waitForSelector('.ar-sel');
  await p.evaluate(()=>{document.querySelectorAll('.ar-sel.on').forEach(e=>e.click());});
  await p.click(`.ar-sel[data-id="${id}"]`); for(const o of [1,2,3]) await p.click(`.ar-sel[data-id="${o}"]`); await p.click('#arPickGo');await p.waitForSelector('#arHud-riv');await p.waitForTimeout(2500);
  const r=await p.evaluate(()=>({aura:document.querySelector('#arMon-yo').classList.contains('ar-aura-oscura'), btn:[...document.querySelectorAll('.ar-act b')].slice(0,3).map(b=>b.textContent).join('|')}));
  check(id+' aura='+aura+', ataques: '+r.btn, r.aura===aura);
  await p.screenshot({path:SHOTS+'/esp-'+id+'.png'});
  await p.goto('file:///root/pokemon/index.html');await p.click('#portadaEntrar',{force:true});await p.waitForTimeout(1200);
  await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>e.classList.remove('show')));
}

check('sin errores de JS '+errs.join(';'), errs.length===0);
console.log(ok+' ok · '+fail+' fallan');await b.close();})();
