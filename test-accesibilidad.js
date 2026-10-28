/* Teclado, foco y lectura de la Pokédex y los paneles. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport:{width:820, height:1000}});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(() => {
    if(localStorage.getItem('album-kanto-jugador')) return;
    localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Tester');
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:900, state:{25:{got:true,dup:1}, 1:{got:true,dup:0}}, bolas:{}, comprasDia:{}, legendariosDia:{}, tomados:[]}));
  });
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  await page.goto('file:///root/pokemon/index.html');await page.click('#portadaEntrar',{force:true});
  await page.waitForTimeout(1500);
  for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await page.isVisible(s)){ await page.click(s); await page.waitForTimeout(300); }
  const activo = () => page.evaluate(() => document.activeElement.id || document.activeElement.className || document.activeElement.tagName);

  console.log('— Pokédex con teclado —');
  await page.focus('#pokedexBtn'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  check('se abre la Pokédex con Enter', await page.isVisible('#pokedexOverlay'));
  check('el foco entra al panel', await page.evaluate(() => document.getElementById('pokedexOverlay').contains(document.activeElement)));
  check('la página de atrás queda inerte', await page.evaluate(() => document.getElementById('main').hasAttribute('inert')));
  check('los filtros son botones', (await page.$$('#filters button.chip')).length > 10);
  check('las figuritas se leen con nombre', (await page.getAttribute('#grid [role=listitem]:nth-child(25)', 'aria-label')).includes('Pikachu'));
  check('una que falta se lee como pendiente', (await page.getAttribute('#grid [role=listitem]:nth-child(2)', 'aria-label')).includes('todavía no'));
  await page.focus('#filters .chip[data-valor="fire"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  check('filtrar con el teclado mantiene el foco en el chip', await page.evaluate(() => document.activeElement.dataset && document.activeElement.dataset.valor === 'fire'));
  check('el chip activo marca aria-pressed', await page.getAttribute('#filters .chip[data-valor="fire"]', 'aria-pressed') === 'true');
  check('el texto del chip activo se lee sobre su color', await page.evaluate(() => {
    const c = document.querySelector('#filters .chip.active'); return !!c.style.color; }));
  // Tab no se escapa del panel
  let afuera = false;
  for(let i = 0; i < 60; i++){ await page.keyboard.press('Tab'); if(!(await page.evaluate(() => document.getElementById('pokedexOverlay').contains(document.activeElement)))){ afuera = true; break; } }
  check('Tab no se escapa a la página de atrás', !afuera);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  check('Esc cierra la Pokédex', !(await page.isVisible('#pokedexOverlay')));
  check('el foco vuelve a "Ver Pokédex"', (await activo()) === 'pokedexBtn');
  check('la página de atrás vuelve a andar', await page.evaluate(() => !document.getElementById('main').hasAttribute('inert')));

  console.log('— Pestañas del ranking —');
  await page.focus('#tabHoy'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  check('flecha derecha pasa a Histórico', await page.getAttribute('#tabHist', 'aria-selected') === 'true' && (await activo()) === 'tabHist');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200);
  check('flecha izquierda vuelve a Hoy', await page.getAttribute('#tabHoy', 'aria-selected') === 'true');

  console.log('— Ranking sin conexión —');
  check('muestra Reintentar', await page.isVisible('#rankReintentar'));
  console.log('— Intercambio —');
  await page.click('#repetidasBtn'); await page.waitForTimeout(250);
  await page.focus('#intercambioBtn'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  check('el foco entra al panel de intercambio', await page.evaluate(() => document.getElementById('intercambioOverlay').contains(document.activeElement)));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  check('el foco vuelve a "Intercambiar"', (await activo()) === 'intercambioBtn');

  check('sin errores de JS', errores.length === 0);
  if(errores.length) console.log(errores);
  console.log(`\n${ok} ok · ${fail} fallan`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
