/** Convierte segundos en m:ss (o h:mm:ss si hace falta). */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60
  const pad = (value) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`
}

/** Formatea una fecha ISO en un formato corto y legible. */
export function formatDate(value, locale = 'es-ES') {
  if (!value) return '--'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  const formatted = date.toLocaleDateString(locale, { year: 'numeric', month: 'long' })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
