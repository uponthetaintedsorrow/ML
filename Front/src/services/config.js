/**
 * Configuracion de la capa de datos del frontend.
 *
 * El frontend NO habla nunca con MySQL: consume la API Python (backend/api.py),
 * que a su vez usa recomendador_app.py. La URL se configura con una sola
 * variable de entorno, VITE_API_URL (ver .env.example), y se lee aqui para no
 * repetirla en ningun componente.
 */

const env = import.meta.env

const DEFAULT_API_URL = 'http://localhost:8000'

const configurada = (env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '')

// Si la pagina se sirve desde la propia API (http://127.0.0.1:8000), se usan
// rutas relativas: mismo origen, sin CORS y sin depender del host.
const mismoOrigen =
  typeof window !== 'undefined' && window.location.origin === configurada

export const API_CONFIG = {
  baseUrl: mismoOrigen ? '' : configurada,
  timeout: Number(env.VITE_API_TIMEOUT ?? 20000),
  // Cantidad de recomendaciones que se piden al backend.
  recommendationCount: Number(env.VITE_RECOMMENDATION_COUNT ?? 5),
}

export const API_ENDPOINTS = {
  search: '/songs',
  recommend: '/recommend',
  health: '/health',
}
