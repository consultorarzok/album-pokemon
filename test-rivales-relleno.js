/* Jugadores de relleno (22/11): buscan batalla (⚔️), tocar el ⚔️ abre la Arena con SU nombre y se arma el rival del juego. Sin servidor. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, mal = 0;
const check = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ✔ ' : '  ✘ ') + n); };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(() => {
    localStorage.setItem('album-central-test', '1'); localStorage.setItem('album-tour-test', '1'); localStorage.setItem('album-tour-aventura', '1');
    localStorage.setItem('album-avatar', 'red'); localStorage.setItem('album-kanto-jugador', 'Tester');
    const st = {}; for(let i = 1; i <= 151; i++) st[i] = {got: i <= 14 || i === 25 || i === 150, dup: 0};
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins: 300, state: st}));
  });
  const p = await ctx.newPage(); const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.waitForTimeout(500);
  await p.click('#portadaEntrar', {force: true}); await p.waitForTimeout(1500);
  for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#revealCloseBtn']) if(await p.isVisible(s)){ await p.tap(s).catch(() => {}); await p.waitForTimeout(250); }
  check('Aventura abierta', await p.evaluate(() => advAbierto));
  // buscar un instante en que algún relleno esté parado buscando batalla (se adelanta el reloj)
  const hallado = await p.evaluate(() => {
    const real = Date.now; const base = real();
    for(let off = 0; off < 40 * 60e3; off += 7e3){
      Date.now = () => base + off;
      for(const k in MUNDO.busca) delete MUNDO.busca[k];
      falsosMover(performance.now());
      const ids = Object.keys(MUNDO.busca).map(Number).filter(i => i <= -500 && i > -600);
      if(ids.length){ window.__off = off; return {off, id: ids[0], n: MUNDO.otros[ids[0]].n}; }
    }
    Date.now = real; return null;
  });
  check('algún relleno busca batalla', !!hallado); console.log('   ', JSON.stringify(hallado));
  await p.evaluate(id => batallaFalso(id), hallado.id);
  await p.waitForSelector('.ar-sel', {timeout: 5000}).catch(() => {});
  check('se abre la Arena para elegir equipo', await p.evaluate(() => arenaAbierta()));
  check('queda anotado su nombre', await p.evaluate(() => !!(window.__rivalFalso && window.__rivalFalso.n)));
  await p.tap('#arPickGo'); await p.waitForTimeout(2500);
  const nom = await p.evaluate(() => { const h = document.querySelector('#arRoot .ar-hud, #arRoot [id^="arHud"], .ar-hud'); return h ? h.textContent : document.getElementById('arRoot').innerText.slice(0, 400); });
  check('el rival lleva el nombre del relleno (' + nom + ')', nom.includes(hallado.n));
  check('la marca se gastó', await p.evaluate(() => window.__rivalFalso === null));
  check('después de pelear no busca por 3 min', await p.evaluate(id => { falsosMover(performance.now()); return !MUNDO.busca[id]; }, hallado.id));
  check('sin errores de página', errores.length === 0); if(errores.length) console.log(errores);
  await browser.close(); console.log(ok + ' bien, ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
