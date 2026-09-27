import { Disc3 } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

/**
 * Logotipo de MUSICA EPICA: marca grafica + nombre.
 * @param {{ onClick?: () => void, size?: 'sm' | 'md' }} props
 */
export function Brand({ onClick, size = 'md' }) {
  const { t } = usePreferences()

  return (
    <button
      type="button"
      className={`brand brand--${size}`}
      onClick={onClick}
      aria-label={t('header.brandHome')}
    >
      <span className="brand__mark" aria-hidden="true">
        <Disc3 size={size === 'sm' ? 20 : 24} strokeWidth={1.8} />
      </span>
      <span className="brand__text">
        <span className="brand__name">MUSICA</span>
        <span className="brand__name brand__name--accent">EPICA</span>
      </span>
    </button>
  )
}
