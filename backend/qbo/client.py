"""Read-only QBO API client — architecturally impossible to call write endpoints."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

import requests

from .exceptions import QBOInvalidQueryError, QBOWriteAttemptError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Immutable whitelist — only these endpoints may ever be called
# ---------------------------------------------------------------------------

ALLOWED_ENDPOINTS: frozenset[str] = frozenset({
    "reports/ProfitAndLoss",
    "reports/BalanceSheet",
    "reports/TrialBalance",
    "reports/GeneralLedger",
    "reports/TransactionList",
    "query",
    "companyinfo/{realmId}",
    "account",
    "taxcode",
    "taxrate",
})

# SQL keywords that must never appear in a query
_FORBIDDEN_SQL: frozenset[str] = frozenset({
    "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "EXEC",
})

_FORBIDDEN_SQL_PATTERN = re.compile(
    r"\b(" + "|".join(_FORBIDDEN_SQL) + r")\b", re.IGNORECASE
)

# QBO API base URL
_QBO_BASE = "https://quickbooks.api.intuit.com/v3/company"


class QBOReadOnlyClient:
    """Read-only wrapper for the QuickBooks Online API.

    The HTTP method is hardcoded as the string literal ``"GET"`` in every
    ``requests.get()`` call.  There is no method parameter, no variable
    indirection — it is *physically impossible* for this class to issue
    a POST, PUT, PATCH, or DELETE.
    """

    def __init__(
        self,
        access_token: str,
        realm_id: str,
        *,
        audit_logger: AuditLogger | None = None,
    ):
        # Tokens are stored but never exposed in logs / repr / errors
        self._access_token = access_token
        self._realm_id = realm_id
        self._audit = audit_logger or _NullAuditLogger()

    def __repr__(self) -> str:
        return f"QBOReadOnlyClient(realm_id={self._realm_id!r})"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get(self, endpoint: str, params: dict[str, Any] | None = None) -> dict:
        """Execute a GET request against a whitelisted QBO endpoint."""
        self._validate_endpoint(endpoint)

        url = f"{_QBO_BASE}/{self._realm_id}/{endpoint}"
        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Accept": "application/json",
        }

        # Method is the string literal "GET" — never a variable
        response = requests.get(url, headers=headers, params=params, timeout=30)

        # Audit — never include the token
        self._audit.log_call(
            endpoint=endpoint,
            params=params or {},
            status_code=response.status_code,
        )

        response.raise_for_status()
        return response.json()

    def query(self, sql: str) -> dict:
        """Execute a read-only QBO query (SELECT only)."""
        cleaned = sql.strip()
        upper = cleaned.upper()

        if not upper.startswith("SELECT"):
            raise QBOInvalidQueryError(cleaned, "Query must start with SELECT")

        # Check for forbidden keywords
        match = _FORBIDDEN_SQL_PATTERN.search(cleaned)
        if match:
            raise QBOInvalidQueryError(
                cleaned, f"Forbidden keyword: {match.group(0)}"
            )

        # Block semicolons (multi-statement injection)
        if ";" in cleaned:
            raise QBOInvalidQueryError(
                cleaned, "Semicolons are not allowed (possible SQL injection)"
            )

        return self.get("query", {"query": cleaned})

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def _validate_endpoint(self, endpoint: str) -> None:
        """Check endpoint against the whitelist. Raises on violation."""
        # Normalize: replace the actual realm_id with the template variable
        normalized = endpoint.replace(self._realm_id, "{realmId}")

        if normalized not in ALLOWED_ENDPOINTS:
            self._handle_write_attempt(endpoint, "GET")
            raise QBOWriteAttemptError(endpoint)

    def _handle_write_attempt(self, endpoint: str, method: str) -> None:
        """Log a security incident and raise CRITICAL alert."""
        logger.critical(
            "QBO WRITE ATTEMPT BLOCKED: endpoint=%s method=%s realm=%s",
            endpoint, method, self._realm_id,
        )
        self._audit.log_security_incident(
            endpoint=endpoint,
            method=method,
        )


# ---------------------------------------------------------------------------
# Audit logger protocol
# ---------------------------------------------------------------------------

class AuditLogger:
    """Interface for QBO audit logging — override for real DB implementation."""

    def log_call(
        self, endpoint: str, params: dict, status_code: int
    ) -> None:
        raise NotImplementedError

    def log_security_incident(
        self, endpoint: str, method: str
    ) -> None:
        raise NotImplementedError


class _NullAuditLogger(AuditLogger):
    """Default no-op logger used when no audit backend is configured."""

    def log_call(self, endpoint: str, params: dict, status_code: int) -> None:
        pass

    def log_security_incident(self, endpoint: str, method: str) -> None:
        pass


class InMemoryAuditLogger(AuditLogger):
    """In-memory audit logger for testing."""

    def __init__(self) -> None:
        self.calls: list[dict] = []
        self.incidents: list[dict] = []

    def log_call(
        self, endpoint: str, params: dict, status_code: int
    ) -> None:
        self.calls.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "endpoint": endpoint,
            "params": params,
            "status_code": status_code,
        })

    def log_security_incident(
        self, endpoint: str, method: str
    ) -> None:
        self.incidents.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "endpoint": endpoint,
            "method": method,
        })
