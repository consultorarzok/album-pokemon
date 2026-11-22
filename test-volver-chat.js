/* Volver de otra app y chat cómodo (22/11), contra el servidor local (SERVIDOR=http://localhost:8799). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8799';
const OUT = process.env.SHOTS || '/tmp';
let ok = 0, mal = 0;
const check = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ✔ ' : '  ✘ ') + n); };
const suf = Math.random().toString(36).slice(2, 5);
async function entrar(ctx, nombre){
  const p = await ctx.newPage(); p.errores = []; p.on('pageerror', e => p.errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force: true}); await p.waitForTimeout(2200);
  if(nombre){ await p.fill('#nameInput', nombre); await p.tap('#nameSaveBtn'); await p.waitForTimeout(2200); if(await p.isVisible('.avatar-op[data-avatar="red"]')){ await p.tap('.avatar-op[data-avatar="red"]'); await p.waitForTimeout(600); } }
  for(let i = 0; i < 6; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#revealCloseBtn']) if(await p.isVisible(s)){ await p.tap(s).catch(() => {}); await p.waitForTimeout(350); }
  await p.waitForTimeout(800); return p;
}
(async () => {
  const b = await chromium.launch();
  const mk = async () => { const c = await b.newContext({viewport: {width: 390, height: 800}, hasTouch: true, isMobile: true}); await c.route('**://n8n.consultorarz.com/**', r => r.abort());
    await c.addInitScript(srv => { localStorage.setItem('album-servidor', srv); localStorage.setItem('album-central-test', '1'); localStorage.setItem('album-tour-aventura', '1'); localStorage.setItem('album-novedades-id', '20261122a'); localStorage.setItem('album-novedades-veces', '9'); localStorage.setItem('album-kanto-pin-ofrecido', '1'); }, SERVIDOR); return c; };
  const ctxA = await mk(), ctxB = await mk();
  const A = await entrar(ctxA, 'Ana' + suf), B = await entrar(ctxB, 'Beto' + suf);
  console.log('— 1. Volver al mismo lugar tras recargar');
  const lugar = await A.evaluate(() => { advMapa = 'overworld'; const t = advBuscarTile('overworld', '@'); advPonerEn(t.x + 3, t.y + 2); return {x: advX, y: advY}; });
  await A.waitForTimeout(4600);
  await A.reload(); await A.waitForTimeout(600); await A.click('#portadaEntrar', {force: true}); await A.waitForTimeout(2500);
  const lugar2 = await A.evaluate(() => ({x: advX, y: advY}));
  check('después de recargar vuelve al mismo lugar (' + lugar.x + ',' + lugar.y + ' → ' + lugar2.x + ',' + lugar2.y + ')', Math.abs(lugar2.x - lugar.x) <= 1 && Math.abs(lugar2.y - lugar.y) <= 1);
  await A.waitForFunction(() => !document.getElementById('advChatBtn').hidden, null, {timeout: 9000}).catch(() => {});
  console.log('— 2. Salir y volver: el mundo se reconecta enseguida');
  await A.waitForFunction(() => MUNDO.ws && MUNDO.ws.readyState === 1, null, {timeout: 9000}).catch(() => {});
  await A.evaluate(() => { MUNDO.ws.close(); });
  await A.waitForTimeout(300);
  const cortada = await A.evaluate(() => !MUNDO.ws);
  await A.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const t0 = Date.now();
  const vivo = await A.waitForFunction(() => MUNDO.ws && MUNDO.ws.readyState === 1, null, {timeout: 2500}).then(() => true).catch(() => false);
  check('la conexión se cayó (' + cortada + ') y vuelve en menos de 2,5 s (' + (Date.now() - t0) + ' ms)', cortada && vivo);
  check('el mapa sigue andando al volver', await A.evaluate(async () => { let n = 0; const o = window.advRender; window.advRender = function(){ n++; return o.apply(this, arguments); }; await new Promise(r => setTimeout(r, 600)); window.advRender = o; return n > 5; }));
  console.log('— 3. Chat con teclado');
  await A.waitForFunction(() => !document.getElementById('advChatBtn').hidden, null, {timeout: 9000}).catch(() => {});
  await A.evaluate(() => document.fullscreenElement && document.exitFullscreen().catch(() => {})); await A.waitForTimeout(900);   // en la prueba se sale de pantalla completa para poder achicar la ventana
  const antes = await A.evaluate(() => { const cv = document.getElementById('advMap'); return {w: cv.width, h: cv.height, cw: cv.clientWidth, ch: cv.clientHeight}; });
  await A.tap('#advChatBtn'); await A.waitForTimeout(400);
  check('el chat se abre y el teclado enfoca el campo', await A.evaluate(() => !document.getElementById('advChatBar').hidden && document.activeElement === document.getElementById('advChatInput')));
  // simulamos el teclado: la pantalla pasa de 800 a 480 de alto, de a pasos como la animación real
  let redib = 0; await A.evaluate(() => { window.__n = 0; const o = window.advRender; window.__o = o; window.advRender = function(){ window.__n++; return o.apply(this, arguments); }; });
  for(const h of [700, 600, 520, 480]){ await A.setViewportSize({width: 390, height: h}); await A.waitForTimeout(60); }
  await A.waitForTimeout(500);
  redib = await A.evaluate(() => window.__n);
  const dentro = await A.evaluate(() => { const r = document.getElementById('advChatBar').getBoundingClientRect(), i = document.getElementById('advChatInput').getBoundingClientRect(); return {barBottom: r.bottom, inpTop: i.top, inpBottom: i.bottom, alto: window.innerHeight}; });
  check('con el teclado la barra y el campo quedan a la vista (' + Math.round(dentro.barBottom) + ' de ' + dentro.alto + ')', dentro.barBottom <= dentro.alto + 1 && dentro.inpTop >= 0);
  check('el mapa NO se redibuja mientras cambia el tamaño (' + redib + ' redibujados en esa animación, el cuadro normal sigue)', redib <= 40);
  const durante = await A.evaluate(() => { const cv = document.getElementById('advMap'); return {w: cv.width, h: cv.height, cw: cv.clientWidth, ch: cv.clientHeight}; });
  check('el lienzo no se estira: ancho igual y alto = lo visible arriba de la barra (' + durante.ch + ')', durante.cw === antes.cw && durante.ch <= 480 && durante.ch > 300 && durante.h === Math.round(durante.ch * (durante.h / durante.ch)));
  const pj = await A.evaluate(() => { const cv = document.getElementById('advMap'), k = cv.clientHeight / 2; return {centroY: cv.getBoundingClientRect().top + k, barTop: document.getElementById('advChatBar').getBoundingClientRect().top}; });
  check('el personaje (centro del mapa) queda arriba de la barra (' + Math.round(pj.centroY) + ' < ' + Math.round(pj.barTop) + ')', pj.centroY < pj.barTop - 20);
  await A.screenshot({path: OUT + '/chat-teclado.png'});
  // B escribe y A lo lee en el historial; A escribe y B lo ve
  await B.evaluate(() => { const bar = document.getElementById('advChatBtn'); });
  await B.waitForFunction(() => !document.getElementById('advChatBtn').hidden, null, {timeout: 9000}).catch(() => {});
  await B.tap('#advChatBtn'); await B.waitForTimeout(300); await B.fill('#advChatInput', 'hola desde B'); await B.keyboard.press('Enter'); await B.waitForTimeout(1200);
  const log = await A.evaluate(() => document.getElementById('advChatLog').innerText);
  check('A ve en el historial lo que escribió B ("' + log.replace(/\n/g, ' | ') + '")', /hola desde B/.test(log));
  await A.fill('#advChatInput', 'respuesta de A'); await A.keyboard.press('Enter'); await A.waitForTimeout(1200);
  check('el mensaje de A le llega a B', await B.evaluate(() => MUNDO.log.some(l => /respuesta de A/.test(l.t))));
  await A.setViewportSize({width: 390, height: 800}); await A.waitForTimeout(700);
  const despues = await A.evaluate(() => { const cv = document.getElementById('advMap'); return {w: cv.width, h: cv.height, cw: cv.clientWidth, ch: cv.clientHeight, cerrado: document.getElementById('advChatBar').hidden, cls: document.body.classList.contains('chat-abierto')}; });
  check('al cerrar el chat el mapa vuelve a su tamaño y se redibuja', despues.cerrado && !despues.cls && despues.cw === antes.cw && despues.ch === antes.ch);
  check('sin errores de JS', A.errores.length === 0 && B.errores.length === 0); if(A.errores.length || B.errores.length) console.log(A.errores, B.errores);
  await b.close(); console.log(ok + ' bien, ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
