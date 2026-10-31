let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const SHOTS = '/tmp/claude-0/-root/b70858be-5edb-4e9c-bb87-88f6028271ef/scratchpad/';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:430, height:760}, hasTouch: true });
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  const page = await ctx.newPage(); const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file:///root/pokemon/index.html'); await page.click('#portadaEntrar', {force: true});
  await page.fill('#nameInput', 'TestClima'); await page.click('#nameSaveBtn'); await page.waitForTimeout(700);
  if(await page.isVisible('#avatarOverlay')){ await page.click('.avatar-op[data-avatar="red"]'); await page.waitForTimeout(200); }
  for(let i = 0; i < 4; i++){
    if(await page.isVisible('#specialContinueBtn')){ await page.click('#specialContinueBtn'); await page.waitForTimeout(500); }
    if(await page.isVisible('#battleCloseBtn')){ await page.click('#battleCloseBtn'); await page.waitForTimeout(300); }
  }
  console.log('\n— Clima real y día/noche —');
  const estado = () => page.evaluate(() => { const c = document.getElementById('climaCanvas'); let pix = 0; if(c && c.style.display === 'block'){ const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for(let i = 3; i < d.length; i += 4) if(d[i] > 0) pix++; } return {visible: !!c && c.style.display === 'block', pix, pe: c ? getComputedStyle(c).pointerEvents : null}; });
  const poner = (condicion, noche) => page.evaluate(([c, n]) => { CLIMA = {condicion: c, noche: n}; }, [condicion, noche]);
  await poner('despejado', false);
  await page.click('#advBtn'); await page.waitForTimeout(500);
  check('día despejado: no hay capa', !(await estado()).visible);
  for(const c of ['lluvia', 'calor', 'viento', 'niebla', 'nublado']){
    await poner(c, false); await page.waitForTimeout(350);
    const e = await estado();
    check(c + ': se dibuja la capa sobre el mapa (' + e.pix + ' px)', e.visible && e.pix > 200 && e.pe === 'none');
    await page.screenshot({path: SHOTS + 'clima_' + c + '.png'});
  }
  await poner('despejado', true); await page.waitForTimeout(350);
  const n = await estado(); check('noche: oscurece todo el mapa', n.visible && n.pix > 5000);
  await page.screenshot({path: SHOTS + 'clima_noche.png'});
  await poner('lluvia', true); await page.waitForTimeout(350);
  await page.screenshot({path: SHOTS + 'clima_noche_lluvia.png'});
  check('noche + lluvia se combinan', (await estado()).visible);
  const avisos = await page.evaluate(() => textoAvisoClima());
  check('el aviso dice qué tipos salen más con lluvia y de noche', /Agua y Eléctrico/.test(avisos) && /Fantasma y Siniestro/.test(avisos));
  await page.click('#advPokedexBtn'); await page.waitForTimeout(350);
  check('con la Pokédex abierta la capa no la tapa', !(await estado()).visible);
  await page.click('#pokedexCloseBtn'); await page.waitForTimeout(350);
  check('al volver al mapa la capa vuelve', (await estado()).visible);
  const mueve = await page.evaluate(() => { const x = advPx; advEje = {x: 1, y: 0}; return new Promise(r => setTimeout(() => { advEje = {x: 0, y: 0}; r(advPx !== x); }, 400)); });
  check('con la capa puesta se puede caminar (no tapa los toques)', mueve);
  await poner('despejado', false); await page.waitForTimeout(350);
  check('vuelve el día: la capa se va sola', !(await estado()).visible);
  const pool = await page.evaluate(() => { CLIMA = {condicion: 'lluvia', noche: false}; const p = poolBioma('hierba', 'kanto'); const t = new Set(p.map(x => x.type)); return {agua: t.has('water'), elec: t.has('electric')}; });
  check('sin servidor, la lluvia suma Agua y Eléctrico al pasto', pool.agua && pool.elec);
  check('sin errores de JS', errores.length === 0); if(errores.length) console.log(errores);
  console.log('\n' + ok + ' ok · ' + fail + ' fallan');
  await browser.close(); process.exit(fail ? 1 : 0);
})();
