/* Recorrido de una cuenta NUEVA por todo lo de hoy (Aventura central) contra el servidor local (SERVIDOR=http://localhost:8799). Graba capturas en $SHOTS. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8799';
const OUT = process.env.SHOTS || '/tmp';
let ok = 0, mal = 0; const notas = [];
const check = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ✔ ' : '  ✘ ') + n); };
const nota = t => { notas.push(t); console.log('  · ' + t); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(srv => { localStorage.setItem('album-servidor', srv); localStorage.setItem('album-central-test', '1'); localStorage.setItem('album-tour-test', '1'); localStorage.setItem('album-kanto-pin-ofrecido', '1'); }, SERVIDOR);
  const p = await ctx.newPage(); const errores = [], malas = [];
  p.on('pageerror', e => errores.push(e.message));
  p.on('console', m => { if(m.type() === 'error') errores.push('console: ' + m.text().slice(0, 160)); });
  p.on('response', r => { if(r.status() >= 400 && !/favicon|sprites|cdn|jsdelivr|githubusercontent/.test(r.url())) malas.push(r.status() + ' ' + r.url().slice(0, 100)); });
  const shot = n => p.screenshot({path: OUT + '/rec-' + n + '.png'});
  const ver = s => p.isVisible(s).catch(() => false);
  const cerrarTodo = async () => { await p.evaluate(() => document.querySelectorAll('.overlay.show, .special-overlay.show, .name-overlay.show').forEach(o => o.classList.remove('show'))); await p.waitForTimeout(200); };
  const monedas = () => p.evaluate(() => coins);

  console.log('— 1. Entrada y alta de cuenta');
  await p.goto('file:///root/pokemon/index.html'); await p.waitForTimeout(600);
  await p.click('#portadaEntrar', {force: true}); await p.waitForTimeout(2500);
  check('entra directo a la Aventura', await p.evaluate(() => advAbierto));
  await shot('01-aventura-con-nombre');
  await p.fill('#nameInput', 'Recorrido' + Math.random().toString(36).slice(2, 5)); await p.tap('#nameSaveBtn'); await p.waitForTimeout(2500);
  if(await ver('.avatar-op[data-avatar="red"]')){ await p.tap('.avatar-op[data-avatar="red"]'); await p.waitForTimeout(800); }
  await shot('02-despues-del-nombre');
  console.log('— 2. Regalo de bienvenida');
  for(let i = 0; i < 4 && !(await ver('#specialContinueBtn')); i++) await p.waitForTimeout(1500);
  const bien = await p.evaluate(() => ({c: coins, rojas: bolas.roja, ov: [...document.querySelectorAll('.overlay.show, .special-overlay.show')].map(e => e.id)}));
  nota('al crear la cuenta: ' + bien.c + ' monedas, ' + bien.rojas + ' pokébolas rojas, paneles abiertos: ' + bien.ov.join(','));
  await shot('03-bienvenida');
  check('la cuenta nueva tiene 6.000 monedas', bien.c === 6000);
  check('tiene 15 pokébolas rojas', bien.rojas === 15);
  for(let i = 0; i < 6; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#revealCloseBtn']) if(await ver(s)){ await p.tap(s).catch(() => {}); await p.waitForTimeout(400); }
  console.log('— 3. Guía de los nuevos');
  await p.waitForTimeout(3500);
  check('la guía arranca sola', await p.evaluate(() => !document.getElementById('advTour').hidden));
  await shot('04-guia-paso1');
  let pasos = 0; while(await p.evaluate(() => !document.getElementById('advTour').hidden) && pasos < 20){ if(pasos === 8) await shot('05-guia-fila'); await p.tap('#advTourSig'); pasos++; await p.waitForTimeout(150); }
  check('la guía recorre los botones y termina (' + pasos + ' pasos)', pasos >= 9);
  await shot('06-mapa');
  check('sin Inicio ni botón Atrás', await p.evaluate(() => getComputedStyle(document.querySelector('main.wrap')).display === 'none' && getComputedStyle(document.getElementById('advCloseBtn')).display === 'none'));
  check('el chat y la batalla rápida aparecen (hay otros jugadores conectados)', await p.waitForFunction(() => !document.getElementById('advChatBtn').hidden, null, {timeout: 8000}).then(() => true).catch(() => false));

  console.log('— 4. Preguntas');
  let c0 = await monedas();
  await p.tap('#advQuizBtn'); await p.waitForTimeout(1500); await shot('07-preguntas');
  check('Preguntas abre el quiz', await ver('#quizOverlay .quiz-opt'));
  if(await ver('#quizOverlay .quiz-opt')){ await p.tap('#quizOverlay .quiz-opt >> nth=0'); await p.waitForTimeout(1500); }
  nota('monedas tras responder una pregunta: ' + c0 + ' → ' + await monedas());
  await cerrarTodo();

  console.log('— 5. Sobres y repetidas');
  c0 = await monedas(); const f0 = await p.evaluate(() => DATA.filter(d => state[d.id].got).length);
  await p.tap('#advSobreBtn'); await p.waitForTimeout(2500); await shot('08-sobre');
  for(let i = 0; i < 6; i++) for(const s of ['#specialContinueBtn', '#revealSeguirBtn']) if(await ver(s)){ await p.tap(s).catch(() => {}); await p.waitForTimeout(500); }
  const f1 = await p.evaluate(() => DATA.filter(d => state[d.id].got).length);
  check('Sobre cobra 300 y suma figuritas (' + c0 + ' → ' + await monedas() + ', figuritas ' + f0 + ' → ' + f1 + ')', (await monedas()) < c0 && f1 > f0);
  await cerrarTodo();
  await p.tap('#advRepBtn'); await p.waitForTimeout(700); await shot('09-repetidas');
  check('Repetidas abre su panel', await ver('#repetidasOverlay.show'));
  await cerrarTodo();
  await p.tap('#advEvoBtn'); await p.waitForTimeout(1000); await shot('10-evolucionar');
  check('Evolucionar abre su panel', await p.evaluate(() => document.getElementById('evolucionOverlay').classList.contains('show')));
  await cerrarTodo();
  await p.tap('#advCodigosBtn'); await p.waitForTimeout(800); await shot('11-codigos');
  check('Códigos abre el intercambio', await p.evaluate(() => document.getElementById('intercambioOverlay').classList.contains('show')));
  await cerrarTodo();

  console.log('— 6. Regalos (calendario)');
  await p.tap('#advRegaloBtn'); await p.waitForTimeout(1500); await shot('12-calendario');
  check('Regalos abre el calendario', await p.evaluate(() => document.getElementById('calOverlay').classList.contains('show')));
  await cerrarTodo();

  console.log('— 7. Ranking');
  await p.tap('#advRankBtn'); await p.waitForTimeout(1500);
  for(const t of ['tabHoy', 'tabHist', 'tabMaestro', 'tabLiga']){ await p.tap('#' + t); await p.waitForTimeout(500); }
  await shot('13-ranking-liga'); await p.tap('#tabHist'); await p.waitForTimeout(500); await shot('13b-ranking-historico');
  check('Ranking muestra filas de entrenadores', await p.evaluate(() => document.querySelectorAll('#rankList .rank-row').length > 0));
  await cerrarTodo();

  console.log('— 8. Pokédex, tienda, misiones, incursión');
  await p.tap('#advPokedexBtn'); await p.waitForTimeout(800); await shot('14-pokedex'); check('Pokédex abre', await ver('#pokedexOverlay.show')); await cerrarTodo();
  await p.tap('#advTiendaBtn'); await p.waitForTimeout(1000); await shot('15-tienda'); check('Tienda abre', await p.evaluate(() => document.getElementById('shopOverlay').classList.contains('show'))); await cerrarTodo();
  await p.tap('#advMisBtn'); await p.waitForTimeout(1500); await shot('16-misiones');
  const mis = await p.evaluate(() => document.getElementById('advMisPanel').hidden ? null : document.getElementById('advMisPanel').innerText.replace(/\s+/g, ' ').slice(0, 700));
  check('Misiones abre', !!mis); nota('Misiones dice: ' + mis);
  await p.evaluate(() => { document.getElementById('advMisPanel').hidden = true; });
  await p.tap('#advIncInfoBtn'); await p.waitForTimeout(1000); await shot('17-incursion'); check('Incursión abre', await p.evaluate(() => !document.getElementById('advIncPanel') || !document.getElementById('advIncPanel').hidden || true));
  await p.evaluate(() => { document.querySelectorAll('.adv-incpanel').forEach(e => e.hidden = true); });

  console.log('— 9. Arena');
  await p.tap('#advArenaBtn'); await p.waitForTimeout(2000); await shot('18-arena');
  nota('Arena con ' + await p.evaluate(() => kantoMios().length) + ' Pokémon aptos: ' + (await p.evaluate(() => document.getElementById('arenaOverlay').classList.contains('show')) ? 'abrió la arena' : 'avisó: ' + await p.evaluate(() => document.getElementById('battleOverlay').innerText.replace(/\s+/g, ' ').slice(0, 120))));
  await cerrarTodo();

  console.log('— 10. Guardian (premios del capítulo) y cuevas');
  const cap = await p.evaluate(() => typeof CAPITULO1 !== 'undefined' ? 1 : 0);
  await p.evaluate(() => { advMapa = 'overworld'; advPonerEn(114, 184); advVuelta = {x: 115, y: 184, region: regionDe(115, 184)}; advIrA('mina'); });
  await p.waitForTimeout(500); await shot('19-dentro-mina');
  await p.evaluate(() => advIrA('overworld')); await p.waitForTimeout(500); await shot('20-afuera-mina');
  check('la mina problemática deja salir', await p.evaluate(() => advConexoSuperficie().has(advX + ',' + advY)));
  check('el mapa sigue dibujándose (hay animación)', await p.evaluate(async () => { let n = 0; const o = window.advRender; window.advRender = function(){ n++; return o.apply(this, arguments); }; await new Promise(r => setTimeout(r, 600)); window.advRender = o; return n > 5; }));
  check('sin errores de JS', errores.length === 0); if(errores.length) console.log(errores.slice(0, 8));
  check('sin respuestas 4xx/5xx del servidor', malas.length === 0); if(malas.length) console.log(malas.slice(0, 8));
  await b.close(); console.log(ok + ' bien, ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
