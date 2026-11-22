/* Aventura central (22/11): el juego arranca en el mapa, sin Inicio; botones del costado, menú ☰, rankings, guía y pausa del dibujo bajo los paneles. Sin servidor (modo viejo, n8n bloqueado). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const OUT = process.env.SHOTS || '/tmp';
let ok = 0, mal = 0;
const check = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ✔ ' : '  ✘ ') + n); };
(async () => {
  const browser = await chromium.launch();
  for(const [w, h] of [[390, 844], [844, 390], [360, 640]]){
    console.log('--- ' + w + 'x' + h);
    const ctx = await browser.newContext({viewport: {width: w, height: h}, hasTouch: true, isMobile: true});
    await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
    await ctx.addInitScript(() => { localStorage.setItem('album-central-test', '1'); localStorage.setItem('album-tour-test', '1'); localStorage.setItem('album-kanto-pin-ofrecido', '1'); localStorage.setItem('album-servidor', 'off'); });
    const p = await ctx.newPage(); const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.goto('file:///root/pokemon/index.html'); await p.waitForTimeout(500);
    await p.click('#portadaEntrar', {force: true}); await p.waitForTimeout(1500);
    check('entra directo a la Aventura', await p.evaluate(() => advAbierto && document.getElementById('advOverlay').classList.contains('show')));
    check('el Inicio no se ve', await p.evaluate(() => getComputedStyle(document.querySelector('main.wrap')).display === 'none'));
    check('no hay botón Atrás', await p.evaluate(() => getComputedStyle(document.getElementById('advCloseBtn')).display === 'none'));
    // jugador nuevo: nombre + personaje, después la guía arranca sola
    await p.fill('#nameInput', 'Prueba' + w); await p.tap('#nameSaveBtn'); await p.waitForTimeout(1500);
    if(await p.isVisible('.avatar-op[data-avatar="red"]')){ await p.tap('.avatar-op[data-avatar="red"]'); await p.waitForTimeout(600); }
    for(let i = 0; i < 8; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#revealCloseBtn']) if(await p.isVisible(s)){ await p.tap(s).catch(() => {}); await p.waitForTimeout(300); }
    await p.waitForTimeout(3500);
    check('la guía arrancó sola', await p.evaluate(() => !document.getElementById('advTour').hidden));
    await p.screenshot({path: OUT + '/central-guia-' + w + 'x' + h + '.png'});
    let pasos = 0;
    while(await p.evaluate(() => !document.getElementById('advTour').hidden) && pasos < 20){ await p.tap('#advTourSig'); pasos++; await p.waitForTimeout(150); }
    check('la guía terminó (' + pasos + ' pasos) y no vuelve', pasos >= 8 && await p.evaluate(() => localStorage.getItem('album-tour-aventura') === '1'));
    await p.screenshot({path: OUT + '/central-mapa-' + w + 'x' + h + '.png'});
    // los botones entran en pantalla y no se pisan con el joystick
    await p.evaluate(() => { document.getElementById('advLigaGrupo').hidden = false; });   // sin servidor el grupo de la Liga está oculto
    const cajas = await p.evaluate(() => ['advQuizBtn', 'advArenaBtn', 'advRankBtn', 'advPokedexBtn', 'advTiendaBtn', 'advMisBtn', 'advIncInfoBtn', 'advGuiaBtn', 'advSobreBtn', 'advRepBtn', 'advEvoBtn', 'advCodigosBtn', 'advRegaloBtn', 'advLigaGuiaBtn', 'advLigaInfoBtn'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return {id, x: r.left, y: r.top, w: r.width, h: r.height}; }));
    check('los 15 botones se ven dentro de la pantalla y no se pisan entre sí', cajas.every(c => c.w > 30 && c.x >= 0 && c.y >= 0 && c.x + c.w <= w && c.y + c.h <= h) && !cajas.some((a, i) => cajas.some((b, j) => j > i && a.x < b.x + b.w - 2 && a.x + a.w - 2 > b.x && a.y < b.y + b.h - 2 && a.y + a.h - 2 > b.y)));
    const hud = await p.evaluate(() => { const r = document.querySelector('.adv-hud').getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height}; });
    check('la fila de arriba no choca con las monedas', !cajas.some(c => c.x < hud.x + hud.w && c.x + c.w > hud.x && c.y < hud.y + hud.h && c.y + c.h > hud.y));
    const st = await p.evaluate(() => { const r = document.getElementById('advStick').getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height}; });
    const pisa = cajas.some(c => c.x < st.x + st.w && c.x + c.w > st.x && c.y < st.y + st.h && c.y + c.h > st.y);
    check('ningún botón tapa el joystick', !pisa);
    // preguntas, arena, ranking, pokédex, menú
    await p.tap('#advQuizBtn'); await p.waitForTimeout(700);
    check('Preguntas abre el quiz', await p.evaluate(() => document.getElementById('quizOverlay').classList.contains('show')));
    await p.tap('#quizCloseBtn'); await p.waitForTimeout(300);
    await p.tap('#advArenaBtn'); await p.waitForTimeout(900);
    check('Arena responde (jugador nuevo: avisa que falta equipo y manda al botón Sobre)', await p.evaluate(() => document.getElementById('battleOverlay').classList.contains('show') && /botón Sobre/.test(document.getElementById('battleOverlay').textContent)));
    await p.tap('#battleCloseBtn'); await p.waitForTimeout(300);
    await p.tap('#advRankBtn'); await p.waitForTimeout(900);
    check('Ranking abre el panel con las pestañas', await p.evaluate(() => document.getElementById('rankOverlay').classList.contains('show') && document.querySelectorAll('#rankOverlay .rank-tab').length >= 4));
    await p.screenshot({path: OUT + '/central-ranking-' + w + 'x' + h + '.png'});
    await p.tap('#tabMaestro'); await p.waitForTimeout(500);
    check('cambia de pestaña', await p.evaluate(() => document.getElementById('tabMaestro').classList.contains('active')));
    // con el ranking abierto, el mapa no se dibuja
    const dib = await p.evaluate(async () => { let n = 0; const o = window.advRender; window.advRender = function(){ n++; return o.apply(this, arguments); }; await new Promise(r => setTimeout(r, 700)); window.advRender = o; return n; });
    check('con el panel abierto el mapa no se redibuja (' + dib + ')', dib === 0);
    await p.tap('#rankCloseBtn'); await p.waitForTimeout(400);
    const dib2 = await p.evaluate(async () => { let n = 0; const o = window.advRender; window.advRender = function(){ n++; return o.apply(this, arguments); }; await new Promise(r => setTimeout(r, 700)); window.advRender = o; return n; });
    check('al cerrarlo el mapa vuelve a dibujarse (' + dib2 + ')', dib2 > 5);
    await p.tap('#advPokedexBtn'); await p.waitForTimeout(600);
    check('Pokédex abre encima del mapa', await p.evaluate(() => document.getElementById('pokedexOverlay').classList.contains('show')));
    await p.tap('#pokedexCloseBtn'); await p.waitForTimeout(300);
    await p.tap('#advSobreBtn'); await p.waitForTimeout(600);
    check('Sobre abre un sobre', await p.evaluate(() => document.getElementById('revealOverlay') ? document.getElementById('revealOverlay').classList.contains('show') : true));
    await p.screenshot({path: OUT + '/central-sobre-' + w + 'x' + h + '.png'});
    await p.evaluate(() => { document.querySelectorAll('.overlay.show, .special-overlay.show').forEach(o => o.classList.remove('show')); });
    await p.tap('#advRepBtn'); await p.waitForTimeout(500);
    check('Repetidas abre su panel', await p.evaluate(() => document.getElementById('repetidasOverlay').classList.contains('show')));
    await p.tap('#repetidasCloseBtn'); await p.waitForTimeout(300);
    await p.tap('#advCodigosBtn'); await p.waitForTimeout(500);
    check('Códigos abre el intercambio', await p.evaluate(() => document.getElementById('intercambioOverlay').classList.contains('show')));
    await p.tap('#intercambioCloseBtn'); await p.waitForTimeout(300);
    await p.tap('#advEvoBtn'); await p.waitForTimeout(500);
    check('Evolucionar abre su panel', await p.evaluate(() => document.getElementById('evolucionOverlay').classList.contains('show')));
    await p.tap('#evolucionCloseBtn'); await p.waitForTimeout(300);
    await p.tap('#advGuiaBtn'); await p.waitForTimeout(400);
    check('Guía vuelve a explicar', await p.evaluate(() => !document.getElementById('advTour').hidden));
    await p.tap('#advTourSaltar'); await p.waitForTimeout(200);
    check('Misiones trae los avisos y la firma', await p.evaluate(() => !!document.querySelector('#advMisPanel #advMenuAvisos') && !!document.querySelector('#advMisPanel .firma')));
    // Escape no cierra la Aventura
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    check('la Aventura no se puede cerrar', await p.evaluate(() => advAbierto));
    check('sin errores de página', errores.length === 0); if(errores.length) console.log(errores);
    await ctx.close();
  }
  await browser.close();
  console.log(ok + ' bien, ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
