import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // ── Node / config files (vite.config.js, etc.) ───────────────
  {
    files: ['*.config.{js,ts}', 'vite.config.*'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // ── Test setup + spec files ───────────────────────────────────
  {
    files: ['src/test/**', '**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        // Vitest globals (enabled via vite.config.js test.globals:true)
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },

  // ── Main source files ─────────────────────────────────────────
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        __APP_VERSION__: 'readonly',  // injected by Vite define
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // ── Unused vars: allow uppercase, _ prefix, and catch errors prefixed _ ──
      'no-unused-vars': ['warn', {
        varsIgnorePattern:       '^[A-Z_]|^_',
        argsIgnorePattern:       '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],

      // ── React hooks: exhaustive-deps is guidance, not a hard error ──────────
      // Missing deps are often intentional (run-once effects, stable refs).
      'react-hooks/exhaustive-deps': 'warn',

      // ── set-state-in-effect: calling async fetchers in useEffect is normal ──
      'react-hooks/set-state-in-effect': 'warn',

      // ── react-refresh: non-component exports in component files are common ──
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ── Keep these as errors — they indicate real bugs ───────────────────────
      'react-hooks/rules-of-hooks':       'error',
      'no-undef':                         'error',
      'no-case-declarations':             'error',
      'no-constant-binary-expression':    'error',

      // ── Downgrade noisy style rules to warnings ───────────────────────────
      'no-empty':                         'warn',
      'no-misleading-character-class':    'warn',
    },
  },
])
