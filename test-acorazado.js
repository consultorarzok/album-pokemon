/* Mewtwo Acorazado como figurita ESPECIAL aparte (no toca al Mewtwo común ni al ranking), adentro de la
   Pokédex, usable en la Arena; y rivales con nombres de entrenadores reales del ranking. Servidor simulado. */
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
const TOP={ok:true,hoy:[{jugador:'ZeTa Centeno',figuritas:501},{jugador:'Gastón',figuritas:5}],historico:[{jugador:'Maximo',figuritas:569},{jugador:'El Mostaza',figuritas:372},{jugador:'zeta centeno',figuritas:501}],completaron:[{jugador:'Matías TA'}],jugadores:64};
const IDS=[...require('fs').readFileSync('/root/pokemon/app.js','utf8').matchAll(/\{ id: '([^']+)'/g)].map(m=>m[1]).filter(i=>i!=='zeta-acorazado-especial-20261022');
let ok=0,fail=0;const check=(n,c)=>{c?ok++:fail++;console.log((c?'  ✅ ':'  ❌ ')+n);};
(async()=>{const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844}});
await ctx.route('**://n8n.consultorarz.com/**',r=>{const u=r.request().url();
  if(u.includes('pokemon-top')) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(TOP)});
  if(u.includes('maestro-top')) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,top:[{jugador:'Bast',pts:3}]})});
  return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
await ctx.addInitScript((IDS)=>{ if(sessionStorage.getItem('s'))return; sessionStorage.setItem('s','1');
 localStorage.setItem('album-kanto-regalos',JSON.stringify(IDS));
 localStorage.setItem('album-kanto-jugador','Zeta Centeno');
 const st={};for(let i=1;i<=151;i++)st[i]={got:i<=20||i===150,dup:0};st[150]={got:true,dup:0,ej:[{f:40,c:'AAAA'}]};
 localStorage.setItem('album-kanto-progreso',JSON.stringify({coins:300,state:st}));},IDS);
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///root/pokemon/index.html');await p.waitForTimeout(500);
await p.waitForTimeout(2000);
check('cartel de regalo especial', (await p.textContent('#revealTitle')).includes('especial') && (await p.textContent('#revealCards')).includes('Mewtwo Acorazado'));
await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/r1.png'});
const st=await p.evaluate(()=>({esp:especiales, m:ejemplares(150).map(e=>e.f+(e.s?'s':'')), fig:figuritasObtenidas(), prog:JSON.parse(localStorage.getItem('album-kanto-progreso')).especiales}));
check('guardado aparte con fuerza 100', st.esp[10150]&&st.esp[10150].f===100 && st.prog[10150].f===100);
check('el Mewtwo común no cambió ('+st.m+')', st.m.join()==='40');
check('no suma figuritas al ranking ('+st.fig+')', st.fig===21);
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>e.classList.remove('show')));
await p.waitForTimeout(400);
check('después de la carta sale el cartel del regalo', await p.isVisible('#battleOverlay.show')); await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>e.classList.remove('show'))); check('NO está afuera', !(await p.isVisible('#especialesBox .esp-carta'))); await p.click('#pokedexBtn'); await p.waitForTimeout(500); check('aparece adentro de la Pokédex', await p.isVisible('#pokedexOverlay #especialesBox .esp-carta'));
await (await p.$('#especialesBox')).screenshot({path:(process.env.SHOTS||'/tmp')+'/box.png'});
await p.reload();await p.waitForTimeout(1500);
check('sigue después de recargar y no se regala de nuevo', !(await p.isVisible('#overlay.show')) && await p.evaluate(()=>especiales[10150].f===100));
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>e.classList.remove('show')));
const rivales=new Set();
for(let k=0;k<6;k++){
 await p.click('#battleBtn');await p.waitForSelector('.ar-sel');
 if(k===0){ const sel=await p.evaluate(()=>[...document.querySelectorAll('.ar-sel')].map(e=>e.dataset.id+':'+e.classList.contains('on')+':'+e.textContent.replace(/\s+/g,' ').trim().slice(0,60)));
   check('el Acorazado aparece y viene elegido 1º: '+sel[0], sel[0].startsWith('10150:true')&&sel[0].includes('Mewtwo Acorazado'));
   check('y el Mewtwo común está aparte', sel.some(s=>s.startsWith('150:'))); await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/sel.png'}); }
 await p.click('#arPickGo');await p.waitForSelector('#arHud-riv');await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>({riv:document.querySelector('#arHud-riv').textContent.replace(/\s+/g,' ').trim(), src:[...document.querySelectorAll('#arMon-yo img')].map(i=>i.getAttribute('src')).join(' '), yo:document.querySelector('#arHud-yo').textContent.replace(/\s+/g,' ').trim()}));
 if(k===0){ check('pelea con el Acorazado: '+r.yo, r.yo.includes('Mewtwo Acorazado') && r.src.includes('mewtwo-acorazado')); await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/pelea.png'}); }
 rivales.add(r.riv.split(' ').slice(0,2).join(' '));
 await p.goto('file:///root/pokemon/index.html');await p.waitForTimeout(1300);
 await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>e.classList.remove('show')));
}
console.log('rivales:',[...rivales]);
check('los rivales son entrenadores del ranking y nunca yo', [...rivales].every(n=>/^(Gastón|Maximo|El Mostaza|Matías TA|Bast)/.test(n)));
check('sin errores '+errs.join('|'), !errs.length);
console.log(ok+' ok, '+fail+' fallas');await b.close();})();
