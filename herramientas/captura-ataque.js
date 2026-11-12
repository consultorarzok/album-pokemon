/* Graba en cuadros un ataque puntual. Uso: node herramientas/captura-ataque.js <idPokemon> <corto|medio|largo> <carpeta> [nombreAtaqueForzado] */
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
const [,, ID, ALC, DIR, FORZAR] = process.argv; const id = Number(ID);
(async()=>{const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
await ctx.route('**://n8n.consultorarz.com/**',r=>r.abort());
await ctx.addInitScript(()=>{ window.__arenaEscena='noche'; if(sessionStorage.getItem('s'))return; sessionStorage.setItem('s','1');
 localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador','Tester');
 const st={};for(let i=1;i<=151;i++)st[i]={got:i<=14||i===94,dup:0};
 const esp={};[10150,10151,10152,10153,10154,10155].forEach(i=>esp[i]={f:90,c:'ABCD'});
 localStorage.setItem('album-kanto-progreso',JSON.stringify({coins:300,state:st,especiales:esp}));});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///root/pokemon/index.html');await p.click('#portadaEntrar',{force:true});await p.waitForTimeout(1200);
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>e.classList.remove('show')));
await p.click('#battleBtn');await p.waitForSelector('.ar-sel');
await p.evaluate(()=>{document.querySelectorAll('.ar-sel.on').forEach(e=>e.click());});
await p.click(`.ar-sel[data-id="${id}"]`); for(const o of [1,2,3].filter(x=>x!==id)) await p.click(`.ar-sel[data-id="${o}"]`); await p.click('#arPickGo');
await p.waitForFunction(()=>window.__arena&&window.__arena.estado()&&window.__arena.estado().fase==='lucha',null,{timeout:20000});
await p.evaluate(([alc,f])=>{ const e=window.__arena.ent(); e.riv.mon.hp=e.riv.mon.max=99999; e.yo.mon.hp=e.yo.mon.max=99999; e.yo.mon.en=999;
  if(f){ const d=window.__arenaMovs.MOVS_CAT.find(x=>x[0]===f); e.yo.mon.movs[alc]={n:d[0],tipo:d[1],fx:alc==='largo'?'rayo':d[2],forma:d[4]||'bola'}; } },[ALC,FORZAR||'']);
await p.waitForTimeout(700);
await p.tap('#arB-'+ALC);
for(let i=0;i<(Number(process.env.N)||14);i++){ await p.screenshot({path:`${DIR}/${ID}-${ALC}-${String(i).padStart(2,'0')}.png`,clip:{x:0,y:100,width:390,height:560}}); await p.waitForTimeout(Number(process.env.MS)||70); }
console.log('errores:',errs.join(';')||'ninguno'); await b.close();})();
