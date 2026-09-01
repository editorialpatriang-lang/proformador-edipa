import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Polyfills para @react-pdf/renderer en el browser
import { Buffer } from 'buffer'
if (!globalThis.Buffer) globalThis.Buffer = Buffer
if (!globalThis.process) globalThis.process = { env: {} }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
