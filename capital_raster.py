"""Región 1 (San Salvador de Jujuy) a partir de OpenStreetMap (capital2.json).
Devuelve un dict {(x,y): char} para x 1..50, y 1..82 con: ~ agua, a orilla, " parques,
. calles, H casas, , pasto. Escala: 1 casillero = ~70 m. La Plaza Belgrano queda en (PX, PY)."""
import json, math
from PIL import Image, ImageDraw

LAT0, LON0 = -24.18624, -65.29890          # Plaza Belgrano
DLAT, DLON = 0.000630, 0.000688            # grados por casillero (~70 m)
PX, PY = 24, 12                             # casillero de la plaza (entra el Parque San Martín al oeste y el Río Grande al este)
X0, X1, Y0, Y1 = 1, 50, 1, 82
S = 4                                       # sobremuestreo para dibujar
d = json.load(open('capital2.json'))

def tile(lat, lon):
    return PX + (lon - LON0) / DLON, PY + (LAT0 - lat) / DLAT

def pts(e): return [tile(p['lat'], p['lon']) for p in e.get('geometry', [])]

W = 52; H = 84
def capa():
    return Image.new('L', (W * S, H * S), 0)
capas = {k: capa() for k in ('agua', 'rio', 'parque', 'calle', 'resid', 'cementerio', 'industria', 'monte')}
dib = {k: ImageDraw.Draw(v) for k, v in capas.items()}
def poly(k, p):
    if len(p) >= 3: dib[k].polygon([(x * S, y * S) for x, y in p], fill=255)
def linea(k, p, ancho):
    if len(p) >= 2: dib[k].line([(x * S, y * S) for x, y in p], fill=255, width=max(1, int(ancho * S)), joint='curve')

PARQUES_GRANDES = {'Parque San Martín', 'Parque Lineal Paseo Xibi-Xibi', 'Parque del Bicentenario del Éxodo', 'Parque Coronel Arias', 'Plaza Belgrano', 'Parque de la Memoria', 'Parque Juan Manuel de Rosas'}
for e in d['elements']:
    t = e.get('tags', {}); p = pts(e)
    if not p: continue
    if t.get('natural') == 'water': poly('agua', p)
    elif t.get('waterway') == 'river': linea('rio', p, 1.6 if t.get('name') == 'Río Grande' else 1.1)
    elif t.get('waterway') in ('stream',): linea('rio', p, .8)
    elif t.get('leisure') == 'park' and (t.get('name') in PARQUES_GRANDES): poly('parque', p)
    elif t.get('leisure') == 'park' and len(p) > 3:
        xs = [q[0] for q in p]; ys = [q[1] for q in p]
        if (max(xs) - min(xs)) * (max(ys) - min(ys)) >= 3: poly('parque', p)    # sólo plazas/parques de ~3 casilleros o más
    elif t.get('landuse') in ('residential', 'commercial', 'retail'): poly('resid', p)
    elif t.get('landuse') == 'industrial': poly('industria', p)
    elif t.get('landuse') == 'cemetery': poly('cementerio', p)
    elif t.get('natural') in ('scrub', 'wood') or t.get('landuse') in ('forest',): poly('monte', p)
    elif t.get('highway') in ('primary', 'trunk'): linea('calle', p, 1.0)
    elif t.get('highway') in ('secondary', 'tertiary'): linea('calle', p, .9)

def frac(k, x, y):
    im = capas[k]; n = 0
    for dy in range(S):
        for dx in range(S):
            if im.getpixel((x * S + dx, y * S + dy)): n += 1
    return n / (S * S)

grid = {}
for y in range(Y0, Y1 + 1):
    for x in range(X0, X1 + 1):
        c = ','
        if frac('monte', x, y) > .5: c = '#'
        if frac('parque', x, y) > .25: c = '"'
        if frac('cementerio', x, y) > .5: c = 'u'
        if frac('calle', x, y) > .22 and c in ',"#': c = '.'
        if frac('agua', x, y) > .4 or frac('rio', x, y) > .3: c = '~'
        grid[(x, y)] = c

if __name__ == '__main__':
    col = {'~': (60, 120, 220), 'a': (230, 215, 150), '"': (40, 150, 60), '.': (170, 170, 170), 'H': (170, 90, 70), ',': (110, 170, 80), '#': (20, 90, 30), 'u': (150, 100, 190)}
    im = Image.new('RGB', (W * 10, H * 10), (0, 0, 0))
    for (x, y), c in grid.items():
        ImageDraw.Draw(im).rectangle([x * 10, y * 10, x * 10 + 9, y * 10 + 9], fill=col.get(c, (255, 0, 255)))
    px, py = PX, PY; ImageDraw.Draw(im).ellipse([px*10, py*10, px*10+9, py*10+9], outline=(255, 255, 0), width=2)
    im.save('capital_preview.png')
    print({k: sum(1 for v in grid.values() if v == k) for k in set(grid.values())})
