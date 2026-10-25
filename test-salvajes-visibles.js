/* Pokémon salvajes a la vista: al "saltar" un encuentro aparecen 2-3 en el pasto, cada uno elige a cuál ir.
   Contra el servidor local (npm run dev en :8787). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
let ok = 0, mal = 0;
const check = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ✔ ' : '  ✘ ') + n); };
const suf = Math.random().toString(36).slice(2, 5);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport:{width:390, height:700}, hasTouch:true, isMobile:true});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(srv => { localStorage.setItem('album-servidor', srv); localStorage.setItem('album-kanto-pin-ofrecido', '1'); localStorage.setItem('album-avatar', 'red'); }, SERVIDOR);
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force:true});
  await p.waitForTimeout(600);
  await p.fill('#nameInput', 'Salva ' + suf); await p.tap('#nameSaveBtn'); await p.waitForTimeout(2500);
  for(let i = 0; i < 8; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#revealCloseBtn']) if(await p.isVisible(s)){ await p.tap(s).catch(() => {}); await p.waitForTimeout(300); }
  await p.evaluate(() => document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')));
  await p.tap('#advBtn'); await p.waitForTimeout(1500);

  // un casillero de hierba alta con hierba alrededor, y se para ahí
  const pos = await p.evaluate(() => {
    const m = ADV_MAPS.overworld;
    for(let y = 6; y < m.rows.length - 6; y++) for(let x = 4; x < m.cols - 4; x++){
      let n = 0;
      for(let dy = -5; dy <= 5; dy++) for(let dx = -3; dx <= 3; dx++){ const t = advTileEn(x + dx, y + dy); if(t && t.walk && t.encuentro === 'hierba') n++; }
      if(n > 60 && advTileEn(x, y).encuentro === 'hierba') return {x, y};
    }
    return null;
  });
  check('hay hierba donde probar', !!pos);
  await p.evaluate(({x, y}) => { advPonerEn(x, y); advDescanso = 0; salirEncuentro(advTileEn(x, y), x, y); }, pos);
  await p.waitForTimeout(1500);
  const sv = await p.evaluate(() => salvajesActivos().map(s => ({n: s.p.name, id: s.p.id, x: s.x, y: s.y})));
  check(`aparecen varios Pokémon en el mapa (${sv.map(s => s.n).join(', ')})`, sv.length >= 2 && sv.length <= 3);
  check('no se abrió la pelea sola', !(await p.isVisible('#encOverlay')));
  check('están en casilleros distintos y cerca', new Set(sv.map(s => s.x + ',' + s.y)).size === sv.length && sv.every(s => Math.abs(s.x - pos.x) <= 3 && Math.abs(s.y - pos.y) <= 5));
  const elegido = sv[sv.length - 1];
  // camina hasta el último con el joystick virtual (eje)
  await p.evaluate(({id}) => { window.__obj = salvajesActivos().find(s => s.p.id === id); }, elegido);
  for(let i = 0; i < 80 && !(await p.isVisible('#encOverlay')); i++){
    await p.evaluate(() => {
      const o = window.__obj, dx = o.x * 16 + 8 - (advPx + 8), dy = o.y * 16 + 8 - (advPy + 11);
      const l = Math.hypot(dx, dy) || 1; advEje = {x: dx / l, y: dy / l};
    });
    await p.waitForTimeout(100);
  }
  await p.evaluate(() => { advEje = {x: 0, y: 0}; });
  await p.waitForTimeout(600);
  const nombre = await p.textContent('#encName').catch(() => '');
  check(`al llegar empieza la pelea con el elegido (${elegido.n})`, await p.isVisible('#encOverlay') && nombre === elegido.n);
  check('los demás desaparecen', (await p.evaluate(() => salvajesActivos().length)) === 0);
  const tirada = await p.evaluate(async () => { const r = await accionServidor('tirar', {tipo: 'roja'}); return r.ok; });
  check('el servidor deja tirar la pokébola al elegido', tirada === true);

  // si nadie se acerca, se van solos
  await p.evaluate(() => { document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); encuentro = null; });
  await p.evaluate(({x, y}) => { advPonerEn(x, y); advDescanso = 0; aparecerSalvajes([ADV_DATA[0], ADV_DATA[3]], x, y); salvajes.forEach(s => s.hasta = Date.now() + 700); }, pos);
  await p.waitForTimeout(1500);
  check('si no vas, se escapan solos', (await p.evaluate(() => salvajes.length)) === 0);
  check('sin errores de JS', errores.length === 0);
  if(errores.length) console.log(errores);
  console.log(`\n${ok} ok · ${mal} fallan`);
  await browser.close();
  process.exit(mal ? 1 : 0);
})();
