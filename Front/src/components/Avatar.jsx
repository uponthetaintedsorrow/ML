import { UserRound } from 'lucide-react'
import { initials } from '../utils/color.js'

/**
 * Avatar del usuario. Muestra la foto real cuando existe y, si no,
 * un avatar visual por defecto con iniciales o icono de usuario.
 */
export function Avatar({ name = '', photo = null, size = 40, alt }) {
  const label = alt || name || 'Avatar'

  return (
    <span className="avatar" style={{ '--avatar-size': `${size}px` }}>
      {photo ? (
        <img className="avatar__image" src={photo} alt={label} />
      ) : (
        <span className="avatar__fallback" aria-hidden="true">
          {name ? <span className="avatar__initials">{initials(name)}</span> : <UserRound size={size * 0.5} />}
        </span>
      )}
    </span>
  )
}
