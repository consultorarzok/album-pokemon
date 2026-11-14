# Sprites provisorios de los 19 líderes (hasta tener las figuras de Gemini). Hombres: hoja de Rosa (Red, 128x192 por cuadro)
# con el verde reteñido. Mujeres: hoja de May (16x21 por cuadro) con el rojo reteñido. Uso: python3 lideres_recolor.py
import colorsys, json
from PIL import Image
import numpy as np
IMG = '/root/pokemon/images/'
def hsv_arr(rgb):
    mx = rgb.max(-1); mn = rgb.min(-1); d = mx-mn; dd = np.where(d == 0, 1, d)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g-b)/dd) % 6, np.where(mx == g, (b-r)/dd+2, (r-g)/dd+4))*60
    return h, np.where(mx > 0, d/np.where(mx == 0, 1, mx), 0), mx
def tenir(base, es_color, H, S, V):
    a = np.array(Image.open(IMG+base).convert('RGBA')).astype(float)/255
    h, s, v = hsv_arr(a[..., :3])
    m = es_color(h, s) & (a[..., 3] > 0.1)
    out = a.copy()
    for y, x in np.argwhere(m):
        out[y, x, :3] = colorsys.hsv_to_rgb(H/360, min(1, s[y, x]*S), min(1, v[y, x]*V))
    return Image.fromarray((out*255).astype('uint8'), 'RGBA')
verde = lambda h, s: (h > 85) & (h < 170) & (s > 0.25)
rojo = lambda h, s: ((h < 22) | (h > 335)) & (s > 0.35)
# n, tipo, sexo, hue, sat*, val*
LID = [(2,'bicho','M',55,1.0,0.95),(3,'roca','M',28,0.8,0.7),(4,'lucha','M',5,1.1,0.95),(5,'electrico','M',48,1.2,1.1),(6,'hielo','M',190,0.9,1.1),
 (7,'psiquico','F',320,1.0,1.05),(8,'siniestro','M',255,0.6,0.55),(9,'acero','M',212,0.3,0.95),(10,'agua','F',215,1.0,0.95),
 (11,'veneno','M',295,1.0,0.9),(12,'normal','F',35,0.45,1.15),(13,'fuego','M',18,1.2,1.0),(14,'rayo','F',50,1.2,1.1),
 (15,'tormenta','M',175,1.0,0.95),(16,'zenta','F',268,0.95,0.9),(17,'sombras','M',200,0.12,0.5),(18,'cielo','F',195,0.65,1.1),(19,'sol','M',42,1.1,1.15)]
man = {}
for n, t, sx, H, S, V in LID:
    f = 'lider%d_%s_walk.png' % (n, t)
    img = tenir('rosa_walk.png', verde, H, S, V) if sx == 'M' else tenir('may_walk.png', rojo, H, S, V)
    if sx == 'M': img = img.resize((192, 288), Image.LANCZOS).quantize(colors=96, method=Image.Quantize.FASTOCTREE).convert('RGBA')   # 96 colores: nadie lo nota a 14 px   # misma medida que red_walk.png: pesa ~30 KB en vez de ~480 KB
    img.save(IMG+f, optimize=True)
    man['lider%d' % n] = {'src': 'images/'+f, 'fw': 48 if sx == 'M' else 16, 'fh': 72 if sx == 'M' else 21, 'w': 14 if sx == 'M' else 16, 'h': 21, 'suave': sx == 'M', 'npc': True}
json.dump(man, open('/root/pokemon/herramientas/lideres_sprites.json', 'w'), indent=1)
