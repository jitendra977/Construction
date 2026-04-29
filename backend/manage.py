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
        os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings_local'


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
