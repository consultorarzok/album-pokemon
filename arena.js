/* ====================== ARENA DE BATALLA (Kanto) · tiempo real ======================
   Cada uno maneja a su Pokémon por la arena (joystick o WASD) y ataca con botones:
     · Corto  = embestida con garra (pega fuerte pero hay que estar encima)
     · Medio  = proyectil que viaja (se esquiva moviéndose)
     · Largo  = se carga ~0,6 s mostrando por dónde va a pegar (rayo o lluvia) y
                después golpea fuerte: hay que salir de la zona marcada
     · Esquivar = voltereta corta con invulnerabilidad
   Equipo de hasta 6, con cambio en cualquier momento (pausa mientras elegís).
   Cada Pokémon tiene su propio crítico (chance y multiplicador) y su velocidad.
   El rival es un bot sin inteligencia: sigue un guion de acciones sorteadas según
   su estilo, con reflejos (a veces esquiva proyectiles, se corre de lo que carga el
   jugador) y un tope contra la repetición.
   El fondo se dibuja en código con píxeles, a la medida de la pantalla (celular,
   tablet o compu), con el mismo tamaño de píxel que los sprites de PokeAPI. */
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
const PREMIO_GANAR = 40, PREMIO_PERDER = 10;

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

/* Nombres de ataque por tipo (corto / medio / largo). */
const MOVS = {
  normal:  ['Arañazo', 'Ataque Rápido', 'Hiperrayo'],
  fire:    ['Colmillo Ígneo', 'Bola de Fuego', 'Lanzallamas'],
  water:   ['Golpe Marea', 'Pistola Agua', 'Hidrobomba'],
  electric:['Puño Trueno', 'Impactrueno', 'Rayo'],
  grass:   ['Hoja Afilada', 'Bala Semilla', 'Tormenta de Hojas'],
  ice:     ['Garra Escarcha', 'Copo Cortante', 'Ventisca'],
  fighting:['Puño Certero', 'Onda Vacío', 'Lluvia de Puños'],
  poison:  ['Colmillo Veneno', 'Bomba Lodo', 'Lluvia Ácida'],
  ground:  ['Garra Tierra', 'Bofetón Lodo', 'Terremoto'],
  flying:  ['Pico Taladro', 'Tornado', 'Lluvia de Plumas'],
  psychic: ['Cabezazo Zen', 'Psicorrayo', 'Psíquico'],
  bug:     ['Tijera X', 'Disparo Demora', 'Enjambre'],
  rock:    ['Garra Roca', 'Lanzarrocas', 'Avalancha'],
  ghost:   ['Lengüetazo', 'Bola Sombra', 'Maldición'],
  dragon:  ['Garra Dragón', 'Pulso Dragón', 'Furia Dragón'],
  fairy:   ['Caricia', 'Brillo Mágico', 'Fuerza Lunar'],
  dark:    ['Mordisco', 'Pulso Umbrío', 'Vendetta'],
  steel:   ['Garra Metal', 'Foco Resplandor', 'Cañón Acero']
};
const MOVS_PROPIOS = {
  25:  ['Ataque Rápido', 'Impactrueno', 'Trueno'],
  3:   ['Látigo Cepa', 'Bomba Germen', 'Rayo Solar'],
  6:   ['Garra Dragón', 'Lanzallamas', 'Llamarada'],
  9:   ['Cabezazo', 'Pistola Agua', 'Hidrobomba'],
  94:  ['Lengüetazo', 'Bola Sombra', 'Come Sueños'],
  143: ['Golpe Cuerpo', 'Onda Ruido', 'Hiperrayo'],
  150: ['Puño Mental', 'Psicorrayo', 'Psíquico']
};
const nombreAtaque = (p, alc) => (MOVS_PROPIOS[p.id] || MOVS[p.type] || MOVS.normal)[ATAQUES.indexOf(alc)];

/* Largo en forma de lluvia sobre una zona marcada (el resto es un rayo). Medio en
   arco (el resto va recto). */
const LARGO_LLUVIA = new Set(['grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'bug', 'rock']);
const MEDIO_ARCO   = new Set(['water', 'rock', 'poison', 'ground', 'bug']);

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
let ST = null, SHAKE = null, FX = null, BG = null;
let E = {};          // entidades en pantalla: E.yo y E.riv
let G = {W:360, H:480, K:1, cx:180, cy:300, rx:150, ry:110, pz:.7};
let RAF = 0, RO = null;

const $ = id => document.getElementById(id);
const azar = (a, b) => a + Math.random() * (b - a);
const elige = arr => arr[Math.floor(Math.random() * arr.length)];
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

/* ---------------- fondo en píxeles ----------------
   Se dibuja en un canvas chico (1 píxel = K píxeles de pantalla, igual que los
   sprites) y se agranda sin suavizar. Se rehace al cambiar el tamaño. */
function rng(sem){ let s = sem >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function medir(){
  const W = ST.clientWidth, H = ST.clientHeight;
  G.W = W; G.H = H;
  G.K = Math.max(1, Math.floor(Math.min(W / 300, H / 210) * 4) / 4);
  const ctrl = $('arCtrl');
  const margen = ctrl && getComputedStyle(ctrl).position === 'absolute' ? Math.min(130, H * .26) : 0;
  const disp = H - margen;
  G.rx = Math.min(W * .42, (W / 2 - 40 * G.K * 1.12) / .96);   // que un sprite grande en el borde no se salga de la pantalla
  /* el piso va debajo de los HUD y arriba de los controles */
  const hud = $('arHud-riv'), hudH = hud ? hud.offsetHeight + 8 : 90;
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

  const gr = g.createLinearGradient(0, 0, 0, ch);
  gr.addColorStop(0, '#05070f'); gr.addColorStop(.55, '#0c1230'); gr.addColorStop(1, '#070a18');
  g.fillStyle = gr; g.fillRect(0, 0, cw, ch);

  /* pared de ladrillos */
  const pared = Math.max(20, ey - ery * 1.5);
  for(let y = 0, fila = 0; y < pared; y += 5, fila++){
    for(let x = -(fila % 2) * 6; x < cw; x += 12){
      const v = 14 + Math.floor(R() * 10);
      g.fillStyle = `rgb(${v},${v + 4},${v + 18})`; g.fillRect(x, y, 11, 4);
    }
  }
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, pared - 3, cw, 6);

  /* carteles: pantalla central con la Pokébola y dos banderas */
  const bw = Math.max(16, Math.min(28, erx * .16)), bh = bw * 2.1, by = 6;
  const bola = (x, y, r) => {
    g.fillStyle = '#1a1f38'; g.fillRect(x - r - 3, y - r - 3, r * 2 + 6, r * 2 + 6);
    g.fillStyle = '#d8403a'; g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.fill();
    g.fillStyle = '#e8e4ee'; g.beginPath(); g.arc(x, y, r, 0, Math.PI); g.fill();
    g.fillStyle = '#20243a'; g.fillRect(x - r, y - 1, r * 2, 2);
    g.fillStyle = '#e8e4ee'; g.beginPath(); g.arc(x, y, r * .32, 0, 7); g.fill();
    g.strokeStyle = '#20243a'; g.lineWidth = 1.5; g.stroke();
  };
  bola(ex, by + bw * .75, bw * .55);
  const bandera = (x, col, borde, dibujo) => {
    g.fillStyle = borde; g.fillRect(x - bw / 2 - 1, by, bw + 2, bh + 2);
    g.fillStyle = col; g.fillRect(x - bw / 2, by + 1, bw, bh - 4);
    g.beginPath(); g.moveTo(x - bw / 2, by + bh - 3); g.lineTo(x, by + bh + 4); g.lineTo(x + bw / 2, by + bh - 3); g.fill();
    dibujo(x, by + bh * .4);
  };
  bandera(ex - erx * .62, '#8f2230', '#c9a23a', (x, y) => {
    g.fillStyle = '#f7d02c'; g.beginPath();
    g.moveTo(x + 2, y - 8); g.lineTo(x - 5, y + 1); g.lineTo(x - 1, y + 1); g.lineTo(x - 3, y + 9); g.lineTo(x + 5, y - 1); g.lineTo(x + 1, y - 1); g.fill();
  });
  bandera(ex + erx * .62, '#4b2b7c', '#8a6bd0', (x, y) => {
    g.fillStyle = '#e6d9ff'; g.fillRect(x - 6, y - 4, 4, 3); g.fillRect(x + 2, y - 4, 4, 3);
    g.fillRect(x - 6, y + 3, 12, 2); g.fillStyle = '#4b2b7c'; for(let i = -5; i < 6; i += 3) g.fillRect(x + i, y + 3, 1, 2);
  });

  /* gradas con público, de afuera hacia adentro */
  const N = 6, cab = ['#3a2a22', '#1d1d2a', '#4a3a1e', '#2a1c34', '#10101a', '#5a2a2a'];
  const ropa = ['#2a3d7a', '#7a2a3a', '#2f6a4a', '#6a5a2a', '#4a2f7a', '#2a5a6a'];
  for(let i = N; i >= 0; i--){
    const f = 1.12 + i * .105, fy = 1.1 + i * .085;
    const rxi = erx * f, ryi = ery * fy;
    g.fillStyle = i % 2 ? '#0b0e20' : '#10142c';
    g.beginPath(); g.ellipse(ex, ey, rxi + 4, ryi + 3, 0, 0, Math.PI * 2); g.fill();
    const n = Math.floor((Math.PI * 2 * Math.sqrt((rxi * rxi + ryi * ryi) / 2)) / 6.2);
    for(let k = 0; k < n; k++){
      const a = (k / n) * Math.PI * 2 + R() * .02;
      const x = Math.round(ex + Math.cos(a) * (rxi + 1)), y = Math.round(ey + Math.sin(a) * (ryi + 1));
      if(y < pared + 2 || y > ch + 4 || x < -4 || x > cw + 4) continue;
      g.globalAlpha = .34 + .2 * Math.max(0, Math.sin(a));
      g.fillStyle = ropa[Math.floor(R() * ropa.length)]; g.fillRect(x - 2, y + 1, 5, 3);
      g.fillStyle = cab[Math.floor(R() * cab.length)]; g.fillRect(x - 1, y - 2, 3, 3);
      g.globalAlpha = 1;
    }
  }

  /* baranda */
  g.lineWidth = 4; g.strokeStyle = '#141a3c';
  g.beginPath(); g.ellipse(ex, ey, erx * 1.07, ery * 1.07, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1; g.strokeStyle = '#3a4888';
  g.beginPath(); g.ellipse(ex, ey - 1, erx * 1.07, ery * 1.07, 0, 0, Math.PI * 2); g.stroke();
  for(let k = 0; k < 14; k++){
    const a = (k / 14) * Math.PI * 2 + .2;
    g.fillStyle = 'rgba(255,225,150,.75)';
    g.fillRect(Math.round(ex + Math.cos(a) * erx * 1.07 - 2), Math.round(ey + Math.sin(a) * ery * 1.07 - 1), 4, 2);
  }

  /* piso con luz cálida al centro, rayas, grietas y la Pokébola */
  g.save(); g.translate(ex, ey); g.scale(1, ery / erx);
  const piso = g.createRadialGradient(0, 0, 0, 0, 0, erx);
  piso.addColorStop(0, '#e4d29a'); piso.addColorStop(.45, '#a49a74'); piso.addColorStop(.8, '#3c405e'); piso.addColorStop(1, '#232846');
  g.fillStyle = piso; g.beginPath(); g.arc(0, 0, erx, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(30,34,60,.55)'; g.lineWidth = 1;
  g.beginPath(); g.arc(0, 0, erx * .84, 0, Math.PI * 2); g.stroke();
  for(let k = 0; k < 18; k++){
    const a = R() * 6.28, r1 = erx * azar(.1, .9), l = erx * azar(.05, .16);
    g.beginPath(); g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    g.lineTo(Math.cos(a + .5) * (r1 + l), Math.sin(a + .5) * (r1 + l)); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(-erx, -.6, erx * 2, 1.2);
  const rb = erx * .2;
  g.fillStyle = '#c4574a'; g.beginPath(); g.arc(0, 0, rb, Math.PI, 0); g.fill();
  g.fillStyle = '#e6dcc0'; g.beginPath(); g.arc(0, 0, rb, 0, Math.PI); g.fill();
  g.strokeStyle = '#2a2e46'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, rb, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(-rb, 0); g.lineTo(rb, 0); g.stroke();
  g.fillStyle = '#e6dcc0'; g.beginPath(); g.arc(0, 0, rb * .32, 0, 7); g.fill(); g.stroke();
  g.restore();

  /* focos y sus conos de luz */
  const lamparas = 6;
  for(let k = 0; k < lamparas; k++){
    const lx = ex + (k - (lamparas - 1) / 2) * erx * .34, ly = 3 + (k % 2) * 6;
    g.fillStyle = '#ffe9a0'; g.fillRect(Math.round(lx) - 3, ly, 6, 3);
    g.fillStyle = 'rgba(255,238,180,.075)';
    g.beginPath(); g.moveTo(lx - 2, ly + 3); g.lineTo(lx + 2, ly + 3);
    g.lineTo(ex + (lx - ex) * .35 + erx * .2, ey + ery * .3); g.lineTo(ex + (lx - ex) * .35 - erx * .2, ey + ery * .3); g.fill();
  }

  /* viñeta y paleta recortada con tramado (se ve a "píxel") */
  const vig = g.createRadialGradient(ex, ey, Math.min(erx, ery) * .5, ex, ey, Math.max(cw, ch) * .75);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = vig; g.fillRect(0, 0, cw, ch);
  const img = g.getImageData(0, 0, cw, ch), d = img.data, paso = 20;
  for(let y = 0; y < ch; y++) for(let x = 0; x < cw; x++){
    const i = (y * cw + x) * 4, b = (BAYER[(x & 3) + (y & 3) * 4] - 7.5) * 1.3;
    d[i] = Math.min(255, Math.round((d[i] + b) / paso) * paso);
    d[i + 1] = Math.min(255, Math.round((d[i + 1] + b) / paso) * paso);
    d[i + 2] = Math.min(255, Math.round((d[i + 2] + b) / paso) * paso);
  }
  g.putImageData(img, 0, 0);
}

function acomodarEntrenadores(){
  const tw = 48 * G.K * .85, th = 72 * G.K * .85;
  [['riv', G.cx - G.rx * 1.13, G.cy - G.ry * .2], ['yo', G.cx + G.rx * 1.13, G.cy + G.ry * .3]].forEach(([l, x, y]) => {
    const t = ST.querySelector('.ar-ent-sprite.' + l);
    x = Math.min(G.W - tw / 2 - 2, Math.max(tw / 2 + 2, x));
    Object.assign(t.style, {width:tw + 'px', height:th + 'px', left:x + 'px', top:y + 'px', zIndex:Math.round(y)});
  });
}

function alCambiarTamano(){
  if(!ST) return;
  medir(); pintarFondo(); acomodarEntrenadores();
  ['yo', 'riv'].forEach(l => { if(E[l]) tamanoSprite(E[l]); });
}

/* ---------------- efectos pixel ---------------- */
function particula(x, y, col, tam, dx, dy, dur, o){
  if(!FX) return;
  o = o || {};
  const d = mk('ar-p', {left:x + 'px', top:y + 'px', width:tam + 'px', height:tam + 'px', background:col, opacity:0});
  const g = o.g || 0, rot = o.rot || 0;
  const T = (px, py, r) => `translate(-50%,-50%) translate(${px}px,${py}px) rotate(${r}deg)`;
  const a = d.animate([
    {transform:T(0, 0, 0), opacity:1},
    {transform:T(dx * .6, dy * .6 + g * .3, rot), opacity:1, offset:.6},
    {transform:T(dx, dy + g, rot * 2), opacity:0}
  ], {duration:dur, delay:o.delay || 0, easing:'steps(7,end)', fill:'forwards'});
  const quitar = () => d.remove();
  a.finished.then(quitar, quitar);
}

function estallido(x, y, tipo, n, k){
  const st = partDe(tipo), U = u();
  n = REDUCE ? Math.ceil(n / 3) : n; k = k || 1;
  for(let i = 0; i < n; i++){
    const ang = Math.random() * Math.PI * 2, dist = azar(3, 9) * U * k;
    let dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    if(st.m === 'viento'){ dy *= .2; dx *= 1.7; }
    if(st.m === 'anillo'){ dx = Math.cos(ang) * 8 * U * k; dy = Math.sin(ang) * 8 * U * k; }
    if(st.m === 'zap'){ dx = Math.round(dx / U) * U; dy = Math.round(dy / U) * U; }
    particula(x, y, elige(st.c), Math.max(2, azar(.9, 1.9) * U * k), dx, dy, azar(380, 640),
      {g:(st.g || 0) * U * 5 * k, rot:azar(-120, 120)});
  }
}

function texto(x, y, txt, color, tam){
  if(!FX) return;
  const d = mk('ar-txt', {left:x + 'px', top:y + 'px', color:color || '#fff',
    fontSize:Math.max(12, u() * (tam || 3.6)) + 'px'});
  d.textContent = txt;
  const a = d.animate([
    {transform:'translate(-50%,0)', opacity:0},
    {transform:`translate(-50%,${-u() * 2}px)`, opacity:1, offset:.2},
    {transform:`translate(-50%,${-u() * 7}px)`, opacity:1, offset:.75},
    {transform:`translate(-50%,${-u() * 9}px)`, opacity:0}
  ], {duration:1100, easing:'steps(12,end)', fill:'forwards'});
  const quitar = () => d.remove();
  a.finished.then(quitar, quitar);
}

function sacudir(fuerza){
  if(REDUCE || !SHAKE) return;
  const p = u() * (fuerza || 1);
  SHAKE.animate([
    {transform:'translate(0,0)'}, {transform:`translate(${-p}px,${p * .4}px)`},
    {transform:`translate(${p}px,${-p * .4}px)`}, {transform:`translate(${-p * .6}px,0)`}, {transform:'translate(0,0)'}
  ], {duration:260, easing:'steps(5,end)'});
}

function tajos(x, y, color){
  const U = u();
  for(let i = 0; i < 3; i++){
    const d = mk('ar-tajo', {left:(x + (i - 1) * 2.6 * U) + 'px', top:(y + (i - 1) * 1.2 * U) + 'px',
      width:(11 * U) + 'px', height:Math.max(3, 1.2 * U) + 'px', background:'#fff', boxShadow:`0 0 0 ${Math.max(1, U * .45)}px ${color}`});
    const a = d.animate([
      {transform:'translate(-50%,-50%) rotate(-35deg) scaleX(0)', opacity:1},
      {transform:'translate(-50%,-50%) rotate(-35deg) scaleX(1)', opacity:1, offset:.45},
      {transform:'translate(-50%,-50%) rotate(-35deg) scaleX(1)', opacity:0}
    ], {duration:360, delay:i * 70, easing:'steps(6,end)', fill:'both'});
    const quitar = () => d.remove();
    a.finished.then(quitar, quitar);
  }
}

function destello(x, y){
  if(!FX) return;
  const f = mk('ar-flash', {left:x + 'px', top:y + 'px'});
  const a = f.animate([{transform:'translate(-50%,-50%) scale(.2)', opacity:.95}, {transform:'translate(-50%,-50%) scale(3.2)', opacity:0}],
    {duration:420, easing:'steps(6,end)'});
  const q = () => f.remove(); a.finished.then(q, q);
}

/* ---------------- entidades ---------------- */
function crearMon(p){
  const bst = bstDe(p), max = Math.round(60 + bst * .22);
  return {p, bst, max, hp:max, en:EN_MAX, vivo:true, st:statsDe(p)};
}
function crearEntidad(lado){
  const w = $('arMon-' + lado);
  return {lado, wrap:w, rot:w.querySelector('.ar-rot'), spr:w.querySelector('.ar-spr'),
    sombra:w.querySelector('.ar-sombra'), x:0, y:0, kx:0, ky:0, accion:null, cd:{corto:0, medio:0, largo:0, esq:0}, stun:0, invul:0,
    rodando:false, w:60, h:60, s:1, mon:null, aparece:0, bot:null};
}
const pie = e => ({x:G.cx + e.x * G.rx, y:G.cy + e.y * G.ry});
const cen = e => { const p = pie(e); return {x:p.x, y:p.y - e.h * e.s * .45}; };
const radio = e => Math.max(12, Math.min(e.w, e.h) * e.s * .36);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (a, b) => { const d = dist(a, b) || 1; return {x:(b.x - a.x) / d, y:(b.y - a.y) / d}; };

function encerrar(e){
  const r = Math.hypot(e.x, e.y);
  if(r > .96){ e.x *= .96 / r; e.y *= .96 / r; }
}
function empujar(e, dx, dy){ e.x += dx / G.rx; e.y += dy / G.ry; encerrar(e); }

function tamanoSprite(e){
  const img = e.spr;
  if(!img.naturalWidth) return;
  const sf = e.lado === 'yo' ? 1.12 : 1;
  e.w = img.naturalWidth * G.K * sf; e.h = img.naturalHeight * G.K * sf;
  img.style.width = e.w + 'px'; img.style.height = e.h + 'px';
  e.sombra.style.width = e.w * .85 + 'px'; e.sombra.style.height = Math.max(6, e.w * .2) + 'px';
}

function ponerSprite(e){
  const img = e.spr, mon = e.mon;
  img.style.opacity = '0';
  img.removeAttribute('data-fb');
  img.onload = () => { tamanoSprite(e); img.style.opacity = '1'; };
  img.onerror = () => {
    if(img.dataset.fb) return;
    img.dataset.fb = '1';
    img.onload = () => { img.style.width = img.style.height = 36 * G.K + 'px'; e.w = e.h = 36 * G.K; img.style.opacity = '1'; };
    img.src = mon.p.img;
  };
  img.alt = mon.p.name;
  img.src = e.lado === 'yo' ? spEspalda(mon.p.id) : spFrente(mon.p.id);
  e.rot.style.setProperty('--tc', TYPE_COLORS[mon.p.type]);
}

function clase(e, nombre, ms){
  e.wrap.classList.remove(nombre); void e.wrap.offsetWidth; e.wrap.classList.add(nombre);
  if(ms) setTimeout(() => e.wrap.classList.remove(nombre), ms);
}

function dibujar(e){
  const p = pie(e);
  e.s = .86 + .22 * ((e.y + 1) / 2);
  e.wrap.style.transform = `translate(${p.x}px,${p.y}px) scale(${e.s})`;
  e.wrap.style.zIndex = Math.round(p.y);
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
function calcularDanio(a, d, alc){
  const mult = efectividad(a.p.type, d.p.type), f = factorTipo(mult);
  const crit = f > 0 && Math.random() < a.st.crit;
  let dmg = ALC[alc].poder * Math.sqrt(a.bst / d.bst) * f * azar(.9, 1.1) * (crit ? a.st.critMult : 1);
  dmg = f === 0 ? 0 : Math.max(1, Math.round(dmg));
  return {dmg, mult, crit};
}

/* Devuelve true si el golpe pegó (false: esquivado, protegido o inmune). */
function golpear(att, def, alc, x, y){
  if(!def.mon.vivo) return false;
  const c = cen(def), arriba = c.y - def.h * def.s * .6;
  if(def.rodando){
    texto(c.x, arriba, '¡Esquivó!', '#8be9ff', 3.8);
    def.mon.en = Math.min(EN_MAX, def.mon.en + EN_PREMIO_ESQUIVE);
    return false;
  }
  if(def.invul > 0) return false;
  const res = calcularDanio(att.mon, def.mon, alc), d = def.mon;
  if(res.dmg === 0){ texto(c.x, arriba, 'No afecta', '#aab', 3.6); return false; }
  d.hp = Math.max(0, d.hp - res.dmg);
  texto(c.x, arriba, (res.crit ? '¡CRÍTICO! ' : '') + '-' + res.dmg,
    res.crit ? '#ff9f2e' : (res.mult > 1 ? '#ffd54a' : (res.mult < 1 ? '#c9ccd8' : '#fff')), res.crit ? 4.8 : 3.8);
  if(res.mult !== 1) setTimeout(() => AR && texto(c.x, c.y - def.h * def.s * .25, res.mult > 1 ? 'Súper efectivo' : 'Poco efectivo',
    res.mult > 1 ? '#ffd54a' : '#c9ccd8', 2.6), 120);
  estallido(x == null ? c.x : x, y == null ? c.y : y, att.mon.p.type, res.crit ? 22 : 10, res.crit ? 1.5 : 1);
  sacudir(res.crit ? 1.5 : .8);
  clase(def, 'ar-golpe', 320);
  def.stun = res.crit ? .3 : .18;
  const dir = unit(pie(att), pie(def)), emp = u() * (alc === 'corto' ? 55 : 30) * (res.crit ? 1.4 : 1);
  def.kx = dir.x * emp; def.ky = dir.y * emp;
  if(def.accion && def.accion.tipo !== 'esquivar') cortarAccion(def);
  pintarHud();
  if(d.hp <= 0) caer(def);
  return true;
}

function cortarAccion(e){
  const A = e.accion; if(!A) return;
  if(A.tele) A.tele.forEach(t => t.remove());
  e.wrap.classList.remove('ar-carga');
  e.accion = null;
}

function iniciar(e, tipo, dirPref){
  const m = e.mon;
  if(!m || !m.vivo || e.accion || e.stun > 0 || e.aparece > 0 || AR.pausa || AR.fase !== 'lucha') return false;
  const O = otro(e);
  if(tipo === 'esquivar'){
    if(e.cd.esq > 0 || m.en < ESQ.coste) return false;
    m.en -= ESQ.coste; e.cd.esq = ESQ.cd;
    let d = dirPref && (dirPref.x || dirPref.y) ? dirPref : null;
    if(!d){
      const a = unit(pie(e), pie(O));
      d = Math.random() < .5 ? {x:-a.y, y:a.x} : {x:a.y, y:-a.x};
    }
    const n = Math.hypot(d.x, d.y) || 1;
    e.accion = {tipo, t:0, dir:{x:d.x / n, y:d.y / n}};
    e.rodando = true; clase(e, 'ar-rodar', 330);
    return true;
  }
  const a = ALC[tipo];
  if(e.cd[tipo] > 0 || m.en < a.coste) return false;
  m.en -= a.coste; e.cd[tipo] = a.cd;
  e.accion = {tipo, t:0, dir:unit(pie(e), pie(O)), hecho:false};
  if(tipo === 'largo') prepararLargo(e);
  return true;
}

function prepararLargo(e){
  const A = e.accion, O = otro(e), tipo = e.mon.p.type, col = TYPE_COLORS[tipo];
  e.wrap.classList.add('ar-carga');
  A.lluvia = LARGO_LLUVIA.has(tipo);
  if(A.lluvia){
    const c = pie(O), r = 11 * u();
    A.zona = {x:c.x, y:c.y, r};
    const z = mk('ar-zona', {left:c.x + 'px', top:c.y + 'px', width:r * 2 + 'px', height:r * 2 * G.pz + 'px', borderColor:col});
    A.tele = [z];
  } else {
    A.tele = [mk('ar-mira', {background:col})];
  }
}

function disparoMedio(e){
  const O = otro(e), tipo = e.mon.p.type, c = cen(e), U = u();
  const d = unit(c, cen(O));
  const tam = Math.max(10, (tipo === 'rock' ? 4 : 3.2) * U), col = TYPE_COLORS[tipo];
  const el = mk('ar-orbe', {width:tam + 'px', height:tam + 'px', background:col, left:'0px', top:'0px',
    boxShadow:`0 0 0 ${Math.max(2, U * .5)}px #fff, 0 0 0 ${Math.max(3, U)}px ${col}88`});
  AR.proys.push({lado:e.lado, x:c.x, y:c.y, vx:d.x * 88 * U, vy:d.y * 88 * U, tipo, el, vida:1.5, tr:0, rad:tam * .6, rot:0,
    arco:MEDIO_ARCO.has(tipo), esq:false});
  estallido(c.x + d.x * 6 * U, c.y + d.y * 6 * U, tipo, 4, .6);
}

function dispararLargo(e){
  const A = e.accion, O = otro(e), tipo = e.mon.p.type, col = TYPE_COLORS[tipo], U = u(), st = partDe(tipo);
  if(A.lluvia){
    const z = A.zona, n = REDUCE ? 4 : 9;
    for(let i = 0; i < n; i++){
      const tx = z.x + azar(-z.r, z.r) * .85, ty = z.y + azar(-z.r, z.r) * G.pz * .85;
      const tam = Math.max(8, (tipo === 'rock' ? 3.6 : 2.4) * U);
      const o = mk('ar-orbe', {width:tam + 'px', height:tam + 'px', background:elige(st.c), boxShadow:`0 0 0 ${Math.max(1, U * .4)}px ${col}`, left:tx + 'px', top:'0px', opacity:0});
      const a = o.animate([
        {transform:'translate(-50%,-50%) translateY(0) rotate(0)', opacity:1},
        {transform:`translate(-50%,-50%) translateY(${ty}px) rotate(180deg)`, opacity:1}
      ], {duration:320, delay:i * 55, easing:'steps(7,start)', fill:'forwards'});
      a.finished.then(() => { o.remove(); estallido(tx, ty, tipo, 4, .7); }, () => o.remove());
    }
    AR.zonas.push({e:e.lado, zona:z, t:0, imp:.32 + n * .055, fin:false});
  } else {
    const c = cen(e), d = A.dirLock || unit(c, cen(O));
    const L = Math.hypot(G.W, G.H) * 1.1;
    const haz = mk('ar-rayo', {left:c.x + 'px', top:c.y + 'px', width:L + 'px', height:Math.max(8, 4.2 * U) + 'px',
      background:`linear-gradient(to bottom, transparent 0, ${col} 22%, #fff 50%, ${col} 78%, transparent 100%)`, boxShadow:`0 0 ${U * 2}px ${col}`});
    const ang = Math.atan2(d.y, d.x) * 180 / Math.PI, R = `translate(0,-50%) rotate(${ang}deg)`;
    const an = haz.animate([{transform:`${R} scaleX(0)`, opacity:1}, {transform:`${R} scaleX(1)`, opacity:1, offset:.2},
      {transform:`${R} scaleX(1) scaleY(.55)`, opacity:1, offset:.6}, {transform:`${R} scaleX(1) scaleY(.4)`, opacity:0}],
      {duration:420, easing:'steps(6,end)', fill:'forwards'});
    const q = () => haz.remove(); an.finished.then(q, q);
    for(let i = 0; i < (REDUCE ? 4 : 14); i++){
      const f = Math.random();
      particula(c.x + d.x * L * .5 * f, c.y + d.y * L * .5 * f, elige(st.c), Math.max(2, azar(.9, 1.7) * U), azar(-2, 2) * U, azar(-3, 3) * U, 360, {delay:i * 20});
    }
    sacudir(1.2);
    /* ¿le pega? distancia del centro del rival al rayo */
    const oc = cen(O), vx = oc.x - c.x, vy = oc.y - c.y, proj = vx * d.x + vy * d.y;
    const lat = Math.abs(vx * d.y - vy * d.x);
    if(proj > 0 && lat <= radio(O) + 2.6 * U) golpear(e, O, 'largo', oc.x, oc.y);
  }
}

function avanzarAccion(e, dt){
  const A = e.accion, O = otro(e), U = u(), vel = e.mon.st.vel;
  A.t += dt;
  if(A.tipo === 'esquivar'){
    const f = 1 - (A.t / ESQ.dur) * .55;
    empujar(e, A.dir.x * 86 * U * f * dt, A.dir.y * 86 * U * f * dt);
    if(A.t >= ESQ.dur){ e.rodando = false; e.accion = null; }
    return;
  }
  if(A.tipo === 'corto'){
    if(A.t < .08){
      const d = unit(pie(e), pie(O));
      empujar(e, -d.x * 14 * U * dt, -d.y * 14 * U * dt);
    } else if(A.t < .28){
      const d = unit(pie(e), pie(O));
      const cerca = dist(cen(e), cen(O)) <= radio(e) + radio(O) * .9;
      if(!cerca) empujar(e, d.x * 100 * U * vel * dt, d.y * 100 * U * vel * dt);
      if(!A.hecho && A.t > .1 && dist(cen(e), cen(O)) <= radio(e) + radio(O) + 7 * U){
        A.hecho = true;
        const c = cen(O);
        if(golpear(e, O, 'corto')) tajos(c.x, c.y, TYPE_COLORS[e.mon.p.type]);
      }
    } else if(A.t >= .46) e.accion = null;
    return;
  }
  if(A.tipo === 'medio'){
    if(!A.hecho && A.t >= .14){ A.hecho = true; disparoMedio(e); }
    if(A.t >= .4) e.accion = null;
    return;
  }
  if(A.tipo === 'largo'){
    if(A.t < .62){
      /* la mira sigue al rival hasta poco antes de disparar */
      const c = cen(e), t = cen(O), tele = A.tele && A.tele[0];
      if(!A.lluvia){
        if(A.t < .42) A.dirLock = unit(c, t);
        const d = A.dirLock || unit(c, t), ang = Math.atan2(d.y, d.x) * 180 / Math.PI;
        if(tele){
          Object.assign(tele.style, {left:c.x + 'px', top:c.y + 'px', width:Math.hypot(G.W, G.H) + 'px', height:Math.max(3, .9 * U) + 'px',
            transform:`translate(0,-50%) rotate(${ang}deg)`, opacity:A.t < .42 ? .55 : (Math.floor(A.t * 24) % 2 ? 1 : .35)});
          if(A.t >= .42) tele.style.background = '#ff3b3b';
        }
      } else if(tele){
        tele.style.opacity = Math.floor(A.t * 14) % 2 ? .95 : .5;
        if(A.t >= .4) tele.style.borderColor = '#ff3b3b';
      }
      if(Math.random() < dt * 30){
        const ang = Math.random() * 6.28, r = azar(5, 8) * U, st = partDe(e.mon.p.type);
        particula(c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r, elige(st.c), Math.max(2, U * 1.2), -Math.cos(ang) * r, -Math.sin(ang) * r, 380);
      }
    } else if(!A.hecho){
      A.hecho = true;
      e.wrap.classList.remove('ar-carga');
      dispararLargo(e);
      if(A.tele) A.tele.forEach(x => x.remove());
      A.tele = null;
    }
    if(A.t >= .62 + (A.lluvia ? .85 : .42)) cortarAccion(e);
  }
}

/* Las zonas de lluvia pegan cuando cae el último golpe. */
function avanzarZonas(dt){
  AR.zonas = AR.zonas.filter(z => {
    z.t += dt;
    if(z.t < z.imp) return true;
    const att = E[z.e], O = otro(att);
    if(att.mon && O.mon && O.mon.vivo){
      const p = pie(O), dx = p.x - z.zona.x, dy = (p.y - z.zona.y) / G.pz;
      if(Math.hypot(dx, dy) <= z.zona.r) golpear(att, O, 'largo');
    }
    sacudir(1.4);
    return false;
  });
}

function avanzarProyectiles(dt){
  const U = u();
  AR.proys = AR.proys.filter(p => {
    p.vida -= dt; p.tr -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += 540 * dt;
    const yy = p.y - (p.arco ? Math.sin(Math.max(0, Math.min(1, (1.5 - p.vida) / 1.5)) * Math.PI) * 6 * U : 0);
    p.el.style.transform = `translate(-50%,-50%) translate(${p.x}px,${yy}px) rotate(${p.rot}deg)`;
    if(p.tr <= 0){
      const st = partDe(p.tipo); p.tr = .045;
      particula(p.x, yy, elige(st.c), Math.max(2, azar(.8, 1.5) * U), azar(-1.5, 1.5) * U, azar(-1.5, 1.5) * U, 380, {g:(st.g || 0) * U * 2});
    }
    const dest = E[p.lado === 'yo' ? 'riv' : 'yo'], att = E[p.lado];
    if(dest.mon && dest.mon.vivo){
      const c = cen(dest);
      if(Math.hypot(c.x - p.x, c.y - yy) <= radio(dest) + p.rad){
        if(dest.rodando){
          /* atraviesa a quien está en la voltereta */
          if(!p.esq){ p.esq = true; golpear(att, dest, 'medio'); }
        } else if(dest.invul > 0){
          p.el.remove(); return false;
        } else {
          golpear(att, dest, 'medio', p.x, yy);
          p.el.remove(); return false;
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
  cortarAccion(e); e.rodando = false;
  AR.hold.clear();
  decir(`¡${m.p.name} se debilitó!`);
  const c = cen(e);
  estallido(c.x, c.y, m.p.type, 24, 1.6);
  e.spr.animate([{transform:'translateY(0)', opacity:1, filter:'brightness(1)'},
    {transform:`translateY(${u() * 2}px)`, opacity:.8, filter:'brightness(2)', offset:.3},
    {transform:`translateY(${u() * 9}px)`, opacity:0, filter:'brightness(1)'}],
    {duration:700, easing:'steps(8,end)', fill:'forwards'});
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
  e.spr.getAnimations().forEach(a => a.cancel());
  e.accion = null; e.rodando = false; e.stun = 0; e.kx = e.ky = 0;
  e.cd = {corto:.3, medio:.3, largo:.6, esq:0};
  e.invul = INVUL_ENTRADA; e.aparece = .45;
  if(e.bot) e.bot.t = .5;
  e.wrap.classList.remove('ar-golpe', 'ar-rodar', 'ar-carga');
  ponerSprite(e);
  pintarHud();
  const c = cen(e); destello(c.x, c.y);
  e.spr.addEventListener('load', () => e.spr.animate([{transform:'scale(.2)', opacity:0, filter:'brightness(3)'}, {transform:'scale(1)', opacity:1, filter:'brightness(1)'}],
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
const alcanceDe = (e, O) => (radio(e) + radio(O) + 7 * u()) * 2.1;

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
  if(!m.vivo) return;
  if(e.accion){
    avanzarAccion(e, dt);
    const A = e.accion;
    if(A && (A.tipo === 'medio' || A.tipo === 'largo') && (intent.x || intent.y)){
      const v = 38 * u() * m.st.vel * (A.tipo === 'largo' ? .3 : .5);
      empujar(e, intent.x * v * dt, intent.y * v * dt);
    }
  } else if(e.stun <= 0 && (intent.x || intent.y)){
    const n = Math.min(1, Math.hypot(intent.x, intent.y)), a = Math.atan2(intent.y, intent.x);
    const v = 38 * u() * m.st.vel * n;
    empujar(e, Math.cos(a) * v * dt, Math.sin(a) * v * dt);
  }
  /* separación: que no se atraviesen */
  const O = otro(e);
  if(O.mon && O.mon.vivo && e.lado === 'yo'){
    const c1 = cen(e), c2 = cen(O), min = (radio(e) + radio(O)) * .8, d = dist(c1, c2);
    if(d < min && d > 0){ const k = (min - d) / 2, dir = unit(c2, c1); empujar(e, dir.x * k, dir.y * k); empujar(O, -dir.x * k, -dir.y * k); }
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
  if(AR.pausa || !dt){ dibujar(E.yo); dibujar(E.riv); return; }
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
  }
  dibujar(E.yo); dibujar(E.riv);
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
const monHTML = lado => `<div class="ar-mon ${lado}" id="arMon-${lado}"><div class="ar-sombra"></div>
  <div class="ar-ancla"><div class="ar-bob"><div class="ar-rot"><img class="ar-spr" alt=""></div></div></div></div>`;

function armarEscenario(){
  $('arRoot').innerHTML = `
    <div class="ar-stage" id="arStage">
      <div class="ar-shake" id="arShake">
        <canvas class="ar-bg" id="arBg"></canvas>
        <div class="ar-ent-sprite riv"></div><div class="ar-ent-sprite yo"></div>
        ${monHTML('riv')}${monHTML('yo')}
        <div class="ar-fx" id="arFx"></div>
      </div>
      ${hudHTML('riv', AR.rivalNombre)}${hudHTML('yo', 'Vos')}
      <div class="ar-lineas"></div>
      <div class="ar-log" id="arLog" aria-live="polite"></div>
      <div class="ar-aviso" id="arAviso" aria-hidden="true"></div>
      <button class="ar-x" id="arCloseBtn" aria-label="Salir de la arena">✕</button>
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
  ST = $('arStage'); SHAKE = $('arShake'); FX = $('arFx'); BG = $('arBg');
  $('arCloseBtn').onclick = pedirSalida;
  $('arSeguir').onclick = () => { $('arConfirm').hidden = true; AR.pausa = AR.pausaAntes; };
  $('arAbandonar').onclick = cerrarArena;
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
  const rival = armarRival(mios);
  const estilo = elige(Object.keys(ESTILOS));
  AR = {
    yo:  {mons:mios.map(crearMon), idx:0, act:null},
    riv: {mons:rival.map(crearMon), idx:0, act:null},
    estilo:ESTILOS[estilo], proys:[], zonas:[], pend:[], hold:new Set(), keys:new Set(), joy:{x:0, y:0},
    fase:'intro', pausa:false, pausaAntes:false, cambioCd:0, cambioRiv:3, ult:0,
    rivalNombre:'Entrenador ' + elige(NOMBRES_RIVAL)
  };
  armarEscenario();
  E = {yo:crearEntidad('yo'), riv:crearEntidad('riv')};
  E.riv.bot = {guion:nuevoGuion(AR.estilo), hist:[], modo:'orbitar', t:1.2, reac:0, huye:0, huyeDir:1, dirOrb:1, ejecutado:false};
  E.yo.x = .55; E.yo.y = .35; E.riv.x = -.55; E.riv.y = -.2;
  AR.yo.act = AR.yo.mons[0]; AR.riv.act = AR.riv.mons[0];
  E.yo.mon = AR.yo.act; E.riv.mon = AR.riv.act;
  medir(); pintarFondo(); acomodarEntrenadores();
  if(typeof ResizeObserver === 'function'){
    RO = new ResizeObserver(() => { if(AR) alCambiarTamano(); });
    RO.observe(ST);
  }
  ponerSprite(E.yo); ponerSprite(E.riv);
  pintarHud();
  ['yo', 'riv'].forEach(l => { dibujar(E[l]); E[l].spr.addEventListener('load', () => dibujar(E[l]), {once:true}); });
  window.__arena = {estado:() => AR, ent:() => E};
  decir(`¡${AR.rivalNombre} quiere pelear!`);
  const aviso = $('arAviso'), tok = TOK, turbo = window.__arenaTurbo > 0 ? window.__arenaTurbo : 1;
  for(const t of ['3', '2', '1', '¡PELEA!']){
    if(tok !== TOK) return;
    aviso.textContent = t; aviso.classList.remove('pop'); void aviso.offsetWidth; aviso.classList.add('pop');
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
  const prem = gane ? PREMIO_GANAR : PREMIO_PERDER;
  coins += prem; updateCoins(); saveProgress();
  decir(gane ? '¡Ganaste la batalla!' : 'Te quedaste sin Pokémon...');
  const col = gane ? '#3DDC6E' : '#F0463C', f = $('arFin');
  f.hidden = false;
  f.innerHTML = `<div class="ar-fin-caja" style="border-color:${col}">
    <b style="color:${col}">${gane ? '¡Ganaste!' : 'Perdiste'}</b>
    <span>${gane ? `Le ganaste a ${AR.rivalNombre}.` : `${AR.rivalNombre} fue más fuerte esta vez.`} +${prem} monedas.</span>
    <div><button class="ar-b ar-med" id="arCerrar2"><b>Cerrar</b></button>
    <button class="ar-b ar-med" id="arOtra"><b>Revancha</b></button></div></div>`;
  $('arCerrar2').onclick = cerrarArena;
  $('arOtra').onclick = () => abrirArena();
  $('arOtra').focus();
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
  AR = null; ST = null; FX = null; SHAKE = null; BG = null; E = {};
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
