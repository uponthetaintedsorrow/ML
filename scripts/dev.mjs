#!/usr/bin/env node
/**
 * Arranque conjunto de MUSICA EPICA: API Python + frontend Vite.
 *
 *   node scripts/dev.mjs                 -> API (:8000) + Vite (:5173)
 *   node scripts/dev.mjs --solo-api      -> solo la API
 *   node scripts/dev.mjs --solo-frontend -> solo Vite
 *
 * Sin argumentos opcionales, `npm run dev` (desde la raiz o desde Front/)
 * levanta los dos procesos, de forma que la aplicacion siempre encuentra la
 * API. Ctrl+C detiene ambos.
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const FRONT = join(ROOT, 'Front')
const BACKEND = join(ROOT, 'backend')
const VENV_PYTHON = join(ROOT, '.venv', 'bin', 'python')

const soloApi = process.argv.includes('--solo-api')
const soloFrontend = process.argv.includes('--solo-frontend')

const API_HOST = process.env.API_HOST || '127.0.0.1'
const API_PORT = process.env.API_PORT || '8000'
const API_URL = `http://${API_HOST}:${API_PORT}`

const PROMPT = '\u001b[1;36m'
const RESET = '\u001b[0m'
const colorea = (color, texto) => `\u001b[${color}m${texto}${RESET}`

const log = {
  info: (msg) => console.log(`${PROMPT}MUSICA EPICA${RESET} ${msg}`),
  api: (msg) => console.log(`${colorea('33', '[api]')} ${msg}`),
  web: (msg) => console.log(`${colorea('35', '[web]')} ${msg}`),
  error: (msg) => console.error(`${colorea('31', '[error]')} ${msg}`),
  ok: (msg) => console.log(`${colorea('32', '[listo]')} ${msg}`),
}

// --- comprobaciones previas ------------------------------------------------
if (!existsSync(join(BACKEND, 'api.py'))) {
  log.error(`No se encuentra la API en ${BACKEND}`)
  process.exit(1)
}

if (!existsSync(VENV_PYTHON)) {
  log.error('No existe el entorno virtual .venv con Python.')
  log.error('Créalo con:  python3 -m venv .venv')
  log.error('e instala:    .venv/bin/python -m pip install -r backend/requirements.txt')
  process.exit(1)
}

if (!soloApi && !existsSync(join(FRONT, 'node_modules'))) {
  log.info('Instalando dependencias del frontend (npm install en Front/)...')
  const install = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: FRONT,
    stdio: 'inherit',
  })
  if (install.status !== 0) {
    log.error('Falló la instalación de dependencias del frontend.')
    process.exit(install.status ?? 1)
  }
}

/** ¿Hay ya algo escuchando y respondiendo en la URL dada? */
function responde(url, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    fetch(url, { signal: controller.signal })
      .then((r) => {
        clearTimeout(timer)
        resolve(r.ok)
      })
      .catch(() => {
        clearTimeout(timer)
        resolve(false)
      })
  })
}

const hijos = []
let cerrando = false

function lanzar(nombre, comando, argumentos, opciones = {}) {
  const hijo = spawn(comando, argumentos, {
    ...opciones,
    env: { ...process.env, ...opciones.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const prefijo = nombre === 'api' ? colorea('33', '[api]') : colorea('35', '[web]')
  const escribir = (flujo) => (dato) => {
    for (const linea of String(dato).split('\n')) {
      if (linea.trim()) flujo.write(`${prefijo} ${linea}\n`)
    }
  }
  hijo.stdout.on('data', escribir(process.stdout))
  hijo.stderr.on('data', escribir(process.stderr))

  hijo.on('exit', (codigo) => {
    if (cerrando) return
    cerrando = true
    log.error(`${nombre === 'api' ? 'La API' : 'El frontend'} se ha detenido (código ${codigo}).`)
    if (nombre === 'api') {
      log.error('Revisa el log de arriba. Para relanzarla:  npm run api')
    }
    parar(codigo ?? 1)
  })

  hijos.push(hijo)
  return hijo
}

function parar(codigo = 0) {
  for (const hijo of hijos) {
    if (!hijo.killed) {
      try {
        hijo.kill('SIGINT')
      } catch {
        hijo.kill('SIGTERM')
      }
    }
  }
  setTimeout(() => process.exit(codigo), 150)
}

process.on('SIGINT', () => parar(0))
process.on('SIGTERM', () => parar(0))

// --- API -------------------------------------------------------------------
if (!soloFrontend) {
  const yaRespondia = await responde(`${API_URL}/health`)
  if (yaRespondia) {
    log.ok(`La API ya estaba funcionando en ${API_URL} (se reutiliza).`)
  } else {
    log.info('Arrancando la API Python...')
    lanzar('api', VENV_PYTHON, [
      '-m', 'uvicorn', 'api:app',
      '--app-dir', BACKEND,
      '--host', API_HOST,
      '--port', API_PORT,
    ])

    // Avisamos en cuanto /health responde, para que se vea claro que ya está.
    for (let intento = 0; intento < 60; intento += 1) {
      await new Promise((r) => setTimeout(r, 500))
      if (await responde(`${API_URL}/health`)) {
        log.ok(`API disponible en ${API_URL}`)
        break
      }
    }
  }
}

// --- Frontend --------------------------------------------------------------
if (!soloApi) {
  // Se invoca el binario de Vite directamente (no "npm run dev"), porque el
  // script de Front/ es este mismo y se crearia una recursion.
  const viteBin = join(FRONT, 'node_modules', 'vite', 'bin', 'vite.js')
  if (!existsSync(viteBin)) {
    log.error('No se encuentra Vite en Front/node_modules. Ejecuta: npm install')
    parar(1)
  }

  log.info('Arrancando el frontend (Vite)...')
  lanzar('web', process.execPath, [viteBin], { cwd: FRONT })

  console.log('')
  log.info('Si prefieres "Open with Live Server" en el puerto 5500, la API ya está levantada.')
  log.ok('Frontend: http://localhost:5173   |   API: ' + API_URL)
  console.log('')
  log.info('Ctrl+C detiene todo.')
}
