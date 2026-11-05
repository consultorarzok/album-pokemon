/* Filtros (nombre, tipo, región) en las listas de Evolucionar e Intercambio. Modo local, sin servidor. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };

(async () => {
  const browser = await chromium.launch();
  for(const [w, h] of [[390, 844], [1366, 768]]){
    console.log('— ' + w + '×' + h + ' —');
    const ctx = await browser.newContext({viewport:{width:w, height:h}});
    await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
    await ctx.route('**://api.entrenadoresrz.com/**', r => r.abort());
    await ctx.addInitScript(() => {
      if(sessionStorage.getItem('sembrado')) return;
      sessionStorage.setItem('sembrado', '1');
      localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Tester'); localStorage.setItem('album-servidor', 'off');
      const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got:false, dup:0};
      st[1] = {got:true, dup:5};     // Bulbasaur (planta)
      st[4] = {got:true, dup:5};     // Charmander (fuego)
      st[133] = {got:true, dup:9};   // Eevee (normal)
      st[10] = {got:true, dup:1};    // Caterpie (bicho)
      localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st}));
    });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar',{force:true});
    await p.waitForTimeout(1500);
    for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.click(s); await p.waitForTimeout(250); }

    await p.evaluate(() => document.getElementById('evolucionarBtn').click());
    await p.waitForTimeout(300);
    const nombres = async () => p.$$eval('#evolucionList .ej-fila', fs => fs.map(f => f.querySelector('b').textContent));
    check('Evolución: hay barra de filtros (nombre, tipo, región)', await p.isVisible('#evolucionFiltro input') && (await p.$$('#evolucionFiltro select')).length === 2);
    check('Evolución: lista completa al abrir', (await nombres()).length === 4);
    await p.fill('#evolucionFiltro input', 'charm'); await p.waitForTimeout(400);
    check('Evolución por nombre: "charm" deja sólo Charmander', (await nombres()).join() === 'Charmander');
    await p.fill('#evolucionFiltro input', 'zzz'); await p.waitForTimeout(400);
    check('Evolución sin coincidencias avisa', /coincide/.test(await p.textContent('#evolucionList')));
    await p.fill('#evolucionFiltro input', ''); await p.selectOption('#evolucionFiltro select[data-f=tipo]', 'fire'); await p.waitForTimeout(300);
    check('Evolución por tipo fuego: Charmander', (await nombres()).join() === 'Charmander');
    await p.selectOption('#evolucionFiltro select[data-f=tipo]', 'all'); await p.selectOption('#evolucionFiltro select[data-f=region]', 'johto'); await p.waitForTimeout(300);
    check('Evolución por región Johto: ninguno', (await nombres()).length === 0);
    await p.selectOption('#evolucionFiltro select[data-f=region]', 'kanto'); await p.waitForTimeout(300);
    check('Evolución por región Kanto: los cuatro', (await nombres()).length === 4);

    await p.evaluate(() => { document.getElementById('evolucionOverlay').classList.toggle('show', false); abrirIntercambio(); });
    await p.waitForTimeout(300);
    const nomI = async () => p.$$eval('#intercambioList .ej-fila', fs => fs.map(f => f.querySelector('b').textContent));
    check('Intercambio: lista completa al abrir', (await nomI()).length === 4);
    await p.fill('#intercambioFiltro input', 'eevee'); await p.waitForTimeout(400);
    check('Intercambio por nombre', (await nomI()).join() === 'Eevee');
    await p.fill('#intercambioFiltro input', ''); await p.selectOption('#intercambioFiltro select[data-f=tipo]', 'bug'); await p.waitForTimeout(300);
    check('Intercambio por tipo bicho = Caterpie', (await nomI()).join() === 'Caterpie');
    await p.evaluate(() => { document.getElementById('intercambioOverlay').classList.toggle('show', false); abrirIntercambio(); });
    await p.waitForTimeout(300);
    check('Al volver a abrir, el filtro arranca limpio', (await nomI()).length === 4);

    check('sin errores de página', errores.length === 0);
    if(errores.length) console.log(errores);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
