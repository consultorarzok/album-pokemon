/* Efectos pixel para el juego (pixelfx, MIT: ver pixfx/vendor/LICENSE-pixelfx). Se empaqueta con herramientas/armar-pixfx.sh
   en pixfx.js (un solo script clásico, sin módulos, para que funcione también abriendo index.html desde archivo).
   Uso desde arena.js:  PIXFX.montar(escenario)  ·  PIXFX.golpe(x, y, tipo, critico, dir)  (x, y en px del escenario) */
import { createFrame, clearFrame, createFx, composite, PAL } from './vendor/core/index.js';
import * as hitSpark from './vendor/fx/impacts/hit-spark.js';
import * as critHit from './vendor/fx/impacts/crit-hit.js';

/* tipo del juego → rampa de color de pixelfx */
const RAMPA = {fire: 'fire', water: 'water', grass: 'leaf', electric: 'electric', ice: 'ice', poison: 'poison', psychic: 'arcane',
  ghost: 'shadow', dark: 'night', dragon: 'arcane', fairy: 'candy', steel: 'metal', rock: 'stone', ground: 'earth',
  fighting: 'blood', flying: 'dust', bug: 'leaf', normal: 'bone'};
const paleta = tipo => PAL[RAMPA[tipo]] || null;

let canvas = null, ctx = null, frame = null, img = null, k = 2, vivos = [], raf = 0, tPrev = 0;

function montar(escenario, px){
  desmontar();
  const r = escenario.getBoundingClientRect();
  k = Math.max(1.5, px || 2);
  canvas = document.createElement('canvas');
  canvas.className = 'ar-px';
  canvas.width = Math.max(8, Math.ceil(r.width / k)); canvas.height = Math.max(8, Math.ceil(r.height / k));
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:100001;image-rendering:pixelated;';
  escenario.appendChild(canvas);
  ctx = canvas.getContext('2d');
  frame = createFrame(canvas.width, canvas.height);
  img = new ImageData(canvas.width, canvas.height);
}
function desmontar(){ vivos = []; if(raf) cancelAnimationFrame(raf); raf = 0; canvas = ctx = frame = img = null; }

function bucle(t){
  if(!canvas || !canvas.isConnected){ desmontar(); return; }
  const dt = Math.min(.05, (t - tPrev) / 1000 || .016); tPrev = t;
  clearFrame(frame);
  for(const f of vivos){ f.update(dt); f.draw(frame, 'back'); f.draw(frame, 'front'); }
  vivos = vivos.filter(f => !f.done());
  composite(frame, img.data, null);
  ctx.putImageData(img, 0, 0);
  if(vivos.length) raf = requestAnimationFrame(bucle);
  else { raf = 0; ctx.clearRect(0, 0, canvas.width, canvas.height); }
}
function lanzar(mod, o){
  if(!canvas) return;
  if(vivos.length > 10) vivos.shift();
  vivos.push(createFx(mod, o));
  if(!raf){ tPrev = performance.now(); raf = requestAnimationFrame(bucle); }
}
/* x, y: px del escenario · tipo: tipo del ataque · critico: golpe crítico · dir: 1 = golpe hacia la derecha, -1 = hacia la izquierda */
function golpe(x, y, tipo, critico, dir){
  if(!canvas) return;
  const o = {x: x / k, y: y / k, flip: dir < 0, seed: Math.floor(Math.random() * 9999), light: .8};
  const pal = paleta(tipo);
  if(critico) lanzar(critHit, Object.assign(o, pal ? {palette: pal} : {}));
  else lanzar(hitSpark, Object.assign(o, pal ? {palette: pal} : {}));
}
window.PIXFX = {montar, desmontar, golpe, activo: () => !!canvas};
