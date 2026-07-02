import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/alfa-slab-one/latin-400.css';
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-600.css';
import App from './App';
import './theme/global.css';

// Block iOS pinch-zoom on the page; Leaflet map keeps its own touch handling.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend'] as const) {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
