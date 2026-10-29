/* Gobernador Sadir en la Aventura: se ve caminando, aparece el botón al acercarse y regala una vez cada 24 h.
   Contra el servidor local (npm run dev en :8787). Graba capturas en $SHOTS. */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const SERVIDOR = process.env.SERVIDOR || 'http://localhost:8787';
const OUT = process.env.SHOTS || '/tmp';
let ok = 0, mal = 0;
const check = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ✔ ' : '  ✘ ') + n); };
const suf = Math.random().toString(36).slice(2, 5);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 390, height: 700}, hasTouch: true, isMobile: true});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(srv => { localStorage.setItem('album-servidor', srv); localStorage.setItem('album-kanto-pin-ofrecido', '1'); }, SERVIDOR);
  const p = await ctx.newPage(); const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.click('#portadaEntrar', {force: true}); await p.waitForTimeout(600);
  await p.fill('#nameInput', 'Visita ' + suf); await p.tap('#nameSaveBtn'); await p.waitForTimeout(2000);
  await p.tap('.avatar-op[data-avatar="red"]'); await p.waitForTimeout(500);
  for(let i = 0; i < 8; i++) for(const s of ['#specialContinueBtn', '#battleCloseBtn', '#revealCloseBtn']) if(await p.isVisible(s)){ await p.tap(s).catch(() => {}); await p.waitForTimeout(300); }
  await p.evaluate(() => document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')));
  await p.tap('#advBtn'); await p.waitForTimeout(1800);
  const hay = () => p.evaluate(() => { const o = MUNDO.otros[-100]; return o ? {x: o.x, y: o.y, m: o.m, av: o.av, n: o.n, npc: o.npc} : null; });
  const s0 = await hay();
  check('el Gobernador está en la Aventura', s0 && s0.av === 'sadir' && s0.npc === 'sadir' && s0.n === 'Gob. Sadir');
  check('lejos no aparece el botón', await p.evaluate(() => document.getElementById('advNpcBtn').hidden));
  const antes = await p.evaluate(() => ({...bolas}));
  // me paro al lado de donde está (el servidor lo valida contra su posición real)
  const irAlLado = async () => { const s = await hay(); await p.evaluate(s => { advPx = s.x + 6; advPy = s.y; }, s); await p.waitForTimeout(450); };
  await irAlLado();
  const txt = await p.evaluate(() => { const b = document.getElementById('advNpcBtn'); return b.hidden ? null : b.textContent; });
  check('cerca aparece "Hablar con Gob. Sadir"', txt && txt.includes('Gob. Sadir'));
  await p.screenshot({path: OUT + '/sadir-cerca.png'});
  await p.tap('#advNpcBtn'); await p.waitForTimeout(1200);
  const desp = await p.evaluate(() => ({...bolas, msg: document.getElementById('advZona').textContent}));
  check('recibe 15 rojas, 10 azules, 3 ultra y 1 master', desp.roja - antes.roja === 15 && desp.azul - antes.azul === 10 && desp.ultra - antes.ultra === 3 && desp.maestra - antes.maestra === 1);
  check('el cartel cuenta lo que dio', desp.msg.includes('+15 Poké Ball') && desp.msg.includes('Master Ball'));
  await p.screenshot({path: OUT + '/sadir-regalo.png'});
  await p.waitForTimeout(3000); await irAlLado();
  await p.tap('#advNpcBtn'); await p.waitForTimeout(800);
  const otra = await p.evaluate(() => ({roja: bolas.roja, msg: document.getElementById('advZona').textContent}));
  check('la segunda vez no da y avisa cuánto falta', otra.roja === desp.roja && /Volvé en 23 h/.test(otra.msg));
  check('sin errores de página', errores.length === 0); if(errores.length) console.log(errores);
  await browser.close();
  console.log(`\n${ok}/${ok + mal}`); process.exit(mal ? 1 : 0);
})();
