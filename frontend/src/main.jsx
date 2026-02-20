import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#1A202C',
            border: '1px solid #DDE1E9',
            fontSize: '0.875rem',
            fontFamily: 'Source Sans 3, sans-serif',
          },
          success: { iconTheme: { primary: '#2E7D32', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#C53030', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
