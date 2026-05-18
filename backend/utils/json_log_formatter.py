"""
JsonFormatter — structured JSON log output.

Emits one JSON object per log line with a stable set of fields so log
aggregators (Datadog, Loki, CloudWatch) can parse without regex hacks.

No third-party dependency — uses only the stdlib json module.

Output shape:
    {
        "time":       "2026-01-15T12:34:56.789Z",
        "level":      "ERROR",
        "logger":     "apps.finance.views",
        "module":     "views",
        "process":    12345,
        "request_id": "3f7a2c1e-...",
        "message":    "...",
        "exc":        "..."   ← only present when exception info is attached
    }
"""

import json
import logging
import traceback
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    # Fields to pull directly off the LogRecord
    _RESERVED = frozenset({
        'args', 'created', 'exc_info', 'exc_text', 'filename',
        'funcName', 'levelname', 'levelno', 'lineno', 'message',
        'module', 'msecs', 'msg', 'name', 'pathname', 'process',
        'processName', 'relativeCreated', 'stack_info', 'thread',
        'threadName', 'taskName',
    })

    def format(self, record: logging.LogRecord) -> str:
        # Build the base record dict
        record.message = record.getMessage()

        payload: dict = {
            'time':       datetime.fromtimestamp(record.created, tz=timezone.utc)
                          .strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
            'level':      record.levelname,
            'logger':     record.name,
            'module':     record.module,
            'process':    record.process,
            'request_id': getattr(record, 'request_id', ''),
            'message':    record.message,
        }

        # Exception info — format the full traceback as a single string
        if record.exc_info:
            payload['exc'] = self.formatException(record.exc_info)
        elif record.exc_text:
            payload['exc'] = record.exc_text

        # Stack info
        if record.stack_info:
            payload['stack'] = self.formatStack(record.stack_info)

        # Merge any extra fields added by the caller (e.g. logger.error("…", extra={…}))
        for key, value in record.__dict__.items():
            if key not in self._RESERVED and not key.startswith('_'):
                try:
                    json.dumps(value)   # only include JSON-serialisable extras
                    payload.setdefault(key, value)
                except (TypeError, ValueError):
                    pass

        return json.dumps(payload, ensure_ascii=False)
