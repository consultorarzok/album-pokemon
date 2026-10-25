// Botón "Personaje" en la Aventura: cambia Red <-> May, se recuerda en el celular.
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, mal = 0;
const check = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ✔ ' : '  ✘ ') + n); };
const OUT = process.env.SHOTS || '/tmp';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport:{width:390, height:844}, hasTouch:true, isMobile:true, deviceScaleFactor:2});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(() => {
    if(localStorage.getItem('album-kanto-jugador')) return;
    localStorage.setItem('album-kanto-jugador', 'Tester');
    localStorage.setItem('album-kanto-regalos', JSON.stringify(['agusg-legendaria-20260906','zeta-legendaria-prueba-20260906','zeta-legendaria-prueba2-20260906','todos-legendaria-20260906']));
  });
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  let primera = true;
  const abrir = async () => {
    await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force:true});
    await p.waitForTimeout(1500);
    if(primera){
      primera = false;
      check('un jugador que ya tenía cuenta ve "Elegí tu personaje"', await p.isVisible('#avatarOverlay'));
      await p.screenshot({path: OUT + '/avatar-elegir.png'});
      await p.tap('.avatar-op[data-avatar="red"]'); await p.waitForTimeout(300);
      check('al elegir se cierra y queda guardado', !(await p.isVisible('#avatarOverlay')) && await p.evaluate(() => localStorage.getItem('album-avatar') === 'red'));
    }else{
      check('la segunda vez ya no pregunta', !(await p.isVisible('#avatarOverlay')));
    }
    for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.tap(s); await p.waitForTimeout(300); }
    await p.tap('#advBtn'); await p.waitForTimeout(1200);
  };
  await abrir();
  check('arranca con Red', await p.evaluate(() => avatarActual === 'red' && RED_SHEET.src.endsWith('red_walk.png')));
  await p.screenshot({path: OUT + '/avatar-red.png'});
  check('el botón Personaje se ve', await p.isVisible('#advAvatarBtn'));
  await p.tap('#advAvatarBtn'); await p.waitForTimeout(600);
  check('al tocarlo pasa a May', await p.evaluate(() => avatarActual === 'may' && RED_SHEET.complete && RED_SHEET.src.endsWith('may_walk.png')));
  check('se dibuja el sprite de May', await p.evaluate(() => !!spriteJugadorCacheado('abajo', 0)));
  await p.screenshot({path: OUT + '/avatar-may.png'});
  const solapa = await p.evaluate(() => {
    const a = document.getElementById('advAvatarBtn').getBoundingClientRect();
    return [...document.querySelectorAll('#advCloseBtn, .adv-hud, #advMini, #advZona')].some(el => {
      const b = el.getBoundingClientRect(); if(!b.width) return false;
      return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    });
  });
  check('el botón no se pisa con Atrás, monedas ni minimapa', !solapa);
  await abrir();
  check('al volver a entrar sigue May', await p.evaluate(() => avatarActual === 'may'));
  await p.tap('#advAvatarBtn'); await p.waitForTimeout(400);
  check('tocando de nuevo vuelve a Red', await p.evaluate(() => avatarActual === 'red' && localStorage.getItem('album-avatar') === 'red'));
  check('sin errores de página', errores.length === 0); if(errores.length) console.log(errores);
  await browser.close();
  console.log(`\n${ok}/${ok + mal}`); process.exit(mal ? 1 : 0);
})();
