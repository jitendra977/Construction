#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def _detect_settings():
    """
    Auto-select settings module.
    - If DJANGO_SETTINGS_MODULE is already set, honour it.
    - If the Docker 'db' host is reachable, use production settings.
    - Otherwise fall back to settings_local (SQLite).
    """
    if 'DJANGO_SETTINGS_MODULE' in os.environ:
        return

    import socket
    try:
        socket.setdefaulttimeout(1)
        socket.getaddrinfo('db', 5432)
        os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
    except (socket.gaierror, socket.timeout, OSError):
        # Fall back to settings_local only if it exists (e.g. local dev without DB up)
        # In Docker builds, 'db' is unreachable and settings_local is missing,
        # so we must default to config.settings.
        if os.path.exists(os.path.join(os.path.dirname(__file__), 'config', 'settings_local.py')):
            os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings_local'
        else:
            os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'


def main():
    """Run administrative tasks."""
    _detect_settings()
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
