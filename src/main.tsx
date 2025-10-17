import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { hydrateFromRemote } from './lib/remoteSync';

// Renderiza imediatamente (página aparece rápido)
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Carrega dados em background (não bloqueia)
void hydrateFromRemote();
