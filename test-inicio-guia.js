/* 18/11: inicio con guía ("Tu próximo paso", "¿Cómo se juega?", descripciones) y ranking con tu puesto. Modo servidor (SERVIDOR=http://localhost:PUERTO). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const suf = Math.random().toString(36).slice(2, 6);
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  const ids = await (async () => { const q = await ctx.newPage(); await q.goto('file:///root/pokemon/index.html'); const r = await q.evaluate(() => REGALOS.map(r => r.id)); await q.close(); return r; })();
  await p.addInitScript(([srv, suf, regalos]) => {
    if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
    localStorage.clear(); localStorage.setItem('album-servidor', srv);
    localStorage.setItem('album-avatar', 'red'); localStorage.setItem('album-kanto-jugador', 'Guia ' + suf);
    localStorage.setItem('album-kanto-dispositivo', 'dgu' + suf); localStorage.setItem('album-kanto-regalos', JSON.stringify(regalos));
    localStorage.setItem('album-kanto-pin-ofrecido', '1'); localStorage.setItem('album-novedades-id', '99999999');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got: false, dup: 0};
    [1, 4, 7, 16, 19, 25].forEach(i => st[i] = {got: true, dup: 0});
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 1200, state: st, bolas: {roja: 5, azul: 0, ultra: 0, maestra: 0}}));
  }, [SERVIDOR, suf, ids]);
  await p.goto('file:///root/pokemon/index.html');
  await p.click('#portadaEntrar', {force: true}).catch(() => {});
  await p.waitForFunction(() => servidorListo, null, {timeout: 15000});
  await p.waitForTimeout(1200);

  // --- guía
  check('aparece "Tu próximo paso" con título, detalle y botón', await p.evaluate(() => { const b = document.getElementById('proximoPaso'); return !b.hidden && document.getElementById('pasoTitulo').textContent.length > 3 && document.getElementById('pasoDetalle').textContent.length > 10 && document.getElementById('pasoBtn').textContent.length > 1; }));
  check('el botón del paso lleva a la acción (Pelear → abre la Arena)', await (async () => {
    const acc = await p.evaluate(() => document.getElementById('proximoPaso').dataset.accion);
    if(acc !== 'battleBtn') return acc;   // con 6 Pokémon y 0 peleas toca la Arena
    await p.click('#pasoBtn');
    return p.waitForFunction(() => document.getElementById('arenaOverlay').classList.contains('show'), null, {timeout: 6000}).then(() => true, () => false);
  })());
  await p.evaluate(() => { document.getElementById('arenaOverlay').classList.remove('show'); });
  check('"¿Cómo se juega?" está plegado y se abre con 6 pasos', await p.evaluate(() => { const d = document.getElementById('comoJuego'); const cerrado = !d.open; d.open = true; return cerrado && d.querySelectorAll('li').length === 6; }));
  const txt = await p.evaluate(() => document.querySelector('.zonas').innerText);
  check('cada función dice qué hace (Sobre, Repetidas, Arena, Aventura)', /nuevas por/.test(txt) && /canjear, evolucionar, intercambiar y mejorar/.test(txt) && /duelos con amigos e incursiones/.test(txt) && /19 medallas/.test(txt), txt.slice(0, 300));
  await p.click('#repetidasBtn');
  check('Repetidas explica cómo mejorar un Pokémon (fusión y estrellas)', await p.evaluate(() => /fusionando copias/.test(document.getElementById('repetidasOverlay').innerText) && !!document.getElementById('repetidasPokedexBtn')));
  await p.click('#repetidasPokedexBtn');
  check('el botón "Ir a la Pokédex" cierra Repetidas y abre la Pokédex', await p.waitForFunction(() => !document.getElementById('repetidasOverlay').classList.contains('show') && document.getElementById('pokedexOverlay') && document.getElementById('pokedexOverlay').classList.contains('show'), null, {timeout: 5000}).then(() => true, () => false));
  await p.evaluate(() => document.querySelectorAll('.overlay.show').forEach(e => e.classList.remove('show')));

  // --- ranking con tu puesto
  const nom = await p.evaluate(async () => { const d = await (await fetch(SERVIDOR_URL + '/semana-top')).json(); if(!d.arena || d.arena.length < 15) return null; jugador = d.arena[14].jugador; await cargarTopSemana(); renderRank(); return jugador; });
  if(!nom) console.log('  (base de pruebas con menos de 15 en la semana: se salta el caso "fuera del top 10")');
  else{
    check('la tarjeta dice "Vos vas 15.º de N"', await p.evaluate(() => /Vos vas 15\.º de \d+/.test(document.getElementById('rankYo').innerText)));
    check('con el puesto 15 aparece tu fila debajo del top 10 (separada por "· · ·")', await p.evaluate(() => !!document.querySelector('#rankList .rank-sep') && !!document.querySelector('#rankList .rank-row.me') && document.querySelectorAll('#rankList .rank-row').length === 11));
  }
  await p.evaluate(() => { jugador = 'Nadie Existe Zzz'; return cargarTopSemana().then(renderRank); });
  check('si todavía no estás: dice cómo entrar al ranking', await p.evaluate(() => /Todavía no estás/.test(document.getElementById('rankYo').innerText) && /Ganá una pelea/.test(document.getElementById('rankYo').innerText)));
  check('cada pestaña explica qué mide el ranking', await p.evaluate(() => { const t = []; ['tabHist', 'tabMaestro', 'tabHoy'].forEach(id => { document.getElementById(id).click(); t.push(document.getElementById('rankAyuda').innerText.length > 20); }); return t.every(Boolean); }));
  check('los premios de la semana vienen plegados y el cierre se ve', await p.evaluate(() => { document.getElementById('tabHoy').click(); const d = document.querySelector('#rankDone details.hof-det'); return !!d && !d.open && /cierra el lunes/.test(document.getElementById('rankDone').innerText); }));

  // --- Liga
  await p.click('#tabLiga');
  check('pestaña Liga: explica la regla y trae el bloque de clasificados', await p.waitForFunction(() => /19 medallas/.test(document.getElementById('rankAyuda').innerText) && !!document.querySelector('#rankList .rank-sec-clas'), null, {timeout: 8000}).then(() => true, () => false));
  check('la carrera va ARRIBA y los clasificados ABAJO; sin clasificados es una sola línea (no 10 filas vacías)', await p.evaluate(() => { const l = document.getElementById('rankList'), t = l.innerText; return /Clasificados a la Liga \d+\/10/.test(t) && t.indexOf('La carrera') < t.indexOf('Clasificados a la Liga') && (ultimoLiga.clasificados.length > 0 || (!l.querySelector('.libre') && /los 10 lugares están libres/.test(t))); }));
  check('sin medallas: dice cómo entrar a la carrera', await p.evaluate(() => /primer líder/.test(document.getElementById('rankYo').innerText)));
  await p.evaluate(() => { ultimoLiga = Object.assign({}, ultimoLiga, {yo: {puesto: 14, total: 30, valor: 2, faltan: 1}, carrera: [{puesto: 1, nombre: 'Ana', medallas: 7, clasificado: false}], clasificados: [{puesto: 1, nombre: 'Beto', ts: new Date().toISOString()}]}); renderRank(); });
  check('con medallas: "Vos vas 14.º de 30" y tu fila aparece fuera del top 10', await p.evaluate(() => /Vos vas 14\.º de 30/.test(document.getElementById('rankYo').innerText) && /Te falta 1 medalla\b/.test(document.getElementById('rankYo').innerText) && !!document.querySelector('#rankList .rank-sep') && !!document.querySelector('#rankList .rank-row.me')));
  check('un clasificado ve "¡Ya estás clasificado a la Liga!"', await p.evaluate(() => { const n = jugador; jugador = 'Beto'; renderRank(); const r = /Ya estás clasificado/.test(document.getElementById('rankYo').innerText); jugador = n; return r; }));

  // --- tamaño táctil
  const chicos = await p.evaluate(() => [...document.querySelectorAll('main button, main summary, main .rank-tab')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 40; }).map(b => (b.id || b.className || b.tagName) + ':' + Math.round(b.getBoundingClientRect().height)));
  check('botones del inicio de al menos 40 px de alto', chicos.length === 0, chicos);
  check('sin scroll horizontal en el celular', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  check('sin errores de JavaScript', errores.length === 0, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
