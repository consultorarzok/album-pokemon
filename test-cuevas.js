/* Cuevas y minas (22/11): desde CADA entrada se entra, se llega a la salida y se vuelve a la superficie en un casillero CONECTADO (sin quedar en un pozo cuya única salida es la entrada). */
let chromium;
try{ ({ chromium } = require('playwright')); }
catch(e){ ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
let ok = 0, mal = 0;
const check = (n, c) => { c ? ok++ : mal++; console.log((c ? '  ✔ ' : '  ✘ ') + n); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: 390, height: 844}});
  await ctx.route('**://n8n.consultorarz.com/**', r => r.abort());
  await ctx.addInitScript(() => { localStorage.setItem('album-servidor', 'off'); localStorage.setItem('album-kanto-pin-ofrecido', '1'); });
  const p = await ctx.newPage(); const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto('file:///root/pokemon/index.html'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const M = ADV_MAPS.overworld, malas = [], entradas = [];
    const bfs = (mapa, sx, sy, vale) => { advMapa = mapa; const vis = new Set([sx + ',' + sy]), q = [[sx, sy]]; let hit = false;
      while(q.length){ const [x, y] = q.shift(); for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const k = (x + dx) + ',' + (y + dy); if(vis.has(k)) continue; const t = advTileEn(x + dx, y + dy); if(!t || !t.walk) continue; vis.add(k); if(vale(t)) hit = true; if(!t.entra) q.push([x + dx, y + dy]); } }
      return {vis, hit}; };
    advMapa = 'overworld'; const ini = advBuscarTile('overworld', '@'); const alc = bfs('overworld', ini.x, ini.y, () => false);
    for(let y = 0; y < M.rows.length; y++) for(let x = 0; x < M.cols; x++){ advMapa = 'overworld'; const t = advTileEn(x, y); if(t && t.entra && t.entra !== 'overworld') entradas.push({x, y, tipo: t.entra}); }
    for(const e of entradas){
      advMapa = 'overworld'; const l = advLugarLibre(e.x, e.y), t = advTileEn(l.x, l.y);
      if(!(t && t.walk && !t.entra && alc.vis.has(l.x + ',' + l.y))) malas.push('al volver de ' + e.tipo + '@' + e.x + ',' + e.y + ' se cae en ' + l.x + ',' + l.y);
    }
    for(const m of ['cueva', 'mina']){ advMapa = m; const E = advBuscarTile(m, 'E'); if(!bfs(m, E.x, E.y + 1, t => t.entra === 'overworld').hit) malas.push('no se llega a la salida de ' + m); }
    advMapa = 'overworld';
    return {n: entradas.length, malas};
  });
  check('hay entradas para revisar (' + r.n + ')', r.n >= 29);
  check('desde todas se sale a un casillero conectado', r.malas.length === 0); if(r.malas.length) console.log(r.malas);
  // recorrido real por la mina problemática: entrar, ir a la salida, volver
  const real = await p.evaluate(() => {
    advMapa = 'overworld'; advPonerEn(114, 184); advVuelta = {x: 115, y: 184, region: regionDe(115, 184)}; advIrA('mina');
    const dentro = advMapa === 'mina'; advIrA('overworld');
    const conexo = advConexoSuperficie();
    return {dentro, vuelve: advMapa === 'overworld', ok: conexo.has(advX + ',' + advY), pos: advX + ',' + advY};
  });
  check('mina (115,184): entra, vuelve a la superficie y queda en un lugar con salida (' + real.pos + ')', real.dentro && real.vuelve && real.ok);
  check('sin errores de página', errores.length === 0);
  await b.close(); console.log(ok + ' bien, ' + mal + ' mal'); process.exit(mal ? 1 : 0);
})();
