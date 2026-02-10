import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// @ts-ignore - virtual module handled by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

// Registrar Service Worker para soporte Offline y Actualizaciones Automáticas
registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
