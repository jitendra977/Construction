"""
DeprecationWarningMiddleware
─────────────────────────────
Injects a  Deprecation  and  Sunset  header on any response from legacy API
prefixes so clients (browser devtools, monitors, frontend code) can see the
warning without breaking functionality.

Canonical replacements:
  /api/v1/finance/    →  /api/v1/fin/
  /api/v1/estimator/  →  /api/v1/estimate/

Add to MIDDLEWARE in settings AFTER SecurityMiddleware:
    'utils.deprecation_middleware.DeprecationWarningMiddleware',
"""

DEPRECATED_PREFIXES = {
    '/api/v1/finance/':    '/api/v1/fin/',
    '/api/v1/estimator/':  '/api/v1/estimate/',
    '/api/v1/accounting/': None,   # no direct replacement — keep as-is until Phase 3
}

# Phase 3 target sunset date (informational only — not enforced)
SUNSET_DATE = 'Sat, 01 Jan 2027 00:00:00 GMT'


class DeprecationWarningMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        path = request.path
        for prefix, canonical in DEPRECATED_PREFIXES.items():
            if path.startswith(prefix):
                response['Deprecation'] = 'true'
                response['Sunset'] = SUNSET_DATE
                if canonical:
                    response['Link'] = f'<{canonical}>; rel="successor-version"'
                response['X-Deprecated-Notice'] = (
                    f'This endpoint ({prefix}) is deprecated. '
                    + (f'Use {canonical} instead.' if canonical else 'No direct replacement available yet.')
                )
                break

        return response
