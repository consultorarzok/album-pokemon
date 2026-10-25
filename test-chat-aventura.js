/* Chat de la Aventura: dos celulares, globos, filtro de teléfonos/links y avisos.
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
  const B = await celular(browser, 'Mayra ' + suf, 'may', false);
  await B.p.waitForTimeout(1500);
  const globos = p => p.evaluate(() => [...document.querySelectorAll('#advGlobos span')].filter(s => s.style.display !== 'none').map(s => s.textContent));
  const escribir = async (p, txt) => { await p.tap('#advChatBtn'); await p.waitForTimeout(250); await p.type('#advChatInput', txt); await p.keyboard.press('Enter'); await p.waitForTimeout(500); };
  check('el botón 💬 aparece al conectarse', await A.p.isVisible('#advChatBtn'));
  const pos0 = await A.p.evaluate(() => [advPx, advPy]);
  await A.p.tap('#advChatBtn'); await A.p.waitForTimeout(250);
  check('se abre la barra para escribir', await A.p.isVisible('#advChatInput'));
  await A.p.type('#advChatInput', 'wasd hola'); // w,a,s,d NO deben mover al personaje
  await A.p.waitForTimeout(400);
  check('escribir w a s d no mueve al personaje', JSON.stringify(pos0) === JSON.stringify(await A.p.evaluate(() => [advPx, advPy])));
  await A.p.keyboard.press('Enter'); await A.p.waitForTimeout(700);
  check('Mayra ve el globo "wasd hola"', (await globos(B.p)).includes('wasd hola'));
  check('Ash ve su propio globo', (await globos(A.p)).includes('wasd hola'));
  await A.p.screenshot({path: OUT + '/chat-A.png'}); await B.p.screenshot({path: OUT + '/chat-B.png'});
  await A.p.waitForTimeout(2700);
  await escribir(A.p, 'pasame al 388 4556789');
  check('un teléfono no llega a Mayra', !(await globos(B.p)).some(t => /388/.test(t)));
  check('Ash ve el aviso de por qué no salió', /tel[eé]fono/i.test(await A.p.textContent('#advChatAviso')));
  await A.p.screenshot({path: OUT + '/chat-aviso.png'});
  await A.p.waitForTimeout(2700);
  await escribir(A.p, 'mirá www.pepe.com');
  check('un link no llega a Mayra', !(await globos(B.p)).some(t => /pepe/.test(t)));
  await A.p.waitForTimeout(6800);
  check('el globo desaparece solo', (await globos(B.p)).length === 0);
  check('sin errores de página', A.p.errores.length + B.p.errores.length === 0); if(A.p.errores.length + B.p.errores.length) console.log(A.p.errores, B.p.errores);
  await A.ctx.close(); await B.ctx.close();
  await browser.close();
  console.log(`\n${ok}/${ok + mal}`); process.exit(mal ? 1 : 0);
})();
