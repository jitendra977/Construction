import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary'

// ── Sentry — error tracking ───────────────────────────────────────────────────
// Set VITE_SENTRY_DSN in your .env.local (or production env) to enable.
// When VITE_SENTRY_DSN is unset, Sentry is a complete no-op — no perf overhead.
import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,          // 'development' | 'production'
    // Capture 10% of transactions for performance monitoring (tune per env)
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Only propagate trace headers to our own API, not third-party CDNs
    tracePropagationTargets: ['localhost', /^\/api\//],
    integrations: [Sentry.browserTracingIntegration()],
    // Never send Authorization headers to Sentry
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['authorization']
      }
      return event
    },
  })
}

// ── TanStack Query client ─────────────────────────────────────────────────────
// staleTime: 30s  — data is fresh for 30s before a background refetch
// retry: 1        — only retry once on error (avoids hammering a 401)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          30 * 1000,
      retry:              1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)
