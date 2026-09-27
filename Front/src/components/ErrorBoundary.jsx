import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

/** Pantalla de error: usa el sistema de traducciones como el resto de la app. */
function CrashScreen() {
  const { t } = usePreferences()

  return (
    <div className="crash">
      <div className="crash__card card card--padded">
        <span className="crash__icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </span>
        <h1 className="crash__title">{t('app.name')}</h1>
        <p className="crash__text">{t('app.crashText')}</p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          <RotateCcw size={16} aria-hidden="true" />
          {t('app.crashReload')}
        </button>
      </div>
    </div>
  )
}

/**
 * Evita que un error inesperado deje la aplicacion en blanco: muestra un
 * mensaje util y ofrece recargar. No sustituye a la gestion de estados
 * (idle/loading/empty/error), solo es la red de seguridad de React.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Queda listo para conectar un servicio de monitorizacion.
    console.error('MUSICA EPICA: error en la interfaz', error, info)
  }

  render() {
    return this.state.hasError ? <CrashScreen /> : this.props.children
  }
}
