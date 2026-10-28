"""Imagen de Gemini (3 vistas sobre fondo magenta) -> capas cuerpo/alas por vista para las monturas de la Aventura.
Uso: python3 herramientas/montura-capas.py <imagen> <montura>-<avatar>   (ej: charizard-red)
Separa las 3 vistas por manchas conectadas (no por columnas: un ala puede meterse en la vista de al lado)."""
import sys, json
from collections import deque
from PIL import Image
import numpy as np
src, nombre = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]
m = np.minimum(r, b) - g                      # "magentidad": fondo ~255
a = np.clip((190 - m) / 110, 0, 1)
ex = np.clip(m, 0, None) * (1 - a)            # saca el tinte magenta de los bordes
out = np.dstack([np.clip(r - ex, 0, 255), g, np.clip(b - ex, 0, 255), a * 255]).astype(np.uint8)
# manchas conectadas sobre la máscara achicada x4
K = 4
mask = (a > .15)[:H // K * K, :W // K * K].reshape(H // K, K, W // K, K).max(axis=(1, 3))
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
            info[n] = (sx / cnt * K, cnt)
grandes = sorted(info, key=lambda k: -info[k][1])[:3]
centros = sorted(info[k][0] for k in grandes)
def panel(k):
    cx, cnt = info[k]
    return int(np.argmin([abs(cx - c) for c in centros]))
labfull = np.kron(lab, np.ones((K, K), int)); labfull = np.pad(labfull, ((0, H - labfull.shape[0]), (0, W - labfull.shape[1])))
pmap = np.full(n + 1, -1); 
for k in info:
    if info[k][1] >= 3: pmap[k] = panel(k)
pan = pmap[labfull]
D = '/root/pokemon/images/monturas/'; meta = {}
for idx, nom in enumerate(['frente', 'lado', 'espalda']):
    o = out.copy(); o[..., 3] = np.where(pan == idx, o[..., 3], 0)
    A = o[..., 3] > 40; ys, xs = np.where(A)
    o = o[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; hh, ww = o.shape[:2]
    R, G, B = (o[..., i].astype(int) for i in range(3))
    yy0, xx0 = np.mgrid[0:hh, 0:ww] / np.array([hh, ww])[:, None, None]
    def dilatar(mk, n):
        mk = mk.copy()
        for _ in range(n):
            mk = mk | np.roll(mk, 1, 0) | np.roll(mk, -1, 0) | np.roll(mk, 1, 1) | np.roll(mk, -1, 1)
        return mk
    oscuro = (R + G + B < 200) & (o[..., 3] > 40)
    teal = (B - R > 40) & (G - R > 30)                      # membrana verde-azulada (el blanco de la gorra no entra)
    centro = (xx0 < .47) if nom == 'lado' else ((xx0 > .37) & (xx0 < .63))
    teal = teal & ~centro                                   # el pantalón azul del chico no es ala
    teal = teal | (dilatar(teal, 6) & oscuro)               # + su contorno oscuro
    amarillo = (R > 200) & (G > 165) & (B < 140)
    llama = (dilatar(amarillo, 6) | (dilatar(amarillo, 45) & (R > 140) & (G < 110) & (B < 100))) & (xx0 > .7)   # la llama de la cola (siempre a la derecha) no aletea
    llama = dilatar(llama, 1)
    jinete = ((R > 170) & (G > 140) & (B < 110)) | ((R > 150) & (G < 90) & (B < 90) & (yy0 < .3))
    yy, xx = yy0, xx0
    if nom == 'frente':
        ala = teal | (((xx < .30) | (xx > .70)) & (yy < .55)) | (((xx < .37) | (xx > .63)) & (yy < .42)); piv = [[.35, .40], [.65, .40]]
    if nom == 'lado':
        ala = teal | ((yy < .42) & (xx > .49) & ~jinete) | ((yy < .50) & (xx > .56)); piv = [[.52, .40]]
    if nom == 'espalda':
        ala = teal | (((xx < .34) | (xx > .66)) & (yy < .64)); piv = [[.38, .40], [.62, .40]]
    ala = ala & ~(llama & ~teal)
    esc = 300 / hh
    for capa, sel in (('cuerpo', ~ala), ('alas', ala)):
        c = o.copy(); c[..., 3] = np.where(sel, o[..., 3], 0)
        Image.fromarray(c).resize((round(ww * esc), 300), Image.LANCZOS).save(D + f'{nombre}-{nom}-{capa}.png', optimize=True)
    meta[nom] = {'w': round(ww * esc), 'h': 300, 'piv': piv}
print(json.dumps(meta))
