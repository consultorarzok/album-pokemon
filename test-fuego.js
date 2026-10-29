/* Zonas de fuego (Kanto y Johto: sólo salen Pokémon de fuego) y Pokémon que el servidor hace aparecer a mano (/admin/aparecer).
   Contra el servidor local (npm run dev en :8787, ADMIN_CLAVE=prueba-local). Graba capturas en $SHOTS. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
const ADMIN = process.env.ADMIN_CLAVE || 'prueba-local';
const OUT = process.env.SHOTS || '/tmp';
let ok = 0, mal = 0;
const check = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ✔ ' : '  ✘ ') + n); };
const suf = Math.random().toString(36).slice(2, 5);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 390, height: 700}, hasTouch: true, isMobile: true});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(srv => { localStorage.setItem('album-servidor', srv); localStorage.setItem('album-kanto-pin-ofrecido', '1'); }, SERVIDOR);
  const p = await ctx.newPage(); const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force: true}); await p.waitForTimeout(600);
  await p.fill('#nameInput', 'Brasa ' + suf); await p.tap('#nameSaveBtn'); await p.waitForTimeout(2000);
  await p.tap('.avatar-op[data-avatar="red"]'); await p.waitForTimeout(500);
  for(let i = 0; i < 8; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#revealCloseBtn']) if(await p.isVisible(s)){ await p.tap(s).catch(() => {}); await p.waitForTimeout(300); }
  await p.evaluate(() => document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')));
  await p.tap('#advBtn'); await p.waitForTimeout(1500);

  const zonas = await p.evaluate(() => ZONAS_FUEGO.map(([x, y]) => advTileEn(x, y).encuentro));
  check('las 12 zonas de fuego están en el mapa', zonas.length === 12 && zonas.every(e => e === 'fuego'));
  const regiones = await p.evaluate(() => ZONAS_FUEGO.map(([x]) => x <= 54 ? 'kanto' : 'johto'));
  check('6 en Kanto y 6 en Johto', regiones.filter(r => r === 'kanto').length === 6 && regiones.filter(r => r === 'johto').length === 6);
  // todas se pueden alcanzar caminando (el reparador del mapa)
  const alcanzables = await p.evaluate(() => {
    const m = ADV_MAPS.overworld, W = m.cols, H = m.rows.length;
    let ini = null; for(let y = 0; y < H && !ini; y++){ const x = m.rows[y].indexOf('@'); if(x >= 0) ini = [x, y]; }
    const vis = new Set([ini.join()]), q = [ini];
    while(q.length){ const [x, y] = q.pop(); for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx = x + dx, ny = y + dy; const t = ADV_TILE[(m.rows[ny] || '')[nx]]; if(t && t.walk && !vis.has(nx + ',' + ny)){ vis.add(nx + ',' + ny); q.push([nx, ny]); } } }
    return ZONAS_FUEGO.every(([x, y]) => vis.has(x + ',' + y));
  });
  check('se llega a todas las zonas caminando', alcanzables);

  // parado en una zona de Kanto: los 3 que salen son de fuego
  const [zx, zy] = await p.evaluate(() => ZONAS_FUEGO[1]);
  await p.evaluate(({zx, zy}) => { advPonerEn(zx, zy); advDescanso = 0; salirEncuentro(advTileEn(zx, zy), zx, zy); }, {zx, zy});
  await p.waitForTimeout(1800);
  const sv = await p.evaluate(() => salvajesActivos().map(s => ({n: s.p.name, t: s.p.type})));
  check(`en la zona de fuego salen sólo de fuego (${sv.map(s => s.n).join(', ')})`, sv.length >= 2 && sv.every(s => s.t === 'fire'));
  await p.screenshot({path: OUT + '/fuego-zona.png'});

  // el servidor le hace aparecer un Charizard parado en la plaza (sin zona de encuentro)
  await p.evaluate(() => { salvajes = []; advDescanso = 0; });
  const [px, py] = [33, 18];
  await p.evaluate(({px, py}) => advPonerEn(px, py), {px, py}); await p.waitForTimeout(1200);
  const nombre = await p.evaluate(() => jugador);
  const r = await (await fetch(SERVIDOR + '/admin/aparecer', {method: 'POST', headers: {'x-admin': ADMIN, 'content-type': 'text/plain'}, body: JSON.stringify({nombre, id: 6})})).json();
  check('el servidor lo manda a un jugador conectado', r.ok === true && r.enviados === 1);
  await p.waitForTimeout(1500);
  const c = await p.evaluate(() => salvajesActivos().map(s => ({n: s.p.name, x: s.x, y: s.y})));
  check('le aparece un Charizard cerca', c.length === 1 && c[0].n === 'Charizard' && Math.abs(c[0].x - 33) <= 3 && Math.abs(c[0].y - 18) <= 5);
  await p.screenshot({path: OUT + '/fuego-charizard.png'});
  for(let i = 0; i < 80 && !(await p.isVisible('#encOverlay')); i++){   // camina hasta él con el joystick virtual
    await p.evaluate(() => { const o = salvajesActivos()[0]; if(!o) return; const dx = o.x * 16 + 8 - (advPx + 8), dy = o.y * 16 + 8 - (advPy + 11), l = Math.hypot(dx, dy) || 1; advEje = {x: dx / l, y: dy / l}; });
    await p.waitForTimeout(100);
  }
  await p.evaluate(() => { advEje = {x: 0, y: 0}; });
  check('lo puede atrapar: se abre su pelea con Charizard', await p.isVisible('#encOverlay') && await p.evaluate(() => encuentro && encuentro.p.name === 'Charizard'));
  check('sin errores de página', errores.length === 0); if(errores.length) console.log(errores);
  await browser.close();
  console.log(`\n${ok}/${ok + mal}`); process.exit(mal ? 1 : 0);
})();
