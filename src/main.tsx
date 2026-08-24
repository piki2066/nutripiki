import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './lib/pwa' // captura 'beforeinstallprompt' lo antes posible
import { stashInviteFromUrl } from './lib/cloud'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/charts.css'

// Si se ha abierto desde un enlace de invitación, se guarda el código para
// aplicarlo en cuanto haya sesión (aunque antes toque hacer el onboarding).
stashInviteFromUrl()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
