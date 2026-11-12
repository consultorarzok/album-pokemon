// Bola eléctrica que VIAJA (12/11): la misma bola de "ball-lightning" de pixelfx, pero quieta en su origen y con la
// estela hacia atrás (-x; el pintor la gira según el ángulo del disparo). La original pasea en un lazo de ±38 px y
// descarga rayos al piso: sirve de adorno, no de proyectil (la bola se veía lejos de donde realmente iba el golpe).
import { fit, rng, TAU, WHITE } from "./vendor/core/index.js";
import { VOLT, PLASMA, zigzag, crackle } from "./vendor/fx/lightning/_lib.js";

export const meta = {
  name: "Bola eléctrica (proyectil)", desc: "Bola de plasma que viaja derecho, con estela.", tags: ["lightning", "projectile"],
  size: [136, 56], origin: [112, 28], duration: 4, loop: true, fps: 30, bg: "ground",
  options: { palette: VOLT, sparks: PLASMA, seed: 9 },
};
const FPS = 30, N = 120;
export function draw(p, t, o) {
  const C = fit(o.palette, 8), f = Math.floor(t * FPS + 1e-6) % N, r = rng(o.seed, 1, f), x = 0, y = 0;
  // estela: se achica y se enfría hacia atrás, con un temblor chico
  for (let i = 14; i >= 1; i--) {
    const u = i / 14, rr = 3.4 * (1 - u) + 0.3, wx = -i * 3.4, wy = Math.sin(t * 22 + i * 0.9) * 1.6 * u;
    if (u > 0.6 && (i + f) % 2) continue;
    p.circle(wx, wy, rr + 0.8, u < 0.35 ? C[3] : C[2]);
    p.circle(wx, wy, rr, u < 0.35 ? C[6] : u < 0.7 ? C[5] : C[4]);
    p.glow(wx, wy, 7 * (1 - u) + 3, C[4], 0.25 * (1 - u));
  }
  // la bola
  const R0 = 5.6 + 0.6 * Math.sin(t * 9) + 0.4 * r.range(-1, 1);
  p.circle(x, y, R0 + 1.3, C[2]);
  p.circle(x, y, R0, C[4]);
  p.circle(x - 0.4, y - 0.4, R0 * 0.72, C[5]);
  for (let i = 0; i < 3; i++) {
    const a = t * (5 + i * 2.3) + i * 2.1, d = R0 * 0.6;
    p.circle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 1.2, i ? C[6] : WHITE);
  }
  p.circle(x - 0.6, y - 0.6, R0 * 0.32, WHITE);
  for (let i = 0; i < 8; i++) {
    if (r.next() < 0.35) continue;
    const a = (i / 8) * TAU + t * 2 + r.range(-0.2, 0.2), l = r.range(1.5, 4);
    p.line(x + Math.cos(a) * (R0 + 1), y + Math.sin(a) * (R0 + 1), x + Math.cos(a) * (R0 + 1 + l), y + Math.sin(a) * (R0 + 1 + l), i % 2 ? C[5] : C[4]);
  }
  p.glow(x, y, 24, C[4], 0.3);
  p.glow(x, y, 9, C[6], 0.1);
  // chispas que saltan de la bola
  for (let i = 0; i < 2 + (r.next() < 0.4 ? 1 : 0); i++) {
    const a = r.range(0, TAU), l = r.range(5, 10), x0 = x + Math.cos(a) * (R0 + 1), y0 = y + Math.sin(a) * (R0 + 1), b = a + r.range(-0.7, 0.7);
    crackle(p, zigzag(r, x0, y0, x0 + Math.cos(b) * l, y0 + Math.sin(b) * l, 0.4, 0.3), r.range(0.4, 0.7), C, 0.25);
  }
}
