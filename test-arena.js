/* Arena de batalla en tiempo real: elegir equipo, pelear una batalla entera con teclado
   (mover, corto, medio, largo, esquivar, cambiar), joystick táctil, y que el escenario se
   adapte a celular parado/acostado, tablet y compu. Con SHOTS=carpeta guarda capturas. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, fail = 0;
const check = (n, c) => { if(c){ ok++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const SHOTS = process.env.SHOTS || '';
/* [nombre, ancho, alto, táctil] */
const TAMANOS = [['celular parado', 390, 844, true], ['celular acostado', 844, 390, true], ['tablet parada', 820, 1180, true],
                 ['compu', 1366, 768, false], ['ancho medio', 600, 900, true]];

(async () => {
  const browser = await chromium.launch();
  for(const [nombre, w, h, tactil] of TAMANOS.filter(t => !process.env.SOLO || t[0].includes(process.env.SOLO))){
    console.log('— ' + nombre + ' (' + w + '×' + h + ') —');
    const ctx = await browser.newContext({viewport:{width:w, height:h}, hasTouch:tactil, isMobile:tactil && w < 900});
    await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
    await ctx.addInitScript(() => {
      localStorage.setItem('album-kanto-jugador', 'Tester');
      const st = {}; for(let i = 1; i <= 151; i++) st[i] = {got:i <= 14 || i === 25 || i === 150, dup:0};
      localStorage.setItem('album-kanto-progreso', JSON.stringify({coins:300, state:st}));
    });
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.goto('file:///root/pokemon/index.html');
    await p.waitForTimeout(1200);
    for(let i = 0; i < 4; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn']) if(await p.isVisible(s)){ await (tactil ? p.tap(s) : p.click(s)); await p.waitForTimeout(250); }
    const tocar = s => tactil ? p.tap(s) : p.click(s);

    check('el botón Pelear está habilitado', await p.isEnabled('#battleBtn'));
    await p.evaluate(() => { window.__arenaTurbo = 3; });
    await tocar('#battleBtn');
    await p.waitForSelector('.ar-sel');
    check('selector de equipo con los Kanto que tengo', (await p.$$('.ar-sel')).length === await p.evaluate(() => kantoMios().length));
    check('viene preseleccionado un equipo de 6', (await p.$$('.ar-sel.on')).length === 6);
    check('cada Pokémon muestra su crítico', (await p.textContent('.ar-sel')).includes('Crít.'));
    if(SHOTS) await p.screenshot({path:`${SHOTS}/pick-${w}.png`});
    const antes = await p.evaluate(() => Number(document.getElementById('coinAmount').textContent));
    await tocar('#arPickGo');
    await p.waitForSelector('#arStage');
    await p.waitForFunction(() => window.__arena && window.__arena.estado() && window.__arena.estado().fase === 'lucha', null, {timeout:15000});
    await p.waitForTimeout(500);
    if(SHOTS) await p.screenshot({path:`${SHOTS}/inicio-${w}.png`});

    const geo = await p.evaluate(() => {
      const s = document.getElementById('arStage').getBoundingClientRect(), r = sel => document.querySelector(sel).getBoundingClientRect();
      const dentro = sel => { const q = r(sel); return q.left >= s.left - 1 && q.right <= s.right + 1 && q.top >= s.top - 1 && q.bottom <= s.bottom + 1; };
      const cv = document.getElementById('arBg');
      const c = r('#arCtrl'), b = r('.ar-btns');
      return {hudY:dentro('#arHud-yo'), hudR:dentro('#arHud-riv'), mon:dentro('#arMon-yo .ar-spr.vis'), rival:dentro('#arMon-riv .ar-spr.vis'),
        canvas:Math.abs(cv.getBoundingClientRect().width - s.width) < 1 && cv.width > 40, stageW:s.width, stageH:s.height,
        botones:b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1 && b.left >= 0, vh:innerHeight};
    });
    check('HUD de los dos dentro del escenario', geo.hudY && geo.hudR);
    check('los dos Pokémon dentro del escenario', geo.mon && geo.rival);
    check('el fondo en píxeles ocupa todo el escenario', geo.canvas);
    check('los botones entran en pantalla', geo.botones);
    check('el escenario es grande (' + Math.round(geo.stageW) + '×' + Math.round(geo.stageH) + ')', geo.stageW >= w - 1 && geo.stageH >= geo.vh * .45);

    if(tactil){
      const j = await p.evaluate(() => {
        const joy = document.getElementById('arJoy'), r = joy.querySelector('.base').getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        joy.dispatchEvent(new PointerEvent('pointerdown', {pointerId:7, clientX:cx + r.width * .4, clientY:cy, bubbles:true}));
        const a = window.__arena.estado().joy.x;
        joy.dispatchEvent(new PointerEvent('pointerup', {pointerId:7, clientX:cx, clientY:cy, bubbles:true}));
        return {a, b:window.__arena.estado().joy.x};
      });
      check('el joystick manda dirección y vuelve a cero', j.a > .6 && j.b === 0);
    }

    /* registrar qué hizo el jugador y el rival */
    await p.evaluate(() => {
      window.__vistos = new Set(); window.__hpMin = {yo:1, riv:1}; window.__crit = 0;
      setInterval(() => {
        const a = window.__arena; if(!a) return;
        const e = a.ent(), s = a.estado(); if(!e.yo || !e.yo.mon) return;
        if(e.yo.accion) window.__vistos.add(e.yo.accion.tipo);
        if(s.proys.length) window.__vistos.add('proyectil');
        if(e.riv.accion) window.__vistos.add('riv-' + e.riv.accion.tipo);
        window.__hpMin.riv = Math.min(window.__hpMin.riv, s.riv.mons.reduce((t, m) => t + m.hp, 0) / s.riv.mons.reduce((t, m) => t + m.max, 0));
        window.__hpMin.yo = Math.min(window.__hpMin.yo, s.yo.mons.reduce((t, m) => t + m.hp, 0) / s.yo.mons.reduce((t, m) => t + m.max, 0));
      }, 16);
      new MutationObserver(m => m.forEach(x => x.addedNodes.forEach(n => { if(n.textContent && n.textContent.includes('CRÍTICO')) window.__crit++; })))
        .observe(document.getElementById('arFx'), {childList:true});
    });

    let cambio = false, resize = false, largoFoto = false, miLargoFoto = false, i = 0;
    const t0 = Date.now();
    const hold = new Set();
    const tecla = async (k, down) => { if(down && !hold.has(k)){ hold.add(k); await p.keyboard.down(k); } if(!down && hold.has(k)){ hold.delete(k); await p.keyboard.up(k); } };
    while(Date.now() - t0 < 150000){
      if(await p.isVisible('#arOtra')) break;
      const s = await p.evaluate(() => {
        const a = window.__arena; if(!a) return null;
        const S = a.estado(), e = a.ent(); if(!S || !e.yo.mon) return null;
        const eq = document.getElementById('arEquipo');
        return {fase:S.fase, pausa:S.pausa, dx:e.riv.x - e.yo.x, dy:e.riv.y - e.yo.y, accRiv:e.riv.accion && e.riv.accion.tipo, accYo:e.yo.accion && e.yo.accion.tipo,
          tLargo:e.riv.accion && e.riv.accion.tipo === 'largo' ? e.riv.accion.t : 0, equipo:!eq.hidden, cambioCd:S.cambioCd, hpYo:e.yo.mon.hp / e.yo.mon.max};
      });
      if(!s){ await p.waitForTimeout(50); continue; }
      if(s.equipo){
        for(const k of [...hold]) await tecla(k, false);
        const c = await p.$('#arEquipo [data-i]:not([disabled])'); if(c) await c.click();
        await p.waitForTimeout(100); continue;
      }
      if(SHOTS && w === 390 && s.tLargo > .35 && !largoFoto){ largoFoto = true; await p.screenshot({path:`${SHOTS}/rival-largo-${w}.png`}); }
      if(SHOTS && w === 390 && s.accYo === 'largo' && !miLargoFoto){ miLargoFoto = true; await p.screenshot({path:`${SHOTS}/largo-${w}.png`}); }
      if(!resize && i > 40){ resize = true; await p.setViewportSize({width:w === 390 ? 420 : w - 40, height:h - 30}); await p.waitForTimeout(300);
        const ok2 = await p.evaluate(() => { const st = document.getElementById('arStage'), cv = document.getElementById('arBg'); return Math.abs(cv.offsetWidth - st.clientWidth) < 1 && Math.abs(cv.offsetHeight - st.clientHeight) < 1 && cv.width >= Math.floor(st.clientWidth / 4); });
        check('al cambiar el tamaño de la ventana el fondo se rehace a la medida', ok2);
      }
      if(i >= 60 && !cambio && s.fase === 'lucha' && !s.pausa && s.cambioCd === 0 && !s.accYo){ cambio = true; await p.keyboard.press('q'); await p.waitForTimeout(150); continue; }
      /* mover: acercarse hasta quedar a tiro y orbitar un poco */
      const d = Math.hypot(s.dx * 1.0, s.dy * .8);
      const ax = d > .45 ? Math.sign(s.dx) : (i % 40 < 20 ? 0 : -Math.sign(s.dx) * .5);
      await tecla('d', s.dx > .12 && ax > 0); await tecla('a', s.dx < -.12 && ax > 0);
      await tecla('s', s.dy > .12 && ax > 0); await tecla('w', s.dy < -.12 && ax > 0);
      const turno = i % 10;
      const accion = turno < 2 ? 'j' : d < .5 ? (turno < 5 ? 'j' : (turno < 7 ? 'k' : (turno === 8 ? 'l' : ' '))) : (turno < 4 ? 'k' : (turno < 6 ? 'l' : (turno === 8 ? ' ' : 'k')));
      await p.keyboard.down(accion); await p.waitForTimeout(accion === 'j' ? 180 : 40); await p.keyboard.up(accion);
      if(s.accRiv === 'largo' && i % 3 === 0){ await p.keyboard.down(' '); await p.waitForTimeout(30); await p.keyboard.up(' '); }
      i++;
      await p.waitForTimeout(45);
    }
    for(const k of [...hold]) await tecla(k, false);
    const fin = await p.isVisible('#arOtra');
    check('la pelea termina con ganador (' + i + ' ciclos)', fin);
    const v = await p.evaluate(() => ({vistos:[...window.__vistos], hp:window.__hpMin, crit:window.__crit}));
    check('usó corto, medio, largo y esquivar (' + v.vistos.join(',') + ')', ['corto', 'medio', 'largo', 'esquivar', 'proyectil'].every(t => v.vistos.includes(t)));
    check('el rival atacó con varios movimientos distintos', v.vistos.filter(t => t.startsWith('riv-')).length >= 3);
    check('las barras de vida bajaron por los golpes', v.hp.riv < .95 && v.hp.yo < .98);
    check('se cambió de Pokémon', cambio);
    if(SHOTS) await p.screenshot({path:`${SHOTS}/fin-${w}.png`});
    const coins = await p.evaluate(() => Number(document.getElementById('coinAmount').textContent));
    check('cobró monedas por el resultado (+' + (coins - antes) + ')', coins - antes >= 15 && coins - antes <= 80 + 6 * 35 + 60);
    check('muestra el desglose del premio', await p.isVisible('.ar-premio .tot'));
    check('suma la pelea al registro de Maestro', await p.evaluate(() => maestro.peleas >= 1 && (maestro.ganadas === 0 || maestro.pts >= 10)));
    await tocar('#arCerrar2');
    check('Cerrar vuelve al álbum', !(await p.isVisible('#arenaOverlay')));
    await p.setViewportSize({width:w, height:h});
    await p.evaluate(() => { window.__arenaTurbo = 3; });
    await tocar('#battleBtn'); await p.waitForSelector('.ar-sel'); await tocar('#arPickGo');
    await p.waitForSelector('#arStage'); await p.keyboard.press('Escape');
    check('Esc pregunta si abandonar', await p.isVisible('#arAbandonar'));
    await tocar('#arAbandonar');
    check('abandonar cierra sin dar monedas', !(await p.isVisible('#arenaOverlay')) && (await p.evaluate(() => Number(document.getElementById('coinAmount').textContent))) === coins);
    check('sin errores de JS', errores.length === 0);
    if(errores.length) console.log(errores);
    await ctx.close();
  }
  await browser.close();
  console.log('\n' + ok + ' ok · ' + fail + ' fallan');
  process.exit(fail ? 1 : 0);
})();
