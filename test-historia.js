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
  const errores = []; p.on('pageerror', e => errores.push(e.message + ' @@ ' + String(e.stack).split('\n').slice(1, 3).join(' <- ')));
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
  await p.evaluate(() => { document.getElementById('advMisPanel').hidden = true; });
  await p.click('#advLigaInfoBtn'); await p.waitForTimeout(1200);
  check('la guía de la Liga es un panel aparte de Misiones', await p.evaluate(() => !document.getElementById('advLigaGuiaPanel').hidden && document.getElementById('advMisPanel').hidden && !document.querySelector('#advMisPanel #advMisHistoria')));
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
  check('la pelea es contra el Rey sin Corona del Lapacho con su equipo de 6 (Oddish, Bellsprout, Tangela, Venusaur, Roserade, Celebi)', await p.waitForFunction(() => window.__arena && window.__arena.estado() && window.__arena.estado().rivalNombre === 'Rey sin Corona del Lapacho' && window.__arena.estado().riv.mons.map(m => m.p.id).join() === '43,69,114,3,407,251', null, {timeout: 10000}).then(() => true, () => false));
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
  await p.evaluate(() => { document.getElementById('advMisPanel').hidden = true; }); await p.click('#advLigaInfoBtn'); await p.waitForTimeout(1200);
  check('en el paso 2 (atrapar 3) no hay lugar al que guiar: sin botón Guiarme', await p.evaluate(() => !document.getElementById('advMisGuia')));
  const objs = await p.evaluate(() => [proximoObjetivo({paso: 0, cnt: 0, medallas: []}), proximoObjetivo({paso: 1, cnt: 3, medallas: []}), proximoObjetivo({paso: 3, cnt: 0, medallas: []}), proximoObjetivo({paso: 3, cnt: 0, medallas: ['g1']}), proximoObjetivo({paso: 4, cnt: 0, medallas: ['g1']}), proximoObjetivo({paso: 4, cnt: 0, medallas: ['g1', 'g2', 'g3']}), proximoObjetivo({paso: 4, cnt: 0, medallas: MEDALLAS.map(m => m.id)})].map(o => o && [o.x, o.y]));
  check('próximo objetivo: Guardián (79,125) al inicio y al cumplir; Rey (93,148) en el paso 3; Guardián al ganar la medalla; luego g2 (139,135), g4 y nada con las 19',
    JSON.stringify(objs) === JSON.stringify([[79, 125], [79, 125], [93, 148], [79, 125], [139, 135], [133, 109], null]), objs);
  // un líder ya ganado NO se repite: el servidor lo rechaza (ya_ganado) y el líder manda al siguiente
  await p.evaluate(async () => { await accionServidor('arenaTerminar', {gane: false, kos: 0, vivos: 0, tLucha: 5}).catch(() => {}); });
  const ganado = await p.evaluate(() => { HIST.estado = {paso: 4, cnt: 0, medallas: ['g1'], dia: {ms: [], d: ''}, bonoPremio: {}}; return proximoObjetivo(HIST.estado) && [proximoObjetivo(HIST.estado).x, proximoObjetivo(HIST.estado).y]; });
  check('con la medalla 1, el próximo objetivo es el líder 2 (139,135)', JSON.stringify(ganado) === JSON.stringify([139, 135]), ganado);
  // etapa 2 (guía): el líder 5 (Cauchari 38,32) sin la medalla 1 te manda al PRIMERO que falta (el 1: Rey sin Corona, 93,148), no al anterior (el 4)
  await p.evaluate(() => { document.getElementById('advMisPanel').hidden = true; document.getElementById('advLigaGuiaPanel').hidden = true; document.getElementById('arenaOverlay').classList.remove('show'); window.__retoVolver = false; advAbierto || abrirAventura(); document.getElementById('advCharla').hidden = true; advGuiaObj = null; });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { document.getElementById('advCharlaTxt').textContent = ''; advPonerEn(38, 33); });
  await p.waitForFunction(() => /Señor del Rayo/.test(document.getElementById('advNpcBtn').textContent) && !document.getElementById('advNpcBtn').hidden, null, {timeout: 8000});
  await p.click('#advNpcBtn');
  await p.waitForFunction(() => /Todavía no estás listo/.test(document.getElementById('advCharlaTxt').textContent), null, {timeout: 8000});
  check('el líder 5 sin la medalla 1 manda al líder 1 (no al 4)', /Rey sin Corona del Lapacho/.test(await p.textContent('#advCharlaTxt')) && !/Titán del Hornocal/.test(await p.textContent('#advCharlaTxt')));
  await p.evaluate(() => [...document.querySelectorAll('#advCharlaBotones button')].find(b => /Guiame/.test(b.textContent)).click());
  check('la flecha apunta al líder 1 (93,148)', await p.evaluate(() => advGuiaObj && advGuiaObj.x === 93 && advGuiaObj.y === 148));
  // botón de arriba "🧭 La Liga"
  check('hay un botón "Liga" visible (grupo propio a la derecha)', await p.evaluate(() => { const b = document.getElementById('advLigaGuiaBtn'), g = document.getElementById('advLigaGrupo'); return !!b && !g.hidden && /Liga/.test(b.textContent); }));
  check('mientras hay flecha el botón está iluminado', await p.waitForFunction(() => document.getElementById('advLigaGuiaBtn').classList.contains('activo'), null, {timeout: 3000}).then(() => true, () => false));
  await p.click('#advLigaGuiaBtn'); await p.waitForTimeout(300);
  check('tocar el botón con flecha prendida la apaga', await p.evaluate(() => advGuiaObj === null));
  await p.click('#advLigaGuiaBtn'); await p.waitForTimeout(1500);
  check('sin flecha, el botón explica el paso (en el paso 2 no hay lugar al que guiar)', await p.evaluate(() => /La Liga de Jujuy/.test(document.getElementById('advZona').textContent)));
  // etapa 2 (requisitos): con la medalla 1 y sin cumplir lo del líder 2, el líder lista lo que pide (✅/⬜) y no ofrece pelear
  const req = await p.evaluate(async () => (await accionServidor('historiaVer', {gym: 'g2'})).resultado.reqGym);
  check('el servidor devuelve los requisitos del líder 2 (4 Bicho, atrapar 7, levantar 5, 40 figuritas)', req && req.id === 'g2' && req.req.length === 4 && /Bicho/.test(req.req[0].t) && /Atrap/.test(req.req[1].t), req);
  await p.evaluate(() => { document.getElementById('advMisPanel').hidden = true; document.getElementById('advLigaGuiaPanel').hidden = true; document.getElementById('advCharla').hidden = true; document.getElementById('advCharlaTxt').textContent = ''; window.__cargarOrig = cargarHistoria; cargarHistoria = () => Promise.resolve({paso: 4, cnt: 0, medallas: ['g1'], dia: {ms: [], d: ''}, bonoPremio: {}, sig: 'g2', req: [], reqGym: {id: 'g2', req: [{t: 'Tené 3 Pokémon de tipo Bicho', meta: 3, v: 1, ok: false}, {t: 'Atrapá 5 Pokémon en la Aventura', meta: 5, v: 5, ok: true}]}}); advPonerEn(139, 136); });
  await p.waitForFunction(() => /Guardián de la Selva/.test(document.getElementById('advNpcBtn').textContent) && !document.getElementById('advNpcBtn').hidden, null, {timeout: 8000});
  await p.click('#advNpcBtn');
  await p.waitForFunction(() => /cumplir esto/.test(document.getElementById('advCharlaTxt').textContent), null, {timeout: 8000});
  const txtReq = await p.textContent('#advCharlaTxt');
  check('el líder 2 lista los requisitos con ⬜/✅ y el avance (1/3 y 5/5)', /⬜ Tené 3 Pokémon de tipo Bicho/.test(txtReq) && /\(1\/3\)/.test(txtReq) && /✅ Atrapá 5/.test(txtReq), txtReq);
  check('y no ofrece pelear', !/Acepto/.test(await p.textContent('#advCharlaBotones')));
  await p.evaluate(() => { cargarHistoria = window.__cargarOrig; document.getElementById('advCharla').hidden = true; });
  console.log('  errores JS:', errores.join(' | ') || 'ninguno');
  check('sin errores de página', errores.length === 0);
  console.log(`\n${ok} bien, ${fail} mal`);
  await br.close();
  process.exit(fail ? 1 : 0);
})();
