/* Prueba del juego en MODO SERVIDOR contra el servidor local (wrangler dev en :8787, ver
   /root/pokemon-servidor). No toca n8n ni nada real: las llamadas a n8n se cortan.
   Correr: (en /root/pokemon-servidor) npm run dev   y después   node test-servidor.js */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }

const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
const URL = 'file:///root/pokemon/index.html';
let ok = 0, fail = 0;
const check = (n, c, extra) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); } };
const suf = Math.random().toString(36).slice(2, 6);

async function abrir(br, init){
  const ctx = await br.newContext();
  const pg = await ctx.newPage();
  const errores = [];
  pg.on('pageerror', e => errores.push(e.message));
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  await pg.addInitScript(([srv, datos]) => {
    if(sessionStorage.getItem('sembrado')) return;   // sólo la primera carga: después manda lo que guardó el juego
    sessionStorage.setItem('sembrado', '1');
    localStorage.setItem('album-servidor', srv);
    Object.keys(datos || {}).forEach(k => localStorage.setItem(k, typeof datos[k] === 'string' ? datos[k] : JSON.stringify(datos[k])));
  }, [SERVIDOR, init]);
  await pg.goto(URL);
  await pg.click('#portadaEntrar', {force: true}).catch(() => {});
  return {ctx, pg, errores};
}
const esperar = (pg, fn, arg, ms = 8000) => pg.waitForFunction(fn, arg, {timeout: ms}).then(() => true, () => false);
async function cerrarCarteles(pg){
  for(let i = 0; i < 6; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#closeBtn', '#pinNoBtn'])
    if(await pg.isVisible(s)){ await pg.click(s); await pg.waitForTimeout(200); }
}

(async () => {
  const br = await chromium.launch();

  console.log('1) Chico que ya jugaba (álbum en su navegador) entra con el servidor nuevo');
  const regalosTodos = await (async () => {
    const {ctx, pg} = await abrir(br, {});
    const ids = await pg.evaluate(() => REGALOS.map(r => r.id));
    await ctx.close();
    return ids;
  })();
  const nombre = 'Viejo ' + suf;
  const progresoViejo = await (async () => {
    const {ctx, pg} = await abrir(br, {});
    const p = await pg.evaluate(() => { const st = {}; DATA.forEach(p => st[p.id] = {got: false, dup: 0}); [1, 4, 7, 25, 150].forEach(id => st[id] = {got: true, dup: id === 25 ? 3 : 0});
      return {coins: 1000, state: st, bolas: {roja: 7, azul: 1, ultra: 0, maestra: 0}, comprasDia: {}, legendariosDia: {dia: null, obtenidos: {}}, maestro: {pts: 120, ganadas: 5, peleas: 9, nivel: 1}, tomados: [], especiales: {}}; });
    await ctx.close();
    return p;
  })();
  const A = await abrir(br, {'album-kanto-jugador': nombre, 'album-kanto-dispositivo': 'dviejo' + suf,
    'album-kanto-progreso': progresoViejo, 'album-kanto-regalos': regalosTodos});
  check('se conectó y subió su álbum', await esperar(A.pg, () => typeof servidorListo !== 'undefined' && servidorListo));
  check('monedas del álbum viejo', await A.pg.evaluate(() => coins) === 1000, await A.pg.evaluate(() => coins));
  check('figuritas del álbum viejo', await A.pg.evaluate(() => figuritasObtenidas()) === 5);
  check('cada figurita con su fuerza (del servidor)', await A.pg.evaluate(() => state[25].ej && state[25].ej.length === 4));
  check('pantalla: monedas', (await A.pg.textContent('#coinAmount')).trim() === '1000');
  check('quedó copia del álbum de antes', await A.pg.evaluate(() => !!localStorage.getItem('album-kanto-progreso-antes-servidor')));
  check('le ofrece poner PIN', await esperar(A.pg, () => document.getElementById('pinOverlay').classList.contains('show'), null, 6000));
  await A.pg.fill('#pinInput', '2468');
  await A.pg.click('#pinOkBtn');
  check('PIN guardado', await esperar(A.pg, () => !document.getElementById('pinOverlay').classList.contains('show')));
  await cerrarCarteles(A.pg);

  console.log('2) Abrir un sobre');
  await A.pg.click('#openBtn');
  check('aparecen las 6 cartas', await esperar(A.pg, () => document.querySelectorAll('#revealCards .reveal-card').length === 6));
  check('descontó 150', await A.pg.evaluate(() => coins) === 850);
  await cerrarCarteles(A.pg);
  const figDespues = await A.pg.evaluate(() => figuritasObtenidas());

  console.log('3) TRAMPA: cambiar monedas y figuritas desde la consola');
  await A.pg.evaluate(() => { coins = 99999; state[149].got = true; updateCoins(); });
  await A.pg.click('#openBtn');
  await esperar(A.pg, () => document.querySelectorAll('#revealCards .reveal-card').length === 6 && document.getElementById('overlay').classList.contains('show'));
  check('el servidor descontó de lo REAL (850 → 700)', await A.pg.evaluate(() => coins) === 700, await A.pg.evaluate(() => coins));
  check('la figurita inventada desapareció', await A.pg.evaluate(() => !state[149].got || false) || await A.pg.evaluate(() => state[149].got && state[149].ej.length > 0));
  await cerrarCarteles(A.pg);
  await A.pg.reload();
  await A.pg.click('#portadaEntrar', {force: true}).catch(() => {});
  check('al recargar sigue en 700 (lo guarda el servidor)', await esperar(A.pg, () => servidorListo && coins === 700));
  await cerrarCarteles(A.pg);

  console.log('4) Responder y ganar');
  await A.pg.click('#earnBtn');
  check('aparece la pregunta con 4 opciones', await esperar(A.pg, () => document.querySelectorAll('#quizOptions .quiz-opt').length === 4));
  const correcta = await A.pg.evaluate(() => quizModo === 'silueta' ? quizTarget.name : TYPE_LABEL[quizTarget.type]);
  await A.pg.evaluate(t => [...document.querySelectorAll('#quizOptions .quiz-opt')].find(b => b.textContent === t).click(), correcta);
  check('acertó: +15', await esperar(A.pg, () => coins === 715), await A.pg.evaluate(() => coins));
  check('cartel de correcto', /Correcto/.test(await A.pg.textContent('#quizFeedback')));
  await A.pg.click('#quizCloseBtn');

  console.log('5) Canje de 3 repetidas');
  const dupAntes = await A.pg.evaluate(() => Object.values(state).reduce((a, s) => a + s.dup, 0));
  await A.pg.evaluate(() => canjearRepetidas());
  check('canjeó 3 por una nueva', await esperar(A.pg, d => Object.values(state).reduce((a, s) => a + s.dup, 0) === d - 3, dupAntes));
  await cerrarCarteles(A.pg);

  console.log('6) Tienda');
  await A.pg.evaluate(() => { abrirTienda(); });
  await A.pg.evaluate(() => comprarBola('roja'));
  check('compró 6 Poké Ball por 50', await esperar(A.pg, () => bolas.roja === 13 && coins === 665), await A.pg.evaluate(() => [bolas.roja, coins]));
  await A.pg.evaluate(() => document.getElementById('shopOverlay').classList.remove('show'));

  console.log('7) Ranking: lo arma el servidor');
  /* el ranking muestra sólo los 10 primeros (en la base de pruebas hay muchos): se le pregunta al servidor por este jugador */
  const info = await (await fetch(SERVIDOR + '/admin/jugador', {method: 'POST', headers: {'x-admin': process.env.ADMIN_CLAVE || 'prueba-local'}, body: JSON.stringify({nombre})})).json();
  check('el servidor lleva sus figuritas para el ranking', info.ok && info.jugador.figuritas === await A.pg.evaluate(() => figuritasObtenidas()), info.jugador);
  check('el ranking lo arma el servidor', await A.pg.evaluate(() => !!(ultimoTop && ultimoTop.dia && Array.isArray(ultimoTop.hoy))));
  check('aparece en Maestros con sus puntos viejos', await A.pg.evaluate(async n => { await cargarTopMaestro(); return ultimoTopMaestro.top.some(x => x.jugador === n && x.pts === 120); }, nombre));

  console.log('8) Otro celular: nombre ocupado → entra con PIN y ve el MISMO álbum');
  const B = await abrir(br, {'album-kanto-dispositivo': 'dotro' + suf});
  check('pide nombre', await esperar(B.pg, () => document.getElementById('nameOverlay').classList.contains('show')));
  await B.pg.fill('#nameInput', nombre.toUpperCase());
  await B.pg.click('#nameSaveBtn');
  check('dice que el nombre tiene dueño y ofrece PIN', await esperar(B.pg, () => !document.getElementById('namePinBtn').hidden));
  await B.pg.click('#namePinBtn');
  await B.pg.fill('#pinInput', '1111');
  await B.pg.click('#pinOkBtn');
  check('PIN incorrecto', await esperar(B.pg, () => /incorrecto/.test(document.getElementById('pinError').textContent)));
  await B.pg.fill('#pinInput', '2468');
  await B.pg.click('#pinOkBtn');
  check('entró con el mismo álbum', await esperar(B.pg, () => servidorListo && coins === 665), await B.pg.evaluate(() => coins));

  console.log('9) Chico nuevo');
  const C = await abrir(br, {'album-kanto-dispositivo': 'dnuevo' + suf});
  await esperar(C.pg, () => document.getElementById('nameOverlay').classList.contains('show'));
  await C.pg.fill('#nameInput', 'Nuevo ' + suf);
  await C.pg.click('#nameSaveBtn');
  check('arranca con 300 monedas', await esperar(C.pg, () => servidorListo && coins === 300), await C.pg.evaluate(() => coins));
  check('recibe los regalos "para todos"', await esperar(C.pg, () => document.getElementById('battleOverlay').classList.contains('show') || document.getElementById('specialCardWrap') && document.querySelector('.special-overlay.show'), null, 5000));
  await cerrarCarteles(C.pg);

  console.log('10) Intercambio entre A y C');
  await cerrarCarteles(A.pg);
  for(let i = 0; i < 4 && !(await A.pg.evaluate(() => Object.values(state).some(s => s.dup > 0))); i++){
    await A.pg.evaluate(() => openPack());
    await esperar(A.pg, () => document.getElementById('overlay').classList.contains('show'));
    await cerrarCarteles(A.pg);
  }
  await A.pg.evaluate(() => abrirIntercambio());
  await A.pg.click('#intercambioList .open-btn');
  check('A genera un código', await esperar(A.pg, () => document.getElementById('codigoCardOverlay').classList.contains('show')));
  const codigo = (await A.pg.textContent('#codigoCardTexto')).trim();
  await A.pg.evaluate(() => document.getElementById('codigoCardOverlay').classList.remove('show'));
  await esperar(C.pg, () => document.getElementById('pinOverlay').classList.contains('show'), null, 6000);
  await cerrarCarteles(C.pg);
  await C.pg.evaluate(() => abrirIntercambio());
  await C.pg.fill('#canjeCodigoInput', codigo);
  await C.pg.click('#canjeCodigoBtn');
  check('C lo canjea', await esperar(C.pg, () => document.getElementById('overlay').classList.contains('show')));
  await B.pg.evaluate(() => abrirIntercambio());
  await B.pg.fill('#canjeCodigoInput', codigo);
  await B.pg.click('#canjeCodigoBtn');
  check('el mismo código no sirve dos veces', await esperar(B.pg, () => /propio|usó/.test(document.getElementById('canjeCodigoFeedback').textContent)));

  console.log('11) Sin conexión');
  await A.ctx.route(new RegExp(SERVIDOR.replace(/^https?:\/\//, '').replace(/\./g, '\\.')), r => r.abort());
  await cerrarCarteles(A.pg);
  await A.pg.evaluate(() => document.getElementById('intercambioOverlay').classList.remove('show'));
  await A.pg.evaluate(() => openPack());
  check('avisa que no hay conexión', await esperar(A.pg, () => document.getElementById('offlineOverlay').classList.contains('show')));
  await A.ctx.unrouteAll(); await A.ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  await A.pg.click('#offlineBtn');
  check('vuelve la señal y sigue', await esperar(A.pg, () => !document.getElementById('offlineOverlay').classList.contains('show')));

  for(const [n, x] of [['A', A], ['B', B], ['C', C]]) check('sin errores de JavaScript en ' + n, x.errores.length === 0, x.errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
