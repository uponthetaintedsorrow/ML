import { BadgeCheck, Info, KeyRound, LogIn } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { formatDate } from '../utils/format.js'
import { AppleMusicIcon, GoogleIcon, SpotifyIcon } from '../components/BrandIcons.jsx'
import { Avatar } from '../components/Avatar.jsx'

const PROVIDER_ICONS = {
  google: GoogleIcon,
  spotify: SpotifyIcon,
  apple: AppleMusicIcon,
  email: LogIn,
  demo: LogIn,
}

const PROVIDER_KEYS = {
  google: 'account_status.google',
  spotify: 'account_status.spotify',
  apple: 'account_status.apple',
  email: 'account_status.email',
  demo: 'account_status.demo',
}

/**
 * Informacion de la cuenta. Los valores vienen del estado de sesion; cuando
 * exista autenticacion real, esta vista solo tendra que leer la respuesta
 * del servicio en lugar del estado local.
 */
export function Account({ onNavigate }) {
  const { t, language } = usePreferences()
  const { user, isAuthenticated } = useUser()
  const locale = language === 'en' ? 'en-GB' : 'es-ES'

  if (!isAuthenticated) {
    return (
      <div className="page account">
        <h1 className="page__title">{t('account.title')}</h1>
        <p className="page__subtitle">{t('account.subtitle')}</p>
        <button type="button" className="btn btn--primary" onClick={() => onNavigate('/login')}>
          <LogIn size={16} aria-hidden="true" />
          {t('nav.login')}
        </button>
      </div>
    )
  }

  const ProviderIcon = PROVIDER_ICONS[user.provider] ?? LogIn

  return (
    <div className="page account">
      <header className="page__header">
        <div>
          <h1 className="page__title">{t('account.title')}</h1>
          <p className="page__subtitle">{t('account.subtitle')}</p>
        </div>
      </header>

      <section className="card card--padded account__identity">
        <Avatar name={user.displayName} photo={user.profilePicture} size={64} alt={t('profile.photo')} />
        <div>
          <p className="account__name">{user.displayName}</p>
          <p className="text-muted text-sm">{user.email}</p>
        </div>
        <span className="badge badge--success">
          <BadgeCheck size={14} aria-hidden="true" />
          {t('account.active')}
        </span>
      </section>

      <section className="card card--padded stack stack--4">
        <h2 className="section-title">
          <KeyRound size={18} aria-hidden="true" />
          {t('account.sessions')}
        </h2>

        <dl className="data-list">
          <div className="data-list__row">
            <dt>{t('account.name')}</dt>
            <dd>{user.displayName}</dd>
          </div>
          <div className="data-list__row">
            <dt>{t('account.email')}</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="data-list__row">
            <dt>{t('account.provider')}</dt>
            <dd className="row">
              <ProviderIcon size={15} aria-hidden="true" />
              {t(PROVIDER_KEYS[user.provider] ?? 'account_status.demo')}
            </dd>
          </div>
          <div className="data-list__row">
            <dt>{t('account.status')}</dt>
            <dd>
              <span className="badge badge--success">{t('account.active')}</span>
            </dd>
          </div>
          <div className="data-list__row">
            <dt>{t('account.memberSince')}</dt>
            <dd>{formatDate(user.createdAt, locale)}</dd>
          </div>
        </dl>

        <p className="notice">
          <Info size={15} aria-hidden="true" />
          {t('account.sessionsHint')}
        </p>
      </section>

      <section className="card card--padded stack stack--2">
        <h2 className="section-title">{t('settings.account')}</h2>
        <p className="text-muted text-sm">{t('account.apiNote')}</p>
        <div>
          <button type="button" className="btn btn--secondary" onClick={() => onNavigate('/ajustes')}>
            {t('settings.accountLink')}
          </button>
        </div>
      </section>
    </div>
  )
}
