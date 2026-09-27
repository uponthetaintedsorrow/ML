import { AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { hasAccessibleContrast } from '../utils/color.js'

const COLOR_FIELDS = [
  { token: 'primary', label: 'settings.colorPrimary' },
  { token: 'background', label: 'settings.colorBackground' },
  { token: 'surface', label: 'settings.colorSurface' },
  { token: 'text', label: 'settings.colorText' },
  { token: 'secondary', label: 'settings.colorSecondary' },
]

const PRESETS = [
  { name: 'Epica', colors: { primary: '#732248', background: '#1A141D', surface: '#221A27', text: '#F5EEF4', secondary: '#D5B979' } },
  { name: 'Vinilo', colors: { primary: '#2F5D50', background: '#12100E', surface: '#1D1A17', text: '#EDE7DC', secondary: '#C9A227' } },
  { name: 'Ocre', colors: { primary: '#8C4A2F', background: '#FDFBF4', surface: '#FFFFFF', text: '#2A1C14', secondary: '#D5B979' } },
  { name: 'Noche', colors: { primary: '#2D4A8A', background: '#0F1117', surface: '#181B24', text: '#E8ECF7', secondary: '#7FD1E0' } },
]

/**
 * Editor del tema personalizado: elige colores, avisa si el contraste es
 * insuficiente y muestra una previsualizacion con los colores elegidos
 * (la previsualizacion usa sus propias variables, no las globales).
 */
export function CustomThemeEditor() {
  const { t, customColors, setCustomColor, resetCustomColors } = usePreferences()
  const contrastOk = hasAccessibleContrast(customColors.text, customColors.background)

  return (
    <div className="custom-theme">
      <p className="custom-theme__hint">{t('settings.customHint')}</p>

      <div className="custom-theme__presets" role="group" aria-label={t('settings.custom')}>
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className="preset-chip"
            onClick={() => Object.entries(preset.colors).forEach(([token, value]) => setCustomColor(token, value))}
          >
            <span className="preset-chip__dots" aria-hidden="true">
              <span style={{ background: preset.colors.primary }} />
              <span style={{ background: preset.colors.background }} />
              <span style={{ background: preset.colors.secondary }} />
            </span>
            {preset.name}
          </button>
        ))}
      </div>

      <div className="custom-theme__grid">
        {COLOR_FIELDS.map((field) => (
          <div key={field.token} className="color-field">
            <label className="color-field__label" htmlFor={`color-${field.token}`}>
              {t(field.label)}
            </label>
            <div className="color-field__control">
              <input
                id={`color-${field.token}`}
                type="color"
                className="color-field__input"
                value={customColors[field.token]}
                onChange={(event) => setCustomColor(field.token, event.target.value)}
              />
              <span className="color-field__value">{customColors[field.token].toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>

      <div
        className="custom-theme__preview"
        style={{
          '--p-primary': customColors.primary,
          '--p-background': customColors.background,
          '--p-surface': customColors.surface,
          '--p-text': customColors.text,
          '--p-secondary': customColors.secondary,
        }}
      >
        <p className="custom-theme__preview-label">{t('settings.preview')}</p>
        <div className="preview">
          <span className="preview__brand">MUSICA EPICA</span>
          <span className="preview__title">This Hurts</span>
          <span className="preview__meta">Mindless Self Indulgence</span>
          <span className="preview__actions">
            <span className="preview__btn preview__btn--primary">{t('selected.recommend')}</span>
            <span className="preview__chip">Punk</span>
          </span>
        </div>
      </div>

      <p className={`contrast-note${contrastOk ? ' is-ok' : ' is-warning'}`}>
        {contrastOk ? <CheckCircle2 size={15} aria-hidden="true" /> : <AlertTriangle size={15} aria-hidden="true" />}
        {contrastOk ? t('settings.contrastOk') : t('settings.contrastWarning')}
      </p>

      <button type="button" className="btn btn--ghost custom-theme__reset" onClick={resetCustomColors}>
        <RotateCcw size={15} aria-hidden="true" />
        {t('settings.resetColors')}
      </button>
    </div>
  )
}
