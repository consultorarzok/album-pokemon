/* Compara los tipos de cada Pokémon y la tabla de efectividad del juego contra los datos oficiales de PokeAPI.
   Uso: node herramientas/auditar-tipos.js <carpeta con pokemon_types.csv, types.csv, type_efficacy.csv> */
const fs = require('fs'), dir = process.argv[2];
let chromium; try{ ({chromium} = require('playwright')); }catch(e){ ({chromium} = require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')); }
const csv = f => fs.readFileSync(dir + '/' + f, 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
const nom = {}; csv('types.csv').forEach(r => nom[r[0]] = r[1]);
const ofi = {}; csv('pokemon_types.csv').forEach(([id, t, slot]) => { (ofi[id] = ofi[id] || [])[slot - 1] = nom[t]; });
const efi = {}; csv('type_efficacy.csv').forEach(([a, d, f]) => { (efi[nom[a]] = efi[nom[a]] || {})[nom[d]] = f / 100; });
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.route('**://n8n.consultorarz.com/**', r => r.abort());
  await p.goto('file:///root/pokemon/index.html');
  const j = await p.evaluate(() => ({
    data: DATA.map(x => ({id:x.id, n:x.name, t:tiposDe(x)})),
    chart: Object.keys(TYPE_CHART).map(a => [a, Object.keys(TYPE_CHART).map(d => [d, efectividad(a, d)])]),
    ej: [483, 484].map(id => { const x = DATA.find(q => q.id === id); return [x.name, tiposDe(x), efectividadContra('ice', x), factorTipo(efectividadContra('ice', x))]; })
  }));
  let mal = 0;
  for(const x of j.data){ if(x.id > 10000) continue; const o = ofi[x.id]; if(!o){ console.log('sin dato oficial', x.id, x.n); continue; }
    if(o.join('/') !== x.t.join('/')){ mal++; console.log('TIPO DISTINTO', x.id, x.n, 'juego:', x.t.join('/'), 'oficial:', o.join('/')); } }
  let malT = 0;
  for(const [a, fila] of j.chart) for(const [d, v] of fila) if(efi[a][d] !== v){ malT++; console.log('TABLA DISTINTA', a, '→', d, 'juego', v, 'oficial', efi[a][d]); }
  console.log('Pokémon revisados:', j.data.filter(x => x.id <= 10000).length, '· tipos distintos:', mal, '· casillas de tabla distintas:', malT, 'de', j.chart.length ** 2);
  console.log(JSON.stringify(j.ej));
  await b.close();
})();
