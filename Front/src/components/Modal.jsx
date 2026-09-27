import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

/**
 * Modal reutilizable: capa oscura, cierre con Escape o clic fuera, foco
 * dentro del dialogo y devolucion del foco al cerrarlo.
 *
 * El foco inicial se pone en el primer CAMPO de texto (no en un boton) y solo
 * cuando el modal se abre: si el efecto se repitiera en cada render, le
 * robarian el foco al usuario mientras escribe.
 *
 * @param {{ open: boolean, title: string, description?: string, onClose: () => void, children: ReactNode, footer?: ReactNode }} props
 */
export function Modal({ open, title, description, onClose, children, footer }) {
  const { t } = usePreferences()
  const dialogRef = useRef(null)
  const previouslyFocused = useRef(null)
  // onClose suele ser una funcion nueva en cada render del padre: se guarda en
  // un ref para que el efecto de foco no dependa de ella.
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined

    previouslyFocused.current = document.activeElement

    const dialog = dialogRef.current
    const campo = dialog?.querySelector('input:not([type=file]), textarea')
    const boton = dialog?.querySelector('button:not([data-modal-close])')
    ;(campo ?? boton)?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusables = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]

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

  return (
    <>
      <button type="button" className="modal__scrim" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <div className="modal" role="presentation">
        <div
          className="modal__dialog card"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          ref={dialogRef}
        >
          <header className="modal__header">
            <h2 className="modal__title">{title}</h2>
            <button
              type="button"
              className="modal__close"
              onClick={onClose}
              data-modal-close
              aria-label={t('common.close')}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          {description && <p className="modal__description">{description}</p>}

          <div className="modal__body">{children}</div>

          {footer && <footer className="modal__footer">{footer}</footer>}
        </div>
      </div>
    </>
  )
}
