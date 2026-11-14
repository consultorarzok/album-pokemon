/* Modo historia (14/11) en MODO SERVIDOR (servidor local :8787, npm run dev en pokemon-servidor): personajes quietos,
   charla con el Profesor Algarrobo, panel de Misiones con medallas y desafío a la Líder Rosa (pelea de gimnasio con su equipo).
   Con SHOTS=carpeta guarda capturas. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787', SHOTS = process.env.SHOTS || '';
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const suf = Math.random().toString(36).slice(2, 6);
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 2});
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  const ids = await (async () => { const q = await ctx.newPage(); await q.goto('file:///root/pokemon/index.html'); const r = await q.evaluate(() => REGALOS.map(r => r.id)); await q.close(); return r; })();
  await p.addInitScript(([srv, suf, regalos]) => {
    if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
    localStorage.clear();
    localStorage.setItem('album-servidor', srv);
    localStorage.setItem('album-avatar', 'red'); localStorage.setItem('album-kanto-jugador', 'Historia ' + suf);
    localStorage.setItem('album-kanto-dispositivo', 'dhis' + suf);
    localStorage.setItem('album-kanto-regalos', JSON.stringify(regalos));
    localStorage.setItem('album-kanto-pin-ofrecido', '1');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
    [1, 4, 7, 25, 16, 19].forEach(i => st[i] = {got: true, dup: 0});
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 0, state: st, bolas: {roja: 0, azul: 0, ultra: 0, maestra: 2}}));
  }, [SERVIDOR, suf, ids]);
  await p.goto('file:///root/pokemon/index.html');
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await p.waitForFunction(() => servidorListo, null, {timeout: 15000});
  await p.evaluate(() => document.querySelectorAll('.overlay.show').forEach(e => e.classList.remove('show')));
  await p.evaluate(() => abrirAventura());
  await p.waitForTimeout(2500);
  // ir al lado del Profesor (Plaza Belgrano 79,126): un casillero más abajo
  await p.evaluate(() => { advPonerEn(79, 127); });
  check('aparece "💬 Hablar con Profesor Algarrobo"', await p.waitForFunction(() => { const b = document.getElementById('advNpcBtn'); return !b.hidden && /Profesor Algarrobo/.test(b.textContent) && /💬/.test(b.textContent); }, null, {timeout: 8000}).then(() => true, () => false));
  if(SHOTS) await p.screenshot({path: SHOTS + '/historia-profesor.png'});
  await p.click('#advNpcBtn');
  check('el Profesor saluda y da 10 Poké Ball', await p.waitForFunction(() => !document.getElementById('advCharla').hidden && /Algarrobo/.test(document.getElementById('advCharlaTxt').innerHTML) && /\+10 Poké Ball/.test(document.getElementById('advCharlaTxt').textContent), null, {timeout: 8000}).then(() => true, () => false));
  check('y pide atrapar 3 Pokémon', /atrapá 3 Pokémon/i.test(await p.textContent('#advCharlaTxt')));
  if(SHOTS) await p.screenshot({path: SHOTS + '/historia-charla.png'});
  await p.click('#advCharlaBotones button');
  // misiones
  await p.click('#advMisBtn');
  check('panel de misiones: 3 misiones + bono', await p.waitForFunction(() => document.querySelectorAll('#advMisLista .adv-mis-fila').length === 4, null, {timeout: 8000}).then(() => true, () => false));
  check('muestra el paso 2 del capítulo', /Paso 2 de 4/.test(await p.textContent('#advMisHistoria')));
  check('las 8 medallas, ninguna ganada', await p.evaluate(() => document.querySelectorAll('#advMisMedallas img').length === 8 && !document.querySelector('#advMisMedallas .on')));
  if(SHOTS) await p.screenshot({path: SHOTS + '/historia-misiones.png'});
  await p.click('#advMisCerrar');
  // Rosa: Parque San Martín (93,149)
  await p.evaluate(() => { advPonerEn(93, 150); });
  check('aparece "💬 Hablar con Líder Rosa"', await p.waitForFunction(() => /Líder Rosa/.test(document.getElementById('advNpcBtn').textContent) && !document.getElementById('advNpcBtn').hidden, null, {timeout: 8000}).then(() => true, () => false));
  await p.click('#advNpcBtn');
  check('Rosa ofrece el desafío por la Medalla Lapacho', /Medalla Lapacho/.test(await p.textContent('#advCharlaTxt')));
  if(SHOTS) await p.screenshot({path: SHOTS + '/historia-rosa.png'});
  await p.click('#advCharlaBotones button');   // ¡Acepto!
  check('se abre la Arena para elegir equipo', await p.waitForFunction(() => document.getElementById('arenaOverlay').classList.contains('show'), null, {timeout: 6000}).then(() => true, () => false));
  await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('arPickGo').click());
  check('la pelea es contra la Líder Rosa con su equipo de 3 (Oddish, Bellsprout, Tangela)', await p.waitForFunction(() => window.__arena && window.__arena.estado() && window.__arena.estado().rivalNombre === 'Líder Rosa' && window.__arena.estado().riv.mons.map(m => m.p.id).join() === '43,69,114', null, {timeout: 10000}).then(() => true, () => false));
  await p.waitForTimeout(1500);
  if(SHOTS) await p.screenshot({path: SHOTS + '/historia-pelea.png'});
  console.log('  errores JS:', errores.join(' | ') || 'ninguno');
  check('sin errores de página', errores.length === 0);
  console.log(`\n${ok} bien, ${fail} mal`);
  await br.close();
  process.exit(fail ? 1 : 0);
})();
