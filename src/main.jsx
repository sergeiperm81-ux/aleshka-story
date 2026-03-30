import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

function renderFatalError(error) {
  const root = document.getElementById('root');
  if (!root) {
    return;
  }

  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  root.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f8e6ca;font-family:Georgia,serif;color:#34211a;">
      <div style="max-width:760px;padding:24px 28px;border-radius:24px;background:#fff8ee;border:1px solid rgba(96,56,38,.15);box-shadow:0 24px 60px rgba(92,58,45,.16);">
        <div style="font:700 12px Trebuchet MS, Verdana, sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#6b4a3d;">Ошибка запуска</div>
        <h1 style="margin:10px 0 12px;font-size:32px;line-height:1;">Сайт загрузился не до конца</h1>
        <p style="margin:0 0 12px;line-height:1.7;">Это диагностический экран. Он нужен, чтобы мы видели реальную ошибку вместо пустой страницы.</p>
        <pre style="white-space:pre-wrap;overflow:auto;padding:16px;border-radius:16px;background:#fffdf8;border:1px solid rgba(96,56,38,.15);">${message}</pre>
      </div>
    </div>
  `;
}

window.addEventListener('error', (event) => {
  renderFatalError(event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  renderFatalError(event.reason);
});

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  renderFatalError(error);
}