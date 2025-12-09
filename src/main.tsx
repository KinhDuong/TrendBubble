import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';

// Handle GitHub Pages SPA redirect
const redirect = sessionStorage.redirect;
if (redirect) {
  delete sessionStorage.redirect;
  if (redirect !== location.href) {
    const url = new URL(redirect);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
