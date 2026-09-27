/**
 * Reglas de datos del perfil (frontend).
 *
 * Aqui solo se valida lo que se puede validar en el cliente: el formato.
 * La unicidad del username NO se comprueba aqui a proposito, porque desde
 * React no se puede garantizar que no exista otra cuenta con ese nombre.
 *
 * Cuando exista el endpoint en la API, la comprobacion va aqui:
 *
 *   GET {VITE_API_URL}/profiles/username-available?username=sam123
 *     -> { "available": true }
 *
 * y la vista de perfil llamara a `usernameIsAvailable()` antes de guardar,
 * mostrando el error si el backend responde que ya esta en uso.
 */

export const PROFILE_LIMITS = {
  displayName: 40,
  username: 24,
  bio: 160,
  pronouns: 24,
}

// Letras, numeros y guion bajo, entre 3 y 24 caracteres.
const USERNAME_RE = /^[a-z0-9_]{3,24}$/

/** Quita espacios y caracteres no permitidos de un username escrito a mano. */
export function sanitizeUsername(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, PROFILE_LIMITS.username)
}

/**
 * Valida el formato del username.
 * @returns {{valid: boolean, error?: 'required'|'short'|'long'|'format'}}
 */
export function validateUsername(value = '') {
  const username = String(value).trim()
  if (!username) return { valid: false, error: 'required' }
  if (username.length < 3) return { valid: false, error: 'short' }
  if (username.length > PROFILE_LIMITS.username) return { valid: false, error: 'long' }
  if (!USERNAME_RE.test(username)) return { valid: false, error: 'format' }
  return { valid: true }
}

/** Un perfil necesita nombre para mostrar y un username con formato valido. */
export function validateProfile(draft) {
  const errors = {}

  if (!String(draft.displayName ?? '').trim()) {
    errors.displayName = 'required'
  } else if (String(draft.displayName).trim().length > PROFILE_LIMITS.displayName) {
    errors.displayName = 'length'
  }

  const username = validateUsername(draft.username)
  if (!username.valid) errors.username = username.error

  if (String(draft.bio ?? '').length > PROFILE_LIMITS.bio) errors.bio = 'long'
  if (String(draft.pronouns ?? '').length > PROFILE_LIMITS.pronouns) errors.pronouns = 'long'

  if (draft.email !== undefined) {
    const email = String(draft.email).trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'invalid'
  }

  return errors
}
