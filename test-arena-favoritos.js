/* Arena: buscador y favoritos al elegir equipo (hasta 6, se guardan en el celular y el equipo arranca con ellos). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport:{width:390, height:844}, hasTouch:true, isMobile:true});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(() => {
    if(sessionStorage.getItem('ya')) return; sessionStorage.setItem('ya', '1');
    localStorage.setItem('album-avatar', 'red'); localStorage.setItem('album-kanto-jugador', 'Tester');
    const st = {}; for(let i = 1; i <= 151; i++) st[i] = {got: i <= 20 || i === 25 || i === 150, dup: 0};
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st}));
  });
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force:true}); await p.waitForTimeout(1200);
  for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.tap(s); await p.waitForTimeout(250); }
  const abrir = async () => { await p.tap('#battleBtn'); await p.waitForSelector('.ar-sel'); };
  const ids = sel => p.$$eval(sel, els => els.map(e => Number(e.dataset.id)));
  const favs = () => p.evaluate(() => JSON.parse(localStorage.getItem('arena-favoritos') || '[]'));

  console.log('\n— Buscador —');
  await abrir();
  const total = (await p.$$('.ar-sel')).length;
  check('hay buscador y no hay botones de más', await p.isVisible('#arBuscar') && !(await p.$('#arFavUsar')) && !(await p.$('#arFavGuardar')));
  await p.fill('#arBuscar', 'pika');
  check('"pika" deja sólo a Pikachu', JSON.stringify(await ids('.ar-sel')) === '[25]');
  await p.fill('#arBuscar', '#4');
  check('"#4" deja sólo al número 4', JSON.stringify(await ids('.ar-sel')) === '[4]');
  await p.fill('#arBuscar', 'fuego');
  const fuego = await p.$$eval('.ar-sel', els => els.length);
  check('"fuego" filtra por tipo (' + fuego + ')', fuego > 0 && fuego < total);
  await p.fill('#arBuscar', 'zzzz');
  check('sin coincidencias avisa', await p.isVisible('.ar-vacio'));
  await p.fill('#arBuscar', '');
  check('al borrar vuelve toda la lista', (await p.$$('.ar-sel')).length === total);
  check('el buscador conserva el foco al escribir', await (async () => { await p.focus('#arBuscar'); await p.keyboard.type('pi'); return p.evaluate(() => document.activeElement && document.activeElement.id === 'arBuscar'); })());
  await p.fill('#arBuscar', '');

  console.log('\n— Favoritos —');
  check('sin favoritos viene el equipo por defecto (6)', (await p.$$('.ar-sel.on')).length === 6 && (await favs()).length === 0);
  const marcar = async n => { await p.fill('#arBuscar', '#' + n); await p.tap(`.ar-fav[data-fav="${n}"]`); await p.fill('#arBuscar', ''); };
  for(const n of [1, 4, 7, 10, 25, 150]) await marcar(n);
  check('quedan 6 favoritos guardados en el celular', JSON.stringify(await favs()) === '[1,4,7,10,25,150]');
  await marcar(12);
  check('un 7º favorito se rechaza y avisa', (await favs()).length === 6 && /Ya ten[ée]s 6/.test(await p.textContent('#arFavInfo')));
  await p.tap('.ar-sel'); await p.waitForTimeout(100);
  check('el aviso desaparece solo en la próxima acción', await p.$eval('#arFavInfo', e => e.hidden));
  const primeros = await ids('.ar-sel');
  check('los favoritos aparecen arriba en la lista', JSON.stringify(primeros.slice(0, 6).sort((a, b) => a - b)) === '[1,4,7,10,25,150]');
  check('la ★ de un favorito está encendida', await p.$eval('.ar-fav[data-fav="25"]', e => e.classList.contains('on')));

  console.log('\n— El equipo arranca con los favoritos —');
  await p.tap('#arPickCerrar'); await p.waitForTimeout(300);
  await abrir();
  const sel = await p.$$eval('.ar-sel.on', els => els.map(e => [Number(e.querySelector('.ar-n').textContent), Number(e.dataset.id)]).sort((a, b) => a[0] - b[0]).map(x => x[1]));
  check('al reabrir el equipo son los 6 favoritos, en orden', JSON.stringify(sel) === '[1,4,7,10,25,150]');
  await p.tap('.ar-sel.on'); await p.waitForTimeout(100);
  check('se puede cambiar el equipo (queda con 5)', (await p.$$('.ar-sel.on')).length === 5);
  const f0 = (await favs())[0];
  await p.fill('#arBuscar', '#' + f0); await p.tap(`.ar-fav[data-fav="${f0}"]`); await p.fill('#arBuscar', '');
  check('sacar la ★ lo borra de favoritos al instante', !(await favs()).includes(f0));
  await p.tap('#arPickGo'); await p.waitForSelector('#arStage', {timeout: 8000});
  check('con el equipo de favoritos se puede pelear', await p.isVisible('#arStage'));
  check('sin errores de JS', errores.length === 0);
  if(errores.length) console.log(errores);
  console.log(`\n${ok} ok · ${fail} fallan`);
  await browser.close(); process.exit(fail ? 1 : 0);
})();
