/* Cuántos entraron y chat en la incursión (26/11). Servidor local con INCURSION_PRUEBA:1; CAPTURAS=/ruta node test-incursion-chat.js */
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
  const entrar = pg => pg.evaluate(() => { document.getElementById('arenaOverlay').classList.add('show'); const ids = DATA.filter(p => state[p.id].got).slice(0, 3).map(p => ({id: p.id, name: p.name})); window.__pintarInc(ids); });
  const A = await jugador('Ana'), B = await jugador('Beto');
  const antes = (await estado()).regiones.kanto;
  check('el servidor responde cuántos hay', antes && Number.isInteger(antes.esperando), antes);

  console.log('— En el mapa —');
  await A.pg.evaluate(() => { document.getElementById('advBtn').click(); });
  await A.pg.waitForTimeout(800);
  await A.pg.evaluate(() => { document.querySelectorAll('.overlay.show,.special-overlay.show,.name-overlay.show').forEach(e => e.classList.remove('show')); abrirPanelIncursiones(); });
  check('el panel muestra cuántos hay en cada guarida', await esperar(A.pg, () => { const e = document.querySelector('[data-dentro="kanto"]'); return e && /👥/.test(e.textContent); }));
  await A.pg.evaluate(() => cerrarPanelIncursiones());

  console.log('— Sala de espera —');
  for(const x of [A, B]){
    await x.pg.evaluate(() => { const c = document.getElementById('advCloseBtn'); if(c) c.click(); abrirIncursionArena({region: 'kanto', legendario: 150}); });
    await x.pg.waitForTimeout(1200);
    /* elegir 3 Pokémon y confirmar, como un jugador */
    await x.pg.evaluate(() => { const s = [...document.querySelectorAll('#arRoot .ar-sel')]; if(document.querySelectorAll('#arRoot .ar-sel.on, #arRoot .ar-sel.sel, #arRoot .ar-sel[aria-pressed="true"]').length < 3) s.slice(0, 3).forEach(b => b.click()); });
    await x.pg.waitForTimeout(300);
    await x.pg.click('#arRoot .ar-go', {timeout: 5000});
    await esperar(x.pg, () => document.getElementById('arIDentro') && /adentro/.test(document.getElementById('arIDentro').textContent));
  }
  check('se ve 2 / 6 adentro', await esperar(A.pg, () => /2 \/ 6/.test(document.getElementById('arIDentro').textContent)), await A.pg.textContent('#arIDentro'));
  const d = (await new Promise(r => setTimeout(r, 4500)), await estado()).regiones.kanto;
  check('desde afuera: 2 esperando', d.esperando === antes.esperando + 2, d);
  await A.pg.fill('#arIChat input', 'hola, vamos juntos'); await A.pg.press('#arIChat input', 'Enter');
  check('B lee el mensaje de A', await esperar(B.pg, () => /Ana.*hola, vamos juntos/.test(document.getElementById('arIChatLog').textContent)));
  check('A ve el suyo como "Vos"', await esperar(A.pg, () => /Vos: hola/.test(document.getElementById('arIChatLog').textContent)));
  await B.pg.waitForTimeout(300); await B.pg.fill('#arIChat input', 'mi numero es 3884556789'); await B.pg.press('#arIChat input', 'Enter');
  check('el filtro frena el teléfono', await esperar(B.pg, () => /teléfono|contacto/.test(document.querySelector('#arIChat .ar-chat-aviso').textContent)));
  check('y no le llega a A', !(await A.pg.textContent('#arIChatLog')).includes('3884556789'));
  for(const t of ['¡Vamos!', '¡Esperen!', '¡Ahora todos!', '¡Ayuda!', '¡Bien jugado!']){
    await B.pg.waitForTimeout(2700); await B.pg.click(`#arIChat .ar-chat-r[data-t="${t}"]`);
    check('frase rápida pasa el filtro: ' + t, await esperar(A.pg, t => document.getElementById('arIChatLog').textContent.includes(t), t, 4000));
  }
  await A.pg.screenshot({path: CAP + '/inc-sala.png'});

  console.log('— Pelea —');
  await A.pg.click('#arIEmpezar');
  check('arranca la pelea con botón de chat', await esperar(A.pg, () => document.getElementById('arChatBtn')) && await esperar(B.pg, () => document.getElementById('arChatBtn')));
  check('contador: 2 en la incursión', /2 en la incursión/.test(await A.pg.textContent('#arDentro')), await A.pg.textContent('#arDentro'));
  await A.pg.waitForTimeout(3500);
  await A.pg.click('#arChatBtn', {timeout: 5000}); await A.pg.click('#arChatPanel input', {timeout: 5000});
  await A.pg.keyboard.type('wasd jkl a pelear');
  check('escribir no maneja al Pokémon', await A.pg.evaluate(() => document.querySelector('#arChatPanel input').value) === 'wasd jkl a pelear');
  await A.pg.screenshot({path: CAP + '/inc-escribir.png'});
  await A.pg.keyboard.press('Enter');
  check('el panel se cierra al enviar', await A.pg.evaluate(() => document.getElementById('arChatPanel').hidden));
  check('B lo ve sobre la cancha', await esperar(B.pg, () => /a pelear/.test(document.getElementById('arChatFlota').textContent)));
  await B.pg.screenshot({path: CAP + '/inc-pelea.png'});
  check('el mensaje se va solo', await esperar(B.pg, () => !/a pelear/.test(document.getElementById('arChatFlota').textContent), null, 12000));
  await A.pg.waitForTimeout(500);
  const p = (await estado()).regiones.kanto;
  check('desde afuera: 2 peleando', p.peleando >= 2, p);
  await B.pg.click('#arCloseBtn'); await B.pg.click('#arAbandonar');
  check('si uno se va, el contador baja', await esperar(A.pg, () => { const e = document.getElementById('arDentro'); return !e || /1 en la/.test(e.textContent); }), await A.pg.evaluate(() => (document.getElementById('arDentro') || {}).textContent));
  const errores = [A, B].flatMap(x => x.errores);
  check('sin errores de JavaScript', !errores.length, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
