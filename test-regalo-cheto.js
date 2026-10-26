/* Regalo de Zeta (26/10): 6 Pokémon shiny de fuerza 100 con ataques puestos a mano y el Mewtwo con otro ataque largo.
   Modo local (sin servidor): el regalo se cobra al entrar y la Arena muestra esos ataques. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport:{width:390, height:844}, hasTouch:true, isMobile:true});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(() => {
    if(sessionStorage.getItem('ya')) return; sessionStorage.setItem('ya', '1');
    localStorage.setItem('album-avatar', 'red'); localStorage.setItem('album-kanto-jugador', 'ZeTa Centeno');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: [1, 4, 7, 25, 150].includes(i), dup: 0};
    st[150].ej = [{f:100, c:'ABCD'}];
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st, regalosCobrados: ['zeta-quitar-mewtwo-shiny-20261022']}));
  });
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force:true}); await p.waitForTimeout(1500);
  for(let i = 0; i < 8; i++){ await p.evaluate(() => document.querySelectorAll('#specialContinueBtn, #battleCloseBtn, #revealCloseBtn').forEach(b => b.click())); await p.waitForTimeout(250); }
  await p.evaluate(() => document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')));
  const est = await p.evaluate(() => [448, 94, 493, 384, 483, 484].map(id => { const e = mejorEjemplar(id); return [id, !!state[id].got, e && e.f, e && !!e.s, e && e.m]; }));
  console.log('\n— El regalo se cobró —');
  est.forEach(([id, got, f, s, m]) => check(`#${id}: lo tiene, fuerza ${f}, shiny, con ataques fijos`, got && f === 100 && s && Array.isArray(m) && m.length === 3));
  check('el Mewtwo conserva su fuerza y sólo cambia el largo', await p.evaluate(() => { const e = mejorEjemplar(150); return e.f === 100 && Array.isArray(e.m) && e.m[0] === null && e.m[1] === null && e.m[2] === 'Onda Mental'; }));
  console.log('\n— En la Arena —');
  await p.evaluate(() => { document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); document.getElementById('battleBtn').click(); }); await p.waitForSelector('.ar-sel');
  const movs = await p.$$eval('.ar-sel', els => Object.fromEntries(els.map(e => [e.dataset.id, e.querySelector('.ar-movs').textContent])));
  const igual = (id, txt) => check(`#${id} pelea con: ${txt}`, movs[id] === txt);
  igual(448, 'Puño Fuego · Puño Trueno · Puño Hielo');
  igual(94, 'Puño Sombra · Meteoros · Comesueños');
  igual(493, 'Velocidad Extrema · Tierra Viva · Hiperrayo');
  igual(384, 'Garra Dragón · Pulso Dragón · Ascenso Draco');
  igual(483, 'Cabeza de Hierro · Cañón Resplandor · Distorsión');
  igual(484, 'Hidroariete · Pulso Dragón · Corte Vacío');
  check('el Mewtwo termina con Onda Mental de ataque largo', /Onda Mental$/.test(movs[150]));
  const efectos = await p.evaluate(() => { const d = window.__arenaMovs; return d.nombreAtaque ? 'ok' : 'sin'; });
  check('sin errores de JS', errores.length === 0);
  if(errores.length) console.log(errores);
  console.log(`\n${ok} ok · ${fail} fallan`);
  await browser.close(); process.exit(fail ? 1 : 0);
})();
