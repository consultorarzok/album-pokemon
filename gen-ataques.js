/* Arma el catálogo de ataques REALES (PokeAPI) para la Arena: nombre oficial en español, tipo oficial,
   en qué botón va (corto/medio/largo) y el efecto visual más parecido al del juego. */
const fs=require('fs');const {pk,mv}=JSON.parse(fs.readFileSync(process.argv[2]));
const NO=new Set(['bide','natural-gift','fling','beat-up','spit-up','final-gambit','trump-card','metal-burst','punishment','struggle','snore','sky-drop','belch','last-resort','dream-eater','synchronoise','fake-out','feint','first-impression','rage','focus-punch','future-sight-x','u-turn','volt-switch','pursuit','sucker-punch','round','echoed-voice','acrobatics','facade','hex','venoshock','payback','avalanche','revenge','assurance','covet','thief','knock-off','pluck','bug-bite','incinerate','clear-smog','smelling-salts','wake-up-slap','secret-power','weather-ball','frustration','return','present','hidden-power','sketch']);
// los vuelvo a permitir porque son icónicos / los usaba antes
['dream-eater','present','hidden-power','pursuit','rage','bug-bite','return','u-turn','knock-off','payback','thief','acrobatics','facade','hex','avalanche','revenge'].forEach(n=>NO.delete(n));
const ESTADO_OK={supersonic:['normal','onda'],sing:['normal','onda'],'sleep-powder':['grass','polvo'],spore:['grass','polvo'],'poison-powder':['poison','polvo'],'stun-spore':['grass','polvo'],'confuse-ray':['ghost','onda'],'string-shot':['bug','polvo'],splash:['normal','burbujas'],'sand-attack':['ground','polvo'],hypnosis:['psychic','onda'],'lovely-kiss':['normal','onda'],'sweet-kiss':['fairy','onda'],sketch:['normal','estrella'],'cotton-spore':['grass','polvo'],'spider-web':['bug','polvo'],smokescreen:['normal','polvo'],'poison-gas':['poison','polvo'],'thunder-wave':['electric','rayito'],'will-o-wisp':['fire','bola'],'sweet-scent':['normal','polvo'],'scary-face':['normal','onda'],metronome:['normal','estrella'],transform:['normal','estrella'],'destiny-bond':['ghost','zona']};
const LARGO_FORZADO=new Set(['rock-slide','seismic-toss','night-shade-x','magnitude','fissure','horn-drill','guillotine','sheer-cold','self-destruct','explosion','future-sight','dream-eater','petal-dance','thrash','outrage','earthquake','surf','razor-wind','sky-attack','solar-beam','solar-blade','skull-bash','fire-spin-x','twister-x','hurricane','blizzard','thunder','heat-wave','eruption','water-spout','sacred-fire','aeroblast','discharge','lava-plume','sludge-wave','bulldoze-x','ancient-power-x','avalanche-x','dragon-rush','stone-edge','leaf-storm','overheat','draco-meteor','psycho-boost','zap-cannon','dynamic-punch','hyper-voice','boomburst','giga-impact','hyper-beam','blast-burn','hydro-cannon','frenzy-plant','rock-wrecker','head-smash','wood-hammer','flare-blitz','volt-tackle','brave-bird','double-edge','close-combat','high-jump-kick','superpower','hammer-arm','icicle-crash','meteor-mash','iron-tail-x','dragon-tail-x','muddy-water','origin-pulse','spacial-rend','roar-of-time','focus-blast','gunk-shot','power-whip','megahorn-x','petal-blizzard','egg-bomb-x']);
const MEDIO_FORZADO=new Set(['egg-bomb','rock-throw','rock-tomb','rock-blast','smack-down','ancient-power','bone-club','bonemerang','bone-rush','pin-missile','spike-cannon','ice-shard','icicle-spear','bullet-seed','seed-bomb','barrage','pay-day','bulldoze','sand-tomb','mud-shot','mud-slap','night-shade','psywave','dragon-rage','sonic-boom','mirror-coat','present','hidden-power','rollout-x','water-shuriken','vacuum-wave','aura-sphere','shadow-sneak','poison-fang-x','fire-spin','whirlpool','twister','gust','icy-wind','powder-snow','razor-leaf','magical-leaf','leaf-tornado','silver-wind','ominous-wind','air-cutter','air-slash','water-pulse','bubble','bubble-beam','octazooka','aurora-beam','psybeam','confusion','swift','tri-attack','charge-beam','shock-wave','electro-ball','spark-x','energy-ball','shadow-ball','dark-pulse','dragon-pulse','dragon-breath','sludge','sludge-bomb','acid','acid-spray','mud-bomb','earth-power','flash-cannon','mirror-shot','magnet-bomb','ice-ball','weather-ball','zap-cannon-x','poison-sting-x']);
const CORTO_FORZADO=new Set(['low-kick','counter','super-fang','endeavor','flail','reversal','return','frustration','gyro-ball','heavy-slam','heat-crash','grass-knot','rollout','spark','poison-fang','poison-sting','twineedle','fury-cutter','bind','wrap','constrict','vine-whip','lick','pursuit','rage','thief','knock-off','payback','avalanche','revenge','u-turn','acrobatics','facade','bug-bite','hex-x']);
const ESPECIAL_FX={ // efectos a mano, lo más parecido al juego
 'flame-wheel':'cuerpo','rollout':'cuerpo','body-slam':'cuerpo','stomp':'cuerpo','heavy-slam':'cuerpo','heat-crash':'cuerpo','gyro-ball':'cuerpo','rapid-spin':'cuerpo','take-down':'cuerpo','submission':'cuerpo','seismic-toss':'zona','slam':'cuerpo','wing-attack':'golpe','steel-wing':'golpe',
 'ember':'bola','flame-burst':'bola','fire-spin':'bola','water-gun':'chorro','octazooka':'chorro','water-pulse':'onda','bubble':'burbujas','bubble-beam':'burbujas','brine':'chorro','whirlpool':'tornado','water-shuriken':'estrella',
 'thunder-shock':'rayito','spark':'golpe','charge-beam':'rayito','shock-wave':'rayito','electro-ball':'bola','discharge':'propia','thunderbolt':'rayo','thunder':'trueno','zap-cannon':'rayo','volt-tackle':'embestida',
 'razor-leaf':'hojas','magical-leaf':'hojas','leaf-tornado':'tornado','absorb':'semillas','mega-drain':'semillas','giga-drain':'semillas','bullet-seed':'semillas','seed-bomb':'semillas','energy-ball':'bola','solar-beam':'rayo','petal-dance':'lluvia','petal-blizzard':'lluvia','leaf-storm':'lluvia','grass-knot':'latigo','power-whip':'latigo','vine-whip':'latigo','leaf-blade':'garra','frenzy-plant':'zona','wood-hammer':'embestida',
 'acid':'lodo','acid-spray':'lodo','sludge':'lodo','sludge-bomb':'lodo','mud-bomb':'lodo','mud-slap':'lodo','mud-shot':'lodo','smog':'polvo','sludge-wave':'propia','gunk-shot':'zona','poison-jab':'aguijon','poison-sting':'aguijon','twineedle':'aguijon','cross-poison':'garra','poison-tail':'latigo','poison-fang':'mordisco',
 'pin-missile':'agujas','spike-cannon':'agujas','silver-wind':'tornado','signal-beam':'onda','bug-buzz':'onda','x-scissor':'garra','fury-cutter':'garra','megahorn':'golpe','leech-life':'mordisco','bug-bite':'mordisco','u-turn':'golpe',
 'gust':'tornado','twister':'tornado','air-cutter':'tornado','air-slash':'tornado','hurricane':'lluvia','aeroblast':'rayo','sky-attack':'embestida','brave-bird':'embestida','drill-peck':'picotazo','peck':'picotazo','aerial-ace':'garra','fly':'embestida','bounce':'cuerpo','acrobatics':'golpe','razor-wind':'tornado',
 'confusion':'onda','psybeam':'onda','psywave':'onda','mirror-coat':'onda','psychic':'zona','psyshock':'zona','future-sight':'lluvia','dream-eater':'zona','zen-headbutt':'golpe','psycho-cut':'garra','extrasensory':'onda','psycho-boost':'rayo',
 'rock-throw':'piedra','rock-tomb':'piedra','rock-blast':'piedra','smack-down':'piedra','ancient-power':'piedra','rock-slide':'lluvia','stone-edge':'lluvia','head-smash':'embestida','power-gem':'estrella','rock-wrecker':'rayo',
 'earthquake':'propia','magnitude':'propia','fissure':'propia','bulldoze':'suelo','earth-power':'suelo','sand-tomb':'tornado','bone-club':'hueso','bonemerang':'hueso','bone-rush':'hueso','dig':'golpe','drill-run':'picotazo','mud-sport':'lodo',
 'ice-shard':'piedra','icicle-spear':'agujas','ice-ball':'piedra','powder-snow':'tornado','icy-wind':'tornado','aurora-beam':'onda','ice-beam':'rayo','blizzard':'lluvia','sheer-cold':'zona','icicle-crash':'lluvia','ice-fang':'mordisco','ice-punch':'golpe','avalanche':'golpe',
 'shadow-ball':'bola','night-shade':'onda','ominous-wind':'tornado','shadow-claw':'garra','shadow-punch':'golpe','shadow-sneak':'latigo','lick':'latigo','astonish':'golpe','hex':'golpe',
 'dragon-rage':'bola','dragon-breath':'onda','dragon-pulse':'bola','dragon-claw':'garra','outrage':'embestida','dragon-rush':'embestida','draco-meteor':'lluvia','dragon-tail':'latigo','twister-':'tornado',
 'dark-pulse':'bola','bite':'mordisco','crunch':'mordisco','night-slash':'garra','faint-attack':'garra','feint-attack':'garra','thief':'garra','knock-off':'golpe','payback':'golpe','foul-play':'zona','snarl':'onda','pursuit':'golpe',
 'iron-tail':'latigo','metal-claw':'garra','flash-cannon':'rayo','mirror-shot':'onda','magnet-bomb':'estrella','meteor-mash':'embestida','bullet-punch':'golpe','iron-head':'golpe','steel-wing-':'golpe',
 'moonblast':'rayo','dazzling-gleam':'estrella','fairy-wind':'tornado','disarming-voice':'onda','draining-kiss':'mordisco','play-rough':'golpe','charm':'onda',
 'vacuum-wave':'onda','aura-sphere':'bola','focus-blast':'bola','close-combat':'embestida','high-jump-kick':'embestida','jump-kick':'patada','double-kick':'patada','low-kick':'patada','rolling-kick':'patada','mega-kick':'patada','triple-kick':'patada','blaze-kick':'patada','low-sweep':'patada','hi-jump-kick':'embestida','brick-break':'golpe','karate-chop':'golpe','cross-chop':'garra','dynamic-punch':'zona','superpower':'embestida','hammer-arm':'golpe','mach-punch':'golpe','sky-uppercut':'golpe','drain-punch':'golpe','force-palm':'golpe','counter':'golpe','rock-smash':'golpe','revenge':'golpe','reversal':'golpe','seismic-toss-':'zona',
 'hyper-beam':'rayo','giga-impact':'embestida','double-edge':'embestida','swift':'estrella','tri-attack':'estrella','hidden-power':'estrella','pay-day':'monedas','egg-bomb':'bola','barrage':'bola','sonic-boom':'onda','hyper-voice':'onda','uproar':'onda','boomburst':'propia','explosion':'propia','self-destruct':'propia','thrash':'embestida','skull-bash':'embestida','super-fang':'mordisco','hyper-fang':'mordisco','fury-attack':'picotazo','horn-attack':'picotazo','horn-drill':'picotazo','guillotine':'garra','scratch':'garra','slash':'garra','cut':'garra','fury-swipes':'garra','false-swipe':'garra','crush-claw':'garra','vise-grip':'garra','bind':'latigo','wrap':'latigo','constrict':'latigo','tail-slap':'latigo','present':'bola','flail':'golpe','endeavor':'golpe','tackle':'golpe','headbutt':'golpe','quick-attack':'golpe','extreme-speed':'golpe','pound':'golpe','double-slap':'golpe','comet-punch':'golpe','mega-punch':'golpe','dizzy-punch':'golpe','facade':'golpe','return':'golpe','frustration':'golpe','strength':'golpe','rage':'golpe','crush-grip':'golpe','wring-out':'latigo','razor-shell':'garra','aqua-tail':'latigo','waterfall':'golpe','aqua-jet':'golpe','crabhammer':'garra','clamp':'garra','dive':'golpe','fire-fang':'mordisco','thunder-fang':'mordisco','fire-punch':'golpe','thunder-punch':'golpe','flare-blitz':'embestida','fire-blast':'zona','flamethrower':'rayo','overheat':'zona','heat-wave':'propia','eruption':'zona','sacred-fire':'zona','lava-plume':'propia','blast-burn':'zona','hydro-pump':'rayo','surf':'propia','muddy-water':'propia','hydro-cannon':'rayo','water-spout':'propia','sludge-bomb-':'lodo'
};
const FORMA={'egg-bomb':'huevo','barrage':'huevo','ember':'llama','fire-spin':'llama','flame-burst':'llama','dragon-rage':'llama','dragon-pulse':'llama','dragon-breath':'llama','sing':'nota','lovely-kiss':'corazon','sweet-kiss':'corazon','draining-kiss':'corazon','charm':'corazon','aurora-beam':'arcoiris','psybeam':'arcoiris','electro-ball':'voltio','vacuum-wave':'medialuna','air-cutter':'medialuna','air-slash':'medialuna','ice-shard':'cristal','icicle-spear':'cristal','ice-ball':'cristal','blizzard':'cristal','icicle-crash':'cristal','petal-dance':'hoja','petal-blizzard':'hoja','leaf-storm':'hoja','rock-slide':'roca','stone-edge':'roca','future-sight':'estrella','draco-meteor':'estrella','hurricane':'pluma','power-gem':'estrella','dazzling-gleam':'estrella','magnet-bomb':'estrella','water-shuriken':'estrella','tri-attack':'estrella','swift':'estrella','hidden-power':'estrella','pay-day':'moneda','sonic-boom':'anillo','present':'huevo','shadow-ball':'bola','aura-sphere':'bola','focus-blast':'bola','mud-bomb':'lodo'};
function slot(m){
  if(m.n==='destiny-bond') return 'largo';
  if(ESTADO_OK[m.n]&&m.cls==='status') return 'medio';
  if(CORTO_FORZADO.has(m.n)) return 'corto';
  if(MEDIO_FORZADO.has(m.n)) return 'medio';
  if(LARGO_FORZADO.has(m.n)||(m.power||0)>=90) return 'largo';
  if(m.cls==='special') return 'medio';
  return 'corto';
}
const FX_CORTO=['golpe','garra','mordisco','cuerpo','picotazo','latigo','patada','aguijon'],FX_LARGO=['rayo','lluvia','zona','trueno','propia','embestida'];
function fxDe(m,s){
  let f=ESPECIAL_FX[m.n]||(ESTADO_OK[m.n]||[])[1];
  const def={corto:'golpe',medio:'bola',largo:m.cls==='physical'?'embestida':'rayo'}[s];
  if(!f) f=def;
  // que el efecto sea del grupo del botón
  if(s==='corto'&&!FX_CORTO.includes(f)) f=def;
  if(s==='largo'&&!FX_LARGO.includes(f)) f=(f==='lodo'||f==='bola')?'zona':(f==='tornado'?'lluvia':def);
  if(s==='medio'&&(FX_CORTO.includes(f)||FX_LARGO.includes(f))) f=f==='rayo'?'onda':f==='lluvia'?'tornado':def;
  return f;
}
const okMove=m=>m&&m.es&&!NO.has(m.n)&&(m.cls!=='status'||ESTADO_OK[m.n]);
const CAT={};
Object.values(mv).forEach(m=>{if(!okMove(m))return;const s=slot(m);const f=fxDe(m,s);
  const tipo=m.cls==='status'?ESTADO_OK[m.n][0]:m.type;
  CAT[m.n]={es:m.es,tipo,fx:f,forma:FORMA[m.n]||null,slot:s,pot:m.power,est:m.cls==='status'};});
// correcciones a mano, por nombre en español: [botón, efecto, forma]
const AJUSTE={'Hoja Aguda':['corto','garra'],'Psicocolmillo':[null,'mordisco'],'Golpe Mordaza':[null,'mordisco'],'Aguijón Letal':[null,'aguijon'],
 'Mil Púas Tóxicas':[null,'cuerpo'],'Plancha':[null,'cuerpo'],'Plancha Corporal':[null,'cuerpo'],'Brinco':[null,'cuerpo'],'Cuerno Certero':[null,'picotazo'],
 'Agarre':[null,'garra'],'Llave Giro':[null,'cuerpo'],'Pirueta Helada':[null,'patada'],'Alboroto':[null,'propia'],'Vozarrón':[null,'propia'],
 'Bruma Explosiva':[null,'propia'],'Bola de Polen':[null,'zona'],'Aria Burbuja':[null,'propia'],'Psicoataque':[null,'zona'],'Puño Dinámico':[null,'embestida'],
 'Escaldar':[null,'chorro'],'Agua Fría':[null,'chorro'],'Voto Agua':[null,'chorro'],'Carga Parábola':[null,'rayito'],'Psicocarga':[null,'onda'],
 'Psicorruido':[null,'onda'],'Canto Encantador':[null,'onda','nota'],'Láser Doble':[null,'rayito'],'Liofilización':[null,'piedra','cristal'],
 'Vaho Gélido':[null,'tornado'],'Arenas Ardientes':[null,'tornado'],'Teraexplosión':[null,'estrella'],'Pirotecnia':[null,'bola','llama'],
 'Llama Embrujada':[null,'bola','llama'],'Envidia Ardiente':[null,'bola','llama'],'Voto Fuego':[null,'bola','llama'],'Fuego Fatuo':[null,'bola','llama'],
 'Giro Fuego':[null,'bola','llama'],'Electrotela':[null,'polvo'],'Bomba Huevo':['medio','bola','huevo'],'Canto':[null,'onda','nota'],
 'Martillazo':[null,'zona'],'Onda Certera':[null,'zona']};
Object.values(CAT).forEach(c=>{const a=AJUSTE[c.es];if(!a)return;if(a[0])c.slot=a[0];if(a[1])c.fx=a[1];if(a[2])c.forma=a[2];});
// pools por Pokémon: prioridad nivel > huevo/tutor > MT del tipo > otras MT
const PRI={'level-up':0,'egg':1,'light-ball-egg':1,'tutor':2,'machine':2};
const APR={};const faltan=[];
for(let i=1;i<=251;i++){const p=pk[i];const pools={corto:[],medio:[],largo:[]};
  p.moves.forEach(x=>{const c=CAT[x.n];if(!c)return;const pr=Math.min(...x.how.map(h=>PRI[h]??3));if(pr>2)return;
    const stab=p.types.includes(c.tipo);pools[c.slot].push({n:x.n,pr:pr+(pr===2&&!stab?1:0)+(c.est?5:0),stab});});
  for(const s in pools){pools[s].sort((a,b)=>a.pr-b.pr||(b.stab-a.stab));pools[s]=pools[s].filter((x,k,a)=>a.findIndex(y=>y.n===x.n)===k);
    const dañinos=pools[s].filter(x=>!CAT[x.n].est);if(dañinos.length)pools[s]=dañinos;pools[s]=pools[s].slice(0,8);
  }
  for(const s in pools){ if(pools[s].length) continue;
    const otros=Object.keys(pools).filter(k=>k!==s).flatMap(k=>pools[k]);
    if(!otros.length){ faltan.push(i+' '+p.name+' '+s); continue; }
    const DEF={corto:'golpe',medio:'bola',largo:'embestida'}[s];
    pools[s]=otros.slice().sort((a,b)=>(CAT[b.n].pot||0)-(CAT[a.n].pot||0)).slice(0,3).map(x=>({...x,fx:DEF}));
  }
  APR[i]=pools;}
fs.writeFileSync(process.argv[3],JSON.stringify({CAT,APR}));
console.log('catálogo',Object.keys(CAT).length,'· huecos:',faltan.join(', ')||'ninguno');
for(const i of [1,6,25,94,129,132,149,150,151,152,201,235,249,250]){const a=APR[i];console.log(i,pk[i].name,'|',['corto','medio','largo'].map(s=>a[s].map(x=>CAT[x.n].es+'('+CAT[x.n].fx+')').join(', ')).join(' || '));}
