/* Ejemplares únicos: cada figurita tiene su fuerza y número de serie, no se vuelven a sortear
   al recargar, en el intercambio se elige cuál dar (viaja con su fuerza) y la arena usa el
   más fuerte. Servidor simulado. Con SHOTS=carpeta guarda capturas. */
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
    const generados = [];
    await ctx.route('**://n8n.consultorarz.com/**', r => {
      const u = r.request().url();
      if(u.includes('pokemon-generar-codigo')){ generados.push(JSON.parse(r.request().postData())); return r.fulfill({status:200, body:'{"ok":true,"codigo":"ABCDEFG"}'}); }
      if(u.includes('pokemon-canjear-codigo')) return r.fulfill({status:200, body:'{"ok":true,"pokemonId":20,"fuerza":93}'});
      return r.abort();
    });
    await ctx.addInitScript(() => {
      if(sessionStorage.getItem('sembrado')) return;
      sessionStorage.setItem('sembrado', '1');
      localStorage.setItem('album-kanto-jugador', 'Tester');
      const st = {}; for(let i = 1; i <= 151; i++) st[i] = {got:i <= 14, dup:0};
      st[1].dup = 3;                                                     // Bulbasaur sin fuerzas todavía (jugador de antes)
      st[4] = {got:true, dup:2, ej:[{f:12, c:'AAAA'}, {f:95, c:'BBBB'}, {f:50, c:'CCCC'}]};
      localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st}));
    });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    const entrar = async () => {
      await p.waitForTimeout(1200);
      for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.click(s); await p.waitForTimeout(250); }
    };
    await p.goto('file:///root/pokemon/index.html'); await entrar();

    const a = await p.evaluate(() => { saveProgress(); return ejemplares(1).map(e => e.f + e.c); });
    check('a las figuritas viejas se les sortea fuerza (4 ejemplares)', a.length === 4);
    await p.reload(); await entrar();
    const b = await p.evaluate(() => ejemplares(1).map(e => e.f + e.c));
    check('al recargar no se vuelven a sortear', JSON.stringify(a) === JSON.stringify(b));
    check('el mejor ejemplar de Charmander es el de 95', await p.evaluate(() => mejorEjemplar(4).f === 95));

    await p.evaluate(() => abrirIntercambio()); await p.waitForTimeout(300);
    const chips = await p.$$eval('.ej-fila', fs => fs.map(f => f.textContent.replace(/\s+/g, ' ')));
    const charm = chips.find(t => t.includes('Charmander')) || '';
    check('el intercambio lista cada ejemplar con su fuerza', charm.includes('95') && charm.includes('12') && charm.includes('50') && charm.includes('BBBB'));
    check('el más fuerte figura como el de la Arena', /95\s*N\.º BBBB · ⭐ Arena/.test(charm));
    check('viene marcado el más débil', await p.evaluate(() => { const f = [...document.querySelectorAll('.ej-fila')].find(x => x.textContent.includes('Charmander'));
      return f.querySelector('.ej-chip.on').dataset.c === 'AAAA'; }));
    if(SHOTS) await p.locator('#intercambioOverlay .panel, #intercambioOverlay > *').first().screenshot({path:`${SHOTS}/intercambio-${w}.png`});
    /* elijo dar el de 50 */
    await p.evaluate(() => { const f = [...document.querySelectorAll('.ej-fila')].find(x => x.textContent.includes('Charmander'));
      f.querySelector('.ej-chip[data-c="CCCC"]').click(); f.querySelector('.open-btn').click(); });
    await p.waitForTimeout(600);
    check('manda la fuerza del ejemplar elegido', generados.some(g => g.pokemonId === 4 && g.fuerza === 50));
    const quedan = await p.evaluate(() => ({c:ejemplares(4).map(e => e.c).sort().join(), dup:state[4].dup}));
    check('se va ESE ejemplar y quedan los otros dos', quedan.c === 'AAAA,BBBB' && quedan.dup === 1);
    for(const s of ['#codigoCardOverlay.show button', '#specialContinueBtn']) if(await p.isVisible(s)) await p.click(s);

    await p.evaluate(() => { document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); abrirIntercambio();
      document.getElementById('canjeCodigoInput').value = 'XYZ1234'; canjearCodigoInput(); });
    await p.waitForTimeout(800);
    const sq = await p.evaluate(() => ({got:state[20].got, ej:ejemplares(20).map(e => e.f)}));
    check('el canjeado llega con su fuerza (93)', sq.got && sq.ej.length === 1 && sq.ej[0] === 93);
    const rv = await p.textContent('#revealCards').catch(() => '');
    check('la carta del canje muestra la fuerza', rv.includes('💪 93'));
    if(SHOTS && await p.isVisible('#overlay')) await p.locator('#revealCards').screenshot({path:`${SHOTS}/reveal-${w}.png`});

    await p.evaluate(() => document.querySelectorAll('.overlay.show, .special-overlay.show').forEach(o => o.classList.remove('show')));
    await p.evaluate(() => document.getElementById('battleBtn').click()); await p.waitForSelector('.ar-sel');
    const sel = await p.$$eval('.ar-sel', bs => bs.map(b => b.textContent.replace(/\s+/g, ' ')));
    check('al elegir equipo se ve la fuerza de tu mejor ejemplar (Charmander 💪95)', sel.some(t => t.includes('Charmander') && t.includes('💪95')));
    if(SHOTS) await p.screenshot({path:`${SHOTS}/pick-fuerza-${w}.png`});
    const canje = await p.evaluate(() => { state[1].dup = 3; ejemplares(1); state[1].ej[0].f = 99; state[1].dup = 1; return ejemplares(1).map(e => e.f); });
    check('si se canjean repetidas se pierden las más débiles', canje.length === 2 && canje.includes(99));
    check('sin scroll horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check('sin errores de JS', errores.length === 0 || (console.log(errores), false));
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${ok} ok · ${fail} fallan`);
  process.exit(fail ? 1 : 0);
})();
