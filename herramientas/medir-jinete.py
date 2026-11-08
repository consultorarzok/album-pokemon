"""Mide a qué escala dibujó la IA al jinete: busca la cabeza del sprite REAL del juego (images/red_walk.png / may_walk.png)
dentro de la imagen de 3 vistas. Imprime px_de_mundo_por_px_de_imagen (wpg): con eso el jinete montado mide lo MISMO que a pie.
Uso: python3 herramientas/medir-jinete.py <imagen.png> <red|may> [debug.png]"""
import sys, json
import numpy as np, cv2
from PIL import Image
src, av = sys.argv[1], sys.argv[2]
dbg = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != '-' else None
rango = [float(x) for x in sys.argv[4].split(',')] if len(sys.argv) > 4 else [3.0, 11.0]
ventana = [int(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 else None   # x,y,w,h: solo buscar ahí
# cabeza del sprite a pie, a tamaño nativo (16 px de ancho de sprite) y cuánto mide en el mundo del juego
if av == 'red':
    sh = Image.open('/root/pokemon/images/red_walk.png').convert('RGBA'); fw, fh = sh.size[0] // 4, sh.size[1] // 4
    fr = sh.crop((0, 0, fw, fh)).resize((fw // 3, fh // 3), Image.NEAREST); mundo_por_nativo = 14 / 16
else:
    sh = Image.open('/root/pokemon/images/may_walk.png').convert('RGBA'); fw, fh = sh.size[0] // 4, sh.size[1] // 4
    fr = sh.crop((0, 0, fw, fh)); mundo_por_nativo = 16 / 16
a = np.asarray(fr).astype(np.float32)
ys, xs = np.where(a[..., 3] > 100); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
cab = a[: max(6, int(a.shape[0] * .5))]                      # cabeza (gorra/pañuelo + cara)
img_full = cv2.cvtColor(cv2.imread(src), cv2.COLOR_BGR2RGB).astype(np.float32)
# solo la vista de FRENTE (la de más a la izquierda): ahí el jinete se ve de frente, como la plantilla
mg = (np.minimum(img_full[..., 0], img_full[..., 2]) - img_full[..., 1]) < 150
cols = np.where(mg.any(axis=0))[0]
img = img_full[:, : min(img_full.shape[1], int(cols.min() + (cols.max() - cols.min()) * .36))]
mejor = (-1, None, None)
for s in np.arange(rango[0], rango[1], .1):
    w, h = max(4, round(cab.shape[1] * s)), max(4, round(cab.shape[0] * s))
    t = cv2.resize(cab, (w, h), interpolation=cv2.INTER_NEAREST)
    m = (t[..., 3] > 100).astype(np.uint8) * 255
    if h >= img.shape[0] or w >= img.shape[1]: continue
    zona = img if not ventana else img[max(0, ventana[1]):ventana[1] + ventana[3], max(0, ventana[0]):ventana[0] + ventana[2]]
    if zona.shape[0] <= h or zona.shape[1] <= w: continue
    r = cv2.matchTemplate(zona, t[..., :3].copy(), cv2.TM_CCOEFF_NORMED, mask=m)
    r = np.nan_to_num(r, nan=-1, posinf=-1, neginf=-1); r = np.clip(r, -1, 1)
    _, mx, _, loc = cv2.minMaxLoc(r)
    if mx < .2: continue
    # el fondo magenta no puede ser el jinete: exigir que la zona NO sea magenta
    if ventana: loc = (loc[0] + max(0, ventana[0]), loc[1] + max(0, ventana[1]))
    z = img[loc[1]:loc[1] + h, loc[0]:loc[0] + w]
    magenta = (np.minimum(z[..., 0], z[..., 2]) - z[..., 1] > 150).mean()
    if magenta > .35: continue
    # puntaje con la parte opaca solamente (más justo que CCORR a secas)
    d = np.abs(z - t[..., :3]).mean(axis=2)[m > 0].mean()
    sc = float(mx) if False else 1 - d / 255
    sc = float(mx)
    if sc > mejor[0]: mejor = (sc, s, (loc, (w, h)))
sc, s, (loc, wh) = mejor
res = {'escala_img_por_nativo': round(float(s), 2), 'puntaje': round(float(sc), 3), 'wpg': round(mundo_por_nativo / float(s), 5), 'caja': [int(loc[0]), int(loc[1]), wh[0], wh[1]]}
if dbg:
    o = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGB2BGR); cv2.rectangle(o, (loc[0], loc[1]), (loc[0] + wh[0], loc[1] + wh[1]), (0, 255, 0), 3); cv2.imwrite(dbg, o)
print(json.dumps(res))
