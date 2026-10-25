/* Prueba del intercambio con un servidor simulado (no toca el n8n real).
   Dos entrenadores en navegadores separados: A genera un código, B lo canjea,
   C intenta usarlo de nuevo, A intenta canjear el suyo. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }

let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };

const codigos = {};   // codigo -> {jugador, pokemonId, usado}
let seq = 0;
function servidor(route){
  const url = route.request().url();
  const body = (() => { try{ return JSON.parse(route.request().postData() || '{}'); }catch(e){ return {}; } })();
  const json = o => route.fulfill({status:200, contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body: JSON.stringify(o)});
  if(url.endsWith('/pokemon-registrar')) return json({ok:true});
  if(url.endsWith('/pokemon-generar-codigo')){
    const c = 'TEST' + (++seq).toString().padStart(2, '0');
    codigos[c] = {jugador: body.jugador, pokemonId: body.pokemonId, usado: false};
    return json({ok:true, codigo:c});
  }
  if(url.endsWith('/pokemon-canjear-codigo')){
    const r = codigos[body.codigo];
    if(!r) return json({ok:false, motivo:'no_existe'});
    if(r.jugador === body.jugador) return json({ok:false, motivo:'propio'});
    if(r.usado) return json({ok:false, motivo:'usado'});
    r.usado = true;
    return json({ok:true, pokemonId:r.pokemonId});
  }
  if(url.endsWith('/pokemon-top') || url.includes('/pokemon-evento-top')) return json({top:[], jugadores:0});
  return json({ok:true});
}

async function entrenador(browser, nombre, estado){
  const ctx = await browser.newContext({viewport:{width:820, height:1000}});
  await ctx.route('**://n8n.consultorarz.com/**', servidor);
  await ctx.addInitScript(([n, e]) => {
    if(localStorage.getItem('album-kanto-jugador')) return;   // recarga: no pisar lo guardado
    localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', n);
    localStorage.setItem('album-kanto-regalos', JSON.stringify(['agusg-legendaria-20260906','zeta-legendaria-prueba-20260906','zeta-legendaria-prueba2-20260906','todos-legendaria-20260906']));
    if(e) localStorage.setItem('album-kanto-progreso', JSON.stringify(e));
  }, [nombre, estado]);
  const page = await ctx.newPage();
  page.errores = [];
  page.on('pageerror', e => page.errores.push(e.message));
  await page.goto('file:///root/pokemon/index.html');await page.click('#portadaEntrar',{force:true});
  await page.waitForTimeout(1500);
  for(let i = 0; i < 4; i++){
    for(const s of ['#specialContinueBtn', '#battleCloseBtn'])
      if(await page.isVisible(s)){ await page.click(s); await page.waitForTimeout(300); }
  }
  return page;
}
const estadoDe = p => p.evaluate(() => JSON.parse(localStorage.getItem('album-kanto-progreso')).state);

(async () => {
  const browser = await chromium.launch();
  const base = id => ({coins:500, state:{[id]:{got:true, dup:2}}, bolas:{}, comprasDia:{}, legendariosDia:{}, tomados:[]});

  console.log('— A genera un código —');
  const A = await entrenador(browser, 'Ana', base(25));
  await A.click('#intercambioBtn'); await A.waitForTimeout(300);
  check('A ve su repetida con botón Generar', await A.isVisible('#intercambioList .open-btn'));
  await A.click('#intercambioList .open-btn'); await A.waitForTimeout(800);
  const codigo = await A.textContent('#codigoCardTexto');
  check('sale la carta con el código', /^TEST\d+$/.test(codigo));
  check('el servidor guardó el código', !!codigos[codigo]);
  await A.click('#codigoCardCerrarBtn'); await A.waitForTimeout(300);
  let sa = await estadoDe(A);
  check('a A le baja una repetida (2 → 1)', sa[25].dup === 1 && sa[25].got === true);
  check('el código queda en "Códigos que generaste"', (await A.textContent('#misCodigosList')).includes(codigo));

  console.log('— A no puede canjear su propio código —');
  await A.fill('#canjeCodigoInput', codigo); await A.click('#canjeCodigoBtn'); await A.waitForTimeout(500);
  check('avisa que es propio', (await A.textContent('#canjeCodigoFeedback')).includes('vos mismo'));
  sa = await estadoDe(A);
  check('A no recibe nada', sa[25].dup === 1);

  console.log('— B canjea —');
  const B = await entrenador(browser, 'Beto', null);
  await B.click('#intercambioBtn'); await B.waitForTimeout(300);
  await B.fill('#canjeCodigoInput', 'ZZZZZZ'); await B.click('#canjeCodigoBtn'); await B.waitForTimeout(500);
  check('código inexistente avisa', (await B.textContent('#canjeCodigoFeedback')).includes('no existe'));
  await B.fill('#canjeCodigoInput', codigo.toLowerCase());   // minúsculas: tiene que andar igual
  await B.press('#canjeCodigoInput', 'Enter'); await B.waitForTimeout(1200);
  for(let i = 0; i < 3; i++) if(await B.isVisible('#specialContinueBtn')){ await B.click('#specialContinueBtn'); await B.waitForTimeout(500); }
  const sb = await estadoDe(B);
  check('B recibe la figurita #25 como nueva', sb[25].got === true && sb[25].dup === 0);
  check('se abre la carta "Canjeaste un código"', (await B.textContent('#revealTitle')).includes('Canjeaste'));
  check('el servidor la marcó usada', codigos[codigo].usado === true);
  await B.reload();await B.click('#portadaEntrar',{force:true}); await B.waitForTimeout(1800);
  { const eb = await estadoDe(B); if(!(eb[25] && eb[25].got === true)) console.log('ESTADO B tras recargar:', JSON.stringify(eb), '| url', B.url()); check('la figurita de B sobrevive al recargar', eb[25] && eb[25].got === true); }

  console.log('— C intenta reusar el código —');
  const C = await entrenador(browser, 'Cami', null);
  await C.click('#intercambioBtn'); await C.waitForTimeout(300);
  await C.fill('#canjeCodigoInput', codigo); await C.click('#canjeCodigoBtn'); await C.waitForTimeout(500);
  check('avisa que ya se usó', (await C.textContent('#canjeCodigoFeedback')).includes('ya lo usó'));
  check('C no recibe nada', !(await estadoDe(C).catch(() => ({})))[25]?.got);

  console.log('— Sin repetidas no hay qué regalar —');
  await B.click('#intercambioBtn'); await B.waitForTimeout(300);
  check('B (sin repetidas) no ve botón Generar', !(await B.isVisible('#intercambioList .open-btn')));

  console.log('— Repetida de B suma +1 —');
  const D = await entrenador(browser, 'Dani', base(25));
  codigos.MANUAL1 = {jugador:'Ana', pokemonId:25, usado:false};
  await D.click('#intercambioBtn'); await D.waitForTimeout(300);
  await D.fill('#canjeCodigoInput', 'MANUAL1'); await D.click('#canjeCodigoBtn'); await D.waitForTimeout(1200);
  for(let i = 0; i < 3; i++) if(await D.isVisible('#specialContinueBtn')){ await D.click('#specialContinueBtn'); await D.waitForTimeout(500); }
  check('D que ya la tenía pasa de 2 a 3 repetidas', (await estadoDe(D))[25].dup === 3);

  const errs = [A, B, C, D].flatMap(p => p.errores);
  check('sin errores de JS', errs.length === 0);
  if(errs.length) console.log(errs);
  console.log(`\n${ok} ok · ${fail} fallan`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
