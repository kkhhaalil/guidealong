import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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
