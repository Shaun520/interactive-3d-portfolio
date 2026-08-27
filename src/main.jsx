import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { siteConfig } from './site.config'

// --- Console Signature (from site.config brand.console) ---
if (typeof window !== 'undefined') {
  const c = siteConfig.brand.console;
  if (c) {
    console.log(
      `%c ${c.title} %c ${c.subtitle} %c`,
      'background: #111; color: #fff; padding: 5px 10px; font-weight: bold; border-radius: 3px 0 0 3px;',
      `background: ${c.color}; color: #fff; padding: 5px 10px; font-weight: bold; border-radius: 0 3px 3px 0;`,
      'background: transparent'
    );
    if (c.message) {
      console.log(
        `%c${c.message}`,
        'font-weight: bold; color: #666; font-size: 14px;'
      );
    }
  }
}


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
