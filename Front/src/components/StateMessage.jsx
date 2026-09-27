import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

/**
 * Bloque unico para los estados de la interfaz:
 *   - 'loading' con mensaje de carga
 *   - 'empty'   sin resultados
 *   - 'error'   error con opcion de reintentar
 *   - 'info'    mensaje informativo
 */
export function StateMessage({
  status = 'info',
  title,
  description,
  hint,
  actionLabel,
  onAction,
  compact = false,
}) {
  const { t } = usePreferences()

  if (status === 'loading') {
    return (
      <div className={`state state--loading${compact ? ' state--compact' : ''}`} role="status" aria-live="polite">
        <span className="state__spinner" aria-hidden="true" />
        <p className="state__title">{title || t('states.loading')}</p>
        {description && <p className="state__description">{description}</p>}
        {hint && <p className="state__hint">{hint}</p>}
      </div>
    )
  }

  const isError = status === 'error'
  const Icon = isError ? AlertCircle : Inbox

  return (
    <div
      className={`state state--${isError ? 'error' : 'empty'}${compact ? ' state--compact' : ''}`}
      role={isError ? 'alert' : 'status'}
    >
      <span className="state__icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <p className="state__title">{title || t('states.empty')}</p>
      {description && <p className="state__description">{description}</p>}
      {hint && <p className="state__hint">{hint}</p>}
      {onAction && (
        <button type="button" className="btn btn--secondary state__action" onClick={onAction}>
          <RefreshCw size={15} />
          {actionLabel || t('states.retry')}
        </button>
      )}
    </div>
  )
}
