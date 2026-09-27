import { useEffect, useRef } from 'react'
import { ChevronDown, CreditCard, LogOut, Search, Settings, User } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { formatDate } from '../utils/format.js'
import { Avatar } from './Avatar.jsx'

/**
 * Menu desplegable del perfil. Muestra la misma foto y nombre que el avatar
 * del header, y permite navegar a Perfil, Tu cuenta y Ajustes, o cerrar sesion.
 */
export function ProfileMenu({ open, onClose, onNavigate, onSignOut }) {
  const { t, language } = usePreferences()
  const { user } = useUser()
  const menuRef = useRef(null)
  const firstItemRef = useRef(null)
  const previouslyFocused = useRef(null)
  // onClose suele ser una funcion nueva en cada render: se guarda en un ref
  // para que el efecto de foco no se repita al cambiar el estado del padre.
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Solo al abrir: mueve el foco al primer elemento y lo mantiene dentro.
  useEffect(() => {
    if (!open) return undefined

    previouslyFocused.current = document.activeElement
    firstItemRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = menuRef.current?.querySelectorAll('button, a[href]')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  const items = [
    { key: 'home', label: t('nav.home'), icon: Search, to: '/' },
    { key: 'profile', label: t('nav.profile'), icon: User, to: '/perfil' },
    { key: 'account', label: t('nav.account'), icon: CreditCard, to: '/cuenta' },
    { key: 'settings', label: t('nav.settings'), icon: Settings, to: '/ajustes' },
  ]

  return (
    <>
      <button
        type="button"
        className="menu-scrim"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={menuRef}
        className="profile-menu"
        role="menu"
        aria-label={t('profileMenu.title')}
      >
        <div className="profile-menu__header">
          <Avatar name={user?.displayName} photo={user?.profilePicture} size={44} />
          <div className="profile-menu__identity">
            <p className="profile-menu__name">{user?.displayName}</p>
            <p className="profile-menu__since">
              {t('profileMenu.memberSince', { date: formatDate(user?.createdAt, language === 'en' ? 'en-GB' : 'es-ES') })}
            </p>
          </div>
        </div>

        <ul className="profile-menu__list">
          {items.map((item, index) => {
            const Icon = item.icon
            return (
              <li key={item.key}>
                <button
                  ref={index === 0 ? firstItemRef : undefined}
                  type="button"
                  role="menuitem"
                  className="profile-menu__item"
                  onClick={() => {
                    onNavigate(item.to)
                    onClose()
                  }}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="profile-menu__footer">
          <button
            type="button"
            role="menuitem"
            className="profile-menu__item profile-menu__item--danger"
            onClick={onSignOut}
          >
            <LogOut size={17} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </div>
    </>
  )
}

export function ProfileMenuTrigger({ user, open, onToggle, onClose, ...menuProps }) {
  const { t } = usePreferences()

  return (
    <div className="profile-trigger">
      <button
        type="button"
        className="profile-trigger__button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? t('header.closeMenu') : t('header.openMenu')}
      >
        <Avatar name={user?.displayName} photo={user?.profilePicture} size={38} alt={t('header.openMenu')} />
        <span className="profile-trigger__name">{user?.displayName}</span>
        <ChevronDown size={15} className={`profile-trigger__caret${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>
      <ProfileMenu open={open} onClose={onClose} {...menuProps} />
    </div>
  )
}
