/* ====================== ARENA DE BATALLA (Kanto) · tiempo real ======================
   Cada uno maneja a su Pokémon por la arena (joystick o WASD) y ataca con botones:
     · Corto  = embestida con garra (pega fuerte pero hay que estar encima)
     · Medio  = proyectil con forma según el tipo (se esquiva moviéndose)
     · Largo  = se carga ~0,6 s mostrando por dónde va a pegar (rayo o lluvia) y
                después golpea fuerte: hay que salir de la zona marcada
     · Esquivar = voltereta corta con invulnerabilidad
   Equipo de hasta 6, con cambio en cualquier momento (pausa mientras elegís).
   Cada Pokémon tiene su propio crítico (chance y multiplicador) y su velocidad.

   El cuerpo de cada Pokémon no se desliza quieto: acelera y frena con inercia,
   da saltitos al caminar, se inclina hacia donde va, se da vuelta, respira,
   se agacha antes de atacar, se estira en la embestida, retrocede al disparar,
   vibra al cargar y deja estela al esquivar. Cada golpe congela la acción un
   instante (hit-stop), deja marca en el piso y hace reaccionar al público.

   El rival es un bot sin inteligencia: sigue un guion de acciones sorteadas según
   su estilo, con reflejos (a veces esquiva proyectiles, se corre de lo que carga el
   jugador) y un tope contra la repetición.
   El fondo se dibuja en código con píxeles, a la medida de la pantalla (celular,
   tablet o compu). Sonido 8-bit sintetizado (sin archivos), con botón de silencio. */
(function(){
'use strict';

const CDN = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/';
const spFrente  = id => CDN + 'versions/generation-v/black-white/animated/' + id + '.gif';
const spEspalda = id => CDN + 'versions/generation-v/black-white/animated/back/' + id + '.gif';
const spIcono   = id => CDN + id + '.png';

/* ---------------- reglas ---------------- */
const ALC = {
  corto: {etq:'Corto', poder:26, coste:8,  cd:.55},
  medio: {etq:'Medio', poder:32, coste:16, cd:1.0},
  largo: {etq:'Largo', poder:54, coste:34, cd:2.4}
};
const ATAQUES = ['corto', 'medio', 'largo'];
const ESQ = {coste:12, cd:1.3, dur:.30};
const EN_MAX = 100, EN_REGEN = 14, EN_PREMIO_ESQUIVE = 18;
const CAMBIO_CD = 3, INVUL_ENTRADA = 1;
const EQUIPO_MAX = 6, EQUIPO_MIN = PELEA_MIN;
/* Premio según cómo fue la pelea: base + cada rival que tumbaste + los tuyos que quedaron
   en pie + el tiempo peleado (con tope, para que no convenga estirarla). */
const PREMIO = {ganar:80, perder:15, porKO:20, porVivo:15, segPorMoneda:3, topeTiempo:60};
/* Tamaño de los sprites respecto del píxel del fondo: más chicos que 1:1 para
   que la arena se vea grande y quede en escala con el público y los entrenadores. */
const ESCALA_POKE = {yo:.66, riv:.6};
const ESCALA_ENTRENADOR = .42;
const VEL_BASE = 34;          // en unidades u() por segundo
const ACEL = 11;              // qué tan rápido llega a la velocidad pedida (inercia)

/* Críticos y velocidad propios de cada Pokémon: salen de su número y de su tipo,
   así que son siempre los mismos para el mismo Pokémon. */
const frac = n => n - Math.floor(n);
const hash = (id, k) => frac(Math.sin(id * 12.9898 + k * 78.233) * 43758.5453);
const SESGO_CRIT = {fighting:.05, dark:.04, ghost:.03, psychic:.03, electric:.02, bug:.02, rock:-.02, normal:-.01};
const SESGO_VEL  = {electric:.22, flying:.18, bug:.10, ghost:.08, psychic:.06, fighting:.05, normal:.04, fire:.04,
                    fairy:.03, dragon:.02, water:0, ice:-.02, grass:-.04, poison:-.06, ground:-.12, rock:-.22};
function statsDe(p){
  const crit = Math.min(.30, Math.max(.04, .07 + hash(p.id, 1) * .14 + (SESGO_CRIT[p.type] || 0)));
  const critMult = Math.round((1.4 + hash(p.id, 2) * .8 + (p.type === 'fighting' ? .1 : 0)) * 10) / 10;
  const vel = Math.min(1.35, Math.max(.7, .92 + hash(p.id, 3) * .2 + (SESGO_VEL[p.type] || 0)));
  return {crit, critMult, vel};
}

/* Catálogo de ataques: nombre → [tipo, efecto, forma]. El tipo es el del ataque
   (no el del Pokémon) y decide la efectividad. El efecto decide cómo se ve y se juega:
     corto: garra, mordisco, golpe, cuerpo (salta y aplasta), picotazo, latigo, patada, aguijon
     medio: bola, chorro, onda (aros que crecen), hojas, agujas, piedra, rayito, polvo (nube lenta),
            estrella (persigue), lodo, burbujas, tornado, hueso (vuelve como bumerán),
            semillas, suelo (onda que viaja por el piso), monedas
     largo: rayo, lluvia (muchos golpes sobre la zona), zona (estallido sobre la zona),
            trueno (rayo del cielo), propia (onda alrededor de uno mismo),
            embestida (cruza la arena por la línea marcada y termina a las piñas: los de Lucha) */
const ATQ = {
  'Placaje':['normal','golpe'], 'Arañazo':['normal','garra'], 'Golpe Cuerpo':['normal','cuerpo'], 'Cabezazo':['normal','golpe'],
  'Mordisco':['dark','mordisco'], 'Hiper Colmillo':['normal','mordisco'], 'Ataque Rápido':['normal','golpe'], 'Cuchillada':['normal','garra'],
  'Destructor':['normal','golpe'], 'Megapuño':['normal','golpe'], 'Atadura':['normal','latigo'], 'Golpe Furia':['normal','picotazo'],
  'Corte':['normal','garra'], 'Agarre':['normal','garra'], 'Tenaza':['normal','garra'], 'Constricción':['normal','latigo'], 'Cornada':['normal','golpe'],
  'Látigo Cepa':['grass','latigo'], 'Puño Fuego':['fire','golpe'], 'Puño Trueno':['electric','golpe'], 'Colmillo Ígneo':['fire','mordisco'],
  'Garra Dragón':['dragon','garra'], 'Picotazo':['flying','picotazo'], 'Pico Taladro':['flying','picotazo'], 'Ataque Ala':['flying','golpe'],
  'Doble Patada':['fighting','patada'], 'Patada Salto Alta':['fighting','embestida'], 'A Bocajarro':['fighting','embestida'], 'Roca Arrancada':['fighting','piedra'], 'Golpe Kárate':['fighting','golpe'], 'Sumisión':['fighting','cuerpo'],
  'Puño Dinámico':['fighting','golpe'], 'Patada Baja':['fighting','patada'], 'Picotazo Veneno':['poison','aguijon'], 'Doble Ataque':['bug','aguijon'],
  'Chupavidas':['bug','mordisco'], 'Tijera X':['bug','garra'], 'Lengüetazo':['ghost','latigo'], 'Martillazo':['water','garra'],
  'Desenrollar':['rock','cuerpo'], 'Hueso Palo':['ground','golpe'], 'Cabezazo Zen':['psychic','golpe'],

  'Ascuas':['fire','bola'], 'Pistola Agua':['water','chorro'], 'Burbuja':['water','burbujas'], 'Rayo Burbuja':['water','burbujas'],
  'Salpicadura':['water','burbujas'], 'Impactrueno':['electric','rayito'], 'Onda Trueno':['electric','rayito'], 'Chispa':['electric','rayito'],
  'Bola Voltio':['electric','bola'], 'Hoja Afilada':['grass','hojas'], 'Drenadoras':['grass','semillas'], 'Bomba Germen':['grass','semillas'],
  'Espora':['grass','polvo'], 'Somnífero':['grass','polvo'], 'Polvo Veneno':['poison','polvo'], 'Ácido':['poison','lodo'],
  'Residuos':['poison','lodo'], 'Bomba Lodo':['poison','lodo'], 'Pin Misil':['bug','agujas'], 'Disparo Demora':['bug','polvo'],
  'Supersónico':['normal','onda'], 'Canto':['normal','onda'], 'Beso Amoroso':['normal','onda'], 'Pisotón':['normal','suelo'],
  'Psicorrayo':['psychic','onda'], 'Confusión':['psychic','onda'], 'Tornado':['flying','tornado'], 'Remolino':['flying','tornado'],
  'Lanzarrocas':['rock','piedra'], 'Huesomerang':['ground','hueso'], 'Ataque Arena':['ground','polvo'], 'Rapidez':['normal','estrella'],
  'Día de Pago':['normal','monedas'], 'Bola Sombra':['ghost','bola'], 'Tinieblas':['ghost','onda'], 'Furia Dragón':['dragon','bola'],
  'Pulso Dragón':['dragon','bola'], 'Onda Vacío':['fighting','onda'], 'Bomba Huevo':['normal','bola'], 'Clavo Cañón':['normal','agujas'],
  'Viento Hielo':['ice','tornado'], 'Rayo Aurora':['ice','onda'], 'Brillo Mágico':['fairy','estrella'],

  'Hiperrayo':['normal','rayo'], 'Lanzallamas':['fire','rayo'], 'Llamarada':['fire','zona'], 'Giro Fuego':['fire','zona'],
  'Hidrobomba':['water','rayo'], 'Surf':['water','propia'], 'Rayo Hielo':['ice','rayo'], 'Ventisca':['ice','lluvia','cristal'],
  'Rayo Solar':['grass','rayo'], 'Danza Pétalo':['grass','lluvia','hoja'], 'Trueno':['electric','trueno'], 'Rayo':['electric','rayo'],
  'Terremoto':['ground','propia'], 'Fisura':['ground','propia'], 'Avalancha':['rock','lluvia','roca'], 'Psíquico':['psychic','zona'],
  'Come Sueños':['psychic','zona'], 'Maldición':['ghost','zona'], 'Sísmico':['fighting','zona'], 'Tóxico':['poison','zona'],
  'Zumbido':['bug','rayo'], 'Vendaval':['flying','zona'], 'Ataque Aéreo':['flying','rayo'], 'Fuerza Lunar':['fairy','rayo'],
  'Autodestrucción':['normal','propia'], 'Explosión':['normal','propia']
};

/* Los tres ataques (corto / medio / largo) de cada Pokémon de Kanto. */
const SETS = `1 Látigo Cepa|Drenadoras|Rayo Solar;2 Látigo Cepa|Hoja Afilada|Rayo Solar;3 Látigo Cepa|Bomba Germen|Rayo Solar;
4 Arañazo|Ascuas|Lanzallamas;5 Cuchillada|Ascuas|Lanzallamas;6 Garra Dragón|Ascuas|Llamarada;
7 Placaje|Pistola Agua|Hidrobomba;8 Mordisco|Burbuja|Hidrobomba;9 Cabezazo|Pistola Agua|Hidrobomba;
10 Placaje|Disparo Demora|Zumbido;11 Placaje|Disparo Demora|Zumbido;12 Placaje|Polvo Veneno|Psíquico;
13 Picotazo Veneno|Disparo Demora|Zumbido;14 Picotazo Veneno|Disparo Demora|Zumbido;15 Doble Ataque|Pin Misil|Tóxico;
16 Ataque Rápido|Tornado|Vendaval;17 Ataque Ala|Tornado|Vendaval;18 Ataque Ala|Remolino|Ataque Aéreo;
19 Hiper Colmillo|Rapidez|Hiperrayo;20 Hiper Colmillo|Rapidez|Hiperrayo;21 Picotazo|Tornado|Ataque Aéreo;22 Pico Taladro|Tornado|Ataque Aéreo;
23 Mordisco|Ácido|Tóxico;24 Atadura|Ácido|Tóxico;25 Ataque Rápido|Impactrueno|Trueno;26 Puño Trueno|Bola Voltio|Trueno;
27 Arañazo|Ataque Arena|Terremoto;28 Cuchillada|Ataque Arena|Terremoto;29 Arañazo|Ácido|Tóxico;30 Mordisco|Ácido|Tóxico;
31 Golpe Cuerpo|Bomba Lodo|Terremoto;32 Picotazo Veneno|Ácido|Tóxico;33 Doble Patada|Bomba Lodo|Tóxico;34 Doble Patada|Bomba Lodo|Terremoto;
35 Destructor|Brillo Mágico|Fuerza Lunar;36 Destructor|Brillo Mágico|Fuerza Lunar;37 Ataque Rápido|Ascuas|Giro Fuego;38 Ataque Rápido|Ascuas|Llamarada;
39 Destructor|Canto|Fuerza Lunar;40 Golpe Cuerpo|Canto|Hiperrayo;41 Chupavidas|Supersónico|Ataque Aéreo;42 Mordisco|Supersónico|Ataque Aéreo;
43 Placaje|Polvo Veneno|Danza Pétalo;44 Placaje|Ácido|Danza Pétalo;45 Placaje|Polvo Veneno|Rayo Solar;46 Arañazo|Espora|Rayo Solar;
47 Cuchillada|Espora|Rayo Solar;48 Placaje|Polvo Veneno|Psíquico;49 Chupavidas|Polvo Veneno|Psíquico;50 Arañazo|Ataque Arena|Terremoto;
51 Cuchillada|Ataque Arena|Fisura;52 Arañazo|Día de Pago|Hiperrayo;53 Cuchillada|Día de Pago|Hiperrayo;54 Arañazo|Confusión|Hidrobomba;
55 Arañazo|Confusión|Hidrobomba;56 Golpe Kárate|Roca Arrancada|A Bocajarro;57 Golpe Kárate|Roca Arrancada|A Bocajarro;58 Mordisco|Ascuas|Lanzallamas;
59 Colmillo Ígneo|Ascuas|Llamarada;60 Placaje|Burbuja|Hidrobomba;61 Destructor|Burbuja|Hidrobomba;62 Sumisión|Rayo Burbuja|Hidrobomba;
63 Placaje|Confusión|Psíquico;64 Cabezazo Zen|Psicorrayo|Psíquico;65 Cabezazo Zen|Psicorrayo|Psíquico;66 Golpe Kárate|Roca Arrancada|A Bocajarro;
67 Patada Baja|Roca Arrancada|A Bocajarro;68 Puño Dinámico|Roca Arrancada|A Bocajarro;69 Látigo Cepa|Ácido|Rayo Solar;70 Látigo Cepa|Hoja Afilada|Rayo Solar;
71 Látigo Cepa|Hoja Afilada|Rayo Solar;72 Atadura|Ácido|Hidrobomba;73 Constricción|Ácido|Hidrobomba;74 Placaje|Lanzarrocas|Autodestrucción;
75 Desenrollar|Lanzarrocas|Terremoto;76 Desenrollar|Lanzarrocas|Explosión;77 Placaje|Ascuas|Giro Fuego;78 Ataque Rápido|Ascuas|Llamarada;
79 Cabezazo|Pistola Agua|Psíquico;80 Cabezazo|Pistola Agua|Psíquico;81 Placaje|Impactrueno|Rayo;82 Placaje|Onda Trueno|Rayo;
83 Corte|Tornado|Ataque Aéreo;84 Golpe Furia|Tornado|Ataque Aéreo;85 Pico Taladro|Tornado|Ataque Aéreo;86 Cabezazo|Rayo Aurora|Rayo Hielo;
87 Cabezazo|Rayo Aurora|Ventisca;88 Destructor|Residuos|Tóxico;89 Destructor|Bomba Lodo|Tóxico;90 Tenaza|Clavo Cañón|Rayo Hielo;
91 Tenaza|Clavo Cañón|Ventisca;92 Lengüetazo|Tinieblas|Maldición;93 Lengüetazo|Bola Sombra|Come Sueños;94 Lengüetazo|Bola Sombra|Come Sueños;
95 Atadura|Lanzarrocas|Avalancha;96 Destructor|Confusión|Come Sueños;97 Destructor|Psicorrayo|Psíquico;98 Agarre|Burbuja|Hidrobomba;
99 Martillazo|Burbuja|Hidrobomba;100 Placaje|Chispa|Autodestrucción;101 Placaje|Rapidez|Explosión;102 Placaje|Drenadoras|Psíquico;
103 Cabezazo Zen|Bomba Huevo|Rayo Solar;104 Hueso Palo|Huesomerang|Terremoto;105 Hueso Palo|Huesomerang|Terremoto;
106 Doble Patada|Roca Arrancada|Patada Salto Alta;107 Megapuño|Roca Arrancada|A Bocajarro;108 Lengüetazo|Supersónico|Hiperrayo;
109 Placaje|Residuos|Autodestrucción;110 Placaje|Residuos|Explosión;111 Cornada|Lanzarrocas|Terremoto;112 Cornada|Lanzarrocas|Fisura;
113 Destructor|Bomba Huevo|Hiperrayo;114 Látigo Cepa|Drenadoras|Rayo Solar;115 Megapuño|Pisotón|Hiperrayo;116 Placaje|Burbuja|Hidrobomba;
117 Placaje|Rayo Burbuja|Hidrobomba;118 Cornada|Pistola Agua|Surf;119 Cornada|Pistola Agua|Surf;120 Placaje|Rapidez|Hidrobomba;
121 Placaje|Rapidez|Psíquico;122 Destructor|Confusión|Psíquico;123 Tijera X|Remolino|Ataque Aéreo;124 Destructor|Beso Amoroso|Ventisca;
125 Puño Trueno|Impactrueno|Trueno;126 Puño Fuego|Ascuas|Lanzallamas;127 Agarre|Disparo Demora|Sísmico;128 Cornada|Pisotón|Hiperrayo;
129 Placaje|Salpicadura|Hidrobomba;130 Mordisco|Furia Dragón|Hiperrayo;131 Golpe Cuerpo|Canto|Rayo Hielo;132 Placaje|Rapidez|Hiperrayo;
133 Ataque Rápido|Rapidez|Hiperrayo;134 Ataque Rápido|Pistola Agua|Hidrobomba;135 Doble Patada|Impactrueno|Trueno;136 Mordisco|Ascuas|Lanzallamas;
137 Placaje|Psicorrayo|Hiperrayo;138 Mordisco|Pistola Agua|Hidrobomba;139 Mordisco|Clavo Cañón|Hidrobomba;140 Arañazo|Pistola Agua|Hidrobomba;
141 Cuchillada|Pistola Agua|Hidrobomba;142 Mordisco|Tornado|Hiperrayo;143 Golpe Cuerpo|Pisotón|Hiperrayo;144 Picotazo|Viento Hielo|Ventisca;
145 Pico Taladro|Onda Trueno|Trueno;146 Ataque Ala|Ascuas|Llamarada;147 Atadura|Furia Dragón|Hiperrayo;148 Atadura|Furia Dragón|Hiperrayo;
149 Garra Dragón|Pulso Dragón|Hiperrayo;150 Cabezazo Zen|Psicorrayo|Psíquico;151 Destructor|Bola Sombra|Psíquico`;
const MOVESET = {};
SETS.split(';').forEach(l => { const m = l.trim().match(/^(\d+) (.+)$/); if(m) MOVESET[m[1]] = m[2].split('|'); });
const FORMA_FX = {bola:'bola', chorro:'gota', onda:'anillo', hojas:'hoja', agujas:'aguja', piedra:'roca', rayito:'chispa', polvo:'nube',
  estrella:'estrella', lodo:'lodo', burbujas:'burbuja', tornado:'tornado', hueso:'hueso', semillas:'semilla', suelo:'suelo', monedas:'moneda'};
function movDe(p, alc){
  const lista = MOVESET[p.id] || ['Placaje', 'Rapidez', 'Hiperrayo'];
  const n = lista[ATAQUES.indexOf(alc)], d = ATQ[n] || ['normal', alc === 'corto' ? 'golpe' : (alc === 'medio' ? 'bola' : 'rayo')];
  return {n, tipo:d[0], fx:d[1], forma:d[2] || FORMA_FX[d[1]] || 'bola'};
}
const nombreAtaque = (p, alc) => movDe(p, alc).n;
/* Ataques medios que se ven distinto a lo que da su efecto genérico. */
const FORMA_MOV = {'Ascuas':'llama', 'Furia Dragón':'llama', 'Pulso Dragón':'llama', 'Canto':'nota', 'Beso Amoroso':'corazon',
  'Rayo Aurora':'arcoiris', 'Psicorrayo':'arcoiris', 'Bola Voltio':'voltio', 'Bomba Huevo':'huevo', 'Onda Vacío':'medialuna'};

const PART = {
  normal:  {c:['#A8A77A', '#ffffff'], g:0},
  fire:    {c:['#EE8130', '#F7D02C', '#FFF3B0'], g:-1},
  water:   {c:['#6390F0', '#BCD2FF', '#ffffff'], g:1},
  electric:{c:['#F7D02C', '#ffffff'], g:0, m:'zap'},
  grass:   {c:['#7AC74C', '#3F8A2A'], g:.8},
  ice:     {c:['#96D9D6', '#ffffff'], g:.4},
  fighting:{c:['#C22E28', '#ffffff', '#F7D02C'], g:0},
  poison:  {c:['#A33EA1', '#D68AD4'], g:-.6},
  ground:  {c:['#E2BF65', '#8A6D2A'], g:1.2},
  flying:  {c:['#ffffff', '#A98FF3'], g:0, m:'viento'},
  psychic: {c:['#F95587', '#FFD0DF'], g:0, m:'anillo'},
  bug:     {c:['#A6B91A', '#DFE88A'], g:.5},
  rock:    {c:['#B6A136', '#6D5F1F'], g:1.6},
  ghost:   {c:['#735797', '#2B1F45', '#C9B5F0'], g:-.8},
  dragon:  {c:['#6F35FC', '#B49CFF'], g:0},
  fairy:   {c:['#D685AD', '#ffffff', '#FFE27A'], g:-.7},
  dark:    {c:['#705746', '#241a14'], g:0},
  steel:   {c:['#B7B7CE', '#ffffff'], g:.5}
};
const partDe = tipo => PART[tipo] || PART.normal;

/* Estilos del rival: peso de cada acción en su guion. */
const ESTILOS = {
  agresivo:    {nombre:'Agresivo',    w:{acercar:2, corto:4, medio:1.5, largo:1, orbitar:1, esquivar:.5}, reflejo:.35},
  tirador:     {nombre:'Tirador',     w:{acercar:.5, corto:.6, medio:4, largo:2.5, orbitar:2, retroceder:1.5, esquivar:.6}, reflejo:.45},
  escurridizo: {nombre:'Escurridizo', w:{acercar:1, corto:2, medio:2, largo:1.5, orbitar:3, retroceder:1, esquivar:2}, reflejo:.65},
  equilibrado: {nombre:'Equilibrado', w:{acercar:1.5, corto:2.5, medio:2.5, largo:1.5, orbitar:2, retroceder:.5, esquivar:1}, reflejo:.45}
};
const NOMBRES_RIVAL = ['Marcos', 'Lucía', 'Nico', 'Sofi', 'Facu', 'Cami', 'Tomi', 'Vale', 'Lauti', 'Mica'];

const REDUCE = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- estado ---------------- */
let AR = null;       // batalla en curso
let TOK = 0;         // se incrementa al cerrar: corta el bucle y los pendientes
let ST = null, SHAKE = null, FX = null, BG = null, PISO = null;
let E = {};          // entidades en pantalla: E.yo y E.riv
let G = {W:360, H:480, K:1, cx:180, cy:300, rx:150, ry:110, pz:.7};
let RAF = 0, RO = null;

const $ = id => document.getElementById(id);
const azar = (a, b) => a + Math.random() * (b - a);
const elige = arr => arr[Math.floor(Math.random() * arr.length)];
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const bstDe = p => (typeof BST !== 'undefined' && BST[p.id - 1]) || 300;
const u = () => Math.min(G.W, G.H * 1.4) / 100;       // unidad de longitud de efectos y velocidades
const otro = e => e.lado === 'yo' ? E.riv : E.yo;

function mk(cls, css, padre){
  const d = document.createElement('div');
  d.className = cls;
  if(css) Object.assign(d.style, css);
  (padre || FX).appendChild(d);
  return d;
}

/* ---------------- sonido 8-bit ---------------- */
let AC = null, RUIDO = null, SONIDO = true;
try{ SONIDO = localStorage.getItem('arena-sonido') !== '0'; }catch(e){}
function audio(){
  if(!AC){ const C = window.AudioContext || window.webkitAudioContext; if(!C) return null; AC = new C(); }
  if(AC.state === 'suspended') AC.resume();
  return AC;
}
function tono(f1, f2, dur, tipo, vol, demora){
  const a = audio(); if(!a) return;
  const t = a.currentTime + (demora || 0), o = a.createOscillator(), g = a.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
}
function ruido(dur, vol, frec, demora){
  const a = audio(); if(!a) return;
  if(!RUIDO){
    RUIDO = a.createBuffer(1, a.sampleRate * .5, a.sampleRate);
    const d = RUIDO.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + (demora || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = RUIDO; f.type = 'bandpass'; f.frequency.value = frec;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dur + .02);
}
const SFX = {
  golpe:   () => { ruido(.12, .25, 900); tono(180, 60, .12, 'square', .07); },
  critico: () => { ruido(.22, .35, 1400); tono(520, 90, .25, 'square', .09); tono(780, 780, .08, 'square', .05, .05); },
  garra:   () => ruido(.08, .16, 4200),
  disparo: () => tono(300, 900, .12, 'square', .045),
  carga:   () => tono(120, 600, .6, 'sawtooth', .03),
  rayo:    () => { tono(900, 200, .4, 'sawtooth', .05); ruido(.35, .12, 2500); },
  lluvia:  () => { ruido(.5, .14, 700); tono(400, 120, .5, 'triangle', .05); },
  esquive: () => ruido(.16, .1, 3200),
  ko:      () => tono(600, 70, .7, 'square', .08),
  cuenta:  () => tono(660, 660, .1, 'square', .05),
  pelea:   () => { tono(880, 880, .1, 'square', .06); tono(1320, 1320, .2, 'square', .06, .1); },
  gana:    () => [523, 659, 784, 1046].forEach((f, i) => tono(f, f, .16, 'square', .06, i * .12)),
  pierde:  () => [392, 330, 262].forEach((f, i) => tono(f, f * .98, .22, 'triangle', .08, i * .18)),
  sale:    () => { tono(500, 1000, .12, 'square', .04); ruido(.1, .08, 2000, .08); }
};
function sfx(n){ if(!SONIDO || window.__arenaMudo) return; try{ SFX[n](); }catch(e){} }

/* ---------------- fondo en píxeles ----------------
   Se dibuja en un canvas chico (1 píxel = K píxeles de pantalla) y se agranda
   sin suavizar. Se rehace al cambiar el tamaño. */
function rng(sem){ let s = sem >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function medir(){
  const W = ST.clientWidth, H = ST.clientHeight;
  G.W = W; G.H = H;
  G.K = Math.max(1, Math.floor(Math.min(W / 300, H / 210) * 4) / 4);
  const ctrl = $('arCtrl');
  const margen = ctrl && getComputedStyle(ctrl).position === 'absolute' ? Math.min(130, H * .26) : 0;
  const disp = H - margen;
  G.rx = Math.min(W * .42, (W / 2 - 40 * G.K * ESCALA_POKE.yo) / .96);   // que un sprite en el borde no se salga de la pantalla
  /* el piso va debajo de los HUD y arriba de los controles */
  const hud = $('arHud-riv'), hudH = hud ? hud.offsetHeight + 8 : 90;
  G.hudH = hudH;
  const top = Math.max(hudH * .8, disp * .2), bajo = disp - 6;
  G.ry = Math.min((bajo - top) / 2 / 1.07, G.rx * .8);
  G.cx = W / 2;
  G.cy = top + (bajo - top) / 2;
  G.pz = Math.max(.5, G.ry / G.rx);
}

function pintarFondo(){
  const K = G.K, cw = Math.max(40, Math.ceil(G.W / K)), ch = Math.max(40, Math.ceil(G.H / K));
  BG.width = cw; BG.height = ch;
  const g = BG.getContext('2d', {willReadFrequently:true});
  g.imageSmoothingEnabled = false;
  const ex = G.cx / K, ey = G.cy / K, erx = G.rx / K, ery = G.ry / K;
  const R = rng(7);

  g.fillStyle = '#04050a'; g.fillRect(0, 0, cw, ch);

  /* pared del galpón al fondo, casi invisible en la oscuridad */
  const pared = Math.max(16, ey - ery * 1.9);
  for(let y = 0, fila = 0; y < pared; y += 5, fila++){
    for(let x = -(fila % 2) * 6; x < cw; x += 12){
      const v = 7 + Math.floor(R() * 5);
      g.fillStyle = `rgb(${v},${v + 1},${v + 6})`; g.fillRect(x, y, 11, 4);
    }
  }
  g.fillStyle = '#0b0d16'; g.fillRect(0, pared - 2, cw, 2);

  /* piso de cemento: la luz de la lámpara cae al centro y se pierde en lo oscuro */
  g.save(); g.translate(ex, ey); g.scale(1, ery / erx);
  const L = erx * 2.1;
  const luz = g.createRadialGradient(0, -erx * .05, 0, 0, 0, L);
  luz.addColorStop(0, '#d8c79c'); luz.addColorStop(.22, '#a89d7c'); luz.addColorStop(.42, '#5a5648');
  luz.addColorStop(.6, '#22232a'); luz.addColorStop(.8, '#0c0d13'); luz.addColorStop(1, '#05060b');
  g.fillStyle = luz; g.fillRect(-L * 1.6, -L * 1.2, L * 3.2, L * 2.4);
  /* losas, grietas y manchas */
  const lado = Math.max(8, erx * .16);
  g.fillStyle = 'rgba(0,0,0,.18)';
  for(let x = -L; x < L; x += lado) g.fillRect(Math.round(x), -L, 1, L * 2);
  for(let y = -L; y < L; y += lado) g.fillRect(-L, Math.round(y), L * 2, 1.4);
  for(let k = 0; k < 14; k++){
    const r = erx * azar(.06, .2);
    g.fillStyle = `rgba(0,0,0,${azar(.06, .16)})`;
    g.beginPath(); g.ellipse(azar(-erx, erx) * 1.2, azar(-erx, erx) * 1.2, r, r * azar(.5, 1), R() * 3, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
  for(let k = 0; k < 22; k++){
    let x = azar(-erx, erx) * 1.3, y = azar(-erx, erx) * 1.3;
    g.beginPath(); g.moveTo(x, y);
    for(let j = 0; j < 4; j++){ x += azar(-1, 1) * erx * .08; y += azar(-1, 1) * erx * .08; g.lineTo(x, y); }
    g.stroke();
  }
  /* la arena pintada a mano, gastada: aro, línea del medio y la Pokébola */
  g.globalAlpha = .55;
  g.strokeStyle = '#e9e2cf'; g.lineWidth = 2.2;
  for(let a = 0; a < Math.PI * 2; a += .09){
    if(R() < .16) continue;                       // pintura saltada
    g.beginPath(); g.arc(0, 0, erx, a, a + .07); g.stroke();
  }
  g.lineWidth = 1.2; g.globalAlpha = .3;
  g.beginPath(); g.arc(0, 0, erx * .86, 0, Math.PI * 2); g.stroke();
  g.globalAlpha = .4; g.fillStyle = '#e9e2cf'; g.fillRect(-erx, -.7, erx * 2, 1.4);
  const rb = erx * .19;
  g.globalAlpha = .62;
  g.fillStyle = '#b5463c'; g.beginPath(); g.arc(0, 0, rb, Math.PI, 0); g.fill();
  g.fillStyle = '#ddd3b8'; g.beginPath(); g.arc(0, 0, rb, 0, Math.PI); g.fill();
  g.strokeStyle = '#1e2030'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, rb, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(-rb, 0); g.lineTo(rb, 0); g.stroke();
  g.fillStyle = '#ddd3b8'; g.beginPath(); g.arc(0, 0, rb * .32, 0, 7); g.fill(); g.stroke();
  g.globalAlpha = 1;
  /* brillo de la lámpara reflejado en el piso */
  const brillo = g.createRadialGradient(0, -erx * .12, 0, 0, -erx * .12, erx * .45);
  brillo.addColorStop(0, 'rgba(255,248,220,.38)'); brillo.addColorStop(1, 'rgba(255,248,220,0)');
  g.fillStyle = brillo; g.fillRect(-erx, -erx, erx * 2, erx * 2);
  g.restore();

  /* cosas tiradas en la penumbra: cajones, un barril y una tarima */
  const cajon = (x, y, w, h) => {
    g.fillStyle = '#17140f'; g.fillRect(x, y - h, w, h);
    g.fillStyle = '#231e16'; g.fillRect(x, y - h, w, 2);
    g.fillStyle = '#0c0a07'; g.fillRect(x + 1, y - h + 3, w - 2, 1); g.fillRect(x + 1, y - h * .5, w - 2, 1);
    g.fillRect(x + 1, y - h + 1, 1, h - 2); g.fillRect(x + w - 2, y - h + 1, 1, h - 2);
  };
  const barril = (x, y, w, h) => {
    g.fillStyle = '#141619'; g.fillRect(x, y - h, w, h);
    g.fillStyle = '#20242a'; g.fillRect(x + 1, y - h, Math.max(1, w * .25), h);
    g.fillStyle = '#0a0b0d'; g.fillRect(x, y - h * .7, w, 1); g.fillRect(x, y - h * .3, w, 1);
  };
  const s = Math.max(6, erx * .09);
  cajon(ex - erx * 1.55, ey - ery * .55, s * 1.6, s * 1.3); cajon(ex - erx * 1.42, ey - ery * .6, s * 1.2, s * 2);
  barril(ex + erx * 1.38, ey - ery * .62, s, s * 1.5); cajon(ex + erx * 1.5, ey - ery * .5, s * 1.5, s * 1.2);
  cajon(ex - erx * 1.65, ey + ery * .7, s * 1.8, s * 1.1); barril(ex + erx * 1.6, ey + ery * .75, s * 1.1, s * 1.6);

  /* viñeta fuerte: todo lo que no está bajo la lámpara se va a negro */
  const vig = g.createRadialGradient(ex, ey, Math.min(erx, ery) * .9, ex, ey, Math.max(cw, ch) * .7);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.75)');
  g.fillStyle = vig; g.fillRect(0, 0, cw, ch);
  posterizar(g, cw, ch);
}

function posterizar(g, cw, ch){
  const img = g.getImageData(0, 0, cw, ch), d = img.data, paso = 14;
  for(let y = 0; y < ch; y++) for(let x = 0; x < cw; x++){
    const i = (y * cw + x) * 4;
    const b = (BAYER[(x & 3) + (y & 3) * 4] - 7.5) * 1.1;
    d[i] = Math.min(255, Math.max(0, Math.round((d[i] + b) / paso) * paso));
    d[i + 1] = Math.min(255, Math.max(0, Math.round((d[i + 1] + b) / paso) * paso));
    d[i + 2] = Math.min(255, Math.max(0, Math.round((d[i + 2] + b) / paso) * paso));
  }
  g.putImageData(img, 0, 0);
}

function acomodarEscena(){
  const th = 72 * G.K * ESCALA_ENTRENADOR, tw = 48 * G.K * ESCALA_ENTRENADOR;
  [['riv', G.cx - G.rx * 1.12, G.cy - G.ry * .15], ['yo', G.cx + G.rx * 1.12, G.cy + G.ry * .25]].forEach(([l, x, y]) => {
    const t = ST.querySelector('.ar-ent-sprite.' + l);
    x = Math.min(G.W - tw / 2 - 2, Math.max(tw / 2 + 2, x));
    Object.assign(t.style, {width:tw + 'px', height:th + 'px', left:x + 'px', top:y + 'px', zIndex:Math.round(y)});
  });
  /* lámpara colgante sobre el centro y su cono de luz hasta el piso */
  const lamp = ST.querySelector('.ar-lampara'), cono = ST.querySelector('.ar-cono');
  const ly = Math.min(Math.max(G.hudH * .95, G.cy - G.ry * 2.2), G.cy - G.ry * .9), tam = Math.max(18, G.rx * .14);   // debajo de los botones de arriba
  Object.assign(lamp.style, {left:G.cx + 'px', top:'0px', height:ly + 'px', '--tam':tam + 'px'});
  Object.assign(cono.style, {left:G.cx + 'px', top:(ly + tam * .3) + 'px', height:(G.cy + G.ry * .9 - ly) + 'px', width:(G.rx * 2.3) + 'px'});
  const motas = ST.querySelector('.ar-motas');
  if(motas && !motas.childElementCount && !REDUCE){
    for(let i = 0; i < 16; i++){
      const m = document.createElement('i');
      m.style.left = azar(30, 70) + '%'; m.style.top = azar(5, 90) + '%';
      m.style.animationDuration = azar(5, 11) + 's'; m.style.animationDelay = -azar(0, 10) + 's';
      motas.appendChild(m);
    }
  }
  if(motas) Object.assign(motas.style, {left:G.cx + 'px', top:(ly + tam) + 'px', height:(G.cy - ly) + 'px', width:(G.rx * 1.2) + 'px'});
}

function alCambiarTamano(){
  if(!ST) return;
  medir(); pintarFondo(); acomodarEscena();
  ['yo', 'riv'].forEach(l => { if(E[l]) tamanoSprite(E[l]); });
}

/* ---------------- efectos pixel ---------------- */
/* Partículas con forma: llama, gota, chispa, hoja, cristal, burbuja, humo, nota, corazón,
   pluma, estrella, roca (o un cuadradito si no se pide forma). */
function particula(x, y, col, tam, dx, dy, dur, o){
  if(!FX) return;
  o = o || {};
  const f = o.forma, texto = f === 'nota' || f === 'corazon';
  const d = mk('ar-p' + (f ? ' p-' + f : ''), {left:x + 'px', top:y + 'px', width:tam + 'px', height:(f === 'chispa' ? Math.max(2, tam * .28) : tam) + 'px',
    background:texto || f === 'burbuja' ? 'none' : col, color:col, fontSize:(tam * 1.5) + 'px', opacity:0}, o.capa);
  if(texto) d.textContent = f === 'nota' ? (Math.random() < .5 ? '♪' : '♫') : '♥';
  const g = o.g || 0, rot = o.rot || 0, s0 = o.s0 || 1, s1 = o.s1 == null ? 1 : o.s1, r0 = o.rot0 || 0;
  const T = (px, py, r, s) => `translate(-50%,-50%) translate(${px}px,${py}px) rotate(${r}deg) scale(${s})`;
  const kf = [
    {transform:T(0, 0, r0, s0), opacity:o.op || 1},
    {transform:T(dx * .6, dy * .6 + g * .3, r0 + rot, (s0 + s1) / 2), opacity:o.op || 1, offset:.6},
    {transform:T(dx, dy + g, r0 + rot * 2, s1), opacity:0}
  ];
  if(o.colores){ kf[0].backgroundColor = o.colores[0]; kf[1].backgroundColor = o.colores[1]; kf[2].backgroundColor = o.colores[2]; }
  const a = d.animate(kf, {duration:dur, delay:o.delay || 0, easing:o.suave ? 'ease-out' : 'steps(7,end)', fill:'forwards'});
  const quitar = () => d.remove();
  a.finished.then(quitar, quitar);
}

/* Cómo estalla cada elemento: formas, colores, gravedad (+ cae, − sube) y movimiento. */
const ELEM = {
  fire:    {f:['llama'], c:['#FFF3B0', '#F7D02C', '#EE8130'], g:-1.5, seq:['#FFF6C8', '#F08A2C', '#7a2410']},
  water:   {f:['gota', 'gota', 'burbuja'], c:['#6390F0', '#BCD2FF', '#ffffff'], g:1.7},
  electric:{f:['chispa'], c:['#F7D02C', '#ffffff', '#FFF59A'], g:0, m:'zap'},
  grass:   {f:['hoja'], c:['#7AC74C', '#3F8A2A', '#B5E07A'], g:.7, gira:true},
  ice:     {f:['cristal', 'cristal', null], c:['#96D9D6', '#ffffff', '#D8F6FF'], g:.4},
  fighting:{f:['estrella', null], c:['#ffffff', '#F7D02C', '#ff8a5c'], g:0},
  poison:  {f:['burbuja', 'humo'], c:['#A33EA1', '#D68AD4', '#6b2a6a'], g:-.8},
  ground:  {f:['roca', 'humo'], c:['#E2BF65', '#8A6D2A', '#c9b98a'], g:1.3},
  flying:  {f:['pluma', null], c:['#ffffff', '#DCD3FF'], g:.25, m:'viento', gira:true},
  psychic: {f:['burbuja', 'estrella'], c:['#F95587', '#FFD0DF', '#C77DFF'], g:0, m:'anillo'},
  bug:     {f:[null, 'hoja'], c:['#A6B91A', '#DFE88A'], g:.5},
  rock:    {f:['roca'], c:['#B6A136', '#6D5F1F', '#8a7a3a'], g:1.9},
  ghost:   {f:['humo'], c:['#735797', '#2B1F45', '#C9B5F0'], g:-1},
  dragon:  {f:['llama'], c:['#B49CFF', '#6F35FC', '#ffffff'], g:-.9, seq:['#ffffff', '#9b6bff', '#2c1470']},
  fairy:   {f:['estrella', 'corazon', 'estrella'], c:['#FFB3D9', '#ffffff', '#FFE27A'], g:-.6},
  dark:    {f:['humo'], c:['#3a2c24', '#705746', '#120c08'], g:-.5},
  steel:   {f:['chispa', null], c:['#E0E0F0', '#ffffff'], g:.6},
  normal:  {f:['estrella', null], c:['#ffffff', '#E8E4D0'], g:.2}
};
const elemDe = t => ELEM[t] || ELEM.normal;

/* Una partícula suelta del elemento (para estelas y auras). */
function chispa(x, y, tipo, k, dx, dy, dur, extra){
  const st = elemDe(tipo), U = u(), f = elige(st.f), tam = Math.max(2, azar(.9, 1.8) * U * (k || 1));
  const o = Object.assign({forma:f, g:(st.g || 0) * U * 4 * (k || 1)}, extra);
  if(f === 'llama'){ Object.assign(o, {s0:.6, s1:1.8, colores:st.seq, suave:true}); }
  else if(f === 'humo'){ Object.assign(o, {s0:.6, s1:2.4, op:.7, suave:true}); dur *= 1.5; }
  else if(f === 'burbuja'){ Object.assign(o, {suave:true}); }
  else if(f === 'chispa'){ o.rot0 = Math.atan2(dy, dx) * 180 / Math.PI; }
  else if(f === 'hoja' || f === 'pluma' || f === 'roca' || f === 'estrella' || f === 'cristal'){ o.rot = azar(-180, 180); }
  particula(x, y, elige(st.c), f === 'chispa' ? tam * 2.4 : tam, dx, dy, dur, o);
}

function estallido(x, y, tipo, n, k){
  const st = elemDe(tipo), U = u();
  n = REDUCE ? Math.ceil(n / 3) : n; k = k || 1;
  for(let i = 0; i < n; i++){
    const ang = Math.random() * Math.PI * 2, dist = azar(3, 9) * U * k;
    let dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    if(st.m === 'viento'){ dy *= .25; dx *= 1.7; }
    if(st.m === 'anillo'){ dx = Math.cos(ang) * 8 * U * k; dy = Math.sin(ang) * 8 * U * k; }
    if(st.m === 'zap'){ dx = Math.round(dx / U) * U; dy = Math.round(dy / U) * U; }
    chispa(x, y, tipo, k, dx, dy, azar(380, 640));
  }
}

/* Estela que deja un proyectil o un golpe en movimiento. */
function rastro(x, y, tipo, k){
  const U = u();
  chispa(x + azar(-1, 1) * U, y + azar(-1, 1) * U, tipo, (k || 1) * .8, azar(-1.5, 1.5) * U, azar(-1.5, 1.5) * U, 340);
}

function polvo(x, y, n, k){
  const U = u();
  for(let i = 0; i < n; i++){
    particula(x + azar(-2, 2) * U, y, elige(['#b9ae8a', '#8f8768', '#d6cba3']), Math.max(2, azar(.7, 1.3) * U * (k || 1)),
      azar(-3, 3) * U, -azar(.5, 2.2) * U, azar(320, 520), {op:.7, capa:PISO});
  }
}

function texto(x, y, txt, color, tam){
  if(!FX) return;
  const d = mk('ar-txt', {left:x + 'px', top:y + 'px', color:color || '#fff',
    fontSize:Math.max(12, u() * (tam || 3.4)) + 'px'});
  d.textContent = txt;
  const a = d.animate([
    {transform:'translate(-50%,0) scale(1.6)', opacity:0},
    {transform:`translate(-50%,${-u() * 2}px) scale(1)`, opacity:1, offset:.18},
    {transform:`translate(-50%,${-u() * 7}px) scale(1)`, opacity:1, offset:.75},
    {transform:`translate(-50%,${-u() * 9}px) scale(.9)`, opacity:0}
  ], {duration:1050, easing:'steps(12,end)', fill:'forwards'});
  const quitar = () => d.remove();
  a.finished.then(quitar, quitar);
}

function sacudir(fuerza, zoom){
  if(REDUCE || !SHAKE) return;
  const p = u() * (fuerza || 1), z = zoom ? 1.03 : 1;
  SHAKE.animate([
    {transform:`translate(0,0) scale(${z})`}, {transform:`translate(${-p}px,${p * .4}px) scale(${z})`},
    {transform:`translate(${p}px,${-p * .4}px)`}, {transform:`translate(${-p * .6}px,0)`}, {transform:'translate(0,0)'}
  ], {duration:280, easing:'steps(5,end)'});
}

function tajos(x, y, color, dir){
  const U = u(), ang = dir < 0 ? 35 : -35;
  for(let i = 0; i < 3; i++){
    const d = mk('ar-tajo', {left:(x + (i - 1) * 2.2 * U) + 'px', top:(y + (i - 1) * 1.1 * U) + 'px',
      width:(9 * U) + 'px', height:Math.max(3, 1 * U) + 'px', background:'#fff', boxShadow:`0 0 0 ${Math.max(1, U * .4)}px ${color}`});
    const a = d.animate([
      {transform:`translate(-50%,-50%) rotate(${ang}deg) scaleX(0)`, opacity:1},
      {transform:`translate(-50%,-50%) rotate(${ang}deg) scaleX(1)`, opacity:1, offset:.45},
      {transform:`translate(-50%,-50%) rotate(${ang}deg) scaleX(1)`, opacity:0}
    ], {duration:340, delay:i * 60, easing:'steps(6,end)', fill:'both'});
    const quitar = () => d.remove();
    a.finished.then(quitar, quitar);
  }
}

function destello(x, y, k){
  if(!FX) return;
  const f = mk('ar-flash', {left:x + 'px', top:y + 'px', width:(10 * u() * (k || 1)) + 'px', height:(10 * u() * (k || 1)) + 'px'});
  const a = f.animate([{transform:'translate(-50%,-50%) scale(.2)', opacity:.95}, {transform:'translate(-50%,-50%) scale(2.6)', opacity:0}],
    {duration:380, easing:'steps(6,end)'});
  const q = () => f.remove(); a.finished.then(q, q);
}

/* Marca que queda en el piso (quemadura, charco, cráter) y se va borrando. */
function marca(x, y, r, col){
  if(!PISO) return;
  const d = mk('ar-marca', {left:x + 'px', top:y + 'px', width:r * 2 + 'px', height:r * 2 * G.pz + 'px',
    background:`radial-gradient(closest-side, rgba(10,10,20,.55), ${col}55 60%, transparent 100%)`}, PISO);
  const a = d.animate([{opacity:.95}, {opacity:.95, offset:.6}, {opacity:0}], {duration:6500, fill:'forwards'});
  const q = () => d.remove(); a.finished.then(q, q);
}

/* Copia del sprite que se desvanece: estela al esquivar o embestir. */
function fantasma(e, col){
  if(!PISO || REDUCE || !e.spr.naturalWidth) return;
  const s = ST.getBoundingClientRect(), r = e.spr.getBoundingClientRect();
  if(!r.width) return;
  const g = document.createElement('img');
  g.src = e.spr.src; g.alt = ''; g.className = 'ar-fant';
  Object.assign(g.style, {left:(r.left - s.left) + 'px', top:(r.top - s.top) + 'px', width:r.width + 'px', height:r.height + 'px',
    filter:`brightness(1.7) drop-shadow(0 0 3px ${col})`, transform:`scaleX(${e.flipAp})`});
  PISO.appendChild(g);
  const a = g.animate([{opacity:.5}, {opacity:0}], {duration:260, easing:'steps(4,end)', fill:'forwards'});
  const q = () => g.remove(); a.finished.then(q, q);
}

/* En los golpes grandes la lámpara se hamaca y parpadea. */
function festejo(fuerte){
  if(!ST || REDUCE) return;
  const l = ST.querySelector('.ar-luz');
  if(l) l.animate([{transform:'rotate(0)', opacity:1}, {transform:`rotate(${fuerte ? 4 : 2}deg)`, opacity:.55, offset:.15},
    {transform:`rotate(${fuerte ? -3 : -1.5}deg)`, opacity:1, offset:.4}, {transform:'rotate(1.5deg)', opacity:.75, offset:.6}, {transform:'rotate(0)', opacity:1}],
    {duration:fuerte ? 1200 : 700, easing:'ease-in-out'});
}

/* ---------------- entidades ---------------- */
function crearMon(p){
  const bst = bstDe(p), max = Math.round(60 + bst * .22);
  return {p, bst, max, hp:max, en:EN_MAX, vivo:true, st:statsDe(p)};
}
function crearEntidad(lado){
  const w = $('arMon-' + lado);
  const e = {lado, wrap:w, cuerpo:w.querySelector('.ar-cuerpo'), flip:w.querySelector('.ar-flip'), giroEl:w.querySelector('.ar-giro'),
    rot:w.querySelector('.ar-rot'), imgs:{frente:w.querySelector('.ar-spr.frente'), espalda:w.querySelector('.ar-spr.espalda')},
    sombra:w.querySelector('.ar-sombra'), refl:w.querySelector('.ar-reflejo img'),
    vista:lado === 'yo' ? 'espalda' : 'frente', vistaQ:null, flipAp:1, girando:false, giroT:0,
    x:0, y:0, vx:0, vy:0, rvx:0, rvy:0, px:null, py:null, kx:0, ky:0, fase:0, polvoT:0, fantT:0, cara:lado === 'yo' ? -1 : 1,
    quieto:0, pose:null, accion:null, cd:{corto:0, medio:0, largo:0, esq:0}, stun:0, invul:0, tEsq:0,
    rodando:false, w:40, h:40, s:1, mon:null, aparece:0, bot:null};
  /* el sprite que se ve: de frente o de espalda según hacia dónde mira */
  Object.defineProperty(e, 'spr', {get(){ return this.imgs[this.vista]; }});
  return e;
}
const pie = e => ({x:G.cx + e.x * G.rx, y:G.cy + e.y * G.ry});
const cen = e => { const p = pie(e); return {x:p.x, y:p.y - e.h * e.s * .45}; };
const radio = e => Math.max(10, Math.min(e.w, e.h) * e.s * .38);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (a, b) => { const d = dist(a, b) || 1; return {x:(b.x - a.x) / d, y:(b.y - a.y) / d}; };
const velMax = e => VEL_BASE * u() * (e.mon ? e.mon.st.vel : 1);

function encerrar(e){
  const r = Math.hypot(e.x, e.y);
  if(r > .96){ e.x *= .96 / r; e.y *= .96 / r; }
  /* que la cabeza no se meta debajo de los HUD de arriba */
  const yMin = (G.hudH + e.h * e.s * .8 - G.cy) / G.ry;
  if(e.y < yMin) e.y = Math.min(yMin, .9);
}
function empujar(e, dx, dy){ e.x += dx / G.rx; e.y += dy / G.ry; encerrar(e); }

function medidas(e, img){
  const sf = ESCALA_POKE[e.lado] * (img.dataset.fb ? .25 : 1);
  return {w:img.naturalWidth * G.K * sf, h:img.naturalHeight * G.K * sf};
}
function tamanoSprite(e){
  for(const v of ['frente', 'espalda']){
    const img = e.imgs[v]; if(!img.naturalWidth) continue;
    const m = medidas(e, img); img.style.width = m.w + 'px'; img.style.height = m.h + 'px';
  }
  const vis = e.spr; if(!vis.naturalWidth) return;
  const m = medidas(e, vis); e.w = m.w; e.h = m.h;
  e.refl.style.width = m.w + 'px'; e.refl.style.height = m.h + 'px';
  e.sombra.style.width = e.w * .8 + 'px'; e.sombra.style.height = Math.max(5, e.w * .2) + 'px';
}
function mostrarVista(e){
  e.imgs.frente.classList.toggle('vis', e.vista === 'frente');
  e.imgs.espalda.classList.toggle('vis', e.vista === 'espalda');
  if(e.spr.src) e.refl.src = e.spr.src;
  tamanoSprite(e);
}

function ponerSprite(e){
  const mon = e.mon;
  e.giroEl.style.opacity = '0';
  for(const v of ['frente', 'espalda']){
    const img = e.imgs[v];
    img.removeAttribute('data-fb');
    img.onload = () => { tamanoSprite(e); if(v === e.vista){ e.refl.src = img.src; e.giroEl.style.opacity = '1'; } };
    img.onerror = () => {
      if(img.dataset.fb) return;
      img.dataset.fb = '1';     // si no carga el animado, la ilustración oficial (en chico)
      img.src = mon.p.img;
    };
    img.alt = mon.p.name;
    img.src = v === 'frente' ? spFrente(mon.p.id) : spEspalda(mon.p.id);
  }
  mostrarVista(e);
  e.rot.style.setProperty('--tc', TYPE_COLORS[mon.p.type]);
}

/* Mirar ya hacia el rival, sin animación (al entrar a la arena). */
function orientarYa(e){
  const O = otro(e);
  if(!O || !O.mon) return;
  const d = unit(pie(e), pie(O));
  e.vista = e.vistaQ = d.y > 0 ? 'frente' : 'espalda';
  e.cara = Math.sign(d.x) || e.cara;
  e.flipAp = e.cara === (e.vista === 'frente' ? -1 : 1) ? 1 : -1;
  e.flip.style.transform = `scaleX(${e.flipAp})`;
  mostrarVista(e);
}

/* Darse vuelta: se angosta de costado, cambia de lado (o de frente a espalda) y se abre
   de nuevo, con un saltito. Así se entiende que gira y se le ve la cara del otro lado. */
function girar(e, vista, flip){
  e.girando = true;
  const cambia = vista !== e.vista;
  if(cambia) e.giroT = .22;
  const a = e.giroEl.animate([{transform:'scaleX(1)'}, {transform:'scaleX(.06)'}], {duration:cambia ? 90 : 70, easing:'ease-in', fill:'forwards'});
  a.finished.then(() => {
    e.vista = vista; e.flipAp = flip;
    e.flip.style.transform = `scaleX(${flip})`;
    if(cambia) mostrarVista(e);
    const b = e.giroEl.animate([{transform:'scaleX(.06)'}, {transform:'scaleX(1)'}], {duration:cambia ? 110 : 80, easing:'ease-out'});
    a.cancel();
    const listo = () => { e.girando = false; };
    b.finished.then(listo, listo);
  }, () => { e.girando = false; });
}

function clase(e, nombre, ms){
  e.wrap.classList.remove(nombre); void e.wrap.offsetWidth; e.wrap.classList.add(nombre);
  if(ms) setTimeout(() => e.wrap.classList.remove(nombre), ms);
}

/* El cuerpo: hacia dónde mira (frente/espalda e izquierda/derecha), saltitos al caminar,
   inclinación, aplastar/estirar, respiración y la pose del ataque en curso. */
function dibujar(e, dt){
  const p = pie(e);
  e.s = .9 + .18 * ((e.y + 1) / 2);
  if(dt > 0){
    if(e.px != null){
      const k = 1 - Math.exp(-dt * 18);
      e.rvx += ((p.x - e.px) / dt - e.rvx) * k; e.rvy += ((p.y - e.py) / dt - e.rvy) * k;
    }
    e.px = p.x; e.py = p.y;
  }
  const vmax = velMax(e), vel = Math.hypot(e.rvx, e.rvy), mov = lim(vel / vmax, 0, 1.6);
  const O = otro(e);
  if(e.vistaQ == null) e.vistaQ = e.vista;
  /* hacia dónde quiere mirar: al rival si ataca o está quieto; si no, hacia donde camina */
  let d = null;
  if(vel > vmax * .25 && !(e.accion && e.accion.tipo !== 'esquivar')){ d = {x:e.rvx / vel, y:e.rvy / vel}; e.quieto = 0; }
  else {
    if(dt > 0) e.quieto += dt;
    if((e.accion && e.accion.tipo !== 'esquivar') || e.quieto > .5) if(O && O.mon) d = unit(p, pie(O));
  }
  if(d){
    if(Math.abs(d.x) > .22) e.cara = Math.sign(d.x);
    if(d.y > .38) e.vistaQ = 'frente'; else if(d.y < -.38) e.vistaQ = 'espalda';
  }
  /* los de frente miran a la izquierda y los de espalda a la derecha */
  const flipQ = e.cara === (e.vistaQ === 'frente' ? -1 : 1) ? 1 : -1;
  if((e.vistaQ !== e.vista || flipQ !== e.flipAp) && !e.girando && e.mon && e.mon.vivo && e.aparece <= 0 && !e.rodando) girar(e, e.vistaQ, flipQ);

  let sx = 1, sy = 1, rot = 0, dx = 0, dy = 0, hop = 0;
  const t = performance.now() / 1000;
  if(mov > .15 && !e.rodando){
    e.fase += dt * (5.5 + 5 * mov);
    const s = Math.abs(Math.sin(e.fase * Math.PI));
    hop = s * Math.min(1, mov) * e.h * .09;
    const sq = (1 - s) * .07 * Math.min(1, mov);
    sx += sq; sy -= sq;
    rot += lim(e.rvx / vmax, -1.2, 1.2) * 9;
    if(dt > 0){
      e.polvoT -= dt;
      if(e.polvoT <= 0 && s < .25){ e.polvoT = .18; polvo(p.x, p.y, 2, .9); }
    }
  } else {
    const b = Math.sin(t * 3.1 + (e.lado === 'yo' ? 0 : 1.7));
    sy += b * .028; sx -= b * .014;
  }
  if(e.giroT > 0){ hop += Math.sin((1 - e.giroT / .22) * Math.PI) * e.h * .12; if(dt > 0) e.giroT -= dt; }
  if(e.pose){ sx *= e.pose.sx || 1; sy *= e.pose.sy || 1; rot += (e.pose.rot || 0) * e.cara; dx += (e.pose.dx || 0) * e.cara; dy += e.pose.dy || 0; }
  if(e.stun > 0){ rot -= e.cara * 12 * Math.min(1, e.stun / .2); dx += azar(-1, 1) * e.h * .03; }
  e.wrap.style.transform = `translate(${p.x}px,${p.y}px) scale(${e.s})`;
  e.wrap.style.zIndex = Math.round(p.y) + 10;
  e.cuerpo.style.transform = `translate(${dx}px,${dy - hop}px) rotate(${rot}deg) scale(${sx},${sy})`;
  /* reflejo en el cemento: la misma figura dada vuelta, que se aleja cuando salta */
  e.refl.parentNode.style.transform = `translate(-50%,0) translate(${dx}px,${hop - dy}px) scale(${e.flipAp * sx},${-sy})`;
  e.refl.style.opacity = e.giroEl.style.opacity === '0' ? 0 : '';
  const somb = 1 - Math.min(.5, (hop - dy) / (e.h || 1) * 1.6);
  e.sombra.style.transform = `translate(-50%,-50%) scale(${somb})`;
  if(dt > 0 && (e.rodando || (e.accion && ((e.accion.tipo === 'corto' && e.accion.t > .08 && e.accion.t < .3) || (e.accion.dash && !e.accion.dash.pego && e.accion.dash.t < .3))))){
    e.fantT -= dt;
    if(e.fantT <= 0){ e.fantT = .035; fantasma(e, TYPE_COLORS[e.mon.p.type]); }
  }
}

/* ---------------- HUD ---------------- */
function ventaja(a, b){
  const sc = m => m === 0 ? -2 : (m > 1 ? 1 : (m < 1 ? -1 : 0));
  return sc(efectividad(a.p.type, b.p.type)) - sc(efectividad(b.p.type, a.p.type));
}

function pintarHud(){
  ['yo', 'riv'].forEach(lado => {
    const eq = AR[lado], m = eq.act, h = $('arHud-' + lado);
    if(!m) return;
    h.querySelector('.n').textContent = m.p.name;
    h.querySelector('.t').textContent = TYPE_LABEL[m.p.type];
    const fr = m.hp / m.max, hp = h.querySelector('.hp');
    hp.style.width = (fr * 100) + '%';
    hp.style.background = fr > .5 ? '#3DDC6E' : (fr > .2 ? '#F7B731' : '#F0463C');
    h.querySelector('.ar-num').textContent = `PS ${Math.max(0, Math.round(m.hp))}/${m.max}`;
    h.querySelectorAll('.ar-bola').forEach((b, i) => {
      b.classList.toggle('muerta', !eq.mons[i].vivo);
      b.classList.toggle('activa', i === eq.idx);
    });
  });
  const v = ventaja(AR.yo.act, AR.riv.act), vb = $('arHud-yo').querySelector('.v');
  vb.textContent = v > 0 ? '▲ ventaja' : (v < 0 ? '▼ desventaja' : '');
  vb.className = 'v ' + (v > 0 ? 'bien' : (v < 0 ? 'mal' : ''));
  pintarBotones();
}

function pintarEnergia(){
  ['yo', 'riv'].forEach(l => {
    const m = AR[l].act; if(!m) return;
    const i = $('arHud-' + l).querySelector('.en i'), w = (m.en / EN_MAX * 100).toFixed(0) + '%';
    if(i.style.width !== w) i.style.width = w;
  });
}

function decir(txt){ const l = $('arLog'); if(l) l.textContent = txt; }

function pintarBotones(){
  const m = AR.yo.act; if(!m) return;
  const col = TYPE_COLORS[m.p.type];
  ATAQUES.forEach(k => {
    const b = $('arB-' + k); if(!b) return;
    b.querySelector('b').textContent = nombreAtaque(m.p, k);
    b.style.borderColor = col;
  });
}

function pintarCooldowns(){
  const e = E.yo, m = e.mon; if(!m) return;
  const set = (id, cd, tot, coste) => {
    const b = $(id); if(!b) return;
    b.querySelector('.cd').style.height = (cd > 0 ? Math.min(1, cd / tot) * 100 : 0).toFixed(0) + '%';
    b.classList.toggle('sinEn', m.en < coste);
  };
  ATAQUES.forEach(k => set('arB-' + k, e.cd[k], ALC[k].cd, ALC[k].coste));
  set('arB-esquivar', e.cd.esq, ESQ.cd, ESQ.coste);
  const cb = $('arB-equipo');
  if(cb) cb.disabled = !AR.yo.mons.some((x, i) => x.vivo && i !== AR.yo.idx) || AR.cambioCd > 0;
}

/* ---------------- combate ---------------- */
function calcularDanio(a, d, alc, tipoMov){
  const mult = efectividad(tipoMov, d.p.type), f = factorTipo(mult);
  const crit = f > 0 && Math.random() < a.st.crit;
  let dmg = ALC[alc].poder * Math.sqrt(a.bst / d.bst) * f * azar(.9, 1.1) * (crit ? a.st.critMult : 1);
  dmg = f === 0 ? 0 : Math.max(1, Math.round(dmg));
  return {dmg, mult, crit};
}

/* Devuelve true si el golpe pegó (false: esquivado, protegido o inmune). */
function golpear(att, def, alc, x, y){
  if(!def.mon.vivo) return false;
  const mov = movDe(att.mon.p, alc), tipo = mov.tipo;
  const c = cen(def), arriba = c.y - def.h * def.s * .6, ahora = performance.now();
  if(def.rodando){
    if(ahora - def.tEsq > 400){
      texto(c.x, arriba, '¡Esquivó!', '#8be9ff', 3.6);
      def.mon.en = Math.min(EN_MAX, def.mon.en + EN_PREMIO_ESQUIVE);
      if(def.lado === 'yo') sfx('esquive');
    }
    def.tEsq = ahora;
    return false;
  }
  if(def.invul > 0) return false;
  const res = calcularDanio(att.mon, def.mon, alc, tipo), d = def.mon;
  if(res.dmg === 0){ texto(c.x, arriba, 'No afecta', '#aab', 3.4); return false; }
  d.hp = Math.max(0, d.hp - res.dmg);
  /* combo: golpes seguidos del mismo lado sin recibir */
  const cb = AR.combo;
  if(cb.lado === att.lado && ahora - cb.t < 2600) cb.n++; else { cb.lado = att.lado; cb.n = 1; }
  cb.t = ahora;
  texto(c.x, arriba, (res.crit ? '¡CRÍTICO! ' : '') + '-' + res.dmg,
    res.crit ? '#ff9f2e' : (res.mult > 1 ? '#ffd54a' : (res.mult < 1 ? '#c9ccd8' : '#fff')), res.crit ? 4.6 : 3.6);
  if(res.mult !== 1) setTimeout(() => AR && texto(c.x, c.y - def.h * def.s * .25, res.mult > 1 ? 'Súper efectivo' : 'Poco efectivo',
    res.mult > 1 ? '#ffd54a' : '#c9ccd8', 2.5), 120);
  if(cb.n >= 2) setTimeout(() => AR && texto(c.x, arriba - u() * 4.5, `Combo ×${cb.n}`, cb.lado === 'yo' ? '#7CF2FF' : '#FF9A9A', 2.8), 60);
  estallido(x == null ? c.x : x, y == null ? c.y : y, tipo, res.crit ? 22 : 11, res.crit ? 1.4 : 1);
  destello(x == null ? c.x : x, y == null ? c.y : y, res.crit ? 1.2 : .7);
  sacudir(res.crit ? 1.5 : .7, res.crit);
  sfx(res.crit ? 'critico' : 'golpe');
  AR.congela = res.crit ? .11 : .055;
  clase(def, 'ar-golpe', 320);
  def.stun = res.crit ? .3 : .18;
  const dir = unit(pie(att), pie(def)), emp = u() * (alc === 'corto' ? 55 : 30) * (res.crit ? 1.4 : 1);
  def.kx = dir.x * emp; def.ky = dir.y * emp; def.vx = def.vy = 0;
  if(def.accion && def.accion.tipo !== 'esquivar') cortarAccion(def);
  if(res.crit || res.mult > 1) festejo(res.crit);
  pintarHud();
  if(d.hp <= 0) caer(def);
  return true;
}

function cortarAccion(e){
  const A = e.accion; if(!A) return;
  if(A.tele) A.tele.forEach(t => t.remove());
  e.wrap.classList.remove('ar-carga');
  e.accion = null; e.pose = null;
}

function iniciar(e, tipo, dirPref){
  const m = e.mon;
  if(!m || !m.vivo || e.accion || e.stun > 0 || e.aparece > 0 || AR.pausa || AR.fase !== 'lucha') return false;
  const O = otro(e);
  if(tipo === 'esquivar'){
    if(e.cd.esq > 0 || m.en < ESQ.coste) return false;
    m.en -= ESQ.coste; e.cd.esq = ESQ.cd;
    let d = dirPref && (dirPref.x || dirPref.y) ? dirPref : null;
    if(!d && Math.hypot(e.vx, e.vy) > velMax(e) * .3) d = {x:e.vx, y:e.vy};
    if(!d){
      const a = unit(pie(e), pie(O));
      d = Math.random() < .5 ? {x:-a.y, y:a.x} : {x:a.y, y:-a.x};
    }
    const n = Math.hypot(d.x, d.y) || 1;
    e.accion = {tipo, t:0, dir:{x:d.x / n, y:d.y / n}};
    e.rodando = true; clase(e, 'ar-rodar', 330);
    polvo(pie(e).x, pie(e).y, 4, 1.1);
    if(e.lado === 'yo') sfx('esquive');
    return true;
  }
  const a = ALC[tipo];
  if(e.cd[tipo] > 0 || m.en < a.coste) return false;
  m.en -= a.coste; e.cd[tipo] = a.cd;
  e.accion = {tipo, t:0, dir:unit(pie(e), pie(O)), hecho:false, mov:movDe(m.p, tipo)};
  if(tipo === 'largo'){ prepararLargo(e); sfx('carga'); }
  return true;
}

/* ---- golpes cuerpo a cuerpo: cómo se ve el impacto según el ataque ---- */
function fxSimple(cls, css, kf, dur, capa){
  if(!FX) return;
  const d = mk(cls, css, capa);
  const a = d.animate(kf, {duration:dur, easing:'steps(6,end)', fill:'forwards'});
  const q = () => d.remove(); a.finished.then(q, q);
}
function impacto(x, y, col, k){
  const t = 9 * u() * k;
  fxSimple('ar-impacto', {left:x + 'px', top:y + 'px', width:t + 'px', height:t + 'px', filter:`drop-shadow(0 0 4px ${col})`},
    [{transform:'translate(-50%,-50%) scale(.3) rotate(0)', opacity:1}, {transform:'translate(-50%,-50%) scale(1.15) rotate(25deg)', opacity:1, offset:.5},
     {transform:'translate(-50%,-50%) scale(1.3) rotate(35deg)', opacity:0}], 280);
}
function aro(x, y, col, r, capa){
  fxSimple('ar-aro', {left:x + 'px', top:y + 'px', width:r * 2 + 'px', height:r * 2 * G.pz + 'px', borderColor:col},
    [{transform:'translate(-50%,-50%) scale(.15)', opacity:1}, {transform:'translate(-50%,-50%) scale(1)', opacity:0}], 520, capa || PISO);
}
function mordida(x, y, col){
  const U = u(), w = 8 * U, h = 2.6 * U;
  [-1, 1].forEach(s => fxSimple('ar-diente' + (s > 0 ? ' abajo' : ''), {left:x + 'px', top:y + 'px', width:w + 'px', height:h + 'px', filter:`drop-shadow(0 0 3px ${col})`},
    [{transform:`translate(-50%,-50%) translateY(${s * 5 * U}px)`, opacity:1}, {transform:`translate(-50%,-50%) translateY(${s * .8 * U}px)`, opacity:1, offset:.55},
     {transform:`translate(-50%,-50%) translateY(${s * .8 * U}px)`, opacity:0}], 300));
}
function pinchazo(x, y, col, dir){
  const U = u();
  fxSimple('ar-pincho', {left:x + 'px', top:y + 'px', width:6 * U + 'px', height:Math.max(2, .7 * U) + 'px', background:col},
    [{transform:`translate(-50%,-50%) rotate(${dir > 0 ? 180 : 0}deg) translateX(${5 * U}px)`, opacity:1},
     {transform:`translate(-50%,-50%) rotate(${dir > 0 ? 180 : 0}deg) translateX(${-1 * U}px)`, opacity:0}], 170);
}
function latigazo(x, y, col, dir){
  const U = u();
  fxSimple('ar-latigo', {left:x + 'px', top:y + 'px', width:13 * U + 'px', height:8 * U + 'px', borderTopColor:col},
    [{transform:`translate(-50%,-50%) rotate(${-70 * dir}deg)`, opacity:1}, {transform:`translate(-50%,-50%) rotate(${40 * dir}deg)`, opacity:1, offset:.6},
     {transform:`translate(-50%,-50%) rotate(${50 * dir}deg)`, opacity:0}], 300);
}
function fxCorto(mov, att, def, x, y, dir){
  const U = u(), fx = mov.fx, col = mov.n === 'Lengüetazo' ? '#ff7fa8' : TYPE_COLORS[mov.tipo];
  if(fx === 'garra') tajos(x, y, col, dir);
  else if(fx === 'mordisco') mordida(x, y, col);
  else if(fx === 'picotazo' || fx === 'aguijon'){
    for(let i = 0; i < 3; i++) setTimeout(() => FX && pinchazo(x + azar(-2, 2) * U, y + azar(-2, 2) * U, fx === 'aguijon' ? '#d58cf0' : '#fff', dir), i * 60);
  }
  else if(fx === 'latigo') latigazo(x, y, col, dir);
  else {
    impacto(x, y, col, fx === 'cuerpo' ? 1.6 : (fx === 'patada' ? 1.25 : 1));      // golpe, patada, cuerpo
    if(fx === 'cuerpo'){ aro(x, y + 4 * U, col, 9 * U); polvo(x, y + 4 * U, 6, 1.3); }
  }
  /* lo propio del elemento encima del golpe: llamas, salpicadura, chispas, hojas... */
  if(mov.tipo !== 'normal') estallido(x, y, mov.tipo, 14, 1.1);
  if(mov.tipo === 'water') aro(pie(def).x, pie(def).y, '#BCD2FF', 7 * U);
  if(mov.n === 'Chupavidas'){
    const a = cen(att);
    for(let i = 0; i < 10; i++) particula(x, y, '#ff4d6d', Math.max(2, U * 1.2), a.x - x + azar(-2, 2) * U, a.y - y + azar(-2, 2) * U, 520, {delay:i * 35, suave:true});
  }
}

/* ---- ataques de medio alcance ---- */
function proyectil(e, o){
  const O = otro(e), U = u(), c = o.suelo ? pie(e) : cen(e);
  let d = unit(c, o.suelo ? pie(O) : cen(O));
  if(o.ang){ const ca = Math.cos(o.ang), sa = Math.sin(o.ang); d = {x:d.x * ca - d.y * sa, y:d.x * sa + d.y * ca}; }
  const tam = Math.max(6, o.tam * U), col = TYPE_COLORS[o.tipo];
  const alto = o.forma === 'aguja' || o.forma === 'chispa' ? tam * .35 : (o.forma === 'suelo' ? tam * G.pz * .55 : tam);
  const alto2 = o.forma === 'gota' && o.orient ? tam * .55 : alto;
  const el = mk('ar-orbe f-' + o.forma, {width:tam + 'px', height:alto2 + 'px', left:'0px', top:'0px', fontSize:(tam * 1.2) + 'px'}, o.suelo ? PISO : FX);
  if(o.forma === 'nota') el.textContent = Math.random() < .5 ? '♪' : '♫';
  if(o.forma === 'corazon') el.textContent = '♥';
  el.style.setProperty('--c', o.forma === 'roca' ? TYPE_COLORS.rock : col);
  const sx = c.x + d.x * (o.suelo ? e.w * .2 : e.w * .3), sy = o.arriba ? c.y - e.h * .55 : c.y + d.y * (o.suelo ? 0 : e.h * .2);
  AR.proys.push({lado:e.lado, x:sx, y:sy, vx:d.x * o.vel * U, vy:d.y * o.vel * U, v:o.vel * U, tipo:o.tipo, forma:o.forma, el,
    vida:o.vida || 1.5, vida0:o.vida || 1.5, rad:tam * .5 * (o.radK || 1), rot:0, giro:o.giro || 0, arco:o.arco || 0,
    crecer:o.crecer || 0, wobble:o.wobble || 0, homing:o.homing || 0, boom:o.boom ? {vuelta:false} : null, suelo:!!o.suelo,
    orient:!!o.orient, grupo:o.grupo, t:0, tr:0, esq:false, fade:!!o.fade, estela:o.estela !== false});
}

function disparoMedio(e){
  const mov = movDe(e.mon.p, 'medio'), grupo = {pego:false}, base = {tipo:mov.tipo, grupo, forma:FORMA_MOV[mov.n] || mov.forma};
  const rafaga = (n, cada, o) => {
    for(let i = 0; i < n; i++){
      const f = () => { if(AR && e.mon && e.mon.vivo) proyectil(e, Object.assign({}, base, typeof o === 'function' ? o(i) : o)); };
      if(i) despues(cada * i, f); else f();
    }
  };
  switch(mov.fx){
    case 'chorro':   rafaga(12, .022, () => ({tam:2.6, vel:120, ang:azar(-.03, .03), vida:1.1, orient:true})); break;
    case 'onda':     rafaga(base.forma === 'nota' || base.forma === 'corazon' ? 4 : 3, .09, i => ({tam:3, vel:70, crecer:base.forma === 'nota' || base.forma === 'corazon' ? .3 : 1.4, vida:1.3, radK:1.2, estela:false, ang:base.forma === 'anillo' || base.forma === 'arcoiris' ? 0 : azar(-.18, .18), wobble:base.forma === 'nota' ? 2 : 0})); break;
    case 'hojas':    rafaga(3, 0, i => ({tam:2.6, vel:95, ang:(i - 1) * .22, giro:720})); break;
    case 'semillas': rafaga(3, .05, i => ({tam:1.7, vel:85, ang:(i - 1) * .15, arco:3})); break;
    case 'agujas':   rafaga(4, .06, () => ({tam:3.6, vel:135, ang:azar(-.08, .08), orient:true, vida:1})); break;
    case 'piedra':   rafaga(1, 0, mov.n === 'Roca Arrancada' ? {tam:4.6, vel:80, arco:8, giro:240, arriba:true} : {tam:3.8, vel:78, arco:10, giro:300}); break;
    case 'rayito':   rafaga(1, 0, {tam:4.5, vel:210, orient:true, vida:.8}); break;
    case 'polvo':    rafaga(1, 0, {tam:7, vel:42, crecer:.8, vida:2, radK:1.1, fade:true, estela:false}); break;
    case 'estrella': rafaga(3, .08, i => ({tam:2.6, vel:85, ang:(i - 1) * .35, giro:500, homing:3.2, vida:1.8})); break;
    case 'lodo':     rafaga(1, 0, {tam:3.4, vel:80, arco:7}); break;
    case 'burbujas': rafaga(4, .07, () => ({tam:2 + Math.random(), vel:60, ang:azar(-.15, .15), wobble:2.2, vida:1.8, estela:false})); break;
    case 'tornado':  rafaga(1, 0, {tam:4.5, vel:62, wobble:3, vida:1.9}); break;
    case 'hueso':    rafaga(1, 0, {tam:4, vel:95, giro:900, boom:true, vida:2.4}); break;
    case 'suelo':    rafaga(1, 0, {tam:7, vel:80, suelo:true, vida:1.6, estela:false}); break;
    case 'monedas':  rafaga(3, .07, i => ({tam:2.3, vel:88, ang:(i - 1) * .2, arco:5, giro:600})); break;
    default:         rafaga(1, 0, {tam:3, vel:90, giro:600});
  }
  const O = otro(e), c = cen(e), d = unit(c, cen(O)), U = u();
  if(mov.fx === 'suelo'){ aro(pie(e).x, pie(e).y, '#c9b98a', 8 * U); polvo(pie(e).x, pie(e).y, 6, 1.2); sacudir(.6); }
  else if(mov.n === 'Roca Arrancada'){ polvo(pie(e).x, pie(e).y, 8, 1.3); estallido(pie(e).x, pie(e).y, 'rock', 8, .9); marca(pie(e).x, pie(e).y, 4 * U, '#6D5F1F'); }
  else destello(c.x + d.x * e.w * .3, c.y + d.y * e.h * .2, .45);
  e.kx -= d.x * 22 * U; e.ky -= d.y * 22 * U;        // retroceso del disparo
  sfx('disparo');
}

/* ---- ataques de largo alcance ---- */
function prepararLargo(e){
  const A = e.accion, mov = A.mov, O = otro(e), col = TYPE_COLORS[mov.tipo];
  e.wrap.classList.add('ar-carga'); e.rot.style.setProperty('--tc', col);
  if(mov.fx === 'rayo' || mov.fx === 'embestida'){ A.tele = [mk('ar-mira', {background:col})]; return; }
  const propia = mov.fx === 'propia';
  const c = pie(propia ? e : O), r = (propia ? 15 : (mov.fx === 'zona' ? 8.5 : 9)) * u();
  A.zona = {x:c.x, y:c.y, r, propia};
  A.tele = [mk('ar-zona', {left:c.x + 'px', top:c.y + 'px', width:r * 2 + 'px', height:r * 2 * G.pz + 'px', borderColor:col}, PISO)];
}

function relampagoEntre(x0, y0, x1, y1, grosor, col){
  if(!FX) return;
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'ar-trueno'); svg.setAttribute('width', G.W); svg.setAttribute('height', G.H);
  const largo = Math.hypot(x1 - x0, y1 - y0), pasos = Math.max(5, Math.round(largo / (5 * u())));
  const nx = -(y1 - y0) / (largo || 1), ny = (x1 - x0) / (largo || 1);
  const pts = [];
  for(let i = 0; i <= pasos; i++){
    const f = i / pasos, j = (i === 0 || i === pasos) ? 0 : azar(-2.6, 2.6) * u();
    pts.push((x0 + (x1 - x0) * f + nx * j).toFixed(1) + ',' + (y0 + (y1 - y0) * f + ny * j).toFixed(1));
  }
  const pl = document.createElementNS(ns, 'polyline');
  pl.setAttribute('points', pts.join(' ')); pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', col || '#fff7b0');
  pl.setAttribute('stroke-width', Math.max(2, grosor || u() * 1.2)); pl.setAttribute('stroke-linejoin', 'bevel');
  svg.appendChild(pl); FX.appendChild(svg);
  const a = svg.animate([{opacity:1}, {opacity:.25}, {opacity:1}, {opacity:.5}, {opacity:0}], {duration:340, easing:'steps(5,end)', fill:'forwards'});
  const q = () => svg.remove(); a.finished.then(q, q);
}
function relampago(x, y){ relampagoEntre(x + azar(-8, 8) * u(), -10, x, y); }
function flashPantalla(col){
  fxSimple('ar-flash-pant', {background:col || '#fff'}, [{opacity:.55}, {opacity:0}], 220);
}

function haz(c, ang, largo, alto, fondo, sombra, dur, cls){
  const h = mk('ar-rayo' + (cls ? ' ' + cls : ''), {left:c.x + 'px', top:c.y + 'px', width:largo + 'px', height:Math.max(4, alto) + 'px', background:fondo, boxShadow:sombra || 'none'});
  const R = `translate(0,-50%) rotate(${ang}deg)`;
  const an = h.animate([{transform:`${R} scaleX(0)`, opacity:1}, {transform:`${R} scaleX(1)`, opacity:1, offset:.2},
    {transform:`${R} scaleX(1) scaleY(.6)`, opacity:1, offset:.65}, {transform:`${R} scaleX(1) scaleY(.35)`, opacity:0}],
    {duration:dur || 420, easing:'steps(6,end)', fill:'forwards'});
  const q = () => h.remove(); an.finished.then(q, q);
}

/* El ataque largo en línea recta, con la forma de su elemento. */
function rayoTipo(e, mov, c, d){
  const t = mov.tipo, col = TYPE_COLORS[t], U = u(), O = otro(e), oc = cen(O);
  const L = Math.hypot(G.W, G.H) * 1.1, ang = Math.atan2(d.y, d.x) * 180 / Math.PI;
  const hasta = Math.min(L, dist(c, oc) + radio(O) * 1.5 + 6 * U);
  const lado = {x:-d.y, y:d.x};
  if(t === 'fire'){                                         // Lanzallamas: chorro de llamas que se abre
    haz(c, ang, hasta, 3 * U, `linear-gradient(to bottom, transparent, ${col}55 40%, #ffe9a066 50%, ${col}55 60%, transparent)`, 'none', 460);
    for(let i = 0; i < (REDUCE ? 12 : 46); i++){
      const f = azar(.55, 1), ab = azar(-1, 1) * 2.4 * U * f;
      particula(c.x, c.y, '#F7D02C', Math.max(3, U * 1.6), d.x * hasta * f + lado.x * ab, d.y * hasta * f + lado.y * ab - U * 2 * f, 380,
        {forma:'llama', s0:.5, s1:2.6, colores:elemDe('fire').seq, suave:true, delay:i * 9});
    }
    return;
  }
  if(t === 'water'){                                        // Hidrobomba: chorro de agua con espuma
    haz(c, ang, hasta, 5.2 * U, '', `0 0 ${U * 1.5}px #9cc0ff`, 480, 'ar-agua');
    for(let i = 0; i < (REDUCE ? 10 : 34); i++){
      const f = Math.random();
      chispa(c.x + d.x * hasta * f, c.y + d.y * hasta * f, 'water', 1, lado.x * azar(-3, 3) * U, lado.y * azar(-3, 3) * U - 2 * U, 420, {delay:i * 12});
    }
    return;
  }
  if(t === 'electric'){                                     // Rayo: descargas en zigzag
    const fin = {x:c.x + d.x * hasta, y:c.y + d.y * hasta};
    relampagoEntre(c.x, c.y, fin.x, fin.y, 1.4 * U);
    setTimeout(() => FX && relampagoEntre(c.x, c.y, fin.x, fin.y, .8 * U, '#ffffff'), 90);
    setTimeout(() => FX && relampagoEntre(c.x, c.y, fin.x, fin.y, 1.1 * U), 190);
    for(let i = 0; i < 12; i++){ const f = Math.random(); chispa(c.x + d.x * hasta * f, c.y + d.y * hasta * f, 'electric', 1, azar(-3, 3) * U, azar(-3, 3) * U, 300, {delay:i * 20}); }
    return;
  }
  if(t === 'ice'){                                          // Rayo Hielo: haz fino y cristales que se forman en el camino
    haz(c, ang, hasta, 2.4 * U, 'linear-gradient(to bottom, transparent, #96D9D6 25%, #ffffff 50%, #96D9D6 75%, transparent)', `0 0 ${U * 1.5}px #c8f4ff`, 520);
    for(let i = 0; i < (REDUCE ? 6 : 16); i++){
      const f = (i + 1) / 17;
      particula(c.x + d.x * hasta * f, c.y + d.y * hasta * f, elige(['#ffffff', '#D8F6FF', '#96D9D6']), Math.max(4, U * 2.2), azar(-1, 1) * U, azar(-1, 1) * U, 620,
        {forma:'cristal', s0:.2, s1:1.3, rot0:azar(0, 90), delay:i * 18, suave:true});
    }
    return;
  }
  if(t === 'grass'){                                        // Rayo Solar: un haz enorme de luz
    haz(c, ang, L, 7.5 * U, 'linear-gradient(to bottom, transparent, #B5E07A88 15%, #fff7c2 35%, #ffffff 50%, #fff7c2 65%, #B5E07A88 85%, transparent)', `0 0 ${U * 4}px #fff3a0`, 560);
    flashPantalla('#fffbe0');
    for(let i = 0; i < 10; i++){ const f = Math.random(); chispa(c.x + d.x * hasta * f, c.y + d.y * hasta * f, 'grass', 1, azar(-3, 3) * U, azar(-3, 3) * U, 500, {delay:i * 25}); }
    return;
  }
  if(t === 'bug'){                                          // Zumbido: ondas de sonido en fila
    for(let i = 0; i < 7; i++){
      particula(c.x, c.y, '#DFE88A', Math.max(6, U * 3), d.x * hasta, d.y * hasta, 380, {forma:'burbuja', s0:.6, s1:2.2, delay:i * 45, suave:true});
    }
    return;
  }
  if(t === 'fairy'){                                        // Fuerza Lunar: una luna que cruza la arena
    const luna = mk('ar-orbe f-luna', {width:7 * U + 'px', height:7 * U + 'px', left:c.x + 'px', top:c.y + 'px'});
    const an = luna.animate([{transform:'translate(-50%,-50%) scale(.3)'}, {transform:`translate(-50%,-50%) translate(${d.x * hasta}px,${d.y * hasta}px) scale(1)`}],
      {duration:260, easing:'ease-in', fill:'forwards'});
    an.finished.then(() => { luna.remove(); estallido(oc.x, oc.y, 'fairy', 20, 1.4); }, () => luna.remove());
    for(let i = 0; i < 10; i++){ const f = i / 10; chispa(c.x + d.x * hasta * f, c.y + d.y * hasta * f, 'fairy', 1, 0, -2 * U, 500, {delay:i * 24}); }
    return;
  }
  if(t === 'flying'){                                       // Ataque Aéreo: estela de viento y plumas
    haz(c, ang, hasta, 3 * U, 'linear-gradient(to bottom, transparent, #ffffffaa 40%, #ffffff 50%, #ffffffaa 60%, transparent)', `0 0 ${U * 2}px #fff`, 380);
    for(let i = 0; i < 12; i++){ const f = Math.random(); chispa(c.x + d.x * hasta * f, c.y + d.y * hasta * f, 'flying', 1.2, azar(-3, 3) * U, azar(-3, 3) * U, 600, {delay:i * 15}); }
    return;
  }
  /* Hiperrayo (y lo demás): el rayo grueso de siempre */
  haz(c, ang, L, 4 * U, `linear-gradient(to bottom, transparent 0, ${col} 22%, #fff 50%, ${col} 78%, transparent 100%)`, `0 0 ${U * 2}px ${col}`, 420);
  for(let i = 0; i < (REDUCE ? 4 : 14); i++){
    const f = Math.random();
    particula(c.x + d.x * L * .5 * f, c.y + d.y * L * .5 * f, elige(elemDe(t).c), Math.max(2, azar(.9, 1.7) * U), azar(-2, 2) * U, azar(-3, 3) * U, 360, {delay:i * 20});
  }
}

/* Estallido sobre una zona (o alrededor de uno mismo), con la forma de su elemento. */
function estallidoZona(z, mov){
  const tipo = mov.tipo, col = TYPE_COLORS[tipo], U = u(), n = mov.n;
  const explota = /Explosión|Autodestrucción/.test(n);
  aro(z.x, z.y, col, z.r * 1.1);
  if(explota){
    estallido(z.x, z.y - 3 * U, 'fire', 50, 2.4); destello(z.x, z.y - 3 * U, 1.4); flashPantalla('#ffd9a0');
    setTimeout(() => PISO && aro(z.x, z.y, '#ffd28a', z.r * 1.4), 120);
  } else if(tipo === 'fire' && n === 'Giro Fuego'){        // aro de llamas que gira alrededor
    for(let i = 0; i < 26; i++){
      const a = i / 26 * Math.PI * 2;
      particula(z.x + Math.cos(a) * z.r * .85, z.y + Math.sin(a) * z.r * .85 * G.pz, '#F7D02C', Math.max(4, U * 2.2), -Math.sin(a) * 4 * U, -azar(5, 9) * U, 620,
        {forma:'llama', s0:.6, s1:2.4, colores:elemDe('fire').seq, suave:true, delay:(i % 6) * 40});
    }
  } else if(tipo === 'fire'){                               // Llamarada: estrella de fuego de cinco puntas
    [-90, -18, 54, 126, 198].forEach((g, k) => {
      const a = g * Math.PI / 180;
      for(let i = 0; i < 9; i++){
        const f = (i + 1) / 9;
        particula(z.x, z.y - 4 * U, '#F7D02C', Math.max(4, U * 2), Math.cos(a) * z.r * 1.3 * f, Math.sin(a) * z.r * 1.3 * f, 520,
          {forma:'llama', s0:.6, s1:2.6 - f, colores:elemDe('fire').seq, suave:true, delay:i * 18 + k * 8});
      }
    });
  } else if(tipo === 'psychic'){                            // ondas psíquicas que laten sobre el rival
    for(let i = 0; i < 4; i++) setTimeout(() => PISO && aro(z.x, z.y, i % 2 ? '#C77DFF' : '#F95587', z.r * (.7 + i * .2)), i * 90);
    for(let i = 0; i < 16; i++) chispa(z.x + azar(-z.r, z.r) * .6, z.y - azar(2, 12) * U, 'psychic', 1.2, 0, -3 * U, 600, {delay:i * 25});
  } else if(tipo === 'ghost'){                              // humo violeta que sube y dos ojos
    for(let i = 0; i < 22; i++) chispa(z.x + azar(-z.r, z.r) * .7, z.y, 'ghost', 1.8, azar(-1, 1) * U, -azar(6, 14) * U, 900, {delay:i * 20});
    [-1, 1].forEach(s => particula(z.x + s * 2.2 * U, z.y - 12 * U, '#f05bff', Math.max(3, U * 1.4), 0, 0, 700, {op:1}));
  } else if(tipo === 'poison'){                             // charco tóxico que burbujea
    marca(z.x, z.y, z.r * 1.1, '#A33EA1');
    for(let i = 0; i < 20; i++) particula(z.x + azar(-z.r, z.r) * .8, z.y + azar(-z.r, z.r) * G.pz * .6, '#D68AD4', Math.max(4, U * azar(1.4, 2.6)), 0, -azar(4, 10) * U, 800,
      {forma:'burbuja', suave:true, delay:i * 30});
  } else if(tipo === 'flying'){                             // Vendaval: un tornado sobre el rival
    fxSimple('ar-torbellino', {left:z.x + 'px', top:z.y + 'px', width:z.r * 1.4 + 'px', height:34 * U + 'px'},
      [{transform:'translate(-50%,-100%) scaleY(0)', opacity:.9}, {transform:'translate(-50%,-100%) scaleY(1)', opacity:.9, offset:.25},
       {transform:'translate(-50%,-100%) scaleY(1) scaleX(.7)', opacity:.8, offset:.8}, {transform:'translate(-50%,-100%) scaleY(1.1) scaleX(.3)', opacity:0}], 800);
    for(let i = 0; i < 16; i++) chispa(z.x, z.y - azar(0, 20) * U, 'flying', 1.2, Math.cos(i) * 8 * U, -azar(2, 8) * U, 700, {delay:i * 30});
  } else if(tipo === 'fighting'){                           // Sísmico: lo levanta y lo estampa contra el piso
    impacto(z.x, z.y - 4 * U, '#ff8a5c', 2.2); polvo(z.x, z.y, 12, 1.6);
    estallido(z.x, z.y - 3 * U, 'rock', 12, 1.2);
  } else if(tipo === 'ground'){                             // Terremoto/Fisura: grietas que salen de uno
    for(let i = 0; i < 7; i++){
      const a = i / 7 * Math.PI * 2 + azar(-.2, .2);
      fxSimple('ar-grieta', {left:z.x + 'px', top:z.y + 'px', width:z.r * azar(.9, 1.3) + 'px', height:Math.max(3, U * 1.1) + 'px'},
        [{transform:`translate(0,-50%) rotate(${a * 180 / Math.PI}deg) scaleY(${G.pz}) scaleX(0)`, opacity:1},
         {transform:`translate(0,-50%) rotate(${a * 180 / Math.PI}deg) scaleY(${G.pz}) scaleX(1)`, opacity:1, offset:.3},
         {transform:`translate(0,-50%) rotate(${a * 180 / Math.PI}deg) scaleY(${G.pz}) scaleX(1)`, opacity:0}], 1400, PISO);
    }
    setTimeout(() => PISO && aro(z.x, z.y, '#c9b98a', z.r * 1.4), 150);
    polvo(z.x, z.y, 14, 1.6); estallido(z.x, z.y, 'ground', 16, 1.6);
  } else if(tipo === 'water'){                              // Surf: una ola que sale para todos lados
    aro(z.x, z.y, '#6390F0', z.r * 1.3); setTimeout(() => PISO && aro(z.x, z.y, '#ffffff', z.r * 1.35), 80);
    for(let i = 0; i < 30; i++){
      const a = i / 30 * Math.PI * 2;
      chispa(z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r * G.pz, 'water', 1.3, Math.cos(a) * 3 * U, -azar(3, 7) * U, 600, {delay:120});
    }
  } else {
    fxSimple('ar-pilar', {left:z.x + 'px', top:z.y + 'px', width:z.r * 1.3 + 'px', height:30 * U + 'px',
      background:`linear-gradient(to top, ${col}, ${col}88 40%, transparent)`},
      [{transform:'translate(-50%,-100%) scaleY(0)', opacity:1}, {transform:'translate(-50%,-100%) scaleY(1)', opacity:.9, offset:.35},
       {transform:'translate(-50%,-100%) scaleY(1.1) scaleX(.4)', opacity:0}], 520);
  }
  if(!explota) estallido(z.x, z.y - 3 * U, tipo, 16, 1.4);
  if(tipo !== 'fire' && !z.propia) destello(z.x, z.y - 3 * U, .8);
  marca(z.x, z.y, z.r * .9, col);
  sacudir(explota ? 2.2 : 1.6, true);
}

function dispararLargo(e){
  const A = e.accion, mov = A.mov, O = otro(e), tipo = mov.tipo, col = TYPE_COLORS[tipo], U = u(), st = partDe(tipo);
  if(mov.fx === 'embestida'){
    A.dash = {dir:A.dirLock || unit(cen(e), cen(O)), t:0, pego:false};
    polvo(pie(e).x, pie(e).y, 6, 1.4); sfx('garra');
    return;
  }
  if(mov.fx === 'rayo'){
    const c = cen(e), d = A.dirLock || unit(c, cen(O));
    rayoTipo(e, mov, c, d);
    destello(c.x + d.x * e.w * .3, c.y + d.y * e.h * .3, .9);
    e.kx -= d.x * 40 * U; e.ky -= d.y * 40 * U;
    sacudir(1.2);
    sfx('rayo');
    const oc = cen(O), vx = oc.x - c.x, vy = oc.y - c.y, proj = vx * d.x + vy * d.y;
    const lat = Math.abs(vx * d.y - vy * d.x);
    if(proj > 0 && lat <= radio(O) + 2.4 * U){
      if(golpear(e, O, 'largo', oc.x, oc.y)) marca(pie(O).x, pie(O).y, 6 * U, col);
    }
    return;
  }
  const z = A.zona;
  if(mov.fx === 'lluvia'){
    const n = REDUCE ? 4 : 10;
    for(let i = 0; i < n; i++){
      const tx = z.x + azar(-z.r, z.r) * .85, ty = z.y + azar(-z.r, z.r) * G.pz * .85;
      const tam = Math.max(8, (mov.forma === 'roca' ? 3.4 : 2.4) * U);
      const o = mk('ar-orbe f-' + mov.forma, {width:tam + 'px', height:tam + 'px', left:tx + 'px', top:'0px', opacity:0});
      o.style.setProperty('--c', mov.n === 'Danza Pétalo' ? elige(['#FFB3D9', '#FF7FBF', '#ffffff']) : elige(elemDe(tipo).c));
      const a = o.animate([
        {transform:'translate(-50%,-50%) translateY(0) rotate(0)', opacity:1},
        {transform:`translate(-50%,-50%) translateY(${ty}px) rotate(200deg)`, opacity:1}
      ], {duration:320, delay:i * 50, easing:'steps(7,start)', fill:'forwards'});
      a.finished.then(() => { o.remove(); estallido(tx, ty, tipo, 4, .65); if(tipo === 'rock') polvo(tx, ty, 2); }, () => o.remove());
    }
    sfx('lluvia');
    AR.zonas.push({e:e.lado, zona:z, t:0, imp:.32 + n * .05, mov, lluvia:true});
    return;
  }
  if(mov.fx === 'trueno'){
    relampago(z.x, z.y - 2 * U);
    setTimeout(() => FX && relampago(z.x + azar(-3, 3) * U, z.y - 2 * U), 120);
    flashPantalla('#fffbe0');
    sfx('rayo');
    AR.zonas.push({e:e.lado, zona:z, t:0, imp:.06, mov});
    return;
  }
  if(z.propia){ const p = pie(e); z.x = p.x; z.y = p.y; }
  sfx('lluvia');
  AR.zonas.push({e:e.lado, zona:z, t:0, imp:.05, mov, estalla:true});
}

/* Avanza el ataque en curso y define la pose del cuerpo (anticipación, golpe, recuperación). */
function avanzarAccion(e, dt){
  const A = e.accion, O = otro(e), U = u(), vel = e.mon.st.vel;
  A.t += dt;
  if(A.tipo === 'esquivar'){
    const f = 1 - (A.t / ESQ.dur) * .55;
    empujar(e, A.dir.x * 86 * U * f * dt, A.dir.y * 86 * U * f * dt);
    e.pose = {sx:1.05, sy:.88};
    if(A.t >= ESQ.dur){ e.rodando = false; e.accion = null; e.pose = null; polvo(pie(e).x, pie(e).y, 3); }
    return;
  }
  const fx = A.mov.fx;
  if(A.tipo === 'corto'){
    if(A.t < .09){
      const d = unit(pie(e), pie(O));
      empujar(e, -d.x * 14 * U * dt, -d.y * 14 * U * dt);
      e.pose = {sx:1.14, sy:.84, rot:-10};                 // se agacha y toma impulso
    } else if(A.t < .28){
      if(!A.salio){
        A.salio = true; if(fx === 'garra' || fx === 'picotazo' || fx === 'aguijon') sfx('garra'); polvo(pie(e).x, pie(e).y, 3, 1.1);
        if(A.mov.tipo !== 'normal'){ e.rot.style.setProperty('--tc', TYPE_COLORS[A.mov.tipo]); e.wrap.classList.add('ar-carga'); A.aura = true; }
        if(A.mov.n === 'Desenrollar') clase(e, 'ar-rodar', 330);
      }
      if(A.mov.tipo !== 'normal' && Math.random() < dt * 40){ const c0 = cen(e), d0 = unit(c0, cen(O)); rastro(c0.x + d0.x * e.w * .35, c0.y + d0.y * e.h * .2, A.mov.tipo); }
      const d = unit(pie(e), pie(O));
      const cerca = dist(cen(e), cen(O)) <= radio(e) + radio(O) * .9;
      if(!cerca) empujar(e, d.x * 100 * U * vel * dt, d.y * 100 * U * vel * dt);
      const k = (A.t - .09) / .19;
      if(fx === 'cuerpo') e.pose = {sx:.92, sy:1.12, dy:-Math.sin(k * Math.PI) * e.h * .5};   // salta y cae encima
      else if(fx === 'patada') e.pose = {sx:1.1, sy:.92, rot:26, dx:e.w * .1};
      else e.pose = {sx:1.22, sy:.88, rot:14, dx:e.w * .08};                                // se estira hacia el golpe
      if(!A.hecho && A.t > (fx === 'cuerpo' ? .2 : .1) && dist(cen(e), cen(O)) <= radio(e) + radio(O) + 5 * U){
        A.hecho = true;
        const c = cen(O);
        if(golpear(e, O, 'corto')) fxCorto(A.mov, e, O, c.x, c.y, Math.sign(c.x - cen(e).x) || 1);
      }
    } else {
      const k = (A.t - .28) / .18;
      e.pose = fx === 'cuerpo' ? {sx:1 + .25 * (1 - k), sy:1 - .2 * (1 - k)} : {sx:1 + .1 * (1 - k), sy:1 - .06 * (1 - k)};
      if(fx === 'cuerpo' && !A.cayo){ A.cayo = true; aro(pie(e).x, pie(e).y, '#c9b98a', 7 * U); polvo(pie(e).x, pie(e).y, 5, 1.2); }
      if(A.aura){ A.aura = false; e.wrap.classList.remove('ar-carga'); }
      if(A.t >= .46){ e.accion = null; e.pose = null; }
    }
    return;
  }
  if(A.tipo === 'medio'){
    if(A.mov.n === 'Roca Arrancada'){                       // se agacha, la arranca y la levanta
      if(A.t < .14) e.pose = {sx:1.16, sy:.8, rot:-8};
      else if(A.t < .28) e.pose = {sx:.9, sy:1.15, dy:-e.h * .08, rot:10};
      else e.pose = null;
    } else if(fx === 'suelo'){                              // levanta la pata y pisa fuerte
      if(A.t < .14) e.pose = {sy:1.08, sx:.95, dy:-e.h * .18 * (A.t / .14), rot:-6};
      else if(A.t < .26) e.pose = {sx:1.2, sy:.82};
      else e.pose = null;
    } else {
      if(A.t < .14) e.pose = {sx:1.1, sy:.9, rot:-6};
      else if(A.t < .26) e.pose = {sx:.9, sy:1.12, rot:6, dx:-e.w * .06};
      else e.pose = null;
    }
    if(!A.hecho && A.t >= .14){ A.hecho = true; disparoMedio(e); }
    if(A.t >= .4){ e.accion = null; e.pose = null; }
    return;
  }
  if(A.tipo === 'largo'){
    if(A.t < .62){
      const prog = A.t / .62;
      e.pose = {sx:1 + Math.sin(A.t * 50) * .04 * prog, sy:1 - .08 * prog, dy:-e.h * .08 * prog, dx:azar(-1, 1) * e.w * .03 * prog};
      /* la mira sigue al rival hasta poco antes de disparar */
      const c = cen(e), t = cen(O), tele = A.tele && A.tele[0];
      if(fx === 'rayo' || fx === 'embestida'){
        if(A.t < .42) A.dirLock = unit(c, t);
        const d = A.dirLock || unit(c, t), ang = Math.atan2(d.y, d.x) * 180 / Math.PI;
        if(tele){
          Object.assign(tele.style, {left:c.x + 'px', top:c.y + 'px', width:Math.hypot(G.W, G.H) + 'px', height:Math.max(3, .8 * U) + 'px',
            transform:`translate(0,-50%) rotate(${ang}deg)`, opacity:A.t < .42 ? .5 : (Math.floor(A.t * 24) % 2 ? 1 : .35)});
          if(A.t >= .42) tele.style.background = '#ff3b3b';
        }
      } else if(tele){
        if(A.zona.propia){ const p = pie(e); A.zona.x = p.x; A.zona.y = p.y; tele.style.left = p.x + 'px'; tele.style.top = p.y + 'px'; }
        tele.style.opacity = Math.floor(A.t * 14) % 2 ? .95 : .5;
        if(A.t >= .4) tele.style.borderColor = '#ff3b3b';
      }
      if(Math.random() < dt * 34){
        const ang = Math.random() * 6.28, r = azar(5, 8) * U, st = partDe(A.mov.tipo);
        particula(c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r, elige(st.c), Math.max(2, U * 1.1), -Math.cos(ang) * r, -Math.sin(ang) * r, 380);
      }
    } else if(!A.hecho){
      A.hecho = true;
      e.wrap.classList.remove('ar-carga');
      dispararLargo(e);
      if(A.tele) A.tele.forEach(x => x.remove());
      A.tele = null;
    } else if(A.dash && A.dash.t < .3 && !A.dash.pego){
      /* la carrera: va derecho por la línea marcada; si alcanza al rival, ráfaga de golpes */
      const D = A.dash; D.t += dt;
      empujar(e, D.dir.x * 230 * U * dt, D.dir.y * 230 * U * dt);
      e.pose = fx === 'embestida' && A.mov.n === 'Patada Salto Alta' ? {sx:1.1, sy:.9, rot:30, dy:-e.h * .25} : {sx:1.28, sy:.84, rot:18, dx:e.w * .1};
      if(Math.random() < dt * 50) rastro(pie(e).x, pie(e).y - e.h * .3, 'fighting', 1);
      if(dist(cen(e), cen(O)) <= radio(e) + radio(O) + 4 * U){
        D.pego = true;
        const c = cen(O), dirx = Math.sign(c.x - cen(e).x) || 1;
        if(golpear(e, O, 'largo')){
          for(let i = 0; i < 4; i++) setTimeout(() => { if(!FX) return; impacto(c.x + azar(-3, 3) * U, c.y + azar(-3, 3) * U, '#ff8a5c', 1 + i * .25); if(i) sfx('golpe'); }, i * 70);
          estallido(c.x, c.y, 'fighting', 18, 1.4);
        }
      }
    } else {
      const k = Math.min(1, (A.t - .62) / .3);
      e.pose = {sx:.86 + .14 * k, sy:1.14 - .14 * k, dx:-e.w * .1 * (1 - k)};
    }
    if(A.t >= .62 + (fx === 'lluvia' ? .85 : .42)) cortarAccion(e);
  }
}

/* Las zonas pegan cuando cae el golpe (al final de la lluvia, o enseguida). */
function avanzarZonas(dt){
  AR.zonas = AR.zonas.filter(z => {
    z.t += dt;
    if(z.t < z.imp) return true;
    const att = E[z.e], O = otro(att);
    if(z.estalla) estallidoZona(z.zona, z.mov);
    else { marca(z.zona.x, z.zona.y, z.zona.r * .9, TYPE_COLORS[z.mov.tipo]); sacudir(1.3); }
    if(z.mov.fx === 'trueno') estallido(z.zona.x, z.zona.y, 'electric', 20, 1.4);
    if(att.mon && O.mon && O.mon.vivo){
      const p = pie(O), dx = p.x - z.zona.x, dy = (p.y - z.zona.y) / G.pz;
      if(Math.hypot(dx, dy) <= z.zona.r) golpear(att, O, 'largo');
    }
    return false;
  });
}

function avanzarProyectiles(dt){
  const U = u();
  AR.proys = AR.proys.filter(p => {
    p.vida -= dt; p.t += dt; p.tr -= dt;
    const dest = E[p.lado === 'yo' ? 'riv' : 'yo'], att = E[p.lado];
    if(p.homing && dest.mon && dest.mon.vivo){
      const c = cen(dest), d = unit(p, c), k = Math.min(1, p.homing * dt);
      p.vx += (d.x * p.v - p.vx) * k; p.vy += (d.y * p.v - p.vy) * k;
    }
    if(p.boom && !p.boom.vuelta && p.t > .55){ p.boom.vuelta = true; p.grupo = {pego:false}; }
    if(p.boom && p.boom.vuelta && att.mon){
      const c = cen(att), d = unit(p, c); p.vx = d.x * p.v; p.vy = d.y * p.v;
      if(dist(p, c) < radio(att)){ p.el.remove(); return false; }
    }
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.giro * dt;
    let xx = p.x, yy = p.y - (p.arco ? Math.sin(Math.min(1, p.t / .6) * Math.PI) * p.arco * U : 0);
    if(p.wobble){ const w = Math.sin(p.t * 14) * p.wobble * U, n = Math.hypot(p.vx, p.vy) || 1; xx += -p.vy / n * w; yy += p.vx / n * w; }
    const esc = 1 + p.crecer * (1 - p.vida / p.vida0);
    const ang = p.orient ? Math.atan2(p.vy, p.vx) * 180 / Math.PI : p.rot;
    p.el.style.transform = `translate(-50%,-50%) translate(${xx}px,${yy}px) rotate(${ang}deg) scale(${esc})`;
    if(p.fade) p.el.style.opacity = Math.min(1, p.vida * 1.5);
    if(p.tr <= 0){
      if(p.suelo){ p.tr = .07; polvo(xx, yy, 2, 1.1); }
      else if(p.estela){ p.tr = .04; rastro(xx, yy, p.tipo, .8); }
    }
    if(dest.mon && dest.mon.vivo){
      const c = p.suelo ? pie(dest) : cen(dest);
      const dx = c.x - xx, dy = (c.y - yy) / (p.suelo ? G.pz : 1);
      if(Math.hypot(dx, dy) <= radio(dest) * (p.suelo ? .9 : 1) + p.rad * esc){
        if(dest.rodando){ if(!p.esq){ p.esq = true; golpear(att, dest, 'medio'); } }
        else if(p.grupo.pego || dest.invul > 0){
          if(!p.boom){ estallido(xx, yy, p.tipo, 3, .5); p.el.remove(); return false; }
        } else {
          p.grupo.pego = true;
          golpear(att, dest, 'medio', xx, p.suelo ? cen(dest).y : yy);
          if(p.forma === 'lodo') marca(pie(dest).x, pie(dest).y, 5 * U, TYPE_COLORS.poison);
          if(!p.boom){ p.el.remove(); return false; }
        }
      }
    }
    if(p.vida <= 0 || p.x < -40 || p.x > G.W + 40 || p.y < -40 || p.y > G.H + 40){ p.el.remove(); return false; }
    return true;
  });
}

function caer(e){
  const m = e.mon;
  m.vivo = false; m.hp = 0;
  cortarAccion(e); e.rodando = false; e.pose = null;
  AR.hold.clear();
  decir(`¡${m.p.name} se debilitó!`);
  const c = cen(e);
  estallido(c.x, c.y, m.p.type, 26, 1.5);
  marca(pie(e).x, pie(e).y, e.w * .55, TYPE_COLORS[m.p.type]);
  festejo(true);
  sfx('ko');
  AR.congela = .25;
  e.giroEl.getAnimations().forEach(a => a.cancel()); e.girando = false;
  e.giroEl.animate([{transform:'translateY(0) rotate(0)', opacity:1, filter:'brightness(1)'},
    {transform:`translateY(${-e.h * .15}px) rotate(${-e.cara * 20}deg)`, opacity:1, filter:'brightness(2.5)', offset:.25},
    {transform:`translateY(${e.h * .1}px) rotate(${-e.cara * 90}deg)`, opacity:0, filter:'brightness(1)'}],
    {duration:800, easing:'steps(9,end)', fill:'forwards'});
  AR.fase = 'caida';
  pintarHud();
  const lado = e.lado;
  despues(1.1, () => {
    if(AR[lado].mons.every(x => !x.vivo)){ terminar(lado === 'riv'); return; }
    if(lado === 'riv'){
      const b = mejorBanca(AR.riv, AR.yo.act);
      sacar('riv', b.i); AR.fase = 'lucha';
    } else {
      abrirEquipo(true);
    }
  });
}

/* ---------------- cambio de Pokémon ---------------- */
function sacar(lado, idx){
  const eq = AR[lado], e = E[lado];
  eq.idx = idx; eq.act = eq.mons[idx]; e.mon = eq.act;
  e.giroEl.getAnimations().forEach(a => a.cancel()); e.girando = false; e.giroT = 0;
  e.accion = null; e.pose = null; e.rodando = false; e.stun = 0; e.kx = e.ky = 0; e.vx = e.vy = 0;
  e.cd = {corto:.3, medio:.3, largo:.6, esq:0};
  e.invul = INVUL_ENTRADA; e.aparece = .45;
  if(e.bot) e.bot.t = .5;
  e.wrap.classList.remove('ar-golpe', 'ar-rodar', 'ar-carga');
  ponerSprite(e);
  orientarYa(e);
  pintarHud();
  const c = cen(e); destello(c.x, c.y, 1.3);
  sfx('sale');
  const ent = ST.querySelector('.ar-ent-sprite.' + lado);
  if(ent && !REDUCE) ent.animate([{transform:'translate(-50%,-100%)'}, {transform:'translate(-50%,-112%)'}, {transform:'translate(-50%,-100%)'}], {duration:300, easing:'steps(4,end)'});
  e.spr.addEventListener('load', () => e.giroEl.animate([{transform:'scale(.2)', opacity:0, filter:'brightness(3)'}, {transform:'scale(1)', opacity:1, filter:'brightness(1)'}],
    {duration:420, easing:'steps(6,end)'}), {once:true});
  decir(lado === 'yo' ? `¡Adelante, ${eq.act.p.name}!` : `${AR.rivalNombre} saca a ${eq.act.p.name}.`);
}

function sortearPeso(w, evitar){
  let ent = Object.entries(w).filter(([k, v]) => v > 0);
  const sin = ent.filter(([k]) => k !== evitar);
  if(sin.length && Math.random() > .35) ent = sin;
  const total = ent.reduce((s, [, v]) => s + v, 0);
  let r = Math.random() * total;
  for(const [k, v] of ent){ r -= v; if(r <= 0) return k; }
  return ent.length ? ent[0][0] : 'orbitar';
}

function mejorBanca(eq, contra){
  return eq.mons.map((m, i) => ({m, i})).filter(o => o.m.vivo && o.i !== eq.idx)
    .map(o => ({i:o.i, s:ventaja(o.m, contra) + Math.random() * .8})).sort((a, b) => b.s - a.s)[0];
}

function abrirEquipo(forzado){
  if(!AR || AR.fase === 'fin') return;
  if(!forzado && (AR.pausa || AR.cambioCd > 0 || E.yo.accion || AR.fase !== 'lucha')) return;
  AR.pausa = true; AR.hold.clear();
  const eq = AR.yo, ov = $('arEquipo');
  ov.hidden = false;
  ov.innerHTML = `<div class="ar-eq-caja" role="dialog" aria-label="Equipo"><b>${forzado ? `${eq.act.p.name} no puede seguir. ¿A quién mandás?` : '¿Con quién cambiás?'}</b>
    <div class="ar-eq-grid">${eq.mons.map((m, i) => {
      const off = !m.vivo || i === eq.idx, fr = m.hp / m.max;
      return `<button class="ar-b ar-carta" data-i="${i}"${off ? ' disabled' : ''} style="border-left-color:${TYPE_COLORS[m.p.type]}">
        <img src="${spIcono(m.p.id)}" alt="" width="48" height="48"><b>${m.p.name}</b>
        <span class="ar-mini"><i style="width:${fr * 100}%;background:${fr > .5 ? '#3DDC6E' : (fr > .2 ? '#F7B731' : '#F0463C')}"></i></span>
        <small>${m.vivo ? Math.round(m.hp) + '/' + m.max : 'Debilitado'}</small></button>`;
    }).join('')}</div>${forzado ? '' : '<button class="ar-b ar-med" id="arVolver"><b>← Volver</b></button>'}</div>`;
  const cerrar = () => { ov.hidden = true; ov.innerHTML = ''; AR.pausa = false; };
  ov.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => {
    const i = Number(b.dataset.i); cerrar();
    sacar('yo', i); AR.cambioCd = CAMBIO_CD; AR.fase = 'lucha';
  }; });
  const v = $('arVolver'); if(v) v.onclick = cerrar;
  const primero = ov.querySelector('[data-i]:not([disabled])'); if(primero) primero.focus();
}

/* ---------------- el rival (guion + reflejos) ---------------- */
function nuevoGuion(est){ return Array.from({length:6}, () => sortearPeso(est.w)); }
const alcanceDe = (e, O) => (radio(e) + radio(O) + 5 * u()) * 2.1;

function botDecidir(e){
  const b = e.bot, est = AR.estilo, O = otro(e), d = dist(pie(e), pie(O)), alcance = alcanceDe(e, O);
  /* a veces, con poca vida y en desventaja, cambia de Pokémon */
  if(AR.riv.mons.some((m, i) => m.vivo && i !== AR.riv.idx) && AR.cambioRiv <= 0){
    const p = (ventaja(e.mon, O.mon) < 0 ? .18 : 0) + (e.mon.hp / e.mon.max < .25 ? .25 : 0);
    if(Math.random() < p){ const k = mejorBanca(AR.riv, O.mon); AR.cambioRiv = 7; sacar('riv', k.i); return; }
  }
  if(!b.guion.length) b.guion = nuevoGuion(est);
  let acc = b.guion.shift();
  if(Math.random() < .3) acc = sortearPeso(est.w);
  if(ATAQUES.includes(acc) && acc === b.hist[0] && acc === b.hist[1]) acc = sortearPeso(est.w, acc);
  if(acc === 'corto' && d > alcance * 1.6) acc = 'acercar';
  if(acc === 'medio' && d < alcance * .7) acc = Math.random() < .5 ? 'corto' : 'retroceder';
  if(ATAQUES.includes(acc) && e.mon.en < ALC[acc].coste) acc = 'orbitar';
  b.hist.unshift(acc); b.hist.length = Math.min(3, b.hist.length);
  b.modo = acc; b.dirOrb = Math.random() < .5 ? 1 : -1;
  b.t = {acercar:azar(.7, 1.3), orbitar:azar(1, 1.8), retroceder:azar(.6, 1), esquivar:.3, corto:.6, medio:.7, largo:1.3}[acc] * azar(.85, 1.2);
  b.ejecutado = false;
}

function botActualizar(e, dt){
  const b = e.bot, O = otro(e), out = {x:0, y:0};
  if(!e.mon.vivo || AR.fase !== 'lucha' || e.aparece > 0) return out;
  b.t -= dt; b.reac -= dt;
  /* reflejo: proyectil que viene hacia mí */
  if(b.reac <= 0 && !e.accion){
    for(const p of AR.proys){
      if(p.lado === e.lado) continue;
      const c = cen(e), rx = c.x - p.x, ry = c.y - p.y, v = Math.hypot(p.vx, p.vy), t = (rx * p.vx + ry * p.vy) / (v * v);
      const lat = Math.abs(rx * p.vy - ry * p.vx) / v;
      if(t > 0 && t < .38 && lat < radio(e) * 1.5){
        b.reac = .7;
        const s = Math.random() < .5 ? 1 : -1;
        if(Math.random() < AR.estilo.reflejo && iniciar(e, 'esquivar', {x:-p.vy / v * s, y:p.vx / v * s})) return out;
        break;
      }
    }
    /* reflejo: el jugador está cargando algo largo → se corre */
    if(O.accion && O.accion.tipo === 'largo' && !b.huye && O.accion.t > .12 && Math.random() < AR.estilo.reflejo + .15){
      b.huye = .75; b.huyeDir = Math.random() < .5 ? 1 : -1;
    }
  }
  if(!O.accion || O.accion.tipo !== 'largo') b.huye = 0;
  if(b.huye > 0){
    b.huye -= dt;
    const z = O.accion && O.accion.zona;
    if(z){ const f = unit(z, pie(e)); out.x = f.x; out.y = f.y; }
    else { const d = unit(pie(O), pie(e)); out.x = -d.y * b.huyeDir; out.y = d.x * b.huyeDir; }
    return out;
  }
  if(e.accion) return out;
  if(b.t <= 0) botDecidir(e);
  const pe = pie(e), po = pie(O), d = dist(pe, po), hacia = unit(pe, po), alcance = alcanceDe(e, O);
  switch(b.modo){
    case 'acercar': if(d > alcance * .6){ out.x = hacia.x; out.y = hacia.y; } else b.t = Math.min(b.t, .1); break;
    case 'retroceder': out.x = -hacia.x; out.y = -hacia.y; break;
    case 'orbitar': {
      const ideal = alcance * 1.5, k = d > ideal * 1.15 ? .8 : (d < ideal * .85 ? -.8 : 0);
      out.x = -hacia.y * b.dirOrb + hacia.x * k; out.y = hacia.x * b.dirOrb + hacia.y * k; break;
    }
    case 'esquivar': if(!b.ejecutado){ b.ejecutado = true; iniciar(e, 'esquivar'); } break;
    case 'corto':
      if(d > alcance * .75){ out.x = hacia.x; out.y = hacia.y; }
      else if(!b.ejecutado || b.t > .25){ if(iniciar(e, 'corto')) b.ejecutado = true; }
      break;
    case 'medio':
      if(!b.ejecutado && iniciar(e, 'medio')) b.ejecutado = true;
      else { out.x = -hacia.y * b.dirOrb * .6; out.y = hacia.x * b.dirOrb * .6; }
      break;
    case 'largo':
      if(!b.ejecutado && iniciar(e, 'largo')) b.ejecutado = true;
      break;
  }
  return out;
}

/* ---------------- bucle ---------------- */
function despues(seg, fn){ AR.pend.push({t:seg, fn}); }

function actualizarMon(e, dt, intent){
  const m = e.mon; if(!m) return;
  for(const k in e.cd) if(e.cd[k] > 0) e.cd[k] = Math.max(0, e.cd[k] - dt);
  if(m.vivo) m.en = Math.min(EN_MAX, m.en + EN_REGEN * dt);
  if(e.stun > 0) e.stun -= dt;
  if(e.invul > 0) e.invul -= dt;
  if(e.aparece > 0) e.aparece -= dt;
  if(Math.abs(e.kx) + Math.abs(e.ky) > 1){
    empujar(e, e.kx * dt, e.ky * dt);
    const f = Math.pow(.004, dt); e.kx *= f; e.ky *= f;
  }
  if(!m.vivo){ e.vx = e.vy = 0; return; }
  if(e.accion) avanzarAccion(e, dt);
  /* caminar con inercia: la velocidad se acerca a la pedida, no salta de golpe */
  let factor = 1;
  const A = e.accion;
  if(A) factor = A.tipo === 'medio' ? .5 : (A.tipo === 'largo' ? .3 : 0);
  if(e.stun > 0) factor = 0;
  const v = velMax(e) * factor, n = Math.min(1, Math.hypot(intent.x, intent.y));
  const ang = Math.atan2(intent.y, intent.x);
  const tx = n ? Math.cos(ang) * v * n : 0, ty = n ? Math.sin(ang) * v * n : 0;
  const k = 1 - Math.exp(-dt * ACEL);
  e.vx += (tx - e.vx) * k; e.vy += (ty - e.vy) * k;
  if(Math.abs(e.vx) + Math.abs(e.vy) > .5) empujar(e, e.vx * dt, e.vy * dt);
  /* separación: que no se atraviesen */
  const O = otro(e);
  if(O.mon && O.mon.vivo && e.lado === 'yo'){
    const c1 = cen(e), c2 = cen(O), min = (radio(e) + radio(O)) * .8, d = dist(c1, c2);
    if(d < min && d > 0){ const s = (min - d) / 2, dir = unit(c2, c1); empujar(e, dir.x * s, dir.y * s); empujar(O, -dir.x * s, -dir.y * s); }
  }
}

function entradaJugador(){
  let x = AR.joy.x, y = AR.joy.y;
  const k = AR.keys;
  if(k.has('a') || k.has('arrowleft')) x -= 1;
  if(k.has('d') || k.has('arrowright')) x += 1;
  if(k.has('w') || k.has('arrowup')) y -= 1;
  if(k.has('s') || k.has('arrowdown')) y += 1;
  const n = Math.hypot(x, y);
  if(n > 1){ x /= n; y /= n; }
  return n < .12 ? {x:0, y:0} : {x, y};
}

function bucle(ts){
  if(!AR) return;
  const tok = TOK;
  RAF = requestAnimationFrame(bucle);
  let dt = AR.ult ? (ts - AR.ult) / 1000 : 0; AR.ult = ts;
  dt = Math.min(.05, Math.max(0, dt)) * (window.__arenaTurbo > 0 ? window.__arenaTurbo : 1);
  if(AR.pausa || !dt){ dibujar(E.yo, 0); dibujar(E.riv, 0); return; }
  /* hit-stop: un instante congelado en cada golpe */
  if(AR.congela > 0){ AR.congela -= dt; return; }
  const pasos = Math.max(1, Math.ceil(dt / .05)), h = dt / pasos;
  for(let i = 0; i < pasos; i++){
    if(tok !== TOK || !AR) return;
    AR.cambioCd = Math.max(0, AR.cambioCd - h); AR.cambioRiv = Math.max(0, AR.cambioRiv - h);
    const intent = entradaJugador();
    if(AR.fase === 'lucha'){
      for(const t of ['largo', 'medio', 'corto']) if(AR.hold.has(t)) iniciar(E.yo, t);
      if(AR.hold.has('esquivar')) iniciar(E.yo, 'esquivar', intent);
    }
    const bi = botActualizar(E.riv, h);
    actualizarMon(E.yo, h, intent);
    actualizarMon(E.riv, h, bi);
    avanzarProyectiles(h);
    avanzarZonas(h);
    AR.pend = AR.pend.filter(p => { p.t -= h; if(p.t <= 0){ p.fn(); return false; } return true; });
    if(!AR || tok !== TOK) return;
    if(AR.fase === 'lucha') AR.tLucha += h;
    if(AR.congela > 0) break;
  }
  dibujar(E.yo, dt); dibujar(E.riv, dt);
  pintarEnergia(); pintarCooldowns();
}

/* ---------------- armado de la arena ---------------- */
function hudHTML(lado, titulo){
  return `<div class="ar-hud ${lado}" id="arHud-${lado}">
    <div class="ar-ent">${titulo}</div>
    <div class="ar-nom"><span class="n"></span><span class="v"></span></div>
    <div class="ar-tip"><span class="t"></span></div>
    <div class="ar-barra"><i class="hp"></i></div><div class="ar-num"></div>
    <div class="ar-barra en" title="Energía"><i></i></div>
    <div class="ar-bolas">${'<span class="ar-bola"></span>'.repeat(AR[lado].mons.length)}</div></div>`;
}
const monHTML = lado => `<div class="ar-mon ${lado}" id="arMon-${lado}"><div class="ar-reflejo"><img alt=""></div><div class="ar-sombra"></div>
  <div class="ar-ancla"><div class="ar-cuerpo"><div class="ar-flip"><div class="ar-giro"><div class="ar-rot"><img class="ar-spr frente" alt=""><img class="ar-spr espalda" alt=""></div></div></div></div></div></div>`;

function armarEscenario(){
  $('arRoot').innerHTML = `
    <div class="ar-stage" id="arStage">
      <div class="ar-shake" id="arShake">
        <canvas class="ar-bg" id="arBg"></canvas>
        <div class="ar-luz"><div class="ar-cono"></div><div class="ar-motas"></div><div class="ar-lampara"></div></div>
        <div class="ar-piso" id="arPiso"></div>
        <div class="ar-ent-sprite riv"></div><div class="ar-ent-sprite yo"></div>
        ${monHTML('riv')}${monHTML('yo')}
        <div class="ar-fx" id="arFx"></div>
      </div>
      ${hudHTML('riv', AR.rivalNombre)}${hudHTML('yo', 'Vos')}
      <div class="ar-lineas"></div>
      <div class="ar-log" id="arLog" aria-live="polite"></div>
      <div class="ar-aviso" id="arAviso" aria-hidden="true"></div>
      <button class="ar-x" id="arCloseBtn" aria-label="Salir de la arena">✕</button>
      <button class="ar-son" id="arSonido" aria-label="Sonido" aria-pressed="${SONIDO}">${SONIDO ? '🔊' : '🔇'}</button>
      <div class="ar-fin" id="arFin" hidden></div>
    </div>
    <div class="ar-ctrl" id="arCtrl">
      <div class="ar-joy" id="arJoy" role="group" aria-label="Joystick para mover"><div class="base"><div class="knob"></div></div></div>
      <div class="ar-hint">Mover: WASD o flechas · Garra J · Disparo K · Rayo L · Esquivar Espacio · Equipo Q</div>
      <div class="ar-btns">
        <button class="ar-act" id="arB-largo" data-a="largo"><i class="cd"></i><b></b><small>Largo · ⚡${ALC.largo.coste}</small></button>
        <button class="ar-act" id="arB-medio" data-a="medio"><i class="cd"></i><b></b><small>Medio · ⚡${ALC.medio.coste}</small></button>
        <button class="ar-act" id="arB-corto" data-a="corto"><i class="cd"></i><b></b><small>Corto · ⚡${ALC.corto.coste}</small></button>
        <button class="ar-act esq" id="arB-esquivar" data-a="esquivar"><i class="cd"></i><b>Esquivar</b><small>⚡${ESQ.coste}</small></button>
        <button class="ar-act eqp" id="arB-equipo" data-a="equipo"><i class="cd"></i><b>Equipo</b><small>Cambiar</small></button>
      </div>
    </div>
    <div class="ar-equipo" id="arEquipo" hidden></div>
    <div class="ar-confirm" id="arConfirm" hidden>
      <div class="ar-conf-caja" role="alertdialog" aria-label="¿Abandonar la batalla?">
        <b>¿Abandonar la batalla?</b><span>No ganás monedas si salís ahora.</span>
        <div><button class="ar-b ar-med" id="arSeguir"><b>Seguir</b></button>
        <button class="ar-b ar-med" id="arAbandonar"><b>Abandonar</b></button></div>
      </div>
    </div>`;
  ST = $('arStage'); SHAKE = $('arShake'); FX = $('arFx'); BG = $('arBg'); PISO = $('arPiso');
  $('arCloseBtn').onclick = pedirSalida;
  $('arSeguir').onclick = () => { $('arConfirm').hidden = true; AR.pausa = AR.pausaAntes; };
  $('arAbandonar').onclick = cerrarArena;
  $('arSonido').onclick = () => {
    SONIDO = !SONIDO;
    try{ localStorage.setItem('arena-sonido', SONIDO ? '1' : '0'); }catch(e){}
    const b = $('arSonido'); b.textContent = SONIDO ? '🔊' : '🔇'; b.setAttribute('aria-pressed', SONIDO);
    if(SONIDO) sfx('cuenta');
  };
  iniciarControles();
}

function iniciarControles(){
  const joy = $('arJoy'), knob = joy.querySelector('.knob'), base = joy.querySelector('.base');
  let id = null;
  const set = ev => {
    const r = base.getBoundingClientRect(), R = r.width * .42;
    let dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy); if(d > R){ dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    if(AR) AR.joy = {x:dx / R, y:dy / R};
  };
  joy.addEventListener('pointerdown', ev => { id = ev.pointerId; try{ joy.setPointerCapture(id); }catch(e){} set(ev); ev.preventDefault(); });
  joy.addEventListener('pointermove', ev => { if(ev.pointerId === id) set(ev); });
  const fin = ev => { if(ev.pointerId !== id) return; id = null; knob.style.transform = ''; if(AR) AR.joy = {x:0, y:0}; };
  joy.addEventListener('pointerup', fin); joy.addEventListener('pointercancel', fin); joy.addEventListener('lostpointercapture', fin);

  $('arCtrl').querySelectorAll('.ar-act').forEach(b => {
    const a = b.dataset.a;
    b.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      if(!AR) return;
      if(a === 'equipo'){ abrirEquipo(false); return; }
      pulsar(a);
    });
    const suelta = () => { if(AR) AR.hold.delete(a); };
    b.addEventListener('pointerup', suelta); b.addEventListener('pointerleave', suelta); b.addEventListener('pointercancel', suelta);
    b.addEventListener('contextmenu', ev => ev.preventDefault());
  });
}

/* Apretar un botón o tecla: intenta la acción ya y la deja "mantenida" para repetirla al soltarse el enfriamiento. */
function pulsar(a){
  if(!AR) return;
  AR.hold.add(a);
  if(AR.fase === 'lucha' && !AR.pausa) iniciar(E.yo, a, a === 'esquivar' ? entradaJugador() : null);
}

function pedirSalida(){
  if(!AR || AR.fase === 'fin'){ cerrarArena(); return; }
  const c = $('arConfirm');
  c.hidden = !c.hidden;
  if(!c.hidden){ AR.pausaAntes = AR.pausa; AR.pausa = true; $('arSeguir').focus(); }
  else AR.pausa = AR.pausaAntes;
}

async function luchar(mios){
  audio();   // el navegador sólo deja arrancar el sonido después de un toque del usuario
  const rival = armarRival(mios);
  const estilo = elige(Object.keys(ESTILOS));
  AR = {
    yo:  {mons:mios.map(crearMon), idx:0, act:null},
    riv: {mons:rival.map(crearMon), idx:0, act:null},
    estilo:ESTILOS[estilo], proys:[], zonas:[], pend:[], hold:new Set(), keys:new Set(), joy:{x:0, y:0},
    fase:'intro', tLucha:0, pausa:false, pausaAntes:false, cambioCd:0, cambioRiv:3, ult:0, congela:0,
    combo:{lado:null, n:0, t:0},
    rivalNombre:'Entrenador ' + elige(NOMBRES_RIVAL)
  };
  armarEscenario();
  E = {yo:crearEntidad('yo'), riv:crearEntidad('riv')};
  E.riv.bot = {guion:nuevoGuion(AR.estilo), hist:[], modo:'orbitar', t:1.2, reac:0, huye:0, huyeDir:1, dirOrb:1, ejecutado:false};
  E.yo.x = .55; E.yo.y = .35; E.riv.x = -.55; E.riv.y = -.2;
  AR.yo.act = AR.yo.mons[0]; AR.riv.act = AR.riv.mons[0];
  E.yo.mon = AR.yo.act; E.riv.mon = AR.riv.act;
  medir(); pintarFondo(); acomodarEscena();
  orientarYa(E.yo); orientarYa(E.riv);
  if(typeof ResizeObserver === 'function'){
    RO = new ResizeObserver(() => { if(AR) alCambiarTamano(); });
    RO.observe(ST);
  }
  ponerSprite(E.yo); ponerSprite(E.riv);
  pintarHud();
  ['yo', 'riv'].forEach(l => { dibujar(E[l], 0); E[l].spr.addEventListener('load', () => dibujar(E[l], 0), {once:true}); });
  window.__arena = {estado:() => AR, ent:() => E};
  decir(`¡${AR.rivalNombre} quiere pelear!`);
  const aviso = $('arAviso'), tok = TOK, turbo = window.__arenaTurbo > 0 ? window.__arenaTurbo : 1;
  /* mientras cuenta, los dos ya respiran y miran al rival */
  const respira = ts => { if(tok !== TOK || !AR || AR.fase !== 'intro') return; dibujar(E.yo, 0); dibujar(E.riv, 0); requestAnimationFrame(respira); };
  requestAnimationFrame(respira);
  for(const t of ['3', '2', '1', '¡PELEA!']){
    if(tok !== TOK) return;
    aviso.textContent = t; aviso.classList.remove('pop'); void aviso.offsetWidth; aviso.classList.add('pop');
    sfx(t === '¡PELEA!' ? 'pelea' : 'cuenta');
    if(t === '¡PELEA!') festejo(true);
    await new Promise(r => setTimeout(r, (t === '¡PELEA!' ? 700 : 520) / turbo));
  }
  if(tok !== TOK) return;
  aviso.textContent = '';
  E.yo.invul = E.riv.invul = .6;
  AR.fase = 'lucha';
  decir('¡A pelear!');
  RAF = requestAnimationFrame(bucle);
}

function terminar(gane){
  AR.fase = 'fin'; AR.hold.clear();
  const pr = calcularPremio(gane);
  coins += pr.monedas;
  for(const t in pr.bolas) if(typeof bolas !== 'undefined' && t in bolas) bolas[t] += pr.bolas[t];
  maestro.peleas++; if(gane) maestro.ganadas++;
  maestro.pts += pr.pts;
  updateCoins(); saveProgress();
  sfx(gane ? 'gana' : 'pierde');
  if(gane) festejo(true);
  decir(gane ? '¡Ganaste la batalla!' : 'Te quedaste sin Pokémon...');
  const col = gane ? '#3DDC6E' : '#F0463C', f = $('arFin');
  f.hidden = false;
  f.innerHTML = `<div class="ar-fin-caja" style="border-color:${col}">
    <b style="color:${col}">${gane ? '¡Ganaste!' : 'Perdiste'}</b>
    <span>${gane ? `Le ganaste a ${AR.rivalNombre}.` : `${AR.rivalNombre} fue más fuerte esta vez.`}</span>
    <ul class="ar-premio">${pr.lineas.map(([t, v]) => `<li><span>${t}</span><b>+${v} 🪙</b></li>`).join('')}
      <li class="tot"><span>Total</span><b>+${pr.monedas} 🪙</b></li></ul>
    ${pr.bolasTxt ? `<span class="ar-premio-bolas">${pr.bolasTxt}</span>` : ''}
    <span class="ar-premio-maestro">${pr.pts ? `+${pr.pts} puntos de Maestro · ` : ''}Maestro Pokémon: <b>${maestro.pts}</b> pts · ${maestro.ganadas} ganada${maestro.ganadas === 1 ? '' : 's'} de ${maestro.peleas}</span>
    <div><button class="ar-b ar-med" id="arCerrar2"><b>Cerrar</b></button>
    <button class="ar-b ar-med" id="arOtra"><b>Revancha</b></button></div></div>`;
  $('arCerrar2').onclick = cerrarArena;
  $('arOtra').onclick = () => abrirArena();
  $('arOtra').focus({preventScroll:true});
}

function calcularPremio(gane){
  const kos = AR.riv.mons.filter(m => !m.vivo).length, vivos = AR.yo.mons.filter(m => m.vivo).length;
  const tiempo = Math.min(PREMIO.topeTiempo, Math.floor(AR.tLucha / PREMIO.segPorMoneda));
  const lineas = [[gane ? 'Victoria' : 'Por pelear', gane ? PREMIO.ganar : PREMIO.perder]];
  if(kos) lineas.push([`${kos} rival${kos > 1 ? 'es' : ''} derrotado${kos > 1 ? 's' : ''}`, kos * PREMIO.porKO]);
  if(gane && vivos) lineas.push([`${vivos} de los tuyos en pie`, vivos * PREMIO.porVivo]);
  if(tiempo) lineas.push([`${Math.round(AR.tLucha)} s de pelea`, tiempo]);
  /* pokébolas: ganar da rojas; equipo completo suma una Súper y ganar sin perder a nadie, una Ultra */
  const b = {};
  if(gane){
    b.roja = 3;
    if(AR.yo.mons.length >= EQUIPO_MAX) b.azul = 1;
    if(vivos === AR.yo.mons.length) b.ultra = 1;
  }else if(kos) b.roja = 1;
  const nombres = {roja:'Poké Ball', azul:'Súper Ball', ultra:'Ultra Ball'};
  const bolasTxt = Object.keys(b).map(t => `+${b[t]} ${nombres[t]}`).join(' · ');
  /* Puntos de Maestro: sólo ganando; suman los rivales tumbados y no perder a ninguno */
  const pts = gane ? 10 + kos * 2 + (vivos === AR.yo.mons.length ? 5 : 0) : 0;
  return {monedas:lineas.reduce((a, l) => a + l[1], 0), lineas, bolas:b, bolasTxt, pts};
}

function armarRival(mios){
  const prom = mios.reduce((s, p) => s + bstDe(p), 0) / mios.length;
  const ids = new Set(mios.map(p => p.id));
  const pool = DATA.filter(p => p.region === 'kanto')
    .sort((x, y) => Math.abs(bstDe(x) - prom) - Math.abs(bstDe(y) - prom)).slice(0, 18);
  const sorteado = pool.sort(() => Math.random() - .5);
  const sinRepetir = sorteado.filter(p => !ids.has(p.id));
  return (sinRepetir.length >= mios.length ? sinRepetir : sorteado).slice(0, mios.length);
}

/* ---------------- elegir equipo ---------------- */
function abrirArena(){
  const ov = $('arenaOverlay');
  const mios = kantoMios();
  if(mios.length < EQUIPO_MIN){
    if(typeof avisoBatalla === 'function')
      avisoBatalla(`Necesitás al menos ${EQUIPO_MIN} Pokémon de Kanto para pelear en la arena. Abrí un sobre primero.`);
    return;
  }
  limpiar();
  ov.classList.add('show');
  const orden = mios.slice().sort((a, b) => bstDe(b) - bstDe(a));
  const sel = orden.slice(0, EQUIPO_MAX).map(p => p.id);
  const root = $('arRoot');
  const pintar = () => {
    root.innerHTML = `<div class="ar-pick">
      <h2>Arena Pokémon · Kanto</h2>
      <p>Elegí tu equipo: de ${EQUIPO_MIN} a ${EQUIPO_MAX}. Sale primero el que marcaste con el 1. Cada uno tiene su crítico y su velocidad.</p>
      <div class="ar-grid">${orden.map(p => {
        const n = sel.indexOf(p.id) + 1, s = statsDe(p);
        return `<button class="ar-sel${n ? ' on' : ''}" data-id="${p.id}" aria-pressed="${n ? 'true' : 'false'}" style="border-color:${n ? TYPE_COLORS[p.type] : '#34407a'}">
          ${n ? `<span class="ar-n">${n}</span>` : ''}
          <img src="${spIcono(p.id)}" alt="" width="64" height="64" loading="lazy">
          <b>${p.name}</b><small>${TYPE_LABEL[p.type]} · ${bstDe(p)}</small>
          <small class="ar-st">Crít. ${Math.round(s.crit * 100)}% ×${s.critMult.toFixed(1)}</small>
          <small class="ar-st">Veloc. ${'★'.repeat(Math.max(1, Math.round((s.vel - .65) / .14)))}</small></button>`;
      }).join('')}</div>
      <div class="ar-pick-pie"><span>${sel.length} de ${EQUIPO_MAX}</span>
        <button class="ar-b ar-med" id="arPickCerrar"><b>Cerrar</b></button>
        <button class="ar-b ar-med ar-go" id="arPickGo"${sel.length < EQUIPO_MIN ? ' disabled' : ''}><b>¡A pelear!</b></button></div></div>`;
    root.querySelectorAll('.ar-sel').forEach(b => {
      b.onclick = () => {
        const id = Number(b.dataset.id), i = sel.indexOf(id);
        if(i >= 0) sel.splice(i, 1); else if(sel.length < EQUIPO_MAX) sel.push(id);
        const g = root.querySelector('.ar-grid').scrollTop;
        pintar();
        root.querySelector('.ar-grid').scrollTop = g;
      };
    });
    $('arPickCerrar').onclick = cerrarArena;
    $('arPickGo').onclick = () => luchar(sel.map(id => DATA.find(p => p.id === id)));
  };
  pintar();
}

function limpiar(){
  TOK++; cancelAnimationFrame(RAF); RAF = 0;
  if(RO){ RO.disconnect(); RO = null; }
  AR = null; ST = null; FX = null; SHAKE = null; BG = null; PISO = null; E = {};
  window.__arena = null;
}

function cerrarArena(){
  limpiar();
  $('arenaOverlay').classList.remove('show');
  $('arRoot').innerHTML = '';
  if(typeof updateBarras === 'function') updateBarras();
}

/* ---------------- teclado ---------------- */
const TECLAS_ACC = {j:'corto', z:'corto', k:'medio', x:'medio', l:'largo', c:'largo', ' ':'esquivar', shift:'esquivar'};
document.addEventListener('keydown', e => {
  const ov = $('arenaOverlay');
  if(!ov || !ov.classList.contains('show')) return;
  const k = e.key.toLowerCase();
  if(k === 'escape'){ e.stopPropagation(); pedirSalida(); return; }
  if(!AR || !AR.keys) return;
  if(['a', 'd', 'w', 's', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)){ AR.keys.add(k); e.preventDefault(); return; }
  if(TECLAS_ACC[k]){ if(!e.repeat) pulsar(TECLAS_ACC[k]); else AR.hold.add(TECLAS_ACC[k]); e.preventDefault(); return; }
  if(k === 'q' || k === 'e') abrirEquipo(false);
});
document.addEventListener('keyup', e => {
  if(!AR || !AR.keys) return;
  const k = e.key.toLowerCase();
  AR.keys.delete(k);
  if(TECLAS_ACC[k]) AR.hold.delete(TECLAS_ACC[k]);
});
window.addEventListener('blur', () => { if(AR && AR.keys){ AR.keys.clear(); AR.hold.clear(); } });

window.abrirArena = abrirArena;
})();
