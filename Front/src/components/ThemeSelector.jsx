import { Check, Moon, Palette, Sun } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

const THEME_OPTIONS = [
  { key: 'dark', icon: Moon, label: 'settings.themeDark', hint: 'settings.themeDarkHint', swatch: ['#732248', '#1A141D'] },
  { key: 'light', icon: Sun, label: 'settings.themeLight', hint: 'settings.themeLightHint', swatch: ['#D5B979', '#FDFBF4'] },
  { key: 'custom', icon: Palette, label: 'settings.themeCustom', hint: 'settings.themeCustomHint', swatch: null },
]

/** Selector de tema: oscuro (por defecto), claro y personalizado. */
export function ThemeSelector({ onOpenCustom }) {
  const { t, theme, setTheme } = usePreferences()

  return (
    <div className="theme-selector" role="radiogroup" aria-label={t('settings.theme')}>
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon
        const active = theme === option.key
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={active}
            className={`theme-option${active ? ' is-active' : ''}`}
            onClick={() => {
              setTheme(option.key)
              if (option.key === 'custom') onOpenCustom?.()
            }}
          >
            <span className="theme-option__top">
              <span className="theme-option__icon">
                <Icon size={16} aria-hidden="true" />
              </span>
              {option.swatch && (
                <span className="theme-option__swatch" aria-hidden="true">
                  <span style={{ background: option.swatch[0] }} />
                  <span style={{ background: option.swatch[1] }} />
                </span>
              )}
              {active && (
                <span className="theme-option__check">
                  <Check size={13} aria-hidden="true" />
                </span>
              )}
            </span>
            <span className="theme-option__label">{t(option.label)}</span>
            <span className="theme-option__hint">{t(option.hint)}</span>
          </button>
        )
      })}
    </div>
  )
}
