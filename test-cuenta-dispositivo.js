/* Entrar en otro dispositivo, uno a la vez (26/11). Servidor local: npm run dev; después: CAPTURAS=/ruta node test-cuenta-dispositivo.js */
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
  const admin = (ruta, b) => fetch(SERVIDOR + ruta, {method: 'POST', headers: {'x-admin': process.env.ADMIN_CLAVE || 'prueba-local'}, body: JSON.stringify(b)}).then(r => r.json());
  const ve = (pg, id, ms) => esperar(pg, i => document.getElementById(i).classList.contains('show'), id, ms);
  const listo = pg => esperar(pg, () => typeof servidorListo !== 'undefined' && servidorListo);
  async function nuevo(pg, nombre){ await ve(pg, 'nameOverlay'); await pg.fill('#nameInput', nombre); await pg.click('#nameSaveBtn'); await listo(pg); }
  async function cartelesHastaPin(pg){ for(let i = 0; i < 30 && !(await pg.evaluate(() => document.getElementById('pinOverlay').classList.contains('show'))); i++){
    for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#closeBtn', '#novedadesOverlay.show button']) if(await pg.isVisible(s)) await pg.click(s).catch(() => {});
    await pg.waitForTimeout(500); } }
  async function ponerPin(pg, pin){ await pg.fill('#pinInput', pin); await pg.click('#pinOkBtn'); return esperar(pg, () => !document.getElementById('pinOverlay').classList.contains('show')); }
  async function entrarCon(pg, nombre, pin){ await ve(pg, 'pinOverlay'); await pg.fill('#pinNombre', nombre); await pg.fill('#pinInput', pin); await pg.click('#pinOkBtn'); }
  const n1 = 'Uno ' + suf, n2 = 'Dos ' + suf;

  console.log('1) Cuenta nueva: botón visible y PIN obligatorio');
  const A = await abrir(br, {'album-kanto-dispositivo': 'dA' + suf});
  await ve(A.pg, 'nameOverlay');
  check('"Ya tengo cuenta" se ve desde el inicio', await A.pg.isVisible('#namePinBtn'));
  await nuevo(A.pg, n1); await cartelesHastaPin(A.pg);
  check('le pide el PIN', await ve(A.pg, 'pinOverlay'));
  check('sin "Ahora no"', !(await A.pg.isVisible('#pinNoBtn')));
  await A.pg.reload(); await A.pg.click('#portadaEntrar', {force: true}).catch(() => {}); await listo(A.pg); await cartelesHastaPin(A.pg);
  check('al recargar sigue siendo obligatorio', await ve(A.pg, 'pinOverlay') && !(await A.pg.isVisible('#pinNoBtn')));
  check('PIN guardado', await ponerPin(A.pg, '2468'));
  await cerrarCarteles(A.pg);
  await A.pg.evaluate(() => accionServidor('favoritosArena', {ids: []}));
  const monedas = await A.pg.evaluate(() => coins);

  console.log('2) Segundo celular entra; el primero se cierra (estando en la Aventura)');
  await A.pg.evaluate(() => mundoEntrar());
  check('A conectado al mundo', await esperar(A.pg, () => MUNDO.ws && MUNDO.ws.readyState === 1));
  const B = await abrir(br, {'album-kanto-dispositivo': 'dB' + suf});
  await ve(B.pg, 'nameOverlay'); await B.pg.click('#namePinBtn'); await entrarCon(B.pg, n1.toUpperCase(), '2468');
  check('B abre la misma cuenta', await listo(B.pg) && await B.pg.evaluate(() => coins) === monedas);
  check('A ve el cartel solo (aviso en vivo)', await ve(A.pg, 'otraOverlay', 12000));
  await A.pg.waitForTimeout(5000);
  check('B NO fue expulsado (sin ida y vuelta)', await B.pg.evaluate(() => servidorListo && !!tokenServidor && !document.getElementById('otraOverlay').classList.contains('show')));
  check('A quedó sin sesión', await A.pg.evaluate(() => !tokenServidor && !servidorListo));

  console.log('3) El primero recupera la cuenta con el PIN');
  await A.pg.click('#otraBtn', {timeout: 5000});
  check('nombre ya puesto', await A.pg.inputValue('#pinNombre') === n1);
  await A.pg.screenshot({path: process.env.CAPTURAS + '/pin-vuelta.png'});
  await A.pg.click('#pinNoBtn', {timeout: 5000});
  check('"Volver" regresa al cartel', await ve(A.pg, 'otraOverlay'));
  await A.pg.click('#otraBtn'); await A.pg.fill('#pinInput', '2468'); await A.pg.click('#pinOkBtn', {timeout: 5000});
  check('A vuelve a entrar', await listo(A.pg));
  await B.pg.evaluate(() => comprobarSesion());
  check('ahora B ve el cartel (sin estar en la Aventura)', await ve(B.pg, 'otraOverlay', 10000));
  await B.pg.reload(); await B.pg.click('#portadaEntrar', {force: true, timeout: 3000}).catch(() => {});
  check('B al recargar no entra solo', await ve(B.pg, 'otraOverlay') && await B.pg.evaluate(() => !tokenServidor));
  await B.pg.screenshot({path: process.env.CAPTURAS + '/otra.png'});
  check('A sigue adentro', await A.pg.evaluate(() => servidorListo && !!tokenServidor));

  console.log('4) Cambiar de cuenta en un celular que ya tiene otra');
  const C = await abrir(br, {'album-kanto-dispositivo': 'dC' + suf});
  await nuevo(C.pg, n2); await cartelesHastaPin(C.pg); await ponerPin(C.pg, '1357'); await cerrarCarteles(C.pg);
  await C.pg.evaluate(() => { localStorage.setItem('arena-favoritos', '[1,2,3]'); abrirCuenta(); });
  await C.pg.screenshot({path: process.env.CAPTURAS + '/mi-cuenta.png'});
  await C.pg.click('#cuentaOtraBtn'); await entrarCon(C.pg, n1, '2468');
  await C.pg.waitForTimeout(1500); await C.pg.click('#portadaEntrar', {force: true, timeout: 3000}).catch(() => {});
  check('C ahora es la cuenta 1', await listo(C.pg) && await C.pg.evaluate(n => jugador === n && coins, n1) === monedas);
  check('no arrastra favoritos de la anterior', await C.pg.evaluate(() => localStorage.getItem('arena-favoritos')) === '[]');
  const dos = await admin('/admin/jugador', {nombre: n2});
  check('la cuenta 2 sigue intacta', dos.ok && dos.jugador.tienePin, dos.jugador);

  console.log('5) Sin PIN no deja cambiar; olvido de PIN; topes');
  await admin('/admin/borrar-pin', {nombre: n2});
  const D = await abrir(br, {'album-kanto-dispositivo': 'dD' + suf});
  await nuevo(D.pg, 'Tres ' + suf); await D.pg.evaluate(() => abrirCuenta());
  await D.pg.click('#cuentaOtraBtn', {force: true});
  check('sin PIN no deja salir', /Primero poné tu PIN/.test(await D.pg.textContent('#cuentaError')));
  const api = b => fetch(SERVIDOR + '/entrar', {method: 'POST', body: JSON.stringify(b)}).then(r => r.json());
  check('admin pone PIN provisorio', (await admin('/admin/poner-pin', {nombre: n2, pin: '9999'})).ok);
  check('entra con el provisorio', (await api({nombre: n2, pin: '9999', dispositivo: 'dx' + suf})).ok);
  let m = []; for(let i = 0; i < 8; i++) m.push((await api({nombre: n2, pin: '0000', dispositivo: 'dx' + suf})).motivo);
  check('6 intentos (el que entró cuenta) y después espera', m[4] === 'pin_incorrecto' && m[5] === 'muchos_intentos', m);
  await admin('/admin/poner-pin', {nombre: n2, pin: '9999'});
  check('el admin destraba', (await api({nombre: n2, pin: '9999', dispositivo: 'dx' + suf})).ok);

  const errores = [A, B, C, D].flatMap(x => x.errores);
  check('sin errores de JavaScript', !errores.length, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
