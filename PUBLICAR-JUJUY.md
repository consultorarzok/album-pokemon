# Mapa de Jujuy v2 — guía para publicar (NO publicado todavía)

Estado: 26/10/2026. Todo está en commits LOCALES de /root/pokemon (rama actual), sin push y sin deploy.

## Qué incluye
- Mapa de 322x120 casilleros (antes 322x84), 6 regiones: Valles, Yungas, Quebrada, Alta Quebrada, Puna, Puna norte.
- Valles: San Salvador (Plaza Belgrano 15x15, fuentes, Casa de Gobierno/Catedral/Cabildo, Parque San Martín, Xibi Xibi, Río Grande),
  El Carmen con Dique La Ciénaga (presa, usina, pasarela ancha, torre de toma) y Embalse Las Maderas, Dique Los Alisos, cordón del Chañi.
- Yungas: Libertador General San Martín + Ingenio, cañaverales, Calilegua (selva y río), Lagunas de Yala.
- Quebrada: Tilcara + Pucará, Maimará + Paleta del Pintor, Purmamarca (plaza 9 de Julio, Algarrobo Histórico, Cerro de los Siete Colores),
  Paseo de los Colorados, Salinas Grandes.
- Alta Quebrada: Humahuaca (Cabildo, Candelaria, Monumento), Río Grande, Coctaca (andenes), Iruya, Serranía del Hornocal.
- Puna: Abra Pampa, Parque Solar Cauchari (paneles), Laguna de los Pozuelos, Salar de Cauchari.
- Puna norte: La Quiaca (río y puente a Villazón), Yavi, laguna de altura.
- Tren Solar: vía este-oeste por las 6 regiones, 6 estaciones, se puede subir y bajar (botón). Se cierra si hay evento con regiones cerradas.

## Pruebas (todas en /root/pokemon)
`node test-mundo.js`, `node test-tren.js`, `node test-aventura-tactil.js`, etc. (ver resultados en el último mensaje de la sesión).
Servidor: `cd /root/pokemon-servidor && npm run reglas && npm test` (34/34).

## Orden para publicar (cuando Zeta diga OK)
1. Backup: `cd /root/pokemon && git tag backup-pre-jujuy2` (y confirmar que existe `backup-pre-jujuy`).
2. Servidor primero: `cd /root/pokemon-servidor && npm run reglas` (ya corrido con el mapa nuevo) y desplegar el Worker
   (el servidor valida los casilleros: encuentros, ítems y altares salen de `src/reglas.json`).
   ⚠️ Entre el deploy del servidor y el del sitio, los celulares con el mapa VIEJO pueden recibir rechazos en encuentros/ítems.
   Hacer los dos pasos seguidos, en un horario con pocos chicos.
3. Sitio: `git push` + `bash sitio/publicar-sitio.sh` (según el script de publicación vigente).
4. Avisar: se pierden posiciones guardadas e ítems del piso ya recogidos (las claves son por coordenada: el mapa cambió entero).
5. Verificar en vivo en PC y celular: entrar, caminar por la plaza, subir al tren, cruzar de región.

## Pendiente / límites conocidos
- Las regiones Yungas, Puna y Puna norte se armaron con satélite de Esri y mi conocimiento, no con capturas de Maps de Zeta.
- Club Náutico y camping de Las Maderas sin dibujar.
- No se probó el botón del tren en un celular real.
