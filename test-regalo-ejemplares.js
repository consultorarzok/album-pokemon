/* Regalo de ejemplares a medida (5 shiny + Mewtwo 100) para El Mostaza: llegan con la fuerza y el
   shiny exactos, se cobran una sola vez, y a otros jugadores no les llega. Servidor simulado. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const SHOTS = process.env.SHOTS || '';

(async () => {
  const browser = await chromium.launch();
  for(const [nombre, recibe] of [['El Mostaza', true], ['Tester', false]]){
    console.log('— jugador "' + nombre + '" —');
    const ctx = await browser.newContext({viewport:{width:390, height:844}});
    await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
    await ctx.route('**/PokeAPI/sprites**', r => r.abort());
    await ctx.addInitScript(n => {
      if(sessionStorage.getItem('sembrado')) return; sessionStorage.setItem('sembrado', '1');
      localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', n);
      const st = {}; for(let i = 1; i <= 151; i++) st[i] = {got:i <= 5, dup:0};
      st[150] = {got:true, dup:1, ej:[{f:30, c:'AAAA'}, {f:60, c:'BBBB'}]};   // ya tenía un Mewtwo repetido
      localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:100, state:st}));
      localStorage.setItem('album-kanto-regalos', JSON.stringify(['agusg-legendaria-20260906','zeta-legendaria-prueba-20260906','zeta-legendaria-prueba2-20260906','todos-legendaria-20260906']));
    }, nombre);
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.goto('file:///root/pokemon/index.html');await p.click('#portadaEntrar',{force:true}); await p.waitForTimeout(1800);
    const est = () => p.evaluate(() => { const o = {}; [6, 149, 130, 94, 65, 150].forEach(id => { o[id] = {got:state[id].got, dup:state[id].dup, ej:ejemplares(id).map(e => e.f + (e.s ? 's' : ''))}; }); return o; });
    const e1 = await est();
    if(recibe){
      const sh = [6, 149, 130, 94, 65].map(id => e1[id].ej.filter(x => x.endsWith('s')));
      check('llegan las 5 shiny (Charizard, Dragonite, Gyarados, Gengar, Alakazam)', sh.every(a => a.length === 1) && [6, 149, 130, 94, 65].every(id => e1[id].got));
      check('con fuerza 100 / 98 / 96 / 95 / 94', sh.map(a => a[0]).join() === '100s,98s,96s,95s,94s');
      check('el Mewtwo llega con 100 💪 y sin pisar los que ya tenía', e1[150].got && e1[150].dup === 2 && e1[150].ej.slice().sort().join() === '100,30,60');
      check('se abre la carta del regalo con ✨ Shiny', (await p.isVisible('#overlay')) && (await p.textContent('#revealTitle')).includes('regalaron') && (await p.textContent('#revealCards')).includes('✨ ¡Shiny!'));
      check('la carta muestra las 6 figuritas', (await p.$$('#revealCards .reveal-card')).length === 6 && (await p.textContent('#revealCards')).includes('💪 100'));
      if(SHOTS) await p.screenshot({path:`${SHOTS}/regalo-mostaza.png`});
      await p.reload(); await p.waitForTimeout(1500);
      const e2 = await est(); const norm = o => JSON.stringify(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, {...v, ej:v.ej.slice().sort()}])));
      check('al recargar no se regala otra vez', norm(e2) === norm(e1) && e2[6].ej.length === 1);
      check('queda guardado como regalo usado', await p.evaluate(() => JSON.parse(localStorage.getItem('album-kanto-regalos')).includes('mostaza-5shiny-mewtwo-20261022')));
    } else {
      check('otro jugador no recibe nada', !e1[6].got && !e1[149].got && e1[150].ej.length === 2);
    }
    check('sin errores de JS', errores.length === 0 || (console.log(errores), false));
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${ok} ok · ${fail} fallan`);
  process.exit(fail ? 1 : 0);
})();
