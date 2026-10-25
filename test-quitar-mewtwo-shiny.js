/* Quitar a Zeta el Mewtwo shiny común (fuerza 100) del regalo viejo: sólo si ese regalo se cobró,
   sólo ese ejemplar, una sola vez, y a nadie más. El Acorazado especial no se toca. */
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
let ok=0,fail=0;const check=(n,c)=>{c?ok++:fail++;console.log((c?'  ✅ ':'  ❌ ')+n);};
const IDS=[...require('fs').readFileSync('/root/pokemon/app.js','utf8').matchAll(/\{ id: '([^']+)'/g)].map(m=>m[1]).filter(i=>i!=='zeta-quitar-mewtwo-shiny-20261022');
(async()=>{const b=await chromium.launch();
const casos=[
 ['Zeta Centeno', true,  {got:true,dup:1,ej:[{f:40,c:'AAAA'},{f:100,c:'BBBB',s:true}]}, '40', 'true'],
 ['Zeta Centeno', true,  {got:true,dup:0,ej:[{f:100,c:'BBBB',s:true}]}, '', 'false'],
 ['Zeta Centeno', false, {got:true,dup:1,ej:[{f:40,c:'AAAA'},{f:100,c:'BBBB',s:true}]}, '40,100s', 'true'],
 ['El Mostaza',   true,  {got:true,dup:1,ej:[{f:40,c:'AAAA'},{f:100,c:'BBBB',s:true}]}, '40,100s', 'true'],
];
for(const [nombre,cobro,m150,esperado,got] of casos){
 const ctx=await b.newContext();await ctx.route('**://n8n.consultorarz.com/**',r=>r.abort());
 const usados=IDS.concat(cobro?['zeta-mewtwo-acorazado-20261022']:[]);
 await ctx.addInitScript(([n,u,m])=>{ if(sessionStorage.getItem('s'))return; sessionStorage.setItem('s','1');
  localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador',n); localStorage.setItem('album-kanto-regalos',JSON.stringify(u));
  const st={};for(let i=1;i<=151;i++)st[i]={got:i<=20,dup:0}; st[150]=m;
  localStorage.setItem('album-kanto-progreso',JSON.stringify({coins:300,state:st,especiales:{10150:{f:100,c:'ZZZZ'}}}));},[nombre,usados,m150]);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file:///root/pokemon/index.html');await p.click('#portadaEntrar',{force:true});await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>({ej:ejemplares(150).map(e=>e.f+(e.s?'s':'')).join(), got:String(state[150].got), esp:especiales[10150]&&especiales[10150].f}));
 await p.reload();await p.waitForTimeout(1200);
 const r2=await p.evaluate(()=>ejemplares(150).map(e=>e.f+(e.s?'s':'')).join());
 check(`${nombre} (regalo viejo ${cobro?'cobrado':'no cobrado'}): Mewtwo [${r.ej}] got=${r.got}`, r.ej===esperado && r.got===got && r2===esperado);
 check('  el Acorazado sigue intacto y sin errores', r.esp===100 && !errs.length);
 await ctx.close();}
console.log(ok+' ok, '+fail+' fallas');await b.close();})();
