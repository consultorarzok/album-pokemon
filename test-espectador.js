/* Modo espectador (26/11). Servidor local con INCURSION_PRUEBA:1 y la migración peleas-vivas; CAPTURAS=/ruta node test-espectador.js */
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
    localStorage.setItem('album-avatar', 'red');
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
  const CAP = process.env.CAPTURAS;
  const estado = () => fetch(SERVIDOR + '/incursion/estado?region=kanto&x=' + Math.random()).then(r => r.json());
  async function jugador(n){
    const c = await abrir(br, {'album-kanto-dispositivo': 'dinc' + n + suf}); await c.pg.setViewportSize({width: 390, height: 780});
    await esperar(c.pg, () => document.getElementById('nameOverlay').classList.contains('show'));
    await c.pg.fill('#nameInput', n + ' ' + suf); await c.pg.click('#nameSaveBtn');
    await esperar(c.pg, () => servidorListo);
    await c.pg.evaluate(async () => { await api('/pin', {token: tokenServidor, pin: '1234'}); tienePinCuenta = true; for(let i = 0; i < 2; i++) await accionServidor('sobre', {}); });
    await c.pg.waitForTimeout(1500);
    await c.pg.addStyleTag({content: '#calOverlay,#novedadesOverlay,#overlay,.special-overlay{display:none!important}'});
    await c.pg.evaluate(() => { aperturaIncursion = () => ({abierta: true, desde: Date.now() - 1000, hasta: Date.now() + 3600e3}); });   // la hora real puede no ser turno: el servidor local las tiene abiertas
    await c.pg.evaluate(() => { document.querySelectorAll('.overlay.show,.special-overlay.show,.name-overlay.show').forEach(e => e.classList.remove('show')); });
    return c;
  }

  const peleas = () => fetch(SERVIDOR + '/peleas?x=' + Math.random()).then(r => r.json()).then(r => r.peleas);
  const mia = async re => (await peleas()).find(p => p.jugadores.some(n => re.test(n)));
  const A = await jugador('Ana'), B = await jugador('Beto'), C = await jugador('Carla'), D = await jugador('Dani');
  console.log('— Duelo 1 contra 1 —');
  await A.pg.evaluate(() => abrirArena()); await A.pg.click('#arPickDuelo'); await A.pg.click('#arDCrear');
  await esperar(A.pg, () => document.querySelector('.ar-lobby-cod b'));
  const cod = (await A.pg.textContent('.ar-lobby-cod b')).trim();
  check('antes de empezar no figura en la lista', !(await mia(new RegExp(suf))));
  await B.pg.evaluate(() => abrirArena()); await B.pg.click('#arPickDuelo'); await B.pg.fill('#arDCodigo', cod); await B.pg.click('#arDUnir');
  await A.pg.click('#arLEmpezar:not([disabled])', {timeout: 8000});
  check('arranca la pelea', await esperar(A.pg, () => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, 15000));
  await C.pg.waitForTimeout(500);
  const p = await mia(new RegExp(suf));
  check('figura en Peleas en vivo con los dos nombres', p && p.modo === '1v1' && p.jugadores.length === 2, p);
  check('botón "Mirar" en el inicio', await C.pg.evaluate(() => !document.getElementById('verPeleasBtn').hidden));
  await C.pg.evaluate(() => document.getElementById('verPeleasBtn').click());
  check('la lista muestra la sala', await esperar(C.pg, s => [...document.querySelectorAll('.ar-viva')].some(v => v.textContent.includes('Ana ' + s) && v.textContent.includes('Beto ' + s)), suf));
  await C.pg.screenshot({path: CAP + '/esp-lista.png'});
  await C.pg.click(`[data-ver="${p.codigo}"]`);
  check('C ve a los dos peleadores', await esperar(C.pg, () => document.querySelectorAll('.ver-mon').length === 2));
  check('A ve el ojito con 1 y el nombre de C', await esperar(A.pg, s => document.getElementById('arOjo') && /👁 1/.test(document.getElementById('arOjo').textContent) && document.getElementById('arPublico').textContent.includes('Carla ' + s), suf));
  check('B ve el aviso de que entró', await esperar(B.pg, () => /Carla.*entró a mirar/.test((document.getElementById('arEntro') || {}).textContent || ''), null, 3000));
  const pos = () => C.pg.evaluate(() => [...document.querySelectorAll('.ver-mon')].map(e => e.style.transform).join('|'));
  const p1 = await pos();
  await A.pg.keyboard.down('a'); await A.pg.waitForTimeout(700); await A.pg.keyboard.up('a'); await A.pg.waitForTimeout(300);
  check('C ve moverse a los peleadores', await pos() !== p1);
  await A.pg.keyboard.press('k');
  check('C ve el nombre del ataque', await esperar(C.pg, () => [...document.querySelectorAll('.ver-ataque.ya')].some(e => e.textContent.length > 2), null, 4000));
  /* que A reciba un golpe: lo calcula su celular y se lo cuenta a todos */
  await A.pg.evaluate(() => window.__arena.golpeDe('riv', 'yo', 'largo'));
  check('C ve bajar la vida de A', await esperar(C.pg, () => parseFloat(document.querySelector('.ver-mon[data-de="a"] .ver-hp i').style.width) < 100, null, 5000));
  await D.pg.evaluate(c => { abrirPeleas(); }, p.codigo);
  await esperar(D.pg, c => document.querySelector(`[data-ver="${c}"]`), p.codigo, 9000); await D.pg.click(`[data-ver="${p.codigo}"]`);
  check('2 espectadores en el ojito de todos', await esperar(A.pg, () => /👁 2/.test(document.getElementById('arOjo').textContent)) && await esperar(C.pg, () => /👁 2/.test(document.getElementById('arOjo').textContent)));
  check('C ve a D entre el público', await esperar(C.pg, s => document.getElementById('arPublico').textContent.includes('Dani ' + s), suf));
  check('la lista cuenta 2 vistas', (await mia(new RegExp(suf))).publico === 2, await mia(new RegExp(suf)));
  await C.pg.waitForTimeout(600); await C.pg.screenshot({path: CAP + '/esp-mirando.png'}); await A.pg.screenshot({path: CAP + '/esp-peleando.png'});
  await D.pg.click('#verSalir');
  check('al salir uno, el ojito baja', await esperar(A.pg, () => /👁 1/.test(document.getElementById('arOjo').textContent)));
  await B.pg.click('#arCloseBtn'); await B.pg.click('#arAbandonar');
  check('C ve quién ganó', await esperar(C.pg, () => /Ganó Ana/.test(document.getElementById('verAviso').textContent), null, 15000), await C.pg.textContent('#verAviso'));
  await A.pg.waitForTimeout(1500);
  check('la pelea sale de la lista', !(await mia(new RegExp(suf))), await peleas());
  await C.pg.click('#verSalir'); await A.pg.evaluate(() => document.getElementById('arCerrar2') && document.getElementById('arCerrar2').click());

  console.log('— Incursión —');
  for(const x of [A, B]){
    await x.pg.evaluate(() => abrirIncursionArena({region: 'kanto', legendario: 150})); await x.pg.waitForTimeout(900);
    await x.pg.click('#arPickGo'); await esperar(x.pg, () => /adentro/.test((document.getElementById('arIDentro') || {}).textContent || ''));
  }
  await A.pg.click('#arIEmpezar'); await esperar(A.pg, () => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, 15000);
  await C.pg.waitForTimeout(500);
  const q = await mia(new RegExp(suf));
  check('la incursión figura en la lista', q && q.modo === 'raid' && q.jefe, q);
  await C.pg.evaluate(() => abrirPeleas()); await esperar(C.pg, c => document.querySelector(`[data-ver="${c}"]`), q.codigo, 9000); await C.pg.click(`[data-ver="${q.codigo}"]`);
  check('C ve 2 entrenadores y el legendario', await esperar(C.pg, () => document.querySelectorAll('.ver-mon').length === 3 && document.querySelector('.ver-mon.jefe')));
  check('los de la incursión ven a C', await esperar(B.pg, s => document.getElementById('arPublico').textContent.includes('Carla ' + s), suf));
  const q1 = await pos(); await C.pg.waitForTimeout(2500);
  check('el legendario y los jugadores se ven en vivo', await pos() !== q1);
  await C.pg.screenshot({path: CAP + '/esp-inc-mirando.png'}); await B.pg.screenshot({path: CAP + '/esp-inc-peleando.png'});
  for(const x of [A, B]) await x.pg.evaluate(() => { const c = document.getElementById('arCloseBtn'); if(c) c.click(); const a = document.getElementById('arAbandonar'); if(a) a.click(); });
  check('C ve el final', await esperar(C.pg, () => /Ganó el legendario/.test(document.getElementById('verAviso').textContent), null, 15000), await C.pg.textContent('#verAviso'));
  const errores = [A, B, C, D].flatMap(x => x.errores);
  check('sin errores de JavaScript', !errores.length, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
