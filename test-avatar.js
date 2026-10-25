// Personaje (modo sin servidor): los que ya jugaban eligen UNA vez al entrar; queda fijo y se dibuja.
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
  const entrar = async () => {
    await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force:true});
    await p.waitForTimeout(1500);
  };
  await entrar();
  check('un jugador que ya tenía cuenta ve "Elegí tu personaje"', await p.isVisible('#avatarOverlay'));
  check('avisa que no se puede cambiar', /no se puede cambiar/.test(await p.textContent('#avatarOverlay')));
  await p.screenshot({path: OUT + '/avatar-elegir.png'});
  await p.tap('.avatar-op[data-avatar="may"]'); await p.waitForTimeout(400);
  check('al elegir se cierra y queda May', !(await p.isVisible('#avatarOverlay')) && await p.evaluate(() => avatarActual === 'may' && localStorage.getItem('album-avatar') === 'may'));
  await entrar();
  check('la segunda vez ya no pregunta y sigue May', !(await p.isVisible('#avatarOverlay')) && await p.evaluate(() => avatarActual === 'may'));
  for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.tap(s); await p.waitForTimeout(300); }
  await p.tap('#advBtn'); await p.waitForTimeout(1200);
  check('en la Aventura no hay botón para cambiar', await p.locator('#advAvatarBtn').count() === 0);
  check('se dibuja el sprite de May', await p.evaluate(() => { const s = spriteJugadorCacheado('abajo', 0); return !!s && (s.width === 16 || s.width === 18); }));   // 18 con contorno; en file:// va sin contorno
  await p.screenshot({path: OUT + '/avatar-may.png'});
  check('sin errores de página', errores.length === 0); if(errores.length) console.log(errores);
  await browser.close();
  console.log(`\n${ok}/${ok + mal}`); process.exit(mal ? 1 : 0);
})();
