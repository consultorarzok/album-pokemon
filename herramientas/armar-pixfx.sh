#!/bin/bash
# Empaqueta pixfx/entry.js (pixelfx) en pixfx.js, un script clásico sin módulos.
cd "$(dirname "$0")/.." && /root/pokemon-servidor/node_modules/.bin/esbuild pixfx/entry.js --bundle --minify --format=iife --target=es2019 --outfile=pixfx.js && ls -la pixfx.js
