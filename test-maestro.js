/* Ranking de Maestros: pestaña, filas del servidor, rangos con premio que se cobra una sola
   vez y envío del acumulado al servidor. Servidor simulado. Con SHOTS=carpeta guarda capturas. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const SHOTS = process.env.SHOTS || '';

(async () => {
  const browser = await chromium.launch();
  for(const [w, h] of [[390, 844], [1366, 768]]){
    console.log('— ' + w + '×' + h + ' —');
    const ctx = await browser.newContext({viewport:{width:w, height:h}});
    const enviados = [];
    await ctx.route('**://n8n.consultorarz.com/**', r => {
      const u = r.request().url();
      if(u.includes('pokemon-maestro-score')){ enviados.push(JSON.parse(r.request().postData())); return r.fulfill({status:200, body:'{"ok":true}'}); }
      if(u.includes('pokemon-maestro-top')) return r.fulfill({status:200, contentType:'application/json', body:JSON.stringify({ok:true, jugadores:3,
        top:[{puesto:1, jugador:'Ash', pts:3500, ganadas:12, peleas:14}, {puesto:2, jugador:'Tester', pts:60, ganadas:3, peleas:5}, {puesto:3, jugador:'Misty', pts:12, ganadas:1, peleas:4}]})});
      return r.abort();
    });
    await ctx.addInitScript(() => {
      localStorage.setItem('album-kanto-jugador', 'Tester');
      const st = {}; for(let i = 1; i <= 151; i++) st[i] = {got:i <= 14, dup:0};
      localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st, maestro:{pts:140, ganadas:3, peleas:5, nivel:1}}));
    });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.goto('file:///root/pokemon/index.html');await p.click('#portadaEntrar',{force:true});
    await p.waitForTimeout(1200);
    for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.click(s); await p.waitForTimeout(250); }

    check('al entrar manda el acumulado guardado', enviados.some(e => e.jugador === 'Tester' && e.pts === 140 && e.ganadas === 3 && e.peleas === 5));
    check('se ve la pestaña Maestros', await p.isVisible('#tabMaestro'));
    await p.click('#tabMaestro'); await p.waitForTimeout(400);
    const filas = await p.$$eval('#rankList .rank-row', rs => rs.map(r => r.textContent));
    check('lista las filas del servidor (' + filas.length + ')', filas.length === 3 && filas[0].includes('Ash') && filas[0].includes('3500'));
    check('cada fila muestra el rango (Ash con 3500 = Alto Mando)', filas[0].includes('Alto Mando'));
    check('mi fila resaltada', await p.isVisible('#rankList .rank-row.me'));
    const abajo = await p.textContent('#rankDone');
    check('abajo muestra mi rango y cuánto falta', abajo.includes('Entrenador') && abajo.includes('te faltan 860 para Líder de Gimnasio'));
    check('lista los 5 rangos con su premio', (await p.$$('#rankDone .hof-row.rango')).length === 5 && abajo.includes('Master Ball'));
    check('el rango ya cobrado aparece con ✅', (await p.$$('#rankDone .hof-row.rango.ok')).length === 1);
    const tabsDentro = await p.$$eval('.rank-tab:not([hidden])', ts => ts.every(t => { const b = t.getBoundingClientRect(); return b.right <= innerWidth && b.left >= 0; }));
    check('las pestañas entran en pantalla', tabsDentro);
    check('sin scroll horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if(SHOTS){ await p.locator('.rank-panel').scrollIntoViewIfNeeded(); await p.locator('.rank-panel').screenshot({path:`${SHOTS}/maestro-${w}.png`}); }

    const r = await p.evaluate(() => {
      const antes = {coins, azul:bolas.azul, ultra:bolas.ultra};
      maestro.pts = 1100;
      const sub = cobrarRangosMaestro();
      const otra = cobrarRangosMaestro();
      return {sub, otra, dc:coins - antes.coins, du:bolas.ultra - antes.ultra, da:bolas.azul - antes.azul, nivel:maestro.nivel};
    });
    check('al pasar 1000 pts sube a Líder de Gimnasio', r.sub.length === 1 && r.sub[0].nombre === 'Líder de Gimnasio' && r.nivel === 2);
    check('cobra 1000 monedas y 4 Ultra Ball (no repite el de Entrenador)', r.dc === 1000 && r.du === 4 && r.da === 0);
    check('no se cobra dos veces', r.otra.length === 0);
    const leg = await p.evaluate(() => { const antes = Object.values(state).filter(s => s.got).length; maestro.pts = 7200; const s = cobrarRangosMaestro();
      return {n:s.map(x => x.nombre), got:Object.values(state).filter(s => s.got).length - antes, txt:s[1] && s[1].premio}; });
    check('saltando dos rangos paga los dos (' + leg.n.join(', ') + ')', leg.n.join() === 'Alto Mando,Campeón');
    check('Campeón regala una legendaria con nombre', leg.got === 1 && /legendaria.*\(.+\)$/.test(leg.txt || ''));
    check('sin errores de JS', errores.length === 0 || (console.log(errores), false));
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${ok} ok · ${fail} fallan`);
  process.exit(fail ? 1 : 0);
})();
