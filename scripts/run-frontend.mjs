#!/usr/bin/env node
/**
 * Lanzador del frontend.
 *
 * Permite ejecutar `npm run dev|build|preview|lint` desde la raiz del
 * proyecto: comprueba que las dependencias de Front/ esten instaladas
 * (instalandolas la primera vez) y delega el script en esa carpeta.
 *
 *   node scripts/run-frontend.mjs dev [-- --host 0.0.0.0]
 *
 * Los argumentos extra se pasan al script de npm.
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const FRONT = join(ROOT, 'Front')
const ALLOWED = ['dev', 'build', 'preview', 'lint']

const script = process.argv[2]

if (!ALLOWED.includes(script)) {
  console.error(`Uso: node scripts/run-frontend.mjs <${ALLOWED.join('|')}> [args...]`)
  process.exit(1)
}

if (!existsSync(join(FRONT, 'package.json'))) {
  console.error(`No se encuentra el frontend en ${FRONT}`)
  process.exit(1)
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const passthrough = process.argv.slice(3)

if (!existsSync(join(FRONT, 'node_modules'))) {
  console.log('> Instalando dependencias del frontend (npm install en Front/)...')
  const install = spawnSync(npm, ['install', '--no-audit', '--no-fund'], {
    cwd: FRONT,
    stdio: 'inherit',
  })
  if (install.status !== 0) {
    console.error('> Fallo al instalar las dependencias del frontend.')
    process.exit(install.status ?? 1)
  }
}

// "--" es imprescindible: sin el, el npm interno se comeria --port, --host, etc.
const run = spawnSync(npm, ['run', script, '--', ...passthrough], {
  cwd: FRONT,
  stdio: 'inherit',
})

process.exit(run.status ?? 1)
