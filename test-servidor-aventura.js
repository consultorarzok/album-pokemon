/* Aventura en MODO SERVIDOR (servidor local :8787): monedas del piso, encuentro que elige el
   servidor y captura que gasta pokébolas. Correr con npm run dev andando en pokemon-servidor. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const suf = Math.random().toString(36).slice(2, 6);

(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({viewport: {width: 1366, height: 768}});
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  const ids = await (async () => { const q = await ctx.newPage(); await q.goto('file:///root/pokemon/index.html'); const r = await q.evaluate(() => REGALOS.map(r => r.id)); await q.close(); return r; })();
  await p.addInitScript(([srv, suf, regalos]) => {
    if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('album-servidor', srv);
    localStorage.setItem('album-kanto-jugador', 'Explorador ' + suf);
    localStorage.setItem('album-kanto-dispositivo', 'dexp' + suf);
    localStorage.setItem('album-kanto-regalos', JSON.stringify(regalos));
    localStorage.setItem('album-kanto-pin-ofrecido', '1');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
    st[1] = {got: true, dup: 0};
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 0, state: st, bolas: {roja: 0, azul: 0, ultra: 0, maestra: 2}}));
  }, [SERVIDOR, suf, ids]);
  await p.goto('file:///root/pokemon/index.html');
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await p.waitForFunction(() => servidorListo, null, {timeout: 10000});
  await p.evaluate(() => abrirAventura());
  await p.waitForTimeout(800);
  /* casilleros del mapa */
  const pos = await p.evaluate(() => {
    const busca = pred => { const rows = ADV_MAPS.overworld.rows; for(let y = 0; y < rows.length; y++) for(let x = 0; x < rows[y].length; x++){ const t = ADV_TILE[rows[y][x]]; if(t && pred(t)) return {x, y}; } };
    return {moneda: busca(t => t.item === 'moneda'), hierba: busca(t => t.encuentro === 'hierba')};
  });
  await p.evaluate(m => advPisar(ADV_TILE.c, m.x, m.y), pos.moneda);
  check('levanta la moneda del piso (la paga el servidor)', await p.waitForFunction(() => coins > 0, null, {timeout: 5000}).then(() => true, () => false));
  const c1 = await p.evaluate(() => coins);
  await p.evaluate(m => { advTomados.delete('overworld:' + m.x + ',' + m.y); advPisar(ADV_TILE.c, m.x, m.y); }, pos.moneda);
  await p.waitForTimeout(1200);
  check('TRAMPA: la misma moneda no se cobra dos veces', await p.evaluate(c => coins === c, c1));
  await p.evaluate(h => salirEncuentro(ADV_TILE['"'], h.x, h.y), pos.hierba);
  check('sale un encuentro que eligió el servidor', await p.waitForFunction(() => document.getElementById('encOverlay').classList.contains('show') && encuentro, null, {timeout: 5000}).then(() => true, () => false));
  const quien = await p.evaluate(() => encuentro && encuentro.p.id);
  await p.evaluate(() => tirarBola('maestra'));
  check('lo atrapa con la Master Ball', await p.waitForFunction(id => state[id].got && bolas.maestra === 1, quien, {timeout: 5000}).then(() => true, () => false), await p.evaluate(() => bolas));
  await p.waitForTimeout(1500);
  await p.reload(); await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await p.waitForFunction(() => servidorListo, null, {timeout: 10000});
  check('al recargar: la captura y la moneda siguen guardadas', await p.evaluate(([id, c]) => state[id].got && bolas.maestra === 1 && coins === c, [quien, c1]));
  check('sin errores de JavaScript', errores.length === 0, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
