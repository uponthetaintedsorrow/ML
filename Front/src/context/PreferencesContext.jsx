import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { createTranslator, DEFAULT_LANGUAGE, isSupportedLanguage } from '../translations/index.js'

const PreferencesContext = createContext(null)

const THEMES = ['dark', 'light', 'custom']

const DEFAULT_CUSTOM_COLORS = {
  primary: '#732248',
  background: '#1A141D',
  surface: '#221A27',
  text: '#F5EEF4',
  secondary: '#D5B979',
}

const isTheme = (value) => THEMES.includes(value)
const isColorMap = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

/**
 * Contexto de preferencias: idioma, tema y colores personalizados.
 * Se persiste en localStorage y se aplica sobre <html>, que es quien lleva
 * los atributos data-theme / data-lang y las variables del tema.
 */
export function PreferencesProvider({ children }) {
  const [language, setLanguageState] = useLocalStorage('me:language', DEFAULT_LANGUAGE, isSupportedLanguage)
  const [theme, setThemeState] = useLocalStorage('me:theme', 'dark', isTheme)
  const [customColors, setCustomColorsState] = useLocalStorage(
    'me:customColors',
    DEFAULT_CUSTOM_COLORS,
    isColorMap,
  )

  const setLanguage = useCallback(
    (next) => {
      if (isSupportedLanguage(next)) setLanguageState(next)
    },
    [setLanguageState],
  )

  const setTheme = useCallback(
    (next) => {
      setThemeState(isTheme(next) ? next : 'dark')
    },
    [setThemeState],
  )

  const setCustomColor = useCallback(
    (token, value) => {
      setCustomColorsState((prev) => ({ ...prev, [token]: value }))
    },
    [setCustomColorsState],
  )

  const resetCustomColors = useCallback(() => {
    setCustomColorsState(DEFAULT_CUSTOM_COLORS)
  }, [setCustomColorsState])

  // El tema y el idioma se aplican sobre <html>. El tema personalizado se
  // inyecta como variables inline, que tienen prioridad sobre themes/custom.css:
  // asi los componentes no necesitan saber de donde viene cada color.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.lang = language
    root.lang = language

    if (theme === 'custom') {
      Object.entries(customColors).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value)
      })
      return
    }

    Object.keys(DEFAULT_CUSTOM_COLORS).forEach((token) => {
      root.style.removeProperty(`--color-${token}`)
    })
  }, [theme, language, customColors])

  const { t, plural } = useMemo(() => createTranslator(language), [language])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      theme,
      setTheme,
      customColors,
      setCustomColor,
      resetCustomColors,
      t,
      plural,
    }),
    [
      language,
      setLanguage,
      theme,
      setTheme,
      customColors,
      setCustomColor,
      resetCustomColors,
      t,
      plural,
    ],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences debe usarse dentro de PreferencesProvider')
  return context
}
