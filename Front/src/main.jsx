import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import './styles/global.css'
import './styles/layout.css'
import './styles/discover.css'
import './styles/pages.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PreferencesProvider>
      <UserProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </UserProvider>
    </PreferencesProvider>
  </StrictMode>,
)
