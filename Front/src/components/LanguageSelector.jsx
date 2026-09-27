import { Check, Languages } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { LANGUAGES } from '../translations/index.js'

const NAMES = { es: 'Español', en: 'English' }

/** Selector de idioma (es / en). El valor se guarda en localStorage. */
export function LanguageSelector() {
  const { t, language, setLanguage } = usePreferences()

  return (
    <div className="language-selector" role="radiogroup" aria-label={t('settings.language')}>
      <span className="language-selector__icon" aria-hidden="true">
        <Languages size={16} />
      </span>
      {LANGUAGES.map((code) => {
        const active = language === code
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            className={`language-option${active ? ' is-active' : ''}`}
            onClick={() => setLanguage(code)}
          >
            {NAMES[code]}
            {active && <Check size={14} aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
