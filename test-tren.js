let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:900, height:700} });
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  await page.goto('file:///root/pokemon/index.html'); await page.click('#portadaEntrar', {force:true});
  await page.fill('#nameInput', 'TestTren'); await page.click('#nameSaveBtn'); await page.waitForTimeout(700);
  if(await page.isVisible('#avatarOverlay')){ await page.click('.avatar-op[data-avatar="red"]'); await page.waitForTimeout(200); }
  for(let i = 0; i < 4; i++){
    if(await page.isVisible('#specialContinueBtn')){ await page.click('#specialContinueBtn'); await page.waitForTimeout(500); }
    if(await page.isVisible('#battleCloseBtn')){ await page.click('#battleCloseBtn'); await page.waitForTimeout(300); }
  }
  await page.click('#advBtn'); await page.waitForTimeout(600);
  console.log('\n— Tren Solar —');
  const t = await page.evaluate(() => {
    const r = {};
    for(let t = 0; t < TREN_CICLO; t += 50){ const e = trenEstado(t); if(r.sale === undefined && e.parado && e.x === 134 && e.dir > 0) r.sale = t; if(r.llega === undefined && e.parado && e.x === 188 && e.dir > 0) r.llega = t; }
    return r;
  });
  check('el tren para en Purmamarca y en Humahuaca', t.sale !== undefined && t.llega !== undefined);
  const fijar = (tt, x, y) => page.evaluate(([tt, x, y]) => { Date.now = () => tt; advPonerEn(x, y); advEje = {x:0, y:0}; }, [tt, x, y]);
  // lejos de la estación no hay botón
  await fijar(t.sale + 1000, 120, 42); await page.waitForTimeout(300);
  check('lejos de la estación no se ofrece subir', await page.evaluate(() => document.getElementById('advTrenBtn').hidden));
  // cerca con el tren parado: botón Subir
  await fijar(t.sale + 1000, 134, 42); await page.waitForTimeout(300);
  check('con el tren parado y cerca de la vía aparece "Subir"', await page.evaluate(() => !document.getElementById('advTrenBtn').hidden && /Subir/.test(document.getElementById('advTrenBtn').textContent)));
  await page.click('#advTrenBtn'); await page.waitForTimeout(200);
  check('al tocar, el jugador sube al tren', await page.evaluate(() => advTrenAbordo === true));
  // viaja: a mitad de camino entre Purmamarca y Humahuaca está en marcha, en la Alta Quebrada o en el borde
  const tramo = t.sale + 8000 + 1000; // ya salió
  await page.evaluate(([tt]) => { Date.now = () => tt; }, [t.sale + 9000]); await page.waitForTimeout(300);
  const mov = await page.evaluate(() => ({x: advX, y: advY, reg: advRegion, txt: document.getElementById('advTrenBtn').textContent}));
  check('mientras viaja avanza con el tren (x>134)', mov.x > 134);
  check('el botón muestra que está viajando', /Viajando/.test(mov.txt));
  await page.evaluate(() => { advEje = {x: -1, y: 0}; }); await page.waitForTimeout(300);
  check('arriba del tren no se camina', await page.evaluate(() => Math.abs(advX - Math.floor(trenEstado(Date.now()).x)) <= 1));
  // llega a Humahuaca y baja
  await page.evaluate(([tt]) => { Date.now = () => tt; }, [t.llega + 1000]); await page.waitForTimeout(300);
  const lleg = await page.evaluate(() => ({reg: advRegion, txt: document.getElementById('advTrenBtn').textContent}));
  check('llegó a la Alta Quebrada (región cambió)', lleg.reg === 'hoenn' || lleg.reg === 'sinnoh');
  check('en la parada ofrece "Bajar"', /Bajar/.test(lleg.txt));
  await page.click('#advTrenBtn'); await page.waitForTimeout(300);
  const baj = await page.evaluate(() => ({a: advTrenAbordo, y: advY, x: advX}));
  check('bajó y quedó caminando junto a la vía', baj.a === false && baj.y === 42 && Math.abs(baj.x - 188) <= 1);
  // en marcha no se puede subir
  await fijar(t.sale + 9000, 150, 42); await page.waitForTimeout(300);
  check('con el tren en marcha no se ofrece subir', await page.evaluate(() => document.getElementById('advTrenBtn').hidden));
  check('sin errores de JS', errores.length === 0);
  if(errores.length) console.log(errores);
  console.log(`\n${ok} ok · ${fail} fallan`);
  await browser.close(); process.exit(fail ? 1 : 0);
})();
