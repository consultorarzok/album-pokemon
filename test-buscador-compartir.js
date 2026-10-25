/* Buscador de la Pokédex y botón de WhatsApp del intercambio. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport:{width:390, height:850}});
  await ctx.route('**://n8n.consultorarz.com/**', r => {
    const u = r.request().url();
    const json = o => r.fulfill({status:200, contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body: JSON.stringify(o)});
    if(u.endsWith('/pokemon-generar-codigo')) return json({ok:true, codigo:'WHAT01'});
    return json({ok:true, top:[], jugadores:0});
  });
  await ctx.addInitScript(() => {
    if(localStorage.getItem('album-kanto-jugador')) return;
    localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Tester');
    localStorage.setItem('album-kanto-regalos', JSON.stringify(['agusg-legendaria-20260906','zeta-legendaria-prueba-20260906','zeta-legendaria-prueba2-20260906','todos-legendaria-20260906']));
    localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:900, state:{25:{got:true,dup:1}, 150:{got:true,dup:0}, 1:{got:true,dup:0}}, bolas:{}, comprasDia:{}, legendariosDia:{}, tomados:[]}));
  });
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  let abierta = null;
  await ctx.route('https://wa.me/**', r => { abierta = r.request().url(); r.fulfill({status:200, body:'ok'}); });
  await page.goto('file:///root/pokemon/index.html');await page.click('#portadaEntrar',{force:true});
  await page.waitForTimeout(1500);
  for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await page.isVisible(s)){ await page.click(s); await page.waitForTimeout(300); }

  console.log('— Buscador —');
  await page.click('#pokedexBtn'); await page.waitForTimeout(400);
  const slots = () => page.$$eval('#grid [role=listitem]', l => l.length);
  const total = await slots();
  check('sin buscar se ve la lista completa', total > 100);
  await page.fill('#buscarInput', 'pikachu'); await page.waitForTimeout(400);
  check('"pikachu" encuentra 1 (la que tengo)', (await slots()) === 1);
  await page.fill('#buscarInput', 'PÍKÁCHU'); await page.waitForTimeout(400);
  check('ignora mayúsculas y tildes', (await slots()) === 1);
  await page.fill('#buscarInput', 'celebi'); await page.waitForTimeout(400);
  check('un nombre que NO tengo no aparece (no spoilea)', (await slots()) === 0 && (await page.textContent('#grid')).includes('No encontramos'));
  await page.fill('#buscarInput', '#150'); await page.waitForTimeout(400);
  check('por número encuentra la #150 (la tengo)', (await slots()) === 1);
  await page.fill('#buscarInput', '149'); await page.waitForTimeout(400);
  check('por número encuentra también una que me falta', (await slots()) === 1);
  const rotulo = await page.getAttribute('#grid [role=listitem]', 'aria-label');
  check('la que falta sigue sin mostrar su nombre', rotulo.includes('todavía no'));
  check('el estado anuncia la cantidad', (await page.textContent('#buscarEstado')).includes('1 figurita'));
  await page.fill('#buscarInput', 'a'); await page.waitForTimeout(400);
  check('busca dentro de lo filtrado por tipo', (await slots()) >= 1);
  await page.focus('#buscarInput'); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  check('Esc borra la búsqueda y no cierra la Pokédex', (await page.inputValue('#buscarInput')) === '' && await page.isVisible('#pokedexOverlay') && (await slots()) === total);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);

  console.log('— Compartir por WhatsApp —');
  await page.click('#intercambioBtn'); await page.waitForTimeout(400);
  await page.click('#intercambioList .open-btn'); await page.waitForTimeout(900);
  check('sale la carta con el código', (await page.textContent('#codigoCardTexto')) === 'WHAT01');
  const [popup] = await Promise.all([ctx.waitForEvent('page', {timeout:4000}).catch(() => null), page.click('#codigoCardWhatsBtn')]);
  await page.waitForTimeout(800);
  const url = popup ? popup.url() : abierta;
  check('abre wa.me con el mensaje', !!url && url.startsWith('https://wa.me/?text='));
  const texto = url ? decodeURIComponent(url.split('?text=')[1]) : '';
  check('el mensaje trae el código y el nombre', texto.includes('WHAT01') && texto.includes('Pikachu'));
  check('el mensaje trae el link del juego', texto.includes('consultorarzok.github.io/album-pokemon'));
  await page.click('#codigoCardCerrarBtn'); await page.waitForTimeout(300);
  check('el código queda con botón WhatsApp en "Códigos que generaste"', await page.isVisible('#misCodigosList .btn-whats'));

  check('sin errores de JS', errores.length === 0);
  if(errores.length) console.log(errores);
  console.log(`\n${ok} ok · ${fail} fallan`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
