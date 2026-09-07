"""Marca como ÉPICOS a los Pokémon que el juego y el anime tratan como
especiales, con reglas objetivas y verificables (no gusto personal):

  1. Pseudo-legendarios: las formas finales de 600 puntos de estadísticas
     (Dragonite, Tyranitar, Salamence, Metagross, Garchomp, Hydreigon,
     Goodra, Kommo-o, Dragapult, Baxcalibur).
  2. Ultra Entes (Ultra Beasts, 7ª generación).
  3. Pokémon Paradoja (9ª generación).
  4. El top 30 de la encuesta oficial "Pokémon of the Year 2020" (The
     Pokémon Company + Google), SALVO las primeras etapas que todavía
     evolucionan: Bulbasaur o Rowlet son queridísimos, pero como figurita
     de arranque no pueden ser más raros que su propia evolución.
  5. Los clásicos que el álbum ya trataba como "especiales" (carta dorada):
     Pikachu -la cara de la franquicia-, Eevee, Snorlax, Gyarados, Lapras,
     Ditto, Espeon y Milotic.

Los míticos (Mew, Celebi, Jirachi...) y los legendarios ya están en su
propia categoría y no se tocan.

Corre sobre index.html y reescribe la rareza y el peso de esos Pokémon.
"""
import io
import re

RUTA = 'index.html'
PESO_EPICO = 4          # entre Rara (8) y Legendario (2)

PSEUDO = [149, 248, 373, 376, 445, 635, 706, 784, 887, 998]
ULTRA_ENTES = list(range(793, 800)) + list(range(803, 807))
PARADOJA = list(range(984, 996)) + [1005, 1006, 1009, 1010] + list(range(1020, 1024))

# Top 30 de la encuesta oficial de 2020, en orden. Los que ya son legendarios
# (Rayquaza, Lugia) quedan como están; las primeras etapas que evolucionan
# (Bulbasaur, Rowlet, Snom, Eevee, Pikachu) se filtran salvo excepción.
TOP30 = [658, 448, 778, 6, 197, 700, 445, 384, 282, 94, 887, 248, 1, 849,
         249, 722, 681, 609, 25, 133, 405, 724, 571, 745, 823, 330, 635, 254, 257, 872]
PRIMERAS_ETAPAS = {1, 722, 872, 133}          # Bulbasaur, Rowlet, Snom, Eevee

CLASICOS = [25, 133, 143, 130, 131, 132, 196, 350]

epicos = set(PSEUDO) | set(ULTRA_ENTES) | set(PARADOJA) | set(CLASICOS)
epicos |= {i for i in TOP30 if i not in PRIMERAS_ETAPAS}

html = io.open(RUTA, encoding='utf-8').read()

cambios, saltados = [], []
FILA = re.compile(r'\[(\d+),"([^"]+)","([a-z]+)","([^"]+)",(\d+)\]')


def reemplazar(m):
    pid, nombre, tipo, rareza, peso = int(m.group(1)), m.group(2), m.group(3), m.group(4), m.group(5)
    if pid not in epicos:
        return m.group(0)
    if rareza == 'Legendario':                 # los legendarios/míticos no bajan de categoría
        saltados.append(nombre)
        return m.group(0)
    cambios.append((pid, nombre, rareza))
    return '[%d,"%s","%s","Épico",%d]' % (pid, nombre, tipo, PESO_EPICO)


nuevo = FILA.sub(reemplazar, html)
io.open(RUTA, 'w', encoding='utf-8').write(nuevo)

print('épicos pedidos:', len(epicos))
print('marcados      :', len(cambios))
print('ya legendarios:', len(saltados), saltados)
print()
for pid, nombre, antes in sorted(cambios):
    print('  #%-4d %-14s %s → Épico' % (pid, nombre, antes))
