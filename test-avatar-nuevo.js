/* Chico NUEVO en modo servidor: escribe su nombre y le aparece "Elegí tu personaje"
   encima de la carta de bienvenida (el PIN espera solo a que no haya ventanas abiertas). Contra el servidor local (npm run dev en :8787). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
const OUT = process.env.SHOTS || '/tmp';
let ok = 0, mal = 0;
const check = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ✔ ' : '  ✘ ') + n); };
(async () => {
  const browser = await chromium.launch();
  for(const tema of ['light', 'dark']){
    const ctx = await browser.newContext({viewport:{width:390, height:844}, hasTouch:true, isMobile:true, deviceScaleFactor:2, colorScheme: tema});
    await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
    await ctx.addInitScript(srv => { localStorage.setItem('album-servidor', srv); }, SERVIDOR);
    const p = await ctx.newPage();
    const errores = []; p.on('pageerror', e => errores.push(e.message));
    await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force:true});
    await p.waitForTimeout(800);
    await p.fill('#nameInput', 'Nueva ' + tema + Math.random().toString(36).slice(2, 5));
    await p.tap('#nameSaveBtn'); await p.waitForTimeout(2500);
    check(`[${tema}] después del nombre aparece "Elegí tu personaje"`, await p.isVisible('#avatarOverlay'));
    check(`[${tema}] el PIN todavía no tapa la elección`, !(await p.isVisible('#pinOverlay')));
    await p.screenshot({path: `${OUT}/nuevo-${tema}.png`});
    await p.tap('.avatar-op[data-avatar="may"]'); await p.waitForTimeout(800);
    check(`[${tema}] eligió May`, await p.evaluate(() => avatarActual === 'may' && localStorage.getItem('album-avatar') === 'may'));
    check(`[${tema}] se cierra y sigue la carta de bienvenida`, !(await p.isVisible('#avatarOverlay')) && await p.isVisible('#specialOverlay'));
    const token = await p.evaluate(() => localStorage.getItem('album-kanto-token'));
    const nombre = await p.evaluate(() => jugador);
    const enServidor = await (await fetch(SERVIDOR + '/progreso', {method: 'POST', body: JSON.stringify({token})})).json();
    check(`[${tema}] quedó guardado en el servidor`, enServidor.avatar === 'may');
    const intento = await (await fetch(SERVIDOR + '/avatar', {method: 'POST', body: JSON.stringify({token, avatar: 'red'})})).json();
    check(`[${tema}] el servidor no deja cambiarlo después`, intento.avatar === 'may');
    check(`[${tema}] sin errores de página`, errores.length === 0); if(errores.length) console.log(errores);
    await ctx.close();
    if(tema === 'light'){
      // otro celular con la misma cuenta y sin nada guardado: no pregunta y camina con May
      const ctx2 = await browser.newContext({viewport:{width:390, height:844}, hasTouch:true, isMobile:true});
      await ctx2.route('**://n8n.consultorarz.com/**', r => r.abort());
      await ctx2.addInitScript(([srv, tok, nom]) => {
        if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
        localStorage.setItem('album-servidor', srv); localStorage.setItem('album-kanto-token', tok); localStorage.setItem('album-kanto-jugador', nom);
        localStorage.setItem('album-kanto-pin-ofrecido', '1');
      }, [SERVIDOR, token, nombre]);
      const p2 = await ctx2.newPage();
      await p2.goto('file:///root/pokemon/index.html'); await p2.click('#portadaEntrar', {force:true});
      await p2.waitForTimeout(2500);
      check('otro celular de la misma cuenta: no pregunta', !(await p2.isVisible('#avatarOverlay')));
      check('otro celular de la misma cuenta: usa May', await p2.evaluate(() => avatarActual === 'may' && localStorage.getItem('album-avatar') === 'may'));
      await ctx2.close();
    }
  }
  await browser.close();
  console.log(`\n${ok}/${ok + mal}`); process.exit(mal ? 1 : 0);
})();
