import { useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, Check, LogIn, Mail, ShieldAlert, UserPlus } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import {
  AuthError,
  getAppleSignInUrl,
  getProviders,
  loginWithEmail,
  readAppleReturn,
  registerWithEmail,
} from '../services/auth.js'
import { AppleMusicIcon } from '../components/BrandIcons.jsx'

/**
 * Pantalla de acceso.
 *
 * - Correo + contrasena: acceso real contra la API (registro o inicio de sesion).
 * - Apple: redireccion al flujo real de "Sign in with Apple" (se habilita solo
 *   si el backend tiene las credenciales).
 * - Google y Spotify: los botones se muestran, pero avisan de que estan
 *   pendientes de credenciales en lugar de fingir que funcionan.
 * - Modo demostracion: acceso local, sin cuenta, para probar la app.
 */
export function Login({ onSignedIn }) {
  const { t } = usePreferences()
  const { signInDemo, adoptUser } = useUser()

  const [modo, setModo] = useState('login') // 'login' | 'registro'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [pendiente, setPendiente] = useState(null)
  const [proveedores, setProveedores] = useState({ email: true, apple: false, google: false, spotify: false })

  // Estado real de los proveedores: no se ofrece lo que no esta configurado.
  useEffect(() => {
    let vivo = true
    getProviders()
      .then((estado) => vivo && setProveedores(estado))
      .catch(() => vivo && setProveedores({ email: true, apple: false, google: false, spotify: false }))
    return () => {
      vivo = false
    }
  }, [])

  // Regreso de Apple: el token viene en la query del hash.
  useEffect(() => {
    let vivo = true
    readAppleReturn().then((resultado) => {
      if (!vivo || !resultado.token) return
      window.location.reload()
    })
    return () => {
      vivo = false
    }
  }, [])

  const entrar = async (event) => {
    event.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      const usuario =
        modo === 'registro'
          ? await registerWithEmail({ email, password, displayName, username })
          : await loginWithEmail({ email, password })
      if (usuario) {
        adoptUser(usuario)
        onSignedIn()
      }
    } catch (fallo) {
      setError(fallo instanceof AuthError ? fallo.message : t('login.errorGeneric'))
    } finally {
      setEnviando(false)
    }
  }

  const entrarConApple = async () => {
    setError(null)
    try {
      window.location.href = await getAppleSignInUrl()
    } catch (fallo) {
      setError(fallo instanceof AuthError ? fallo.message : t('login.errorGeneric'))
    }
  }

  const pendienteDe = (proveedor) => {
    setError(null)
    setPendiente(proveedor)
  }

  const demo = () => {
    signInDemo()
    onSignedIn()
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

        {/* ------------------------------------------------- correo real */}
        <form className="login__form stack stack--3" onSubmit={entrar} noValidate>
          <div className="row row--wrap login__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'login'}
              className={`login__tab${modo === 'login' ? ' is-active' : ''}`}
              onClick={() => {
                setModo('login')
                setError(null)
              }}
            >
              <LogIn size={15} aria-hidden="true" />
              {t('login.tabLogin')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'registro'}
              className={`login__tab${modo === 'registro' ? ' is-active' : ''}`}
              onClick={() => {
                setModo('registro')
                setError(null)
              }}
            >
              <UserPlus size={15} aria-hidden="true" />
              {t('login.tabRegister')}
            </button>
          </div>

          {modo === 'registro' && (
            <>
              <div className="field">
                <label className="field__label" htmlFor="auth-name">
                  {t('profile.displayName')}
                </label>
                <input
                  id="auth-name"
                  className="input"
                  value={displayName}
                  autoComplete="name"
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Sam"
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="auth-username">
                  {t('profile.username')}
                </label>
                <input
                  id="auth-username"
                  className="input"
                  value={username}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="sam_rivers"
                />
              </div>
            </>
          )}

          <div className="field">
            <label className="field__label" htmlFor="auth-email">
              {t('profile.email')}
            </label>
            <input
              id="auth-email"
              type="email"
              className="input"
              value={email}
              required
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="auth-password">
              {t('login.password')}
            </label>
            <input
              id="auth-password"
              type="password"
              className="input"
              value={password}
              required
              minLength={modo === 'registro' ? 8 : undefined}
              autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {modo === 'registro' && <p className="field__hint">{t('login.passwordHint')}</p>}
          </div>

          {error && (
            <p className="login__error" role="alert">
              <AlertCircle size={15} aria-hidden="true" />
              {error}
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--block" disabled={enviando}>
            {enviando ? t('login.working') : modo === 'registro' ? t('login.createAccount') : t('login.tabLogin')}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </form>

        <div className="login__divider" aria-hidden="true">
          <span>{t('login.or')}</span>
        </div>

        {/* ----------------------------------------------- otros metodos */}
        <div className="login__providers">
          <button
            type="button"
            className="btn btn--provider"
            onClick={entrarConApple}
            disabled={!proveedores.apple}
          >
            <AppleMusicIcon />
            <span>{t('login.withApple')}</span>
            {proveedores.apple ? <Check size={15} className="login__ok" /> : <span className="login__tag">{t('login.pending')}</span>}
          </button>

          <button
            type="button"
            className="btn btn--provider"
            onClick={() => pendienteDe('Google')}
            disabled={!proveedores.google}
          >
            <Mail size={17} aria-hidden="true" />
            <span>{t('login.withGoogle')}</span>
            {proveedores.google ? <Check size={15} className="login__ok" /> : <span className="login__tag">{t('login.pending')}</span>}
          </button>

          <button
            type="button"
            className="btn btn--provider"
            onClick={() => pendienteDe('Spotify')}
            disabled={!proveedores.spotify}
          >
            <Mail size={17} aria-hidden="true" />
            <span>{t('login.withSpotify')}</span>
            {proveedores.spotify ? <Check size={15} className="login__ok" /> : <span className="login__tag">{t('login.pending')}</span>}
          </button>
        </div>

        {pendiente && (
          <div className="login__notice login__notice--info" role="status">
            <ShieldAlert size={15} aria-hidden="true" />
            <span>{t(`login.pendiente_${pendiente}`)}</span>
          </div>
        )}

        <div className="login__divider" aria-hidden="true" />

        <button type="button" className="btn btn--ghost btn--block" onClick={demo}>
          {t('login.demoMode')}
        </button>

        <p className="login__legal">{t('login.providersNote')}</p>
      </section>
    </div>
  )
}
