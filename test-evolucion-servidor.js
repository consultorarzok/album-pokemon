/* Evolucionar en MODO SERVIDOR contra el servidor local (npm run dev en /root/pokemon-servidor).
   El navegador pide, el servidor descuenta y decide; la pantalla se redibuja con lo que vuelve. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const suf = Math.random().toString(36).slice(2, 6);
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({viewport: {width: 390, height: 844}});
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  const pg = await ctx.newPage();
  const errores = []; pg.on('pageerror', e => errores.push(e.message));
  const ids = await (async () => { const c2 = await br.newContext(); const q = await c2.newPage(); await q.goto('file:///root/pokemon/index.html'); const r = await q.evaluate(() => REGALOS.map(x => x.id)); await c2.close(); return r; })();
  await pg.addInitScript(([srv, regalos, nombre, disp]) => {
    if(sessionStorage.getItem('sembrado')) return;
    sessionStorage.setItem('sembrado', '1');
    localStorage.setItem('album-servidor', srv); localStorage.setItem('album-avatar', 'red');
    localStorage.setItem('album-kanto-jugador', nombre); localStorage.setItem('album-kanto-dispositivo', disp);
    localStorage.setItem('album-kanto-regalos', JSON.stringify(regalos));
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
    st[1] = {got: true, dup: 10}; st[133] = {got: true, dup: 20};
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 1000, state: st, bolas: {roja: 7, azul: 1, ultra: 0, maestra: 0}, comprasDia: {}, legendariosDia: {dia: null, obtenidos: {}}, maestro: {pts: 0, ganadas: 0, peleas: 0, nivel: 0}, tomados: [], especiales: {}}));
  }, [SERVIDOR, ids, 'Evo ' + suf, 'devo' + suf]);
  await pg.goto('file:///root/pokemon/index.html'); await pg.click('#portadaEntrar', {force: true}).catch(() => {});
  check('conectado', await pg.waitForFunction(() => typeof servidorListo !== 'undefined' && servidorListo, null, {timeout: 10000}).then(() => true, () => false));
  for(let i = 0; i < 6; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#closeBtn', '#pinNoBtn']) if(await pg.isVisible(s)){ await pg.click(s); await pg.waitForTimeout(200); }
  await pg.waitForTimeout(500);
  check('botón habilitado', await pg.evaluate(() => !document.getElementById('evolucionarBtn').disabled));
  await pg.click('#evolucionarBtn'); await pg.waitForTimeout(300);
  const fuerte = await pg.evaluate(() => ejemplares(133).slice().sort((a, b) => b.f - a.f)[0]);
  await pg.evaluate(c => { const f = [...document.querySelectorAll('#evolucionList .ej-fila')].find(x => x.querySelector('b').textContent === 'Eevee'); f.querySelector('.ej-chip[data-c="' + c + '"]').click(); }, fuerte.c);
  await pg.evaluate(() => { const f = [...document.querySelectorAll('#evolucionList .ej-fila')].find(x => x.querySelector('b').textContent === 'Eevee'); [...f.querySelectorAll('.evo-btn')].find(b => /Espeon/.test(b.textContent)).click(); });
  await pg.waitForTimeout(1500);
  for(let i = 0; i < 6; i++){ if(await pg.isVisible('#specialContinueBtn')){ await pg.click('#specialContinueBtn'); await pg.waitForTimeout(300); } }
  check('muestra "Evolucionó a Espeon"', await pg.waitForFunction(() => /Evolucionó a Espeon/.test(document.getElementById('revealTitle').textContent), null, {timeout: 8000}).then(() => true, () => false));
  const r = await pg.evaluate(() => ({e: state[133].dup, n: ejemplares(133).length, es: ejemplares(196).map(x => x.f)}));
  check('Eevee gastó 20 y queda con 1', r.e === 0 && r.n === 1, r);
  check('Espeon nació con la fuerza del ejemplar elegido', r.es.length === 1 && r.es[0] === fuerte.f, {r, f: fuerte.f});
  const sv = await pg.evaluate(async () => { const x = await api('/progreso', {}); return x.progreso ? x.progreso.state[196].got : x; });
  check('el servidor lo tiene guardado', sv === true, sv);
  check('sin errores de página', errores.length === 0, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})();
