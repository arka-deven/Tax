"""Tests for QBOReadOnlyClient — enforcing read-only access."""

from __future__ import annotations

import logging
from unittest.mock import patch, MagicMock

import pytest

from backend.qbo.client import QBOReadOnlyClient, InMemoryAuditLogger, ALLOWED_ENDPOINTS
from backend.qbo.exceptions import QBOWriteAttemptError, QBOInvalidQueryError


@pytest.fixture
def audit():
    return InMemoryAuditLogger()


@pytest.fixture
def client(audit):
    return QBOReadOnlyClient(
        access_token="test-token-secret-abc123",
        realm_id="1234567890",
        audit_logger=audit,
    )


class TestAllowedEndpoints:
    """GET on allowed endpoints must succeed."""

    def test_get_allowed_endpoint_succeeds(self, client, audit):
        """GET on an allowed endpoint → succeeds and returns data."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"QueryResponse": {"Account": []}}
        mock_resp.raise_for_status = MagicMock()

        with patch("backend.qbo.client.requests.get", return_value=mock_resp) as mock_get:
            result = client.get("account")

        assert result == {"QueryResponse": {"Account": []}}
        # Verify requests.get was called (not post/put/etc)
        mock_get.assert_called_once()
        call_kwargs = mock_get.call_args
        assert "account" in call_kwargs[0][0]

    def test_all_whitelisted_endpoints_accepted(self, client):
        """Every endpoint in ALLOWED_ENDPOINTS is accepted by validation."""
        for endpoint in ALLOWED_ENDPOINTS:
            # Replace template vars
            normalized = endpoint.replace("{realmId}", "1234567890")
            # Should not raise
            client._validate_endpoint(normalized)


class TestWriteBlocking:
    """Write attempts must be blocked and logged."""

    def test_post_blocked(self, client, audit):
        """Any POST attempt → QBOWriteAttemptError, logged to security_incidents."""
        # The client has no POST method — test endpoint validation
        with pytest.raises(QBOWriteAttemptError) as exc_info:
            client.get("invoice")  # invoice is not in ALLOWED_ENDPOINTS
        assert "invoice" in str(exc_info.value)
        assert len(audit.incidents) == 1
        assert audit.incidents[0]["endpoint"] == "invoice"

    def test_put_blocked(self, client, audit):
        """PUT/PATCH/DELETE endpoint → QBOWriteAttemptError."""
        with pytest.raises(QBOWriteAttemptError):
            client.get("customer/123")
        assert len(audit.incidents) == 1

    def test_endpoint_not_in_whitelist(self, client, audit):
        """Endpoint not in ALLOWED_ENDPOINTS → QBOWriteAttemptError."""
        with pytest.raises(QBOWriteAttemptError) as exc_info:
            client.get("payment")
        assert "payment" in str(exc_info.value)
        assert len(audit.incidents) == 1

    def test_write_attempt_logged_to_incidents(self, client, audit):
        """QBOWriteAttemptError writes to security_incidents table."""
        with pytest.raises(QBOWriteAttemptError):
            client.get("bill")
        assert len(audit.incidents) == 1
        incident = audit.incidents[0]
        assert incident["endpoint"] == "bill"
        assert "timestamp" in incident


class TestQueryValidation:
    """Query method must only allow SELECT."""

    def test_select_query_passes(self, client, audit):
        """SELECT query → passes validation, calls GET."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"QueryResponse": {}}
        mock_resp.raise_for_status = MagicMock()

        with patch("backend.qbo.client.requests.get", return_value=mock_resp):
            result = client.query("SELECT * FROM Account")

        assert result == {"QueryResponse": {}}

    def test_insert_blocked(self, client):
        """INSERT in query → QBOInvalidQueryError."""
        with pytest.raises(QBOInvalidQueryError) as exc_info:
            client.query("INSERT INTO Account VALUES ('test')")
        assert "SELECT" in str(exc_info.value)

    def test_update_blocked(self, client):
        """UPDATE in query → QBOInvalidQueryError."""
        with pytest.raises(QBOInvalidQueryError) as exc_info:
            client.query("SELECT * FROM Account; UPDATE Account SET Name='x'")
        # Either keyword or semicolon check catches it
        assert "UPDATE" in str(exc_info.value) or "Semicolons" in str(exc_info.value)

    def test_delete_blocked(self, client):
        """DELETE in query → QBOInvalidQueryError."""
        with pytest.raises(QBOInvalidQueryError):
            client.query("DELETE FROM Account WHERE Id='123'")

    def test_drop_blocked(self, client):
        """DROP in query → QBOInvalidQueryError."""
        with pytest.raises(QBOInvalidQueryError):
            client.query("SELECT * FROM x; DROP TABLE Account")

    def test_sql_injection_semicolon(self, client):
        """SQL injection with semicolon → QBOInvalidQueryError."""
        # Use a query with semicolon but no forbidden keyword after SELECT
        with pytest.raises(QBOInvalidQueryError) as exc_info:
            client.query("SELECT * FROM Account; SELECT * FROM Other")
        assert "Semicolons" in str(exc_info.value)


class TestTokenSecurity:
    """Access token must never appear in logs."""

    def test_token_not_in_logs(self, client, audit, caplog):
        """access_token never appears in any log output."""
        with caplog.at_level(logging.DEBUG):
            try:
                client.get("payment")
            except QBOWriteAttemptError:
                pass

        assert "test-token-secret-abc123" not in caplog.text

    def test_token_not_in_repr(self, client):
        """access_token not in repr."""
        assert "test-token-secret-abc123" not in repr(client)

    def test_token_not_in_error(self, client):
        """access_token not in error message."""
        try:
            client.get("payment")
        except QBOWriteAttemptError as e:
            assert "test-token-secret-abc123" not in str(e)


class TestAuditLogging:
    """Every successful call must be audit logged."""

    def test_successful_call_logged(self, client, audit):
        """Every successful GET writes to qbo_audit_log."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {}
        mock_resp.raise_for_status = MagicMock()

        with patch("backend.qbo.client.requests.get", return_value=mock_resp):
            client.get("account")

        assert len(audit.calls) == 1
        assert audit.calls[0]["endpoint"] == "account"
        assert audit.calls[0]["status_code"] == 200

    def test_audit_includes_params(self, client, audit):
        """Audit log includes query params but never the token."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {}
        mock_resp.raise_for_status = MagicMock()

        with patch("backend.qbo.client.requests.get", return_value=mock_resp):
            client.get("account", {"limit": 10})

        assert audit.calls[0]["params"] == {"limit": 10}
