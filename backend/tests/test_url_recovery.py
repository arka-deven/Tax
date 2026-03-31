"""Tests for IRS URL recovery via Claude API."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest

from backend.forms.irs_url_recovery import (
    RecoveryResult,
    RecoveryError,
    recover_irs_url,
    _parse_claude_json,
)


def _make_claude_response(pdf_url: str, inst_url: str, confidence: str = "high") -> str:
    return json.dumps({
        "pdf_url": pdf_url,
        "instructions_url": inst_url,
        "confidence": confidence,
        "reasoning": "Standard IRS URL pattern",
    })


class TestURLRecovery:
    """Claude-based URL recovery with HEAD verification."""

    @pytest.mark.asyncio
    async def test_broken_url_calls_claude(self):
        """Broken URL → Claude called with correct prompt."""
        called_prompts = []

        async def mock_claude(prompt):
            called_prompts.append(prompt)
            return _make_claude_response(
                "https://www.irs.gov/pub/irs-pdf/f1120s.pdf",
                "https://www.irs.gov/pub/irs-pdf/i1120s.pdf",
            )

        with patch("backend.forms.irs_url_recovery._verify_head", new_callable=AsyncMock, return_value=True):
            result = await recover_irs_url(
                "f1120s", 2024,
                "https://old.irs.gov/broken.pdf",
                _claude_caller=mock_claude,
            )

        assert len(called_prompts) == 1
        assert "f1120s" in called_prompts[0]
        assert "2024" in called_prompts[0]
        assert result.new_pdf_url is not None

    @pytest.mark.asyncio
    async def test_valid_urls_head_passes_db_updated(self):
        """Claude returns valid URLs → HEAD passes → verified=True."""
        async def mock_claude(prompt):
            return _make_claude_response(
                "https://www.irs.gov/pub/irs-pdf/f1120s.pdf",
                "https://www.irs.gov/pub/irs-pdf/i1120s.pdf",
                "high",
            )

        with patch("backend.forms.irs_url_recovery._verify_head", new_callable=AsyncMock, return_value=True):
            result = await recover_irs_url(
                "f1120s", 2024, "https://broken.url",
                _claude_caller=mock_claude,
            )

        assert result.verified is True
        assert result.needs_manual_review is False

    @pytest.mark.asyncio
    async def test_head_fails_needs_manual_review(self):
        """Claude returns URLs → HEAD fails → needs_manual_review=True, DB NOT updated."""
        async def mock_claude(prompt):
            return _make_claude_response(
                "https://bad.url/form.pdf",
                "https://bad.url/instructions.pdf",
                "high",
            )

        with patch("backend.forms.irs_url_recovery._verify_head", new_callable=AsyncMock, return_value=False):
            result = await recover_irs_url(
                "f1120s", 2024, "https://broken.url",
                _claude_caller=mock_claude,
            )

        assert result.verified is False
        assert result.needs_manual_review is True

    @pytest.mark.asyncio
    async def test_low_confidence_always_needs_review(self):
        """Low confidence → needs_manual_review=True regardless of HEAD."""
        async def mock_claude(prompt):
            return _make_claude_response(
                "https://maybe.irs.gov/form.pdf",
                "https://maybe.irs.gov/inst.pdf",
                "low",
            )

        # HEAD is never even called for low confidence
        result = await recover_irs_url(
            "f1120s", 2024, "https://broken.url",
            _claude_caller=mock_claude,
        )

        assert result.confidence == "low"
        assert result.needs_manual_review is True
        assert result.verified is False

    @pytest.mark.asyncio
    async def test_malformed_claude_json_raises(self):
        """Malformed Claude JSON → RecoveryError, not crash."""
        async def mock_claude(prompt):
            return "This is not valid JSON at all {{"

        with pytest.raises(RecoveryError) as exc_info:
            await recover_irs_url(
                "f1120s", 2024, "https://broken.url",
                _claude_caller=mock_claude,
            )
        assert "Malformed" in str(exc_info.value)


class TestParseClaudeJSON:
    """JSON parsing from Claude responses."""

    def test_plain_json(self):
        """Plain JSON parsed correctly."""
        data = _parse_claude_json('{"key": "value"}')
        assert data == {"key": "value"}

    def test_markdown_fenced_json(self):
        """JSON wrapped in markdown fences → extracted correctly."""
        raw = '```json\n{"key": "value"}\n```'
        data = _parse_claude_json(raw)
        assert data == {"key": "value"}

    def test_invalid_json_raises(self):
        """Invalid JSON → JSONDecodeError."""
        with pytest.raises(json.JSONDecodeError):
            _parse_claude_json("not json")
