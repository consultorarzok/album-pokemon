/* Captura del modo Aventura parado en un casillero. Uso: node herramientas/captura-aventura.js <x> <y> <archivo.png> [ancho alto] */
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
const [,, X, Y, OUT, W, H] = process.argv;
(async()=>{const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:Number(W)||390,height:Number(H)||844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
await ctx.route('**://n8n.consultorarz.com/**',r=>r.abort()); await ctx.route('**://api.entrenadoresrz.com/**',r=>r.abort());
await ctx.addInitScript(()=>{ if(sessionStorage.getItem('s'))return; sessionStorage.setItem('s','1');
 localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador','Tester'); localStorage.setItem('album-servidor','off');
 const st={};for(let i=1;i<=151;i++)st[i]={got:i<=14,dup:0};
 localStorage.setItem('album-kanto-progreso',JSON.stringify({coins:300,state:st}));});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///root/pokemon/index.html');await p.click('#portadaEntrar',{force:true});await p.waitForTimeout(1200);
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>e.classList.remove('show')));
await p.evaluate(()=>abrirAventura()); await p.waitForTimeout(2500);
await p.evaluate(([x,y])=>{ advPonerEn(x,y); advRender(); },[Number(X),Number(Y)]); await p.waitForTimeout(900);
await p.screenshot({path:OUT}); console.log('errores:',errs.join(';')||'ninguno'); await b.close();})();
