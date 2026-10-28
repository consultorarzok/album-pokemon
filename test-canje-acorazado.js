/* Canjear un código de Mewtwo Acorazado: va a las figuritas especiales (no al álbum), con su fuerza,
   y si ya lo tenía se queda con el más fuerte. Un código común sigue andando igual. Servidor simulado. */
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
const IDS=[...require('fs').readFileSync('/root/pokemon/app.js','utf8').matchAll(/\{ id: '([^']+)'/g)].map(m=>m[1]);
let ok=0,fail=0;const check=(n,c)=>{c?ok++:fail++;console.log((c?'  ✅ ':'  ❌ ')+n);};
const RESP={ESP1:{ok:true,pokemonId:10150,fuerza:73},ESP2:{ok:true,pokemonId:10150,fuerza:41},ESP3:{ok:true,pokemonId:10150,fuerza:95},COMUN:{ok:true,pokemonId:25,fuerza:150}};
(async()=>{const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844}});
await ctx.route('**://n8n.consultorarz.com/**',r=>{const u=r.request().url();
  if(u.includes('canjear-codigo')){ const c=JSON.parse(r.request().postData()).codigo; return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(RESP[c]||{ok:false,motivo:'no_existe'})}); }
  return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
await ctx.addInitScript((IDS)=>{ if(sessionStorage.getItem('s'))return; sessionStorage.setItem('s','1');
 localStorage.setItem('album-kanto-regalos',JSON.stringify(IDS)); localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador','Prueba Canje');
 const st={};for(let i=1;i<=151;i++)st[i]={got:i<=20,dup:0};
 localStorage.setItem('album-kanto-progreso',JSON.stringify({coins:300,state:st}));},IDS);
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///root/pokemon/index.html');await p.click('#portadaEntrar',{force:true});await p.waitForTimeout(1200);
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>e.classList.remove('show')));
const fig0=await p.evaluate(()=>figuritasObtenidas());
async function canjear(c){ await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>e.classList.remove('show')));
  await p.evaluate(() => document.getElementById('intercambioBtn').click()); await p.fill('#canjeCodigoInput',c); await p.click('#canjeCodigoBtn'); await p.waitForTimeout(900); }
await canjear('ESP1');
check('sale la carta de figurita especial', (await p.textContent('#revealTitle')).includes('especial') && (await p.textContent('#revealCards')).includes('Mewtwo Acorazado') && await p.isVisible('#overlay.show'));
check('cierra el panel de intercambio', !(await p.isVisible('#intercambioOverlay.show')));
let s=await p.evaluate(()=>({e:especiales[10150], g:JSON.parse(localStorage.getItem('album-kanto-progreso')).especiales, fig:figuritasObtenidas(), m:state[150]}));
check('queda en especiales con fuerza 73 y guardado', s.e&&s.e.f===73&&s.g[10150].f===73);
check('no toca al Mewtwo común ni las figuritas del álbum', s.fig===fig0 && !s.m.got);
await canjear('ESP2'); s=await p.evaluate(()=>especiales[10150].f); check('uno más débil no lo baja ('+s+')', s===73);
await canjear('ESP3'); s=await p.evaluate(()=>especiales[10150].f); check('uno más fuerte lo sube ('+s+')', s===95);
await canjear('COMUN'); s=await p.evaluate(()=>({got:state[25].got, ej:ejemplares(25).map(e=>e.f+(e.s?'s':''))}));
check('un código común sigue andando (Pikachu shiny 50: '+s.ej+')', s.got && s.ej.join()==='50s');
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>e.classList.remove('show')));
await p.click('#pokedexBtn'); await p.waitForTimeout(400);
check('aparece en la Pokédex como especial', await p.isVisible('#pokedexOverlay #especialesBox .slot.especial'));
check('sin errores de JS '+errs.join('|'), errs.length===0);
await b.close(); console.log(`\n${ok} ok, ${fail} fallas`); process.exit(fail?1:0);})();
