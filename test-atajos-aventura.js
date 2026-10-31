let chromium; try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright'))}
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:430, height:800}, hasTouch: true });
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  const page = await ctx.newPage(); const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file:///root/pokemon/index.html'); await page.click('#portadaEntrar', {force: true});
  await page.fill('#nameInput', 'TestAtajos'); await page.click('#nameSaveBtn'); await page.waitForTimeout(700);
  if(await page.isVisible('#avatarOverlay')){ await page.click('.avatar-op[data-avatar="red"]'); await page.waitForTimeout(200); }
  for(let i = 0; i < 4; i++){
    if(await page.isVisible('#specialContinueBtn')){ await page.click('#specialContinueBtn'); await page.waitForTimeout(500); }
    if(await page.isVisible('#battleCloseBtn')){ await page.click('#battleCloseBtn'); await page.waitForTimeout(300); }
  }
  console.log('\n— Pokédex y códigos desde la Aventura —');
  await page.click('#advBtn'); await page.waitForTimeout(500);
  check('los dos atajos se ven en la Aventura', await page.isVisible('#advPokedexBtn') && await page.isVisible('#advCodigosBtn'));
  const pos0 = await page.evaluate(() => ({x: advPx, y: advPy}));
  await page.click('#advPokedexBtn'); await page.waitForTimeout(300);
  const ped = await page.evaluate(() => { const o = document.getElementById('pokedexOverlay'); const r = o.getBoundingClientRect(); const el = document.elementFromPoint(r.width / 2, r.height / 2); return {visible: o.classList.contains('show'), encima: !!(el && o.contains(el)), adv: advAbierto}; });
  check('la Pokédex se abre ENCIMA de la Aventura', ped.visible && ped.encima);
  check('y la Aventura sigue abierta debajo', ped.adv);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(400); await page.keyboard.up('ArrowRight');
  const pos1 = await page.evaluate(() => ({x: advPx, y: advPy}));
  check('con la Pokédex abierta las flechas no mueven al personaje', pos1.x === pos0.x && pos1.y === pos0.y);
  await page.click('#pokedexCloseBtn'); await page.waitForTimeout(200);
  check('al cerrar la Pokédex se vuelve al mapa (sin salir de la Aventura)', await page.evaluate(() => advAbierto && !document.getElementById('pokedexOverlay').classList.contains('show')));
  await page.click('#advCodigosBtn'); await page.waitForTimeout(300);
  const cod = await page.evaluate(() => { const o = document.getElementById('intercambioOverlay'); const r = o.getBoundingClientRect(); const el = document.elementFromPoint(r.width / 2, r.height / 2); return {visible: o.classList.contains('show'), encima: !!(el && o.contains(el)), input: !!document.getElementById('canjeCodigoInput').offsetParent}; });
  check('los códigos (generar / ingresar) se abren encima de la Aventura', cod.visible && cod.encima && cod.input);
  await page.fill('#canjeCodigoInput', 'wasd12'); await page.waitForTimeout(200);
  const pos2 = await page.evaluate(() => ({x: advPx, y: advPy, v: document.getElementById('canjeCodigoInput').value}));
  check('escribir un código con letras de movimiento (w a s d) no mueve al personaje', pos2.x === pos0.x && pos2.y === pos0.y && pos2.v === 'wasd12');
  await page.click('#intercambioCloseBtn'); await page.waitForTimeout(200);
  check('al cerrar los códigos también se vuelve al mapa', await page.evaluate(() => advAbierto && !document.getElementById('intercambioOverlay').classList.contains('show')));
  await page.screenshot({path: '/tmp/claude-0/-root/b70858be-5edb-4e9c-bb87-88f6028271ef/scratchpad/atajos.png'});
  check('sin errores de JS', errores.length === 0); if(errores.length) console.log(errores);
  console.log('\n' + ok + ' ok · ' + fail + ' fallan');
  await browser.close(); process.exit(fail ? 1 : 0);
})();
