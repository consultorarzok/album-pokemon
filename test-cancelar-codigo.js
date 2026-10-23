/* Intercambio: cancelar un código generado (desde la carta y desde la lista) devuelve la figurita
   con su fuerza y shiny; y el botón "Arriba" aparece al bajar y vuelve arriba. Usa el servidor REAL
   para generar/cancelar (con un jugador de prueba); ranking y registro van bloqueados. */
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
let ok=0,fail=0;const check=(n,c)=>{c?ok++:fail++;console.log((c?'  ✅ ':'  ❌ ')+n);};
const SHOTS=process.env.SHOTS||'';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});
await ctx.route('**://n8n.consultorarz.com/**',r=>/pokemon-(generar|cancelar)-codigo/.test(r.request().url())?r.continue():r.abort());
await ctx.addInitScript(()=>{ if(sessionStorage.getItem('s'))return; sessionStorage.setItem('s','1');
 localStorage.setItem('album-kanto-jugador','zz prueba cancelar'); localStorage.setItem('album-kanto-regalos',JSON.stringify([]));
 const st={};for(let i=1;i<=151;i++)st[i]={got:i<=40,dup:i<=40?1:0}; st[25]={got:true,dup:1,ej:[{f:30,c:'AAAA'},{f:77,c:'BBBB',s:true}]};
 localStorage.setItem('album-kanto-progreso',JSON.stringify({coins:0,state:st}));});
await ctx.addInitScript(()=>{ window.REGALOS_OFF=1; });
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///root/pokemon/index.html');await p.click('#portadaEntrar',{force:true});await p.waitForTimeout(1200);
await p.evaluate(()=>{ REGALOS.length=0; document.querySelectorAll('.show').forEach(e=>e.classList.remove('show')); });
const pika=()=>p.evaluate(()=>({dup:state[25].dup, ej:ejemplares(25).map(e=>e.f+(e.s?'s':'')).sort().join()}));
await p.click('#intercambioBtn'); await p.waitForTimeout(300);
// generar código del Pikachu shiny 77
const fila=p.locator('.ej-fila',{hasText:'Pikachu'});
await fila.locator('.ej-chip[data-c="BBBB"]').click(); await fila.locator('button.open-btn').click();
await p.waitForSelector('#codigoCardOverlay.show',{timeout:15000});
const c1=(await p.textContent('#codigoCardTexto')).trim();
check('se generó el código '+c1+' y se fue el shiny', (await pika()).ej==='30');
if(SHOTS) await p.screenshot({path:SHOTS+'/carta.png'});
await p.click('#codigoCardCancelarBtn');
check('pide confirmar', (await p.textContent('#codigoCardCancelarBtn')).includes('Seguro'));
await p.click('#codigoCardCancelarBtn');
await p.waitForFunction(()=>!document.getElementById('codigoCardOverlay').classList.contains('show'),null,{timeout:15000});
const r1=await pika(); const fb=await p.textContent('#canjeCodigoFeedback');
check('desde la carta: vuelve el Pikachu shiny 77 ('+r1.ej+') · '+fb, r1.ej==='30,77s' && r1.dup===1 && fb.includes('cancelado'));
check('el código cancelado no queda en la lista', !(await p.evaluate(()=>misCodigos().some(i=>i.codigo)) ));
// generar de nuevo y cancelar desde la lista
await fila.locator('.ej-chip[data-c]').first().click(); await fila.locator('button.open-btn').click();
await p.waitForSelector('#codigoCardOverlay.show',{timeout:15000}); const c2=(await p.textContent('#codigoCardTexto')).trim();
await p.click('#codigoCardCerrarBtn');
const btnL=p.locator('#misCodigosList .btn-cancelar-codigo').first();
await btnL.scrollIntoViewIfNeeded(); if(SHOTS) await p.screenshot({path:SHOTS+'/lista.png'});
const geo=await p.evaluate(()=>{const r=document.querySelector('#misCodigosList .shop-row').getBoundingClientRect();return r.right<=innerWidth+1;});
check('la fila de códigos entra en pantalla', geo);
await p.evaluate(()=>{document.getElementById('canjeCodigoFeedback').textContent='';}); await btnL.click(); await btnL.click();
await p.waitForFunction(()=>document.getElementById('canjeCodigoFeedback').textContent.includes('cancelado'),null,{timeout:15000});
const r2=await pika(); check('desde la lista: vuelve ('+r2.ej+'), código '+c2+' anulado', r2.dup===1 && r2.ej.split(',').length===2);
// volver arriba
await p.evaluate(()=>{const pn=document.querySelector('#intercambioOverlay .reveal-panel'); pn.scrollTop=0; pn.dispatchEvent(new Event('scroll'));});
await p.waitForTimeout(200);
check('arriba de todo no se ve el botón Arriba', !(await p.isVisible('#intercambioArribaBtn')));
await p.evaluate(()=>{const pn=document.querySelector('#intercambioOverlay .reveal-panel'); pn.scrollTop=1500; pn.dispatchEvent(new Event('scroll'));});
await p.waitForTimeout(300);
check('al bajar aparece el botón Arriba', await p.isVisible('#intercambioArribaBtn'));
if(SHOTS) await p.screenshot({path:SHOTS+'/arriba.png'});
await p.click('#intercambioArribaBtn'); await p.waitForTimeout(900);
check('y te lleva arriba', await p.evaluate(()=>document.querySelector('#intercambioOverlay .reveal-panel').scrollTop<5));
check('sin errores '+errs.join('|'), !errs.length);
console.log(ok+' ok, '+fail+' fallas');await b.close();})();
