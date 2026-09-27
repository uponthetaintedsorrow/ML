/** Quita acentos y pasa a minusculas: util para busquedas tolerantes. */
export function normalizeText(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Hash estable para derivar colores de portada a partir de un titulo. */
export function hashString(value = '') {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/** Genera una paleta estable para la portada de una cancion. */
export function coverPalette(seed = '') {
  const hash = hashString(seed)
  const hue = hash % 360
  const hue2 = (hue + 40) % 360
  return {
    background: `linear-gradient(140deg, hsl(${hue} 55% 34%), hsl(${hue2} 48% 16%))`,
    accent: `hsl(${hue2} 70% 68%)`,
  }
}

/** Iniciales para el avatar por defecto (maximo 2 letras). */
export function initials(name = '') {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function channelToLinear(value) {
  const channel = value / 255
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function parseColor(hex) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const value = Number.parseInt(full, 16)
  if (Number.isNaN(value) || full.length !== 6) return null
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function relativeLuminance(hex) {
  const rgb = parseColor(hex)
  if (!rgb) return 0
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(channelToLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Ratio de contraste WCAG entre dos colores hex. */
export function contrastRatio(colorA, colorB) {
  const lumA = relativeLuminance(colorA)
  const lumB = relativeLuminance(colorB)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Indica si el texto chosen sobre el fondo elegido cumple el minimo AA (4.5).
 * Se usa en el editor de tema personalizado para avisar al usuario.
 */
export function hasAccessibleContrast(textColor, backgroundColor) {
  return contrastRatio(textColor, backgroundColor) >= 4.5
}
