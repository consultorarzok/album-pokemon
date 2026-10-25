/* Evento Halloween en el navegador, con el reloj adelantado (navegador y servidor local).
   Fase "durante" (servidor con RELOJ_DESFASE a las 16:00) y fase "despues" (a las 20:05, misma base).
   Uso: node test-halloween.js durante http://localhost:8791   /   node test-halloween.js despues http://localhost:8792 */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const fs = require('fs');
const [fase, SRV] = process.argv.slice(2);
const HORA = fase === 'durante' ? '2026-10-24T16:00:00-03:00' : '2026-10-24T20:05:00-03:00';
const GUARDA = process.env.GUARDA || '/tmp/halloween-sesion.json';
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const espera = (p, fn, arg, ms = 8000) => p.waitForFunction(fn, arg, {timeout: ms}).then(() => true, () => false);

(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({viewport: {width: 390, height: 844}});
  await ctx.route(/n8n\.consultorarz\.com/, r => r.abort());
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  const sesion = fase === 'despues' ? JSON.parse(fs.readFileSync(GUARDA)) : null;
  await p.addInitScript(([srv, desfase, sesion]) => {
    const _Date = Date;
    class D extends _Date { constructor(...a){ if(a.length) super(...a); else super(_Date.now() + desfase); } static now(){ return _Date.now() + desfase; } }
    window.Date = D;
    window.__arenaMudo = true;
    try{ localStorage.setItem('album-avatar', 'red'); }catch(e){}
    if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
    localStorage.setItem('album-servidor', srv);
    localStorage.setItem('album-kanto-pin-ofrecido', '1');
    if(sesion) Object.keys(sesion).forEach(k => localStorage.setItem(k, sesion[k]));
  }, [SRV, Date.parse(HORA) - Date.now(), sesion]);
  await p.goto('file:///root/pokemon/index.html');
  await p.click('#portadaEntrar', {force: true});

  if(fase === 'durante'){
    console.log('Durante el evento (16:00)');
    await p.waitForSelector('#nameOverlay.show');
    await p.fill('#nameInput', 'Zoe Halloween');
    await p.click('#nameSaveBtn');
    check('la carta de bienvenida es de Kanto o Johto', await espera(p, () => document.querySelector('.special-overlay.show')) &&
      await p.evaluate(() => { const n = document.getElementById('specialName').textContent; const q = DATA.find(d => d.name === n); return q && (q.region === 'kanto' || q.region === 'johto'); }),
      await p.textContent('#specialName').catch(() => ''));
    for(let i = 0; i < 4 && await p.isVisible('#specialContinueBtn'); i++){ await p.click('#specialContinueBtn'); await p.waitForTimeout(300); }
    await p.evaluate(() => document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')));
    check('cartel de Halloween con sus calabazas', await p.evaluate(() => { const b = document.getElementById('eventoBanner'); return !b.hidden && b.classList.contains('evento-halloween') && b.querySelectorAll('img').length === 2 && /Evento Halloween/.test(b.textContent); }));
    check('el cartel explica la regla', /Sólo Kanto y Johto · gana el que más Pokémon atrape/.test(await p.textContent('#eventoBannerSub')));
    await p.click('#tabEvento');
    check('la pestaña del evento muestra los premios', await espera(p, () => /Premios del Evento Halloween/.test(document.getElementById('rankDone').textContent) && /Charizard shiny/.test(document.getElementById('rankDone').textContent)));
    /* aventura: el paso a Hoenn tiene calabazas y no se puede pasar */
    await p.evaluate(() => { abrirAventura(); advPonerEn(105, 42); advRender(); });
    await p.waitForTimeout(400);
    check('hay calabazas en el paso a Hoenn', await p.evaluate(() => [...document.querySelectorAll('#advObjetos span')].some(s => s.dataset.tipo === 'calabaza' && s.style.display !== 'none')));
    for(let i = 0; i < 8; i++){ await p.evaluate(() => advMover(1, 0)); await p.waitForTimeout(60); }
    check('no se puede pasar a Hoenn', await p.evaluate(() => advX < 109), await p.evaluate(() => advX));
    check('avisa que está clausurado', /Clausurado por el Evento Halloween/.test(await p.textContent('#advZona')), await p.textContent('#advZona'));
    await p.screenshot({path: '/tmp/halloween-calabazas.png'});
    /* atrapar 2 */
    const hierba = await p.evaluate(() => { const rows = ADV_MAPS.overworld.rows; for(let y = 0; y < rows.length; y++) for(let x = 0; x < 50; x++) if(rows[y][x] === '"') return {x, y}; });
    for(let i = 0; i < 2; i++){
      await p.evaluate(h => salirEncuentro(ADV_TILE['"'], h.x, h.y), hierba);
      await espera(p, () => !!encuentro);
      await p.evaluate(() => tirarBola('roja'));
      await p.waitForTimeout(700);
      for(let k = 0; k < 6 && await p.evaluate(() => !!encuentro); k++){ await p.evaluate(() => tirarBola('roja')); await p.waitForTimeout(500); }
      await p.evaluate(() => { document.querySelectorAll('.overlay.show,.special-overlay.show').forEach(o => o.classList.remove('show')); cerrarEncuentro(); });
      await p.waitForTimeout(1200);
    }
    await p.evaluate(() => { cerrarAventura(); cargarTopEvento(eventoActivo()); });
    check('el ranking del evento cuenta sus atrapados', await espera(p, () => ultimoTopEvento && ultimoTopEvento.top.some(f => f.jugador === 'Zoe Halloween' && f.figuritas >= 1), null, 8000),
      await p.evaluate(() => ultimoTopEvento));
    check('y lo muestra como "atrapados"', await espera(p, () => /atrapados/.test(document.getElementById('rankList').textContent), null, 5000));
    const ls = await p.evaluate(() => Object.fromEntries(['album-kanto-token', 'album-kanto-jugador', 'album-kanto-dispositivo'].map(k => [k, localStorage.getItem(k)])));
    fs.writeFileSync(GUARDA, JSON.stringify(ls));
  } else {
    console.log('Después del evento (20:05)');
    check('le sale el premio con su carta', await espera(p, () => document.querySelector('.special-overlay.show') || document.getElementById('overlay').classList.contains('show'), null, 10000));
    for(let i = 0; i < 6; i++){
      if(await p.isVisible('#specialContinueBtn')) await p.click('#specialContinueBtn');
      else if(await p.evaluate(() => document.getElementById('overlay').classList.contains('show'))) await p.click('#closeBtn');
      else break;
      await p.waitForTimeout(400);
    }
    check('cartel "¡Saliste 1º en el Evento Halloween!"', await espera(p, () => /Saliste 1º en el Evento Halloween/.test(document.getElementById('battleStage').textContent), null, 6000));
    await p.screenshot({path: '/tmp/halloween-premio.png'});
    check('tiene el Charizard shiny', await p.evaluate(() => (state[6].ej || []).some(e => e.s)));
    check('el cartel del evento ya no está', await p.evaluate(() => document.getElementById('eventoBanner').hidden));
    await p.evaluate(() => document.getElementById('battleCloseBtn').click());
    await p.click('#tabHist');
    check('queda en "Ganadores de eventos"', await espera(p, () => /Ganadores de eventos/.test(document.getElementById('rankDone').textContent) && /Zoe Halloween/.test(document.getElementById('rankDone').textContent) && /Evento Halloween · 1º/.test(document.getElementById('rankDone').textContent)));
    await p.evaluate(() => document.getElementById('rankDone').scrollIntoView());
    await p.screenshot({path: '/tmp/halloween-ganadores.png'});
  }
  check('sin errores de JavaScript', !errores.length, errores);
  await br.close();
  console.log(`\n${ok} bien, ${fail} mal`);
  process.exit(fail ? 1 : 0);
})();
