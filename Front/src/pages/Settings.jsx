import { useState } from 'react'
import { Database, Palette, Plug, Wallet } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { checkApiHealth, describeError } from '../services/api.js'
import { API_CONFIG } from '../services/config.js'
import { CustomThemeEditor } from '../components/CustomThemeEditor.jsx'
import { LanguageSelector } from '../components/LanguageSelector.jsx'
import { ThemeSelector } from '../components/ThemeSelector.jsx'

/**
 * Ajustes: apariencia (tema y colores), idioma y acceso a la cuenta.
 * Los cambios se aplican al instante porque las preferencias viven en un
 * contexto y los temas solo dependen de variables CSS.
 */
export function Settings({ onNavigate, onOpenCustom }) {
  const { t, theme } = usePreferences()
  const [health, setHealth] = useState(null)
  const [checking, setChecking] = useState(false)

  // Comprobacion real contra /health: no se da por hecho que la API funciona.
  const checkConnection = async () => {
    setChecking(true)
    try {
      setHealth(await checkApiHealth())
    } catch (error) {
      setHealth({ conectada: false, error: describeError(error, t) })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="page settings">
      <header className="page__header">
        <div>
          <h1 className="page__title">{t('settings.title')}</h1>
          <p className="page__subtitle">{t('settings.subtitle')}</p>
        </div>
      </header>

      <section className="card card--padded stack stack--4">
        <h2 className="section-title">
          <Palette size={18} aria-hidden="true" />
          {t('settings.appearance')}
        </h2>

        <div className="stack stack--3">
          <p className="field__label">{t('settings.theme')}</p>
          <ThemeSelector onOpenCustom={onOpenCustom} />
        </div>

        {theme === 'custom' && (
          <div className="settings__custom" id="settings-custom">
            <h3 className="settings__subtitle">{t('settings.custom')}</h3>
            <CustomThemeEditor />
          </div>
        )}
      </section>

      <section className="card card--padded stack stack--4">
        <h2 className="section-title">{t('settings.language')}</h2>
        <LanguageSelector />
        <p className="text-muted text-sm">{t('settings.languageHint')}</p>
      </section>

      <section className="card card--padded stack stack--4">
        <h2 className="section-title">
          <Wallet size={18} aria-hidden="true" />
          {t('settings.account')}
        </h2>
        <p className="text-muted text-sm">{t('settings.accountHint')}</p>
        <div>
          <button type="button" className="btn btn--secondary" onClick={() => onNavigate('/cuenta')}>
            {t('settings.accountLink')}
          </button>
        </div>
      </section>

      <section className="card card--padded stack stack--2">
        <h2 className="section-title">
          <Database size={18} aria-hidden="true" />
          {t('settings.data')}
        </h2>
        <p className="text-muted text-sm">
          {t('settings.dataSource')}: <strong className="text-soft">{t('settings.dataSourceApi')}</strong>
        </p>
        <p className="text-muted text-sm">
          {t('settings.apiUrl')}: <code className="api-url">{API_CONFIG.baseUrl}</code>
        </p>

        <div className="row row--wrap">
          <button type="button" className="btn btn--secondary" onClick={checkConnection} disabled={checking}>
            <Plug size={15} aria-hidden="true" />
            {checking ? t('settings.apiChecking') : t('settings.apiCheck')}
          </button>

          {health && (
            <span className={`badge ${health.conectada ? 'badge--success' : 'badge--danger'}`} role="status">
              {health.conectada
                ? health.recomendadorCargado
                  ? t('settings.apiOk', { count: health.canciones ?? 0 })
                  : t('settings.apiLoading')
                : (health.error?.title ?? t('settings.apiDown'))}
            </span>
          )}
        </div>

        {health && !health.conectada && health.error?.description && (
          <p className="text-muted text-sm">{health.error.description}</p>
        )}
      </section>
    </div>
  )
}
