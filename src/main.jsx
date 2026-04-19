import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Unregister any old service workers, then register the current one
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    const hasNew = regs.some(r => r.active?.scriptURL?.includes('sw.js'));
    // unregister all first to clear stale caches
    Promise.all(regs.map(r => r.unregister())).then(() => {
      navigator.serviceWorker.register('/sw.js');
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
