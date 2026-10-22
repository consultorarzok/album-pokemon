/* Gengar shiny blanco (arte propio en images/shiny/) y respaldo de las shiny que jsDelivr bloquea:
   1) mismo archivo desde GitHub directo, 2) versión normal. Servidor simulado. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const fs = require('fs');
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const SHOTS = process.env.SHOTS || '';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

(async () => {
  console.log('— archivos —');
  for(const f of ['arte.png', 'icono.png', 'frente.gif', 'espalda.gif']) check('existe images/shiny/gengar-' + f, fs.existsSync('/root/pokemon/images/shiny/gengar-' + f) && fs.statSync('/root/pokemon/images/shiny/gengar-' + f).size > 500);

  const browser = await chromium.launch();
  for(const [w, h] of [[390, 844], [1366, 768]]){
    console.log('— ' + w + '×' + h + ' —');
    const ctx = await browser.newContext({viewport:{width:w, height:h}});
    const raw = [];
    await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
    /* jsDelivr: las shiny de Pikachu (25) y Gyarados (130) dan 403, como las 19 reales; el resto no carga (sin internet) */
    await ctx.route('**cdn.jsdelivr.net/**', r => r.abort());
    await ctx.route('**raw.githubusercontent.com/**', r => { raw.push(r.request().url()); if(/shiny\/130\./.test(r.request().url())) return r.abort(); return r.fulfill({status:200, contentType:'image/png', body:PNG}); });
    await ctx.addInitScript(() => {
      if(sessionStorage.getItem('sembrado')) return; sessionStorage.setItem('sembrado', '1');
      localStorage.setItem('album-kanto-jugador', 'Tester');
      const st = {}; for(let i = 1; i <= 151; i++) st[i] = {got:i <= 5, dup:0};
      st[94] = {got:true, dup:0, ej:[{f:90, c:'GGGG', s:true}]};
      st[25] = {got:true, dup:0, ej:[{f:70, c:'PPPP', s:true}]};
      st[130] = {got:true, dup:0, ej:[{f:75, c:'YYYY', s:true}]};
      st[6] = {got:true, dup:0, ej:[{f:60, c:'CCCC'}]};
      localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:100, state:st}));
    });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    const pedidos = []; p.on('request', q => pedidos.push(q.url()));
    await p.goto('file:///root/pokemon/index.html'); await p.waitForTimeout(1500);
    for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.click(s); await p.waitForTimeout(250); }

    /* Pokédex */
    await p.evaluate(() => document.getElementById('pokedexBtn').click()); await p.waitForTimeout(900);
    const src = await p.$$eval('#grid .slot', ss => Object.fromEntries(ss.map(s => [s.querySelector('.num').textContent, s.querySelector('img') && s.querySelector('img').src])));
    const loaded = await p.$$eval('#grid .slot.vario img', is => Object.fromEntries(is.map(i => [i.closest('.slot').querySelector('.num').textContent, i.naturalWidth > 0])));
    check('Pokédex: Gengar shiny usa su arte blanco propio y carga', /images\/shiny\/gengar-arte\.png$/.test(src['#094']) && loaded['#094'] === true);
    check('Pokédex: Pikachu shiny (jsDelivr bloqueado) cae a GitHub directo', /raw\.githubusercontent\.com\/.*official-artwork\/shiny\/25\.png$/.test(src['#025']) && loaded['#025'] === true);
    check('Pokédex: Gyarados shiny (bloqueado en las dos fuentes) cae a la versión normal', /raw\.githubusercontent\.com\/.*official-artwork\/130\.png$/.test(src['#130']) && !src['#130'].includes('/shiny/'));
    check('Pokédex: Charizard normal no se toca', !src['#006'].includes('/shiny/') && !src['#006'].includes('raw.githubusercontent'));
    if(SHOTS) await p.screenshot({path:`${SHOTS}/gengar-pokedex-${w}.png`});
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);

    /* carta del sobre y del código */
    await p.evaluate(() => { document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); showReveal([{p:DATA.find(d => d.id === 94), isNew:true}], 'Prueba'); });
    await p.waitForTimeout(500);
    const rv = await p.$eval('#revealCards img', i => ({src:i.src, ok:i.naturalWidth > 0}));
    check('carta del sobre: Gengar blanco propio', /images\/shiny\/gengar-arte\.png$/.test(rv.src) && rv.ok);
    if(SHOTS) await p.screenshot({path:`${SHOTS}/gengar-carta-${w}.png`});
    await p.evaluate(() => { document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); mostrarCartaCodigo(94, 'ABCDEFG', 90, true); });
    await p.waitForTimeout(500);
    check('carta del código: Gengar blanco propio', /images\/shiny\/gengar-arte\.png$/.test(await p.getAttribute('#codigoCardImg', 'src')));
    await p.evaluate(() => { document.querySelectorAll('.overlay.show, .special-overlay.show').forEach(o => o.classList.remove('show')); });

    /* arena: Gengar primero */
    await p.evaluate(() => document.getElementById('battleBtn').click()); await p.waitForSelector('.ar-sel');
    const ic = await p.$$eval('.ar-sel', bs => bs.map(b => ({t:b.textContent, src:b.querySelector('img').src})).find(x => x.t.includes('Gengar')));
    check('selector del equipo: ícono blanco propio de Gengar con ✨', ic && ic.t.includes('✨') && /images\/shiny\/gengar-icono\.png$/.test(ic.src));
    await p.evaluate(() => { let b; while((b = document.querySelector('.ar-sel.on'))) b.click(); });
    for(const n of ['Gengar', 'Charizard', 'Gyarados']) await p.evaluate(nombre => [...document.querySelectorAll('.ar-sel')].find(b => b.textContent.includes(nombre)).click(), n);
    await p.click('#arPickGo');
    await p.waitForFunction(() => window.__arena && window.__arena.estado().fase === 'lucha', null, {timeout:15000});
    await p.waitForTimeout(700);
    const ar = await p.evaluate(() => { const E = window.__arena.ent(); return {n:E.yo.mon.p.name, f:E.yo.imgs.frente.src, b:E.yo.imgs.espalda.src, ok:E.yo.imgs.frente.naturalWidth > 0 || E.yo.imgs.espalda.naturalWidth > 0}; });
    check('en la arena Gengar usa sus sprites animados blancos (frente y espalda)', ar.n === 'Gengar' && /images\/shiny\/gengar-(frente|espalda)\.gif$/.test(ar.f) && /images\/shiny\/gengar-(frente|espalda)\.gif$/.test(ar.b) && ar.ok);
    if(SHOTS) await p.screenshot({path:`${SHOTS}/gengar-arena-${w}.png`});
    check('Gengar nunca pidió sus sprites shiny a internet', !pedidos.some(u => /\/shiny\/94\./.test(u) || /animated\/(back\/)?shiny\/94/.test(u)));
    check('sin errores de JS', errores.length === 0 || (console.log(errores), false));
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${ok} ok · ${fail} fallan`);
  process.exit(fail ? 1 : 0);
})();
