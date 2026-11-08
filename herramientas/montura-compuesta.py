"""Monturas con el sprite REAL del jugador: toma el dibujo del Pokémon SOLO (3 vistas sobre magenta, imagen de IA), le sienta encima
el sprite del juego (Red o May, frente / costado / espalda) a su tamaño exacto del mundo, y guarda las capas cuerpo/alas por vista.
Uso: python3 herramientas/montura-compuesta.py <solo.png> <montura> <red|may> <alto_pokemon_mundo> <anclas.json> [sinalas]
  alto_pokemon_mundo = altura del Pokémon (vista de frente) en px de MUNDO (el jugador a pie mide 21).
  anclas.json = {"<montura>": {"frente": [x, y], "lado": [x, y], "espalda": [x, y]}}: dónde van las caderas del jinete, como fracción
  del rectángulo del Pokémon (x de izquierda a derecha, y de arriba a abajo).
Escala de salida: K px de imagen por px de mundo (K = 10), así hd.alto (px de mundo de una capa de 300 px) = 30."""
import sys, json
from collections import deque
from PIL import Image
import numpy as np
src, nombre, av, H_MUNDO, anclas_path = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5]
SIN_ALAS = len(sys.argv) > 6 and sys.argv[6] == 'sinalas'
K = 8        # px de imagen por px de mundo; el sprite del jugador se escala con número ENTERO (píxeles nítidos)
ANCLAS = json.load(open(anclas_path))[nombre]
D = '/root/pokemon/images/monturas/'

# --- sprite del jugador: (hoja, ancho de cuadro, mundo por px de hoja) ---
if av == 'red':
    SH = Image.open('/root/pokemon/images/red_walk.png').convert('RGBA'); MUNDO_POR_PX = 14 / 48
else:
    SH = Image.open('/root/pokemon/images/may_walk.png').convert('RGBA'); MUNDO_POR_PX = 16 / 16
FW, FH = SH.size[0] // 4, SH.size[1] // 4
FILA = {'frente': 0, 'lado': 1, 'espalda': 3}      # fila 1 = mira a la izquierda
def jinete(vista):
    f = SH.crop((0, FILA[vista] * FH, FW, (FILA[vista] + 1) * FH))
    a = np.asarray(f); ys, xs = np.where(a[..., 3] > 40); f = f.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    if av == 'red':      # la hoja de Red viene agrandada x3: se vuelve al sprite original (16 px) y se escala entero
        f = f.resize((max(1, round(f.size[0] / 3)), max(1, round(f.size[1] / 3))), Image.NEAREST); z = round(14 / 16 * K)
    else:
        z = round(1.0 * K)
    return f.resize((f.size[0] * z, f.size[1] * z), Image.NEAREST)

# --- Pokémon solo: quitar el magenta y separar las 3 vistas por manchas ---
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]
m = np.minimum(r, b) - g
a = np.clip((190 - m) / 110, 0, 1)
ex = np.clip(m, 0, None) * (1 - a)
out = np.dstack([np.clip(r - ex, 0, 255), g, np.clip(b - ex, 0, 255), a * 255]).astype(np.uint8)
KK = 4
mask = (a > .15)[:H // KK * KK, :W // KK * KK].reshape(H // KK, KK, W // KK, KK).max(axis=(1, 3))
h4, w4 = mask.shape
lab = np.zeros(mask.shape, int); n = 0; info = {}
for y in range(h4):
    for x in range(w4):
        if mask[y, x] and not lab[y, x]:
            n += 1; q = deque([(y, x)]); lab[y, x] = n; sx = cnt = 0
            while q:
                cy, cx = q.popleft(); sx += cx; cnt += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h4 and 0 <= nx < w4 and mask[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n; q.append((ny, nx))
            info[n] = (sx / cnt * KK, cnt)
grandes = sorted(info, key=lambda k: -info[k][1])[:3]
centros = sorted(info[k][0] for k in grandes)
pmap = np.full(n + 1, -1)
for k in info:
    if info[k][1] >= 3: pmap[k] = int(np.argmin([abs(info[k][0] - c) for c in centros]))
labfull = np.kron(lab, np.ones((KK, KK), int)); labfull = np.pad(labfull, ((0, H - labfull.shape[0]), (0, W - labfull.shape[1])))
pan = pmap[labfull]
vistas = {}
for idx, nom in enumerate(['frente', 'lado', 'espalda']):
    o = out.copy(); o[..., 3] = np.where(pan == idx, o[..., 3], 0)
    A = o[..., 3] > 40; ys, xs = np.where(A)
    vistas[nom] = Image.fromarray(o[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
ESC = H_MUNDO * K / vistas['frente'].size[1]          # misma escala para las 3 vistas
meta = {}
for nom, pk in vistas.items():
    pk = pk.resize((max(1, round(pk.size[0] * ESC)), max(1, round(pk.size[1] * ESC))), Image.LANCZOS)
    rd = jinete(nom)
    ax, ay = ANCLAS[nom][:2]; delante = len(ANCLAS[nom]) > 2 and ANCLAS[nom][2] == 'f'     # 'f': el jinete va DELANTE del Pokémon
    cx, cy = round(ax * pk.size[0]), round(ay * pk.size[1])        # caderas del jinete = este punto del Pokémon
    # el jinete: centro horizontal en cx; sus caderas (65 % de su alto) en cy
    rx, ry = cx - rd.size[0] // 2, cy - round(rd.size[1] * .65)
    # lienzo: del punto más alto al más bajo, con margen
    x0, y0 = min(0, rx), min(0, ry); x1, y1 = max(pk.size[0], rx + rd.size[0]), max(pk.size[1], ry + rd.size[1])
    cw, ch = x1 - x0, y1 - y0
    L = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    if not delante: L.alpha_composite(rd, (rx - x0, ry - y0))       # jinete DETRÁS...
    P = Image.new('RGBA', (cw, ch), (0, 0, 0, 0)); P.alpha_composite(pk.convert('RGBA'), (-x0, -y0))
    # ...y el Pokémon adelante (su contorno tapa las piernas del jinete). Alas: capa aparte
    Pa = np.asarray(P).copy()
    if SIN_ALAS:
        ala = np.zeros(Pa.shape[:2], bool)
    else:
        R, G, B = (Pa[..., i].astype(int) for i in range(3))
        yy, xx = np.mgrid[0:ch, 0:cw] / np.array([ch, cw])[:, None, None]
        oscuro = (R + G + B < 200) & (Pa[..., 3] > 40)
        def dil(mk, k):
            mk = mk.copy()
            for _ in range(k): mk = mk | np.roll(mk, 1, 0) | np.roll(mk, -1, 0) | np.roll(mk, 1, 1) | np.roll(mk, -1, 1)
            return mk
        teal = (B - R > 40) & (G - R > 30)
        teal = teal | (dil(teal, 6) & oscuro)
        ala = teal
    cuerpo = Image.fromarray(np.where(ala[..., None], 0, Pa).astype(np.uint8))
    alas = Image.fromarray(np.where(ala[..., None], Pa, 0).astype(np.uint8))
    cuerpo_full = Image.new('RGBA', (cw, ch), (0, 0, 0, 0)); cuerpo_full.alpha_composite(L); cuerpo_full.alpha_composite(cuerpo)
    if delante:
        corte = ANCLAS[nom][3] if len(ANCLAS[nom]) > 3 else .85            # delante: se le cortan las piernas (quedan 'dentro' del Pokémon)
        cuerpo_full.alpha_composite(rd.crop((0, 0, rd.size[0], round(rd.size[1] * corte))), (rx - x0, ry - y0))
    # encuadre al contenido
    box = cuerpo_full.getbbox() if SIN_ALAS else Image.alpha_composite(cuerpo_full, alas).getbbox()
    cuerpo_full.crop(box).save(D + f'{nombre}-{av}-{nom}-cuerpo.png', optimize=True)
    if not SIN_ALAS: alas.crop(box).save(D + f'{nombre}-{av}-{nom}-alas.png', optimize=True)
    w, h = box[2] - box[0], box[3] - box[1]
    meta[nom] = {'w': w, 'h': h, 'piv': [[.35, .4], [.65, .4]] if nom != 'lado' else [[.52, .4]]}
    if nom == 'espalda': meta[nom]['piv'] = [[.38, .4], [.62, .4]]
# GUIA: las 3 vistas (con jinete real, tosco) sobre magenta, para que la IA las redibuje juntas
import os
GUIA = os.environ.get('GUIA')
if GUIA:
    cap = []
    for nom in ('frente', 'lado', 'espalda'):
        c = Image.open(D + f'{nombre}-{av}-{nom}-cuerpo.png').convert('RGBA'); al = D + f'{nombre}-{av}-{nom}-alas.png'
        if os.path.exists(al):
            L2 = Image.new('RGBA', c.size); L2.alpha_composite(Image.open(al).convert('RGBA')); L2.alpha_composite(c); c = L2
        cap.append(c)
    hmax = max(c.size[1] for c in cap); wtot = sum(c.size[0] for c in cap)
    f = min(560 / hmax, 1380 / (wtot + 140))
    cap = [c.resize((round(c.size[0] * f), round(c.size[1] * f)), Image.NEAREST) for c in cap]
    G = Image.new('RGBA', (1536, 1024), (255, 0, 255, 255)); x = 60
    gap = (1536 - 120 - sum(c.size[0] for c in cap)) // 2
    for c in cap: G.alpha_composite(c, (x, 700 - c.size[1])); x += c.size[0] + gap
    G.convert('RGB').save(GUIA)
print(json.dumps({'alto': round(300 / K, 3), 'vistas': meta}))
