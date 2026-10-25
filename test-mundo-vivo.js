/* Aventura en vivo: dos celulares (Red y May) entran a la Aventura y se ven caminar con su nombre.
   Contra el servidor local (npm run dev en :8787). Graba un video en $SHOTS. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
const OUT = process.env.SHOTS || '/tmp';
let ok = 0, mal = 0;
const check = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ✔ ' : '  ✘ ') + n); };
const suf = Math.random().toString(36).slice(2, 5);

async function celular(browser, nombre, avatar, video){
  const ctx = await browser.newContext(Object.assign({viewport:{width:390, height:700}, hasTouch:true, isMobile:true},
    video ? {recordVideo: {dir: OUT, size: {width: 390, height: 700}}} : {}));
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(srv => { localStorage.setItem('album-servidor', srv); localStorage.setItem('album-kanto-pin-ofrecido', '1'); }, SERVIDOR);
  const p = await ctx.newPage();
  p.errores = []; p.on('pageerror', e => p.errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force:true});
  await p.waitForTimeout(600);
  await p.fill('#nameInput', nombre); await p.tap('#nameSaveBtn'); await p.waitForTimeout(2000);
  await p.tap(`.avatar-op[data-avatar="${avatar}"]`); await p.waitForTimeout(500);
  for(let i = 0; i < 8; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#revealCloseBtn']) if(await p.isVisible(s)){ await p.tap(s).catch(() => {}); await p.waitForTimeout(300); }
  await p.evaluate(() => document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')));
  await p.tap('#advBtn'); await p.waitForTimeout(1500);
  return {ctx, p};
}
const caminar = async (p, tecla, ms) => { await p.keyboard.down(tecla); await p.waitForTimeout(ms); await p.keyboard.up(tecla); };

(async () => {
  const browser = await chromium.launch();
  const A = await celular(browser, 'Ash ' + suf, 'red', false);
  const B = await celular(browser, 'Mayra ' + suf, 'may', true);
  await B.p.waitForTimeout(1200);
  const nombresB = () => B.p.evaluate(() => [...document.querySelectorAll('#advNombres span')].filter(s => s.style.display !== 'none').map(s => s.textContent));
  const nombresA = () => A.p.evaluate(() => [...document.querySelectorAll('#advNombres span')].filter(s => s.style.display !== 'none').map(s => s.textContent));
  check('Mayra ve a Ash en el mapa con su nombre', (await nombresB()).includes('Ash ' + suf));
  check('Ash ve a Mayra con su nombre', (await nombresA()).includes('Mayra ' + suf));
  const otroEnA = await A.p.evaluate(() => Object.values(MUNDO.otros)[0] || null);
  check('Ash la ve con el personaje de May', otroEnA && otroEnA.av === 'may');
  // Ash camina a la derecha y abajo: Mayra lo ve moverse
  const antes = await B.p.evaluate(() => { const o = Object.values(MUNDO.otros)[0]; return o && [o.x, o.y]; });
  await caminar(A.p, 'ArrowRight', 900); await caminar(A.p, 'ArrowDown', 700);
  await B.p.waitForTimeout(800);
  const despues = await B.p.evaluate(() => { const o = Object.values(MUNDO.otros)[0]; return o && [o.x, o.y]; });
  check('Mayra lo ve caminar', antes && despues && despues[0] > antes[0] + 10 && despues[1] > antes[1] + 5);
  const real = await A.p.evaluate(() => [advPx, advPy]);
  check('y llega a donde está de verdad (±3 px)', Math.abs(despues[0] - real[0]) <= 3 && Math.abs(despues[1] - real[1]) <= 3);
  // Mayra camina hacia él
  await caminar(B.p, 'ArrowRight', 600); await B.p.waitForTimeout(700);
  await B.p.screenshot({path: OUT + '/mundo-B.png'}); await A.p.screenshot({path: OUT + '/mundo-A.png'});
  await caminar(A.p, 'ArrowLeft', 700); await caminar(B.p, 'ArrowDown', 500); await B.p.waitForTimeout(800);
  // Ash cierra la Aventura: desaparece para Mayra
  await A.p.tap('#advCloseBtn'); await B.p.waitForTimeout(1200);
  check('cuando Ash sale de la Aventura, Mayra deja de verlo', !(await nombresB()).includes('Ash ' + suf));
  check('sin errores de página', A.p.errores.length + B.p.errores.length === 0); if(A.p.errores.length + B.p.errores.length) console.log(A.p.errores, B.p.errores);
  await A.ctx.close(); await B.ctx.close();
  await browser.close();
  console.log(`\n${ok}/${ok + mal}`); process.exit(mal ? 1 : 0);
})();
