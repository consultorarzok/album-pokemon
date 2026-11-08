/* Efectos pixel para el juego (pixelfx, MIT: ver pixfx/vendor/LICENSE-pixelfx). Se empaqueta con herramientas/armar-pixfx.sh
   en pixfx.js (un solo script clásico, sin módulos, para que funcione también abriendo index.html desde archivo).
   Uso desde arena.js:
     PIXFX.montar(escenario, px)                         al armar la Arena
     PIXFX.golpe(x, y, tipo, critico, dir)               golpe común o crítico (x, y en px del escenario)
     PIXFX.proyectil(tipo, forma) → {mover(x,y,vx,vy), parar()} | null     poder que viaja (bola de fuego, rayo, lanza de hielo)
     PIXFX.zona(x, y, tipo, r)                           estallido grande de un ataque de zona (largo) */
import { createFrame, clearFrame, createFx, composite, PAL } from './vendor/core/index.js';
import * as hitSpark from './vendor/fx/impacts/hit-spark.js';
import * as critHit from './vendor/fx/impacts/crit-hit.js';
import * as fireball from './vendor/fx/fire/fireball.js';
import * as ballLightning from './vendor/fx/lightning/ball-lightning.js';
import * as lightningStrike from './vendor/fx/lightning/lightning-strike.js';
import * as iceLance from './vendor/fx/ice/ice-lance.js';
import * as frostNova from './vendor/fx/ice/frost-nova.js';
import * as smallExplosion from './vendor/fx/explosions/small-explosion.js';
import * as manaBurst from './vendor/fx/arcane/mana-burst.js';
import * as darkExplosion from './vendor/fx/shadow/dark-explosion.js';
import * as geyser from './vendor/fx/water/geyser.js';

/* tipo del juego → rampa de color de pixelfx */
const RAMPA = {fire: 'fire', water: 'water', grass: 'leaf', electric: 'electric', ice: 'ice', poison: 'poison', psychic: 'arcane',
  ghost: 'shadow', dark: 'night', dragon: 'arcane', fairy: 'candy', steel: 'metal', rock: 'stone', ground: 'earth',
  fighting: 'blood', flying: 'dust', bug: 'leaf', normal: 'bone'};
const paleta = tipo => PAL[RAMPA[tipo]] || null;

/* poderes que viajan: sólo los de forma "bola" de estos tipos */
const PROY = {fire: {mod: fireball, o: {}, dy: 0}, electric: {mod: ballLightning, o: {}, dy: 46}, ice: {mod: iceLance, o: {}, dy: 0}};   // dy: la bola eléctrica flota sobre su origen
/* estallidos de zona: módulo, escala (px de pantalla por px del efecto) y velocidad de reproducción */
const ZONA = {fire: {mod: smallExplosion, k: 1.5, vel: 3}, ice: {mod: frostNova, k: 1.3, vel: 2}, electric: {mod: lightningStrike, k: 1.5, vel: 2.4},
  psychic: {mod: manaBurst, k: 1.4, vel: 1.4}, ghost: {mod: darkExplosion, k: 1.5, vel: 2}, dark: {mod: darkExplosion, k: 1.5, vel: 2},
  water: {mod: geyser, k: 1.4, vel: 2.5}};

let esc = null, capas = {}, base = 2;
/* una capa = un canvas con su propia escala (los golpes se ven con píxeles gruesos; los estallidos grandes, más finos) */
function capa(k){
  const key = String(k);
  if(capas[key]) return capas[key];
  const r = esc.getBoundingClientRect(), c = document.createElement('canvas');
  c.className = 'ar-px';
  c.width = Math.max(8, Math.ceil(r.width / k)); c.height = Math.max(8, Math.ceil(r.height / k));
  c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:100001;image-rendering:pixelated;';
  esc.appendChild(c);
  const L = {k, canvas: c, ctx: c.getContext('2d'), frame: createFrame(c.width, c.height), img: new ImageData(c.width, c.height), vivos: [], raf: 0, t: 0};
  capas[key] = L; return L;
}
function montar(escenario, px){
  desmontar(); esc = escenario; base = Math.max(1.5, px || 2); capa(base);
}
function desmontar(){ for(const k in capas){ const L = capas[k]; if(L.raf) cancelAnimationFrame(L.raf); } capas = {}; esc = null; }

function bucle(L, t){
  if(!L.canvas.isConnected){ desmontar(); return; }
  const dt = Math.min(.05, (t - L.t) / 1000 || .016); L.t = t;
  clearFrame(L.frame);
  for(const f of L.vivos){ f.update(dt * (f.__vel || 1)); f.draw(L.frame, 'back'); f.draw(L.frame, 'front'); }
  L.vivos = L.vivos.filter(f => !f.done());
  composite(L.frame, L.img.data, null);
  L.ctx.putImageData(L.img, 0, 0);
  if(L.vivos.length) L.raf = requestAnimationFrame(t2 => bucle(L, t2));
  else { L.raf = 0; L.ctx.clearRect(0, 0, L.canvas.width, L.canvas.height); }
}
function lanzar(L, mod, o, vel){
  if(L.vivos.length > 12) L.vivos.shift();
  const f = createFx(mod, o); f.__vel = vel || 1; L.vivos.push(f);
  if(!L.raf){ L.t = performance.now(); L.raf = requestAnimationFrame(t => bucle(L, t)); }
  return f;
}

/* golpe común o crítico */
function golpe(x, y, tipo, critico, dir){
  if(!esc) return;
  const L = capa(base), pal = paleta(tipo);
  const o = {x: x / L.k, y: y / L.k, flip: dir < 0, seed: Math.floor(Math.random() * 9999), light: .8};
  if(pal) o.palette = pal;
  lanzar(L, critico ? critHit : hitSpark, o);
}
/* poder que viaja: se actualiza cada cuadro con mover(); parar() lo deja apagar */
function proyectil(tipo, forma){
  if(!esc || forma !== 'bola' || !PROY[tipo]) return null;
  const L = capa(1.5), f = lanzar(L, PROY[tipo].mod, Object.assign({x: -999, y: -999, seed: Math.floor(Math.random() * 9999), light: .9}, PROY[tipo].o), 1);
  return {
    mover(x, y, vx, vy){ f.options.x = x / L.k; f.options.y = y / L.k + PROY[tipo].dy; f.options.angle = Math.atan2(vy, vx); },
    parar(){ f.stop(); }
  };
}
/* estallido grande de zona: se ve apenas entra el ataque y dura poco */
function zona(x, y, tipo, r){
  if(!esc || !ZONA[tipo]) return;
  const Z = ZONA[tipo], L = capa(Z.k);
  const f = lanzar(L, Z.mod, {x: x / L.k, y: y / L.k, seed: Math.floor(Math.random() * 9999), light: .9}, Z.vel);
  setTimeout(() => f.stop(), 2200 / Z.vel);
}
window.PIXFX = {montar, desmontar, golpe, proyectil, zona, activo: () => !!esc};
