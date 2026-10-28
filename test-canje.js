/* Canje de 3 repetidas (modo local): 40 % una figurita que no tenés, el resto una al azar. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({viewport:{width:390, height:844}});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(() => {
    if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
    localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Tester'); localStorage.setItem('album-servidor', 'off'); localStorage.setItem('album-novedades-visto', '20261028');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got:i <= 900, dup:0};
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st}));
  });
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force: true});
  await p.waitForTimeout(1500);
  for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.click(s); await p.waitForTimeout(250); }
  await p.click('#repetidasBtn');
  check('el panel avisa el 40 %', /40 %/.test(await p.textContent('#repetidasOverlay')));
  // 200 canjes: cuántas salen nuevas (esperado ≈ 40 % + 60 % × (faltantes/1025))
  const r = await p.evaluate(() => {
    let nuevas = 0, n = 200; const tit = new Set();
    for(let i = 0; i < n; i++){
      for(let j = 1; j <= 1025; j++) state[j].dup = 0;
      state[1].dup = 3;
      const antes = DATA.filter(x => state[x.id].got).length;
      canjearRepetidas();
      const desp = DATA.filter(x => state[x.id].got).length;
      if(desp > antes) nuevas++;
      tit.add(document.getElementById('revealTitle').textContent);
      document.getElementById('overlay').classList.remove('show'); document.getElementById('specialOverlay').classList.remove('show');
      for(let j = 901; j <= 1025; j++) state[j].got = false;   // vuelve a faltar lo mismo
    }
    return {nuevas, n, tit: [...tit]};
  });
  const pct = r.nuevas / r.n * 100;
  check('alrededor del 45 % salen nuevas (40 % + algo de las al azar), no el 100 %', pct > 30 && pct < 62, r);
  check('los títulos distinguen "¡una nueva!" de "ya tenías"', r.tit.some(t => /nueva/.test(t)) && r.tit.some(t => /ya tenías/.test(t)), r.tit);
  check('sin errores de página', errores.length === 0, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})();
