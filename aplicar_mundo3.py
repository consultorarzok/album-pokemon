"""Mete el mundo v3 (mundo3.txt + mundo3.json que escribe genmundo3.py) dentro
de index.html: filas, cols, zonas, carteles, santuarios y las fronteras que usa
regionDe(). No se edita el HTML a mano: son 84 renglones de 160 caracteres."""
import io
import json
import re

RUTA = 'index.html'
filas = io.open('mundo3.txt', encoding='utf-8').read().split('\n')
meta = json.load(io.open('mundo3.json', encoding='utf-8'))
html = io.open(RUTA, encoding='utf-8').read()

assert len(filas) == meta['filas'], (len(filas), meta['filas'])
assert all(len(f) == meta['cols'] for f in filas), 'hay renglones de largo distinto'


def js(txt):
    """Escapa un renglón del mapa para meterlo en un string JS con comillas dobles."""
    return '"' + txt.replace('\\', '\\\\').replace('"', '\\"') + '"'


def bloque_lineas(items, ancho=4, sangria=6):
    out, linea = [], []
    for i, it in enumerate(items):
        linea.append(it)
        if len(linea) == ancho or i == len(items) - 1:
            out.append(' ' * sangria + ','.join(linea))
            linea = []
    return ',\n'.join(out)


# ---------------- filas y cols ----------------
nuevas_filas = 'rows:[\n' + ',\n'.join('      ' + js(f) for f in filas) + '\n    ]'
html, n = re.subn(r'rows:\[\n(?:      "(?:[^"\\]|\\.)*",?\n)+    \]',
                  lambda m: nuevas_filas, html, count=1)
assert n == 1, 'no se pudo reemplazar el bloque rows del overworld'
html, n = re.subn(r"(overworld: \{\n    nombre:'[^']*',\n    cols:)\d+",
                  lambda m: m.group(1) + str(meta['cols']), html, count=1)
assert n == 1, 'no se pudo reemplazar cols'

# ---------------- zonas ----------------
zonas = ',\n'.join(
    "      {{n:{n:<28} x0:{x0:<4} y0:{y0:<4} x1:{x1:<4} y1:{y1}}}".format(
        n="'" + z['n'] + "',", x0=str(z['x0']) + ',', y0=str(z['y0']) + ',',
        x1=str(z['x1']) + ',', y1=z['y1'])
    for z in meta['zonas'])
html, n = re.subn(r'    zonas:\[\n(?:.*?\n)*?    \],', '    zonas:[\n' + zonas + '\n    ],',
                  html, count=1)
assert n == 1, 'no se pudo reemplazar zonas'

# ---------------- carteles ----------------
carteles = ',\n'.join("      '{}': {}".format(k, "'" + v.replace("'", "\\'") + "'")
                      for k, v in meta['carteles'].items())
html, n = re.subn(r'    carteles:\{\n(?:.*?\n)*?    \},', '    carteles:{\n' + carteles + '\n    },',
                  html, count=1)
assert n == 1, 'no se pudo reemplazar carteles'

# ---------------- santuarios ----------------
sant = ',\n'.join(
    "      '{}': {{n:'{}', pokes:[{}]}}".format(k, v['n'], ','.join("'" + p + "'" for p in v['pokes']))
    for k, v in meta['santuarios'].items())
html, n = re.subn(r'    santuarios:\{\n(?:.*?\n)*?    \}\n', '    santuarios:{\n' + sant + '\n    }\n',
                  html, count=1)
assert n == 1, 'no se pudo reemplazar santuarios'

# ---------------- fronteras (regionDe) ----------------
fr = ', '.join("{{hasta:{}, region:'{}'}}".format(f['hasta'], f['region']) for f in meta['fronteras'])
html, n = re.subn(r'const FRONTERAS = \[[^\]]*\];', 'const FRONTERAS = [' + fr + '];', html, count=1)
assert n == 1, 'no se pudo reemplazar FRONTERAS'

# ---------------- letras del minimapa (una por región, generado por genmundo3.py) ----------------
letras = ', '.join("['{}', {}]".format(l, x) for l, x in meta['letras'])
html, n = re.subn(r"\[\[.*?\]\]\.forEach\(\(\[letra, col\]\)",
                  '[' + letras + '].forEach(([letra, col])', html, count=1)
assert n == 1, 'no se pudieron reemplazar las letras del minimapa'

io.open(RUTA, 'w', encoding='utf-8').write(html)
print('index.html actualizado: {}x{}, {} zonas, {} carteles, {} altares'.format(
    meta['cols'], meta['filas'], len(meta['zonas']), len(meta['carteles']), len(meta['santuarios'])))
