import { useState } from 'react'
import { ArrowRight, Info, Mail, ShieldAlert } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { AppleMusicIcon, GoogleIcon, SpotifyIcon } from '../components/BrandIcons.jsx'

const PROVIDERS = [
  { id: 'google', label: 'login.withGoogle', icon: GoogleIcon },
  { id: 'spotify', label: 'login.withSpotify', icon: SpotifyIcon },
  { id: 'apple', label: 'login.withApple', icon: AppleMusicIcon },
]

/**
 * Pantalla de inicio de sesion.
 *
 * IMPORTANTE: aqui no hay autenticacion real. Al pulsar un proveedor se
 * informa de que la integracion sigue pendiente (nunca se simula un OAuth
 * falso) y se ofrece el modo demostracion, que crea una sesion local.
 * Cuando exista el servicio de autenticacion, se sustituye
 * UserContext.signInDemo por esa llamada y el resto de la interfaz no cambia.
 */
export function Login({ onSignedIn }) {
  const { t } = usePreferences()
  const { signInDemo } = useUser()
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(null)

  const enterDemo = () => {
    signInDemo()
    onSignedIn()
  }

  const requestProvider = (provider) => {
    setPending({ type: 'provider', id: provider.id })
    setShowEmail(false)
  }

  const requestEmail = (event) => {
    event.preventDefault()
    setPending({ type: 'email', id: email.trim() })
  }

  const closePending = () => {
    setPending(null)
    setShowEmail(false)
    setEmail('')
  }

  return (
    <div className="login">
      <section className="login__card card card--padded">
        <div className="login__head">
          <span className="login__mark" aria-hidden="true">
            <span className="login__disc" />
          </span>
          <h1 className="login__title">{t('login.title')}</h1>
          <p className="login__subtitle">{t('login.subtitle')}</p>
        </div>

        <div className="login__providers">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon
            const active = pending?.type === 'provider' && pending.id === provider.id
            return (
              <button
                key={provider.id}
                type="button"
                className="btn btn--provider"
                aria-expanded={active}
                onClick={() => requestProvider(provider)}
              >
                <Icon />
                <span>{t(provider.label)}</span>
                {active && <span className="login__badge">{t('login.pending')}</span>}
              </button>
            )
          })}

          <button
            type="button"
            className="btn btn--secondary btn--block"
            onClick={() => {
              setShowEmail((value) => !value)
              setPending(null)
            }}
            aria-expanded={showEmail}
          >
            <Mail size={17} aria-hidden="true" />
            {t('login.withEmail')}
          </button>
        </div>

        {showEmail && (
          <form className="login__email stack stack--3" onSubmit={requestEmail}>
            <div className="field">
              <label className="field__label" htmlFor="login-email">
                {t('login.emailTitle')}
              </label>
              <input
                id="login-email"
                type="email"
                className="input"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn--primary btn--block">
              {t('login.submit')}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
        )}

        {pending && (
          <div className="login__pending" role="status">
            <ShieldAlert size={16} aria-hidden="true" />
            <p className="login__pending-text">
              {pending.type === 'provider'
                ? t('login.pendingProvider', { provider: t(`login.with_${pending.id}`) })
                : t('login.pendingEmail', { email: pending.id || t('login.emailPlaceholder') })}
            </p>
            <div className="row row--wrap">
              <button type="button" className="btn btn--secondary login__pending-action" onClick={closePending}>
                {t('common.close')}
              </button>
              <button type="button" className="btn btn--ghost login__pending-action" onClick={enterDemo}>
                {t('login.demoMode')}
              </button>
            </div>
          </div>
        )}

        {!pending && (
          <p className="login__notice">
            <Info size={15} aria-hidden="true" />
            {t('login.notReady')}
          </p>
        )}

        <div className="login__divider" aria-hidden="true">
          <span />
        </div>

        <button type="button" className="btn btn--ghost btn--block" onClick={enterDemo}>
          {t('login.demoMode')}
        </button>

        <p className="login__legal">{t('login.providersNote')}</p>
      </section>
    </div>
  )
}
