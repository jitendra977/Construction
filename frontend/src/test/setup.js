/**
 * Vitest global test setup
 * Runs before every test file.
 */
import '@testing-library/jest-dom';

// ── Mock navigator.geolocation ────────────────────────────────────────────────
// jsdom doesn't provide geolocation. Login uses it to gate the submit button.
// Stub it so geoStatus immediately resolves to 'granted' (not 'checking').
Object.defineProperty(global.navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn((success) => success({ coords: { latitude: 0, longitude: 0 } })),
    watchPosition:      vi.fn(() => 0),
    clearWatch:         vi.fn(),
  },
  configurable: true,
});

// ── Mock navigator.permissions (used by the geo hook) ────────────────────────
Object.defineProperty(global.navigator, 'permissions', {
  value: {
    query: vi.fn(() => Promise.resolve({ state: 'granted', addEventListener: vi.fn() })),
  },
  configurable: true,
});

// ── Silence noisy React/testing-library console output ───────────────────────
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('act(') ||
       args[0].includes('Warning:') ||
       args[0].includes('Not implemented') ||
       args[0].includes('inside a test was not wrapped'))
    ) return;
    originalError(...args);
  };
});
afterAll(() => { console.error = originalError; });
