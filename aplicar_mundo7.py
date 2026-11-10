"""Mete el mundo v7 (grilla 3x3, Capital al medio) en app.js: filas, cols, zonas, carteles, altares, fuegos, fuentes,
guaridas, algarrobo y el recorrido del Tren Solar (lo escribe genmundo7.py en mundo7.txt / mundo7.json)."""
import io
import json
import re

RUTA = 'app.js'
filas = io.open('mundo7.txt', encoding='utf-8').read().split('\n')
meta = json.load(io.open('mundo7.json', encoding='utf-8'))
js_ = io.open(RUTA, encoding='utf-8').read()
assert len(filas) == meta['filas'] and all(len(f) == meta['cols'] for f in filas)


def js(txt):
    return '"' + txt.replace('\\', '\\\\').replace('"', '\\"') + '"'


def sub(patron, nuevo, txt, nombre, flags=0):
    txt, n = re.subn(patron, lambda m: nuevo, txt, count=1, flags=flags)
    assert n == 1, 'no se pudo reemplazar ' + nombre
    return txt


js_ = sub(r'rows:\[\n(?:      "(?:[^"\\]|\\.)*",?\n)+    \]',
          'rows:[\n' + ',\n'.join('      ' + js(f) for f in filas) + '\n    ]', js_, 'rows')
js_ = re.sub(r"(overworld: \{\n    nombre:'[^']*',\n    cols:)\d+", lambda m: m.group(1) + str(meta['cols']), js_, count=1)

zonas = ',\n'.join("      {{n:{n:<28} x0:{x0:<4} y0:{y0:<4} x1:{x1:<4} y1:{y1}}}".format(
    n="'" + z['n'].replace("'", "\\'") + "',", x0=str(z['x0']) + ',', y0=str(z['y0']) + ',', x1=str(z['x1']) + ',', y1=z['y1'])
    for z in meta['zonas'])
js_ = sub(r'    zonas:\[\n(?:.*?\n)*?    \],', '    zonas:[\n' + zonas + '\n    ],', js_, 'zonas')

carteles = ',\n'.join("      '{}': {}".format(k, "'" + v.replace("'", "\\'") + "'") for k, v in meta['carteles'].items())
js_ = sub(r'    carteles:\{\n(?:.*?\n)*?    \},', '    carteles:{\n' + carteles + '\n    },', js_, 'carteles')

sant = ',\n'.join("      '{}': {{n:'{}', pokes:[{}]}}".format(k, v['n'], ','.join("'" + p + "'" for p in v['pokes']))
                  for k, v in meta['santuarios'].items())
js_ = sub(r'    santuarios:\{\n(?:.*?\n)*?    \}\n', '    santuarios:{\n' + sant + '\n    }\n', js_, 'santuarios')

js_ = sub(r'const FUENTES = \[.*?\];', 'const FUENTES = ' + json.dumps(meta['fuentes']) + ';', js_, 'FUENTES')
js_ = sub(r'const GUARIDAS = \[.*?\];', 'const GUARIDAS = ' + json.dumps(meta['guaridas']) + ';', js_, 'GUARIDAS')
js_ = sub(r'const ALGARROBOS = \[.*?\];', 'const ALGARROBOS = ' + json.dumps(meta['algarrobos']) + ';', js_, 'ALGARROBOS')
fuego = ', '.join('[%d, %d]' % tuple(p) for p in meta['fuego'])
js_ = sub(r'const ZONAS_FUEGO = \[[^\n]*\n[^\n]*\];[^\n]*', 'const ZONAS_FUEGO = [' + fuego + '];        // fuegos de Valles y Yungas (trasladados con la grilla 3x3)', js_, 'ZONAS_FUEGO')

t = meta['tren']
js_ = sub(r'const TREN_DATOS = \{.*?\};', 'const TREN_DATOS = ' + json.dumps(t, ensure_ascii=False) + ';', js_, 'TREN_DATOS')
io.open(RUTA, 'w', encoding='utf-8').write(js_)
print('app.js actualizado: {}x{}, {} zonas, {} carteles, {} altares, tren con {} paradas'.format(
    meta['cols'], meta['filas'], len(meta['zonas']), len(meta['carteles']), len(meta['santuarios']), len(t['paradas'])))
