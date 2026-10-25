/* Arena con Pokémon de Johto: aparecen en el selector, pelean con sus tres ataques propios
   (botones con el nombre real), cargan sus sprites animados de frente y espalda y los rivales
   salen de Kanto o Johto. Con SHOTS=carpeta guarda capturas. */
let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const SHOTS = process.env.SHOTS || '';
const JOHTO = [157, 160, 248, 249, 250, 212, 197, 181];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport:{width:390, height:844}, hasTouch:true, isMobile:true});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(j => {
    localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Tester');
    const st = {}; for(let i = 1; i <= 1025; i++) st[i] = {got:j.includes(i) || i === 25, dup:0};
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st}));
  }, JOHTO);
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force:true});
  await p.waitForTimeout(1200);
  for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.tap(s); await p.waitForTimeout(250); }

  check('la tarjeta de la Arena nombra a Johto', (await p.textContent('.zona-mejor')).includes('Johto'));
  check('cuenta los de Johto para habilitar Pelear', await p.isEnabled('#battleBtn'));
  await p.evaluate(() => { window.__arenaTurbo = 3; window.__rivalIds = [152, 245, 6]; });
  await p.tap('#battleBtn'); await p.waitForSelector('.ar-sel');
  const sel = await p.evaluate(() => [...document.querySelectorAll('.ar-sel')].map(e => +e.dataset.id));
  check('el selector muestra los 8 de Johto que tengo (' + sel.length + ')', JOHTO.every(i => sel.includes(i)));
  check('título de la arena con Kanto y Johto', (await p.textContent('.ar-pick h2')).includes('Johto'));
  if(SHOTS) await p.screenshot({path:SHOTS + '/johto-pick.png'});
  await p.tap('#arPickGo');
  await p.waitForFunction(() => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, {timeout:15000});
  await p.waitForTimeout(600);
  const info = await p.evaluate(() => {
    const A = window.__arena.estado();
    const bot = k => document.querySelector('#arB-' + k + ' b').textContent;
    return {id:A.yo.act.p.id, rival:A.riv.act.p.id, botones:['corto', 'medio', 'largo'].map(bot),
      imgs:[...document.querySelectorAll('#arMon-yo img, #arMon-riv img')].map(i => ({src:i.getAttribute('src'), w:i.naturalWidth}))};
  });
  console.log('   yo', info.id, info.botones.join(' / '), '· rival', info.rival);
  check('sale primero el más fuerte de Johto (Lugia o Ho-Oh)', info.id === 249 || info.id === 250);
  const reales = await p.evaluate(([id, bot]) => { const {APRENDE, MOVS_CAT} = window.__arenaMovs; return ['corto', 'medio', 'largo'].every((a, k) => APRENDE[id][a].some(x => MOVS_CAT[x.i][0] === bot[k])); }, [info.id, info.botones]);
  check('los botones tienen ataques que ese Pokémon aprende de verdad', reales);
  check('sprites animados de espalda (yo) y de frente (rival) cargados', info.imgs.length >= 2 && info.imgs.every(i => i.w > 0 && /animated\//.test(i.src)) && info.imgs.some(i => /back\//.test(i.src)));
  if(SHOTS) await p.screenshot({path:SHOTS + '/johto-pelea.png'});

  // usar los tres ataques y cambiar de Pokémon, sin errores
  for(let i = 0; i < 40; i++){
    const s = await p.evaluate(() => { const A = window.__arena && window.__arena.estado(); return A ? {fase:A.fase, pausa:A.pausa} : null; });
    if(!s || s.fase === 'fin') break;
    if(s.pausa){ await p.evaluate(() => { const b = document.querySelector('.ar-cambio-ok, .ar-camb button, #arCambioOk'); b && b.click(); }); }
    const k = ['j', 'k', 'l'][i % 3];
    await p.keyboard.down(k); await p.waitForTimeout(k === 'l' ? 700 : 120); await p.keyboard.up(k);
    if(i === 12){ await p.keyboard.press('q'); await p.waitForTimeout(200); }
    await p.waitForTimeout(120);
  }
  const nombres = await p.evaluate(() => [...document.querySelectorAll('#arB-corto b, #arB-medio b, #arB-largo b')].map(b => b.textContent));
  check('ningún botón quedó con el ataque genérico de repuesto', !nombres.join('|').match(/^Placaje\|Rapidez\|Hiperrayo$/));
  check('sin errores de JS ' + errores.join(' | '), errores.length === 0);
  console.log(ok + ' ok, ' + fail + ' fallas');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
