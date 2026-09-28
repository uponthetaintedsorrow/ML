import { API_CONFIG } from './config.js'

/**
 * Acceso de usuarios contra la API Python.
 *
 * - Correo + contrasena: funciona (registro / login / sesion).
 * - Apple: flujo real de "Sign in with Apple". El boton se habilita solo si el
 *   backend tiene las credenciales (APPLE_* en backend/.env).
 * - Google y Spotify: preparados en el backend, pendientes de credenciales.
 *
 * El token de sesion se guarda en localStorage y se envia como
 * "Authorization: Bearer ...". MySQL no se toca: las cuentas viven en el
 * backend (backend/usuarios.json).
 */

const TOKEN_KEY = 'me:token'

export class AuthError extends Error {
  constructor(message, code = 'AUTH_ERROR', status = 0) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.status = status
  }
}

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || null
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* sin almacenamiento: la sesion durara lo que la pestana */
  }
}

async function pedir(ruta, { method = 'GET', body, auth = true } = {}) {
  const cabeceras = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (auth && token) cabeceras.Authorization = `Bearer ${token}`

  let respuesta
  try {
    respuesta = await fetch(`${API_CONFIG.baseUrl}${ruta}`, {
      method,
      headers: cabeceras,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new AuthError('No se pudo contactar con la API', 'NETWORK_ERROR')
  }

  const texto = await respuesta.text()
  let datos = {}
  try {
    datos = texto ? JSON.parse(texto) : {}
  } catch {
    datos = {}
  }

  if (!respuesta.ok) {
    throw new AuthError(datos.detail || `Error ${respuesta.status}`, 'API_ERROR', respuesta.status)
  }
  return datos
}

/** Que metodos estan disponibles ahora mismo en el backend. */
export async function getProviders() {
  const datos = await pedir('/auth/providers', { auth: false })
  return {
    email: Boolean(datos.email),
    apple: Boolean(datos.apple),
    google: Boolean(datos.google),
    spotify: Boolean(datos.spotify),
  }
}

/** Crea una cuenta con correo y contrasena e inicia sesion. */
export async function registerWithEmail({ email, password, displayName, username }) {
  const datos = await pedir('/auth/registro', {
    method: 'POST',
    auth: false,
    body: { email, password, displayName: displayName || '', username: username || '' },
  })
  setToken(datos.token)
  return datos.usuario
}

/** Inicia sesion con correo y contrasena. */
export async function loginWithEmail({ email, password }) {
  const datos = await pedir('/auth/login', { method: 'POST', auth: false, body: { email, password } })
  setToken(datos.token)
  return datos.usuario
}

/** Recupera la cuenta de la sesion actual, o null si no hay. */
export async function fetchMe() {
  if (!getToken()) return null
  try {
    const datos = await pedir('/auth/me')
    return datos.usuario
  } catch (error) {
    if (error.status === 401) {
      setToken(null)
      return null
    }
    throw error
  }
}

/** Cierra sesion en el navegador (el token es sin estado, se descarta). */
export function logout() {
  setToken(null)
}

/** URL de inicio de sesion de Apple (redirige el navegador al proveedor). */
export async function getAppleSignInUrl() {
  const datos = await pedir('/auth/apple/start', { auth: false })
  return datos.url
}

/**
 * Apple devuelve al navegador con el token en la query del hash
 * (por ejemplo #/?token=...). Se recoge, se guarda y se limpia la URL.
 * @returns {Promise<{token?: string, error?: string}>}
 */
export async function readAppleReturn() {
  const hash = window.location.hash.replace(/^#/, '')
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  if (!query) return {}

  const params = new URLSearchParams(query)
  const token = params.get('token')
  const error = params.get('error')
  if (!token && !error) return {}

  // La app vuelve a su estado normal (#/), sin los parametros de la respuesta.
  window.history.replaceState(null, '', `${window.location.pathname}#/`)

  if (error) return { error }
  setToken(token)
  return { token }
}
