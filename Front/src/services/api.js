import { API_CONFIG, API_ENDPOINTS, API_PUBLICADA_SIN_URL } from './config.js'

/**
 * Unica capa de acceso a datos del frontend.
 *
 * Los componentes NUNCA llaman a fetch: usan estas funciones, que traducen el
 * JSON de la API Python (backend/api.py) al shape que ya consume la interfaz
 * (id, title, artist, genre, duration, year, popularity, similarity).
 *
 * Contrato de la API:
 *   GET  {base}/songs?search=<texto>
 *        -> { "results": [ { "id", "titulo", "artista", "genero", "generos",
 *                            "duracion_segundos", "anio", "popularidad_cancion" } ] }
 *   POST {base}/recommend  { "cancion": "This Hurts", "id": 4, "cantidad": 5 }
 *        -> { "cancion": "This Hurts",
 *             "resultados": [ { ..., "similitud": 0.9865 } ] }
 *
 * Los errores se propagan como ApiError con un `code` estable para que la
 * interfaz muestre el mensaje correcto (traducido) segun el fallo real.
 */

export class ApiError extends Error {
  constructor(message, { code = 'UNKNOWN', status = 0, detail = '' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.detail = detail
  }
}

/** Traduce un error de la API al texto adecuado en el idioma activo. */
export function describeError(error, t, vars = {}) {
  const code = error?.code ?? 'UNKNOWN'
  switch (code) {
    case 'NOT_FOUND':
      return {
        title: t('errors.songNotFoundTitle'),
        description: t('errors.songNotFound', { title: vars.title ?? '' }),
      }
    case 'UNAVAILABLE':
      return { title: t('errors.apiUnavailableTitle'), description: t('errors.apiUnavailable') }
    case 'NETWORK_ERROR':
      // Causa mas probable en un despliegue: la app publicada sigue apuntando
      // a localhost, que en el navegador remoto no apunta a ningun sitio.
      if (API_PUBLICADA_SIN_URL) {
        return {
          title: t('errors.deployedTitle'),
          description: t('errors.deployed', { url: API_CONFIG.baseUrl }),
          hint: t('errors.deployedHint'),
        }
      }
      return {
        title: t('errors.connectionTitle'),
        description: t('errors.connection', { url: API_CONFIG.baseUrl }),
        hint: t('errors.connectionHint'),
      }
    case 'TIMEOUT':
      return { title: t('errors.timeoutTitle'), description: t('errors.timeout') }
    default:
      return { title: t('errors.apiTitle'), description: t('errors.api') }
  }
}

function codeForStatus(status) {
  if (status === 404) return 'NOT_FOUND'
  if (status === 503) return 'UNAVAILABLE'
  return 'HTTP_ERROR'
}

async function parse(response) {
  const texto = await response.text()
  if (!texto) return {}
  try {
    return JSON.parse(texto)
  } catch {
    return {}
  }
}

async function request(path, { method = 'GET', params, body } = {}) {
  const url = new URL(`${API_CONFIG.baseUrl}${path}`)
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout)

  let response
  try {
    response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    // fetch solo falla aqui por error de red o por el AbortController.
    if (error.name === 'AbortError') throw new ApiError('Timeout', { code: 'TIMEOUT' })
    throw new ApiError('No se pudo conectar con la API', { code: 'NETWORK_ERROR' })
  } finally {
    clearTimeout(timeoutId)
  }

  const payload = await parse(response)

  if (!response.ok) {
    throw new ApiError(payload.detail || `HTTP ${response.status}`, {
      code: codeForStatus(response.status),
      status: response.status,
      detail: payload.detail ?? '',
    })
  }

  return payload
}

/** Canción de la API (snake_case español) -> shape de la interfaz. */
function toSong(item) {
  const generos = Array.isArray(item.generos) && item.generos.length ? item.generos : [item.genero]
  return {
    id: item.id,
    title: item.titulo,
    artist: item.artista,
    // La etiqueta muestra el primer genero; el resto queda en `genres`.
    genre: generos[0] ?? '',
    genres: generos,
    duration: item.duracion_segundos,
    year: item.anio,
    popularity: item.popularity_cancion ?? item.likes ?? null,
  }
}

/**
 * Busca canciones en MySQL a traves de la API.
 * @returns {Promise<Array<object>>} lista de canciones (puede estar vacia)
 */
export async function searchSongs(query) {
  const payload = await request(API_ENDPOINTS.search, { params: { search: query } })
  return (payload.results ?? []).map(toSong)
}

/**
 * Pide recomendaciones reales al backend (cosine similarity sobre MySQL).
 * @returns {Promise<Array<object>>} canciones con `similarity` (0..1)
 */
export async function getRecommendations(song) {
  const payload = await request(API_ENDPOINTS.recommend, {
    method: 'POST',
    body: {
      cancion: song?.title,
      // El id evita ambigüedades si dos canciones tienen el mismo título.
      id: song?.id ?? null,
      cantidad: API_CONFIG.recommendationCount,
    },
  })
  return (payload.resultados ?? []).map((item) => ({
    ...toSong(item),
    similarity: typeof item.similitud === 'number' ? item.similitud : null,
  }))
}

/**
 * Estado real de la API y de MySQL. Se usa en Ajustes para no dar por hecho
 * que la conexion funciona.
 */
export async function checkApiHealth() {
  const payload = await request(API_ENDPOINTS.health)
  const conectada = Boolean(payload?.base_datos?.conectada)
  return {
    url: API_CONFIG.baseUrl,
    conectada,
    canciones: payload?.canciones ?? null,
    recomendadorCargado: Boolean(payload?.recomendador_cargado),
    detail: payload?.error ?? '',
  }
}

export const musicApi = {
  searchSongs,
  getRecommendations,
  checkApiHealth,
  source: 'api',
  baseUrl: API_CONFIG.baseUrl,
}
