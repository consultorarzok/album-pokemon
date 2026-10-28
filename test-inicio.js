/* Inicio ordenado: Repetidas/Evolución/Intercambio juntos en un panel, rankings hasta 10, Salón plegado
   y medallas sólo para los 3 primeros de los ganadores de eventos. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c, x) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const SHOTS = process.env.SHOTS || '';
const fila = (i, extra) => Object.assign({puesto: i, jugador: 'Jugador' + i, figuritas: 900 - i * 10, total: 1025}, extra || {});
const TOP = {ok: true, dia: '2026-10-27', jugadores: 40, enLinea: 3, hoy: Array.from({length: 15}, (_, i) => fila(i + 1)), historico: Array.from({length: 15}, (_, i) => fila(i + 1)),
  completaron: [{jugador: 'Matías', dia: '2026-09-07'}],
  eventos: [1, 2, 3, 4, 5].map(i => ({evento: 'Pachamanga Fest', puesto: i, nombre: 'Ganador' + i}))};
const MAESTRO = {ok: true, jugadores: 30, top: Array.from({length: 20}, (_, i) => ({puesto: i + 1, jugador: 'Maestro' + (i + 1), pts: 5000 - i * 50, ganadas: 100 - i, peleas: 110}))};
(async () => {
  const browser = await chromium.launch();
  for(const [w, h] of [[390, 844], [1366, 768]]){
    console.log('— ' + w + '×' + h + ' —');
    const ctx = await browser.newContext({viewport:{width:w, height:h}});
    await ctx.route('**://api.entrenadoresrz.com/**', r => {
      const u = r.request().url();
      if(u.includes('/maestro-top')) return r.fulfill({status:200, contentType:'application/json', body: JSON.stringify(MAESTRO)});
      if(u.includes('/semana-top')) return r.fulfill({status:200, contentType:'application/json', body: JSON.stringify({ok: true, activa: false})});
      if(u.includes('/top')) return r.fulfill({status:200, contentType:'application/json', body: JSON.stringify(TOP)});
      return r.abort();
    });
    await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
    await ctx.addInitScript(() => {
      if(sessionStorage.getItem('sembrado')) return; sessionStorage.setItem('sembrado', '1');
      localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Tester'); localStorage.setItem('album-servidor', 'off');
      const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got:i <= 300, dup:i === 1 ? 4 : 0};
      localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st}));
    });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar',{force:true});
    await p.waitForTimeout(1500);
    for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.click(s); await p.waitForTimeout(250); }
    // el servidor está apagado en este modo: pasamos los datos por la misma función que los pinta
    await p.evaluate(([t, m]) => { ultimoTop = t; ultimoTopMaestro = m; renderRank(); }, [TOP, MAESTRO]);

    console.log('Inicio');
    check('en el inicio hay UNA tarjeta de Repetidas y no las 3 sueltas', await p.isVisible('#repetidasBtn') && !(await p.isVisible('#canjeBtn')) && !(await p.isVisible('#evolucionarBtn')) && !(await p.isVisible('#intercambioBtn')));
    check('la tarjeta dice cuántas repetidas tenés', (await p.textContent('#dupCountHome')) === '4');
    await p.click('#repetidasBtn'); await p.waitForTimeout(300);
    check('el botón abre el panel con Canjear, Evolucionar e Intercambiar', await p.isVisible('#canjeBtn') && await p.isVisible('#evolucionarBtn') && await p.isVisible('#intercambioBtn'));
    check('el panel también cuenta las repetidas', (await p.textContent('#dupCount')) === '4');
    if(SHOTS) await p.screenshot({path: SHOTS + '/repetidas-' + w + '.png'});
    await p.click('#intercambioBtn'); await p.waitForTimeout(300);
    check('desde ahí se abre Intercambio (y Repetidas queda debajo)', await p.isVisible('#intercambioOverlay .reveal-panel'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    check('Escape cierra Intercambio y vuelve al panel de Repetidas', !(await p.isVisible('#intercambioOverlay .reveal-panel')) && await p.isVisible('#repetidasOverlay .reveal-panel'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    check('otro Escape vuelve al inicio', !(await p.isVisible('#repetidasOverlay .reveal-panel')));

    console.log('Rankings');
    const filasHoy = async () => (await p.$$('#rankList .rank-row')).length;
    check('Hoy muestra 10 aunque el servidor mande 15', (await filasHoy()) === 10, await filasHoy());
    await p.click('#tabHist'); await p.waitForTimeout(300);
    check('Histórico muestra 10 aunque el servidor mande 15', (await filasHoy()) === 10);
    await p.click('#tabMaestro'); await p.waitForTimeout(500);
    check('Maestros muestra 10 aunque el servidor mande 20', (await filasHoy()) === 10, await filasHoy());
    await p.click('#tabHoy'); await p.waitForTimeout(300);

    console.log('Salón de la Fama y ganadores');
    check('el Salón va plegado (no alarga el inicio)', await p.evaluate(() => { const d = document.querySelector('.hof-det'); return !!d && !d.open; }));
    await p.click('.hof-det > summary'); await p.waitForTimeout(250);
    check('al abrirlo están el Salón y los ganadores de eventos', /Matías/.test(await p.textContent('.hof-det')) && /Ganador5/.test(await p.textContent('.hof-det')));
    const medallas = await p.$$eval('.hof-det .hof-row:has(.hof-name)', rs => rs.filter(r => /Ganador/.test(r.textContent)).map(r => !!r.querySelector('img.hof-crown')));
    check('medalla sólo para el 1.º, 2.º y 3.º; el 4.º y el 5.º sin medalla', JSON.stringify(medallas) === JSON.stringify([true, true, true, false, false]), medallas);
    const bronces = await p.$$eval('.hof-det img[src*="medal-bronce"]', x => x.length);
    check('hay una sola medalla de bronce (la del 3.º)', bronces === 1, bronces);
    if(SHOTS){ await p.screenshot({path: SHOTS + '/inicio-nuevo-' + w + '.png', fullPage: true}); }
    check('sin errores de página', errores.length === 0, errores);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${ok} bien, ${fail} mal`); process.exit(fail ? 1 : 0);
})();
