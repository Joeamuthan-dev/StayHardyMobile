import * as Sentry from '@sentry/react';
import ReactDOM from 'react-dom/client';
import Root from './App';
import './index.css';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  tracesSampleRate: 0.5,
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  // Ignore common non-critical errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection',
    'Item with given key does not exist',
  ],
});

const SentryApp = Sentry.withProfiler(Root);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <SentryApp />
);
