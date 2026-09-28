#!/usr/bin/env node
/**
 * Tunnel público para la API (opcional, SOLO para pruebas).
 *
 *   npm run tunnel:api
 *
 * Levanta un túnel hacia http://127.0.0.1:8000 usando localtunnel (npx, sin
 * cuenta ni clave de API) e imprime la URL pública que debes poner en
 * Netlify como VITE_API_URL.
 *
 * AVISO DE SEGURIDAD: mientras el túnel esté abierto, cualquiera que conozca
 * la URL puede llegar a tu API (buscar canciones y crear cuentas). Es una
 * medida temporal para comprobar que la web publicada funciona; para un
 * despliegue de verdad usa la API en un servidor (render.yaml).
 *
 * Requiere: la API arrancada en otra terminal (npm run dev o npm run api).
 */

import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)))
const PUERTO_API = process.env.PUERTO_API || '8000'
const URL_API = `http://127.0.0.1:${PUERTO_API}`

const comprobar = async () => {
  try {
    const respuesta = await fetch(`${URL_API}/health`, { signal: AbortSignal.timeout(2500) })
    return respuesta.ok
  } catch {
    return false
  }
}

if (!(await comprobar())) {
  console.error(`\n  La API no responde en ${URL_API}.`)
  console.error('  Arrancala primero en otra terminal:  npm run dev  (o  npm run api)\n')
  process.exit(1)
}

console.log('\n  Levantando túnel público hacia la API...')
console.log(`  (la URL cambia en cada ejecución; ciérralo con Ctrl+C)\n`)

const tunel = spawn(
  'npx',
  ['--yes', 'localtunnel', '--port', PUERTO_API],
  { cwd: RAIZ, stdio: ['ignore', 'pipe', 'pipe'], env: process.env },
)

const puerto = (texto) => {
  for (const linea of String(texto).split('\n')) {
    if (linea.includes('loca.lt') || linea.includes('loca.lt')) return linea.trim()
  }
  return null
}

tunel.stdout.on('data', (dato) => {
  const url = puerto(dato.toString())
  if (!url) return
  const limpia = url.replace(/\x1b\[[0-9;]*m/g, '')
  console.log('  ┌─────────────────────────────────────────────────────────┐')
  console.log('  │  URL pública de tu API:                                 │')
  console.log(`  │  ${limpia.padEnd(56)}│`)
  console.log('  └─────────────────────────────────────────────────────────┘\n')
  console.log('  1. Netlify → Site configuration → Environment variables')
  console.log('  2. Añade:  VITE_API_URL =', limpia.split('https://')[1] ? `https://${limpia.split('https://')[1]}` : limpia)
  console.log('  3. Redeploy → la web ya hablará con tu API\n')
})

tunel.stderr.on('data', (dato) => {
  const texto = dato.toString().trim()
  if (texto) console.error('  [túnel]', texto)
})

tunel.on('exit', (codigo) => {
  if (codigo) console.error(`\n  El túnel se ha cerrado (código ${codigo}).\n`)
  process.exit(codigo ?? 0)
})

process.on('SIGINT', () => tunel.kill('SIGINT'))
