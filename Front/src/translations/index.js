import { es } from './es.js'
import { en } from './en.js'

export const LANGUAGES = ['es', 'en']

export const DEFAULT_LANGUAGE = 'es'

const DICTIONARIES = { es, en }

function resolve(key, dict, fallbackDict) {
  const value = key.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), dict)
  if (value !== undefined) return value
  return fallbackDict
    ? key.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), fallbackDict)
    : key
}

function interpolate(template, vars) {
  if (typeof template !== 'string' || !vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : match,
  )
}

/**
 * Crea el traductor para un idioma concreto.
 * Si falta una clave en el idioma activo se recurre a español y, en ultimo
 * caso, se devuelve la propia clave para que el fallo sea visible.
 */
export function createTranslator(language) {
  const dict = DICTIONARIES[language] ?? DICTIONARIES[DEFAULT_LANGUAGE]

  const t = (key, vars) => {
    const value = resolve(key, dict, DICTIONARIES.es)
    return interpolate(value, vars)
  }

  /**
   * Plural simple (0, 1, many) usando las claves con sufijo _other,
   * igual que el formato de los archivos de traduccion.
   */
  const plural = (key, count, vars) => {
    const suffix = count === 1 ? '' : '_other'
    return t(`${key}${suffix}`, { count, ...vars })
  }

  return { t, plural, language: dict === en ? 'en' : 'es' }
}

export function isSupportedLanguage(value) {
  return LANGUAGES.includes(value)
}
