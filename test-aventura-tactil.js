/* Aventura con el dedo: joystick, cancelación, encuentros y paneles en
   celular y tablet, parado y acostado. Usa eventos táctiles reales (CDP). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };

const TAMANOS = [['celular parado', 390, 844], ['celular acostado', 844, 390], ['celular chico acostado', 667, 375], ['tablet parada', 820, 1180], ['tablet acostada', 1180, 820]];

(async () => {
  const browser = await chromium.launch();
  for(const [nombre, w, h] of TAMANOS){
    console.log('— ' + nombre + ' (' + w + '×' + h + ') —');
    const ctx = await browser.newContext({viewport:{width:w, height:h}, hasTouch:true, isMobile:true});
    await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
    await ctx.addInitScript(() => {
      if(localStorage.getItem('album-kanto-jugador')) return;
      localStorage.setItem('album-avatar','red'); localStorage.setItem('album-kanto-jugador', 'Tester');
      localStorage.setItem('album-kanto-regalos', JSON.stringify(['agusg-legendaria-20260906','zeta-legendaria-prueba-20260906','zeta-legendaria-prueba2-20260906','todos-legendaria-20260906']));
    });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.goto('file:///root/pokemon/index.html');await p.click('#portadaEntrar',{force:true});
    await p.waitForTimeout(1500);
    for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await p.tap(s); await p.waitForTimeout(300); }
    await p.tap('#advBtn'); await p.waitForTimeout(1200);
    const cdp = await ctx.newCDPSession(p);
    const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints:(type === 'touchEnd' || type === 'touchCancel') ? [] : [{x, y, id:1}]});
    const st = await p.evaluate(() => { const r = document.getElementById('advStick').getBoundingClientRect(); return {cx:r.left + r.width/2, cy:r.top + r.height/2}; });
    const pos = () => p.evaluate(() => [Math.round(advPx), Math.round(advPy)]);
    const estado = () => p.evaluate(() => ({x:advEje.x, y:advEje.y, activo:stickActivo}));

    const antes = await pos();
    await tp('touchStart', st.cx, st.cy); await tp('touchMove', st.cx + 45, st.cy); await p.waitForTimeout(900);
    const durante = await pos();
    check('arrastrar el joystick mueve al entrenador', durante[0] > antes[0]);
    await tp('touchEnd'); await p.waitForTimeout(300);
    const t1 = await pos(); await p.waitForTimeout(400);
    check('al soltar se frena', (await pos())[0] === t1[0] && !(await estado()).activo);
    await tp('touchStart', st.cx, st.cy); await tp('touchMove', st.cx, st.cy + 45); await p.waitForTimeout(250);
    await tp('touchCancel'); await p.waitForTimeout(250);
    const c = await estado();
    check('un toque cancelado no deja el joystick trabado', !c.activo && c.x === 0 && c.y === 0);

    await tp('touchStart', st.cx, st.cy); await tp('touchMove', st.cx - 45, st.cy); await p.waitForTimeout(250);
    await p.evaluate(() => iniciarEncuentro(ADV_DATA.find(x => x.name === 'Charizard') || ADV_DATA[5]));
    await p.waitForTimeout(500);
    const e1 = await pos(); await p.waitForTimeout(600);
    check('durante un encuentro no camina solo', JSON.stringify(e1) === JSON.stringify(await pos()));
    await tp('touchEnd');
    const caja = await p.evaluate(() => {
      const panel = document.querySelector('#encOverlay .reveal-panel'), r = panel.getBoundingClientRect();
      const t = document.getElementById('encTitle').getBoundingClientRect();
      const img = document.getElementById('encImg').getBoundingClientRect();
      return {panelTop:r.top, panelBottom:r.bottom, vh:innerHeight, tituloArriba:t.top - r.top, imgArriba:img.top - r.top, scroll:panel.scrollTop};
    });
    check('el panel del encuentro no se sale de la pantalla', caja.panelTop >= -1 && caja.panelBottom <= caja.vh + 1);
    check('el título y la imagen arrancan visibles (no cortados arriba)', caja.tituloArriba >= 0 && caja.imgArriba >= 0 && caja.scroll === 0);
    await p.evaluate(() => document.querySelector('#encOverlay .reveal-panel').scrollTo(0, 9999));
    check('"Huir" se alcanza (visible o scrolleando)', await p.evaluate(() => { const b = document.getElementById('encCloseBtn').getBoundingClientRect(); return b.bottom <= innerHeight + 1 && b.top >= 0; }));
    await p.evaluate(() => cerrarEncuentro());
    await p.evaluate(() => abrirTienda()); await p.waitForTimeout(400);
    check('el Centro Pokémon abre con el título a la vista', await p.evaluate(() => { const r = document.querySelector('#shopOverlay h2').getBoundingClientRect(); return r.top >= 0; }));
    await p.evaluate(() => document.getElementById('shopOverlay').classList.remove('show'));
    await p.evaluate(() => mostrarCartaCodigo(25, 'ABC123')); await p.waitForTimeout(1600);
    check('la carta del código entra en la pantalla', await p.evaluate(() => {
      const rs = ['codigoCardWrap', 'codigoCardCopiarBtn', 'codigoCardCerrarBtn'].map(i => document.getElementById(i).getBoundingClientRect());
      return rs.every(r => r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1); }));
    await p.evaluate(() => document.getElementById('codigoCardOverlay').classList.remove('show'));
    check('el botón Atrás se toca bien (≥44 px)', await p.evaluate(() => document.querySelector('.adv-back').getBoundingClientRect().height >= 43));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    check('Esc sale de la aventura', !(await p.isVisible('#advOverlay')));
    check('sin errores de JS', errores.length === 0);
    await ctx.close();
  }
  console.log(`\n${ok} ok · ${fail} fallan`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
