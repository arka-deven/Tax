"""QBO client exceptions."""

from __future__ import annotations


class QBOWriteAttemptError(Exception):
    """Raised when any write operation is attempted against the QBO API."""

    def __init__(self, endpoint: str, method: str = "GET"):
        self.endpoint = endpoint
        self.method = method
        super().__init__(
            f"WRITE BLOCKED: attempted {method} on endpoint '{endpoint}'. "
            "Only GET requests to whitelisted read-only endpoints are allowed."
        )


class QBOInvalidQueryError(Exception):
    """Raised when a QBO query contains forbidden SQL keywords."""

    def __init__(self, query: str, reason: str):
        self.query = query
        self.reason = reason
        super().__init__(f"Invalid QBO query: {reason}")
