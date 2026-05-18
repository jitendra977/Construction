import warnings
from django.apps import AppConfig


class AccountingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounting'
    label = 'accounting'

    def ready(self):
        warnings.warn(
            "\n\n"
            "⚠️  DEPRECATED: apps.accounting is the legacy accounting module.\n"
            "   The canonical implementation is apps.fin (api/v1/fin/).\n"
            "   apps.fin covers: accounts, bills, budget, journal, loans, transfers.\n"
            "   Audit remaining ledger/treasury/payables logic and migrate to apps.fin\n"
            "   before removing this app.\n"
            "   Scheduled for URL removal in Phase 2, model deletion in Phase 3.\n",
            DeprecationWarning,
            stacklevel=2,
        )
