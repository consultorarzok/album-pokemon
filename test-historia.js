/* Modo historia (14/11) en MODO SERVIDOR (servidor local :8787, npm run dev en pokemon-servidor): personajes quietos,
   charla con el Guardián de la Liga, panel de Misiones con medallas y desafío al Rey sin Corona del Lapacho (pelea de gimnasio con su equipo).
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
  // ir al lado del Guardián de la Liga (Plaza Belgrano 79,126): un casillero más abajo
  await p.evaluate(() => { advPonerEn(79, 127); });
  check('aparece "💬 Hablar con Guardián de la Liga"', await p.waitForFunction(() => { const b = document.getElementById('advNpcBtn'); return !b.hidden && /Guardián de la Liga/.test(b.textContent) && /💬/.test(b.textContent); }, null, {timeout: 8000}).then(() => true, () => false));
  if(SHOTS) await p.screenshot({path: SHOTS + '/historia-profesor.png'});
  await p.click('#advNpcBtn');
  check('el Guardián de la Liga saluda y da 10 Poké Ball', await p.waitForFunction(() => !document.getElementById('advCharla').hidden && /Guardián de la Liga/.test(document.getElementById('advCharlaTxt').innerHTML) && /\+10 Poké Ball/.test(document.getElementById('advCharlaTxt').textContent), null, {timeout: 8000}).then(() => true, () => false));
  check('y pide atrapar 3 Pokémon', /atrapá 3 Pokémon/i.test(await p.textContent('#advCharlaTxt')));
  if(SHOTS) await p.screenshot({path: SHOTS + '/historia-charla.png'});
  await p.click('#advCharlaBotones button');
  // misiones
  await p.click('#advMisBtn');
  check('panel de misiones: 3 misiones + bono', await p.waitForFunction(() => document.querySelectorAll('#advMisLista .adv-mis-fila').length === 4, null, {timeout: 8000}).then(() => true, () => false));
  check('muestra el paso 2 del capítulo', /Paso 2 de 4/.test(await p.textContent('#advMisHistoria')));
  check('las 19 medallas, ninguna ganada', await p.evaluate(() => document.querySelectorAll('#advMisMedallas img').length === 19 && !document.querySelector('#advMisMedallas .on')));
  if(SHOTS) await p.screenshot({path: SHOTS + '/historia-misiones.png'});
  await p.click('#advMisCerrar');
  // Rosa: Parque San Martín (93,149)
  await p.evaluate(() => { advPonerEn(93, 150); });
  check('aparece "💬 Hablar con Rey sin Corona del Lapacho"', await p.waitForFunction(() => /Rey sin Corona del Lapacho/.test(document.getElementById('advNpcBtn').textContent) && !document.getElementById('advNpcBtn').hidden, null, {timeout: 8000}).then(() => true, () => false));
  await p.click('#advNpcBtn');
  check('Rosa ofrece el desafío por la Medalla Lapacho', await p.waitForFunction(() => /Medalla Lapacho/.test(document.getElementById('advCharlaTxt').textContent), null, {timeout: 6000}).then(() => true, () => false));
  if(SHOTS) await p.screenshot({path: SHOTS + '/historia-rosa.png'});
  await p.click('#advCharlaBotones button');   // ¡Acepto!
  check('se abre la Arena para elegir equipo', await p.waitForFunction(() => document.getElementById('arenaOverlay').classList.contains('show'), null, {timeout: 6000}).then(() => true, () => false));
  await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('arPickGo').click());
  check('la pelea es contra el Rey sin Corona del Lapacho con su equipo de 4 (Oddish, Bellsprout, Tangela, Celebi)', await p.waitForFunction(() => window.__arena && window.__arena.estado() && window.__arena.estado().rivalNombre === 'Rey sin Corona del Lapacho' && window.__arena.estado().riv.mons.map(m => m.p.id).join() === '43,69,114,251', null, {timeout: 10000}).then(() => true, () => false));
  await p.waitForTimeout(1500);
  if(SHOTS) await p.screenshot({path: SHOTS + '/historia-pelea.png'});
  // etapa 2 (orden): el gimnasio 2 (Calilegua, 139,135) NO deja pelear sin la medalla del 1.º y ofrece una flecha hasta el anterior
  await p.evaluate(() => { document.getElementById('arenaOverlay').classList.remove('show'); window.__retoVolver = false; try{ abrirAventura(); }catch(e){} });
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('#advCharla').forEach(e => { e.hidden = true; }));
  await p.evaluate(() => { advPonerEn(139, 136); });
  check('aparece el botón del Guardián de la Selva (gimnasio 2)', await p.waitForFunction(() => /Guardián de la Selva/.test(document.getElementById('advNpcBtn').textContent) && !document.getElementById('advNpcBtn').hidden, null, {timeout: 8000}).then(() => true, () => false));
  await p.click('#advNpcBtn'); await p.waitForTimeout(800);
  check('sin la medalla del 1.º: "Todavía no estás listo" (no ofrece pelear)', /Todavía no estás listo/.test(await p.textContent('#advCharlaTxt')) && !/Acepto/.test(await p.textContent('#advCharlaBotones')));
  await p.evaluate(() => { [...document.querySelectorAll('#advCharlaBotones button')].find(b => /Guiame/.test(b.textContent)).click(); });
  check('"Guiame hasta él" prende la flecha hacia el Rey sin Corona del Lapacho (93,148)', await p.evaluate(() => advGuiaObj && advGuiaObj.x === 93 && advGuiaObj.y === 148));
  // el servidor también lo exige (no se puede saltear tocando el cliente)
  const g2 = await p.evaluate(async () => accionServidor('arenaEmpezar', {equipo: [1, 4, 7], reto: 'g2', mapa: 'overworld', x: 139 * 16, y: 135 * 16}));
  check('el servidor rechaza el gimnasio 2 sin la medalla 1 (falta_medalla_previa)', g2 && g2.ok === false && g2.motivo === 'falta_medalla_previa', g2);
  // panel de misiones: próximo objetivo con botón de flecha
  await p.evaluate(() => { advGuiaObj = null; });
  await p.click('#advMisBtn'); await p.waitForTimeout(1200);
  check('en el paso 2 (atrapar 3) no hay lugar al que guiar: sin botón Guiarme', await p.evaluate(() => !document.getElementById('advMisGuia')));
  const objs = await p.evaluate(() => [proximoObjetivo({paso: 0, cnt: 0, medallas: []}), proximoObjetivo({paso: 1, cnt: 3, medallas: []}), proximoObjetivo({paso: 3, cnt: 0, medallas: []}), proximoObjetivo({paso: 3, cnt: 0, medallas: ['g1']}), proximoObjetivo({paso: 4, cnt: 0, medallas: ['g1']}), proximoObjetivo({paso: 4, cnt: 0, medallas: ['g1', 'g2', 'g3']}), proximoObjetivo({paso: 4, cnt: 0, medallas: MEDALLAS.map(m => m.id)})].map(o => o && [o.x, o.y]));
  check('próximo objetivo: Guardián (79,125) al inicio y al cumplir; Rey (93,148) en el paso 3; Guardián al ganar la medalla; luego g2 (139,135), g4 y nada con las 19',
    JSON.stringify(objs) === JSON.stringify([[79, 125], [79, 125], [93, 148], [79, 125], [139, 135], [133, 109], null]), objs);
  console.log('  errores JS:', errores.join(' | ') || 'ninguno');
  check('sin errores de página', errores.length === 0);
  console.log(`\n${ok} bien, ${fail} mal`);
  await br.close();
  process.exit(fail ? 1 : 0);
})();
