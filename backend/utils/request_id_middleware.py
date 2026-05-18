"""
RequestIdMiddleware
───────────────────
Attaches a unique X-Request-Id to every request/response so log lines and
Sentry events from the same request can be correlated.

Usage
─────
Add to MIDDLEWARE (after SecurityMiddleware, before everything else):
    'utils.request_id_middleware.RequestIdMiddleware',

The ID is read from the incoming X-Request-Id header (so a load-balancer can
set it) or generated fresh as a UUID4. It is:
  • stored on request.request_id
  • echoed back in the response as X-Request-Id
  • attached to the Sentry scope (if Sentry is configured)
  • available in log records via a custom filter (see logging config)
"""

import uuid
import logging
import threading

logger = logging.getLogger(__name__)

# Thread-local so the request ID is accessible anywhere in the call stack
# without passing it through function arguments.
_local = threading.local()


def get_current_request_id() -> str:
    """Return the request ID for the current thread, or '' if not in a request."""
    return getattr(_local, 'request_id', '')


class RequestIdMiddleware:
    HEADER_IN  = 'HTTP_X_REQUEST_ID'   # WSGI env key for incoming header
    HEADER_OUT = 'X-Request-Id'        # Response header name

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Accept a pre-assigned ID from a load-balancer; otherwise mint one.
        request_id = request.META.get(self.HEADER_IN) or str(uuid.uuid4())
        request.request_id = request_id
        _local.request_id  = request_id

        # Attach to Sentry scope if Sentry is active
        try:
            import sentry_sdk
            sentry_sdk.set_tag('request_id', request_id)
        except ImportError:
            pass

        response = self.get_response(request)
        response[self.HEADER_OUT] = request_id

        # Do NOT reset _local.request_id here.
        # Resetting before return causes Django's access-log (basehttp) and any
        # post-response signals to log with rid= empty.  The thread-local is
        # safely overwritten at the start of the next request on this thread.
        return response


class RequestIdFilter(logging.Filter):
    """Injects ``request_id`` into every LogRecord for the JSON formatter."""

    def filter(self, record):
        record.request_id = get_current_request_id()
        return True
