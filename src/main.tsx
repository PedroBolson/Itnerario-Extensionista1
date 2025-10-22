import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { hydrateFromRemote } from './lib/remoteSync';
import { hydrateProgressFromCache } from './lib/progress';

// Renderiza imediatamente (página aparece rápido)
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Carrega dados em background (não bloqueia)
void (async () => {
  try {
    await hydrateFromRemote();
  } finally {
    hydrateProgressFromCache();
  }
})();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .catch((err) => console.error('Service worker registration failed', err));
  });
}
