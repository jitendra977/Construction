"""
Custom DRF throttle classes for the accounts app.

Note: the login endpoint (/auth/login/) already has a cache-independent
LoginRateThrottle defined inline in views.py (20 attempts / 15-minute window).
That class is intentionally in-process so a Redis failure can never take down
the login page with a 500 — do not replace it with a cache-backed throttle.

PasswordResetThrottle — applied to password-reset / change endpoints.

Rates are configurable via settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']:
    'password_reset': '10/hour'  (default)
"""

from rest_framework.throttling import AnonRateThrottle


class PasswordResetThrottle(AnonRateThrottle):
    """
    10 password-reset requests per hour per IP by default.
    Override with REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['password_reset'].
    """
    scope = 'password_reset'
