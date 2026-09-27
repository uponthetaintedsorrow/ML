#!/usr/bin/env node
/**
 * Genera Front/index.html: el build autonomo de la aplicacion.
 *
 * Toma el HTML que produce Vite en dist/ e incrusta dentro los CSS y el JS,
 * de modo que index.html se abre directamente (doble clic, "Open with Live
 * Server", cualquier servidor estatico) sin necesidad de Node, Vite ni un
 * servidor con transformaciones.
 *
 * Se ejecuta automaticamente con "npm run build".
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FRONT = dirname(dirname(fileURLToPath(import.meta.url)))
const DIST = join(FRONT, 'dist')
const TARGET = join(FRONT, 'index.html')

if (!existsSync(DIST)) {
  console.error('No existe dist/. Ejecuta primero: vite build')
  process.exit(1)
}

const distHtml = readdirSync(DIST).find((file) => file.endsWith('.html'))
if (!distHtml) {
  console.error('dist/ no contiene ningun HTML.')
  process.exit(1)
}

let html = readFileSync(join(DIST, distHtml), 'utf8')

/** Escapa secuencias que romperian un <script> inline. */
const escapeForInlineScript = (code) => code.replace(/<\/script/gi, '<\\/script')

/** Incrusta el contenido de un asset referenciado en el HTML. */
function inlineAsset(htmlString, pattern, tagName) {
  return htmlString.replace(pattern, (match, href) => {
    const file = join(DIST, href.replace(/^\.?\//, ''))
    if (!existsSync(file)) return match
    const content = escapeForInlineScript(readFileSync(file, 'utf8'))
    if (tagName === 'script') {
      return `<script type="module">\n${content}\n</script>`
    }
    return `<style>\n${content}\n</style>`
  })
}

html = inlineAsset(html, /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, 'style')
html = inlineAsset(html, /<script[^>]*src="([^"]+)"[^>]*><\/script>/g, 'script')

// El favicon se incrusta como data URI: asi index.html no depende de archivos
// vecinos y funciona tambien con el protocolo file://.
html = html.replace(/<link[^>]*rel="icon"[^>]*href="([^"]+)"[^>]*>/g, (match, href) => {
  const file = join(DIST, href.replace(/^\.?\//, ''))
  if (!existsSync(file)) return match
  const base64 = readFileSync(file).toString('base64')
  return `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${base64}" />`
})

html = html.replace(
  '</head>',
  '  <meta name="generator" content="MUSICA EPICA - build autonomo (npm run build)" />\n  </head>',
)

// Comentario de cabecera propio: el del HTML de desarrollo no tiene sentido aqui.
html = html.replace(
  /<!--[\s\S]*?-->/,
  '<!--\n' +
    '  MUSICA EPICA - build autonomo.\n' +
    '  Archivo generado por "npm run build": contiene toda la aplicacion\n' +
    '  (HTML + CSS + JavaScript) y no depende de Node, Vite ni servidores\n' +
    '  especiales. Se puede abrir con doble clic, con "Open with Live Server"\n' +
    '  o con cualquier servidor estatico.\n' +
    '  Para desarrollo con recarga en caliente: npm run dev\n' +
    '-->\n',
)

writeFileSync(TARGET, html, 'utf8')
// Copia tambien dentro de dist/, para que la API pueda servir la web completa
// en http://127.0.0.1:8000 (montaje estatico de backend/api.py).
writeFileSync(join(DIST, 'index.html'), html, 'utf8')

const kb = (Buffer.byteLength(html) / 1024).toFixed(0)
console.log(`> index.html autonomo generado (${kb} kB, sin dependencias externas)`)
