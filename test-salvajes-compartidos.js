/* Salvajes compartidos: si a un entrenador le salen Pokémon en el pasto, otro que está cerca los ve en las mismas coordenadas
   y también puede atrapar uno (cada uno el suyo). Contra el servidor local (npm run dev en :8787). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
let ok = 0, mal = 0;
const check = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ✔ ' : '  ✘ ') + n); };
const suf = Math.random().toString(36).slice(2, 5);
async function celular(browser, nombre, avatar){
  const ctx = await browser.newContext({viewport: {width: 390, height: 700}, hasTouch: true, isMobile: true});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(srv => { localStorage.setItem('album-servidor', srv); localStorage.setItem('album-kanto-pin-ofrecido', '1'); }, SERVIDOR);
  const p = await ctx.newPage(); p.errores = []; p.on('pageerror', e => p.errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force: true}); await p.waitForTimeout(600);
  await p.fill('#nameInput', nombre); await p.tap('#nameSaveBtn'); await p.waitForTimeout(2000);
  await p.tap(`.avatar-op[data-avatar="${avatar}"]`); await p.waitForTimeout(500);
  for(let i = 0; i < 8; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#revealCloseBtn']) if(await p.isVisible(s)){ await p.tap(s).catch(() => {}); await p.waitForTimeout(300); }
  await p.evaluate(() => document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')));
  await p.tap('#advBtn'); await p.waitForTimeout(1500);
  return {ctx, p};
}
(async () => {
  const browser = await chromium.launch();
  const A = await celular(browser, 'Uno ' + suf, 'red'), B = await celular(browser, 'Dos ' + suf, 'may'), C = await celular(browser, 'Lejos ' + suf, 'red');
  const pos = await A.p.evaluate(() => {
    const m = ADV_MAPS.overworld;
    for(let y = 6; y < m.rows.length - 6; y++) for(let x = 4; x < m.cols - 4; x++){
      let n = 0;
      for(let dy = -5; dy <= 5; dy++) for(let dx = -3; dx <= 3; dx++){ const t = advTileEn(x + dx, y + dy); if(t && t.walk && t.encuentro === 'hierba') n++; }
      if(n > 60 && advTileEn(x, y).encuentro === 'hierba') return {x, y};
    }
    return null;
  });
  check('hay hierba donde probar', !!pos);
  // B se para 3 casilleros al lado de A; C se queda lejos (en el punto de partida)
  await A.p.evaluate(({x, y}) => advPonerEn(x, y), pos);
  await B.p.evaluate(({x, y}) => advPonerEn(x + 1, y + 1), pos);
  await B.p.waitForTimeout(900); await A.p.waitForTimeout(300);
  await A.p.evaluate(({x, y}) => { advDescanso = 0; salirEncuentro(advTileEn(x, y), x, y); }, pos);
  await A.p.waitForTimeout(2500);
  const sa = await A.p.evaluate(() => salvajesActivos().map(s => ({id: s.p.id, x: s.x, y: s.y})));
  const sb = await B.p.evaluate(() => salvajesActivos().map(s => ({id: s.p.id, x: s.x, y: s.y, comp: !!s.comp})));
  const sc = await C.p.evaluate(() => salvajesActivos().length);
  check(`a Uno le salen ${sa.length} Pokémon`, sa.length >= 2);
  const clave = l => l.map(s => `${s.id}@${s.x},${s.y}`).sort().join('|');
  check('Dos ve los MISMOS Pokémon en las MISMAS coordenadas', sb.length === sa.length && clave(sa) === clave(sb));
  check('Lejos no los ve', sc === 0);
  // Dos camina hasta uno y lo puede atrapar (su propio encuentro)
  const elegido = sb[0];
  await B.p.evaluate(({id}) => { window.__obj = salvajesActivos().find(s => s.p.id === id); }, elegido);
  for(let i = 0; i < 80 && !(await B.p.isVisible('#encOverlay')); i++){
    await B.p.evaluate(() => { const o = window.__obj, dx = o.x * 16 + 8 - (advPx + 8), dy = o.y * 16 + 8 - (advPy + 11); const l = Math.hypot(dx, dy) || 1; advEje = {x: dx / l, y: dy / l}; });
    await B.p.waitForTimeout(100);
  }
  await B.p.evaluate(() => { advEje = {x: 0, y: 0}; });
  check('al tocarlo se abre SU pelea con ese Pokémon', await B.p.isVisible('#encOverlay') && await B.p.evaluate(({id}) => !!encuentro && encuentro.p.id === id, elegido));
  // y Uno puede seguir con lo suyo: elige uno también
  const elA = sa[sa.length - 1];
  await A.p.evaluate(({id}) => { window.__obj = salvajesActivos().find(s => s.p.id === id); }, elA);
  for(let i = 0; i < 80 && !(await A.p.isVisible('#encOverlay')); i++){
    await A.p.evaluate(() => { const o = window.__obj, dx = o.x * 16 + 8 - (advPx + 8), dy = o.y * 16 + 8 - (advPy + 11); const l = Math.hypot(dx, dy) || 1; advEje = {x: dx / l, y: dy / l}; });
    await A.p.waitForTimeout(100);
  }
  check('Uno también atrapa el suyo', await A.p.isVisible('#encOverlay') && await A.p.evaluate(({id}) => !!encuentro && encuentro.p.id === id, elA));
  const errs = A.p.errores.length + B.p.errores.length + C.p.errores.length;
  check('sin errores de página', errs === 0); if(errs) console.log(A.p.errores, B.p.errores, C.p.errores);
  await browser.close();
  console.log(`\n${ok}/${ok + mal}`); process.exit(mal ? 1 : 0);
})();
