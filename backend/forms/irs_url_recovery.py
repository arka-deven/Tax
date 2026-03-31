"""IRS URL recovery via Claude API — locate new URLs when stored ones break."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)


@dataclass
class RecoveryResult:
    form_id: str
    tax_year: int
    old_url: str
    new_pdf_url: str | None = None
    new_instructions_url: str | None = None
    verified: bool = False
    confidence: str = "low"
    needs_manual_review: bool = True
    reasoning: str = ""
    error: str | None = None


class RecoveryError(Exception):
    """Raised when URL recovery fails."""


async def recover_irs_url(
    form_id: str,
    tax_year: int,
    broken_url: str,
    *,
    anthropic_api_key: str | None = None,
    _claude_caller: Any | None = None,
) -> RecoveryResult:
    """Call Claude API to locate the new IRS URL, then verify via HEAD.

    Args:
        form_id: IRS form identifier (e.g. "f1120s")
        tax_year: The tax year
        broken_url: The URL that returned 404
        anthropic_api_key: Anthropic API key (uses env var if not provided)
        _claude_caller: Injectable callable for testing (skips real API)
    """
    result = RecoveryResult(
        form_id=form_id,
        tax_year=tax_year,
        old_url=broken_url,
    )

    prompt = (
        f"The IRS PDF for form {form_id} (tax year {tax_year}) used to be at:\n"
        f"{broken_url}\n\n"
        "This URL is now returning 404. The IRS hosts all official tax forms and\n"
        "instructions at irs.gov. Please provide:\n"
        "1. The most likely current URL for this form's PDF on irs.gov\n"
        "2. The most likely current URL for this form's instructions PDF on irs.gov\n"
        "3. Your confidence level (high/medium/low)\n"
        "4. Reasoning\n\n"
        "Respond ONLY in JSON:\n"
        '{\n'
        '  "pdf_url": "https://...",\n'
        '  "instructions_url": "https://...",\n'
        '  "confidence": "high|medium|low",\n'
        '  "reasoning": "..."\n'
        '}'
    )

    # Call Claude
    try:
        if _claude_caller:
            raw_response = await _claude_caller(prompt)
        else:
            raw_response = await _call_claude(prompt, anthropic_api_key)
    except Exception as exc:
        result.error = f"Claude API call failed: {exc}"
        raise RecoveryError(result.error) from exc

    # Parse response
    try:
        data = _parse_claude_json(raw_response)
    except (json.JSONDecodeError, ValueError) as exc:
        result.error = f"Malformed Claude response: {exc}"
        raise RecoveryError(result.error) from exc

    result.new_pdf_url = data.get("pdf_url")
    result.new_instructions_url = data.get("instructions_url")
    result.confidence = data.get("confidence", "low")
    result.reasoning = data.get("reasoning", "")

    # Low confidence → always flag for review, skip verification
    if result.confidence == "low":
        result.needs_manual_review = True
        result.verified = False
        return result

    # HEAD verification — mandatory before any DB write
    pdf_verified = False
    inst_verified = False

    if result.new_pdf_url:
        pdf_verified = await _verify_head(result.new_pdf_url)
    if result.new_instructions_url:
        inst_verified = await _verify_head(result.new_instructions_url)

    result.verified = pdf_verified and (
        inst_verified or not result.new_instructions_url
    )

    if not result.verified:
        result.needs_manual_review = True
    else:
        result.needs_manual_review = False

    return result


async def _call_claude(prompt: str, api_key: str | None = None) -> str:
    """Call the Claude API and return the response text."""
    import anthropic

    key = api_key or ""
    client = anthropic.Anthropic(api_key=key)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def _parse_claude_json(raw: str) -> dict[str, Any]:
    """Extract JSON from Claude's response, handling markdown fences."""
    text = raw.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last fence lines
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)
    return json.loads(text)


async def _verify_head(url: str) -> bool:
    """Verify a URL returns 200 via HEAD request."""
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.head(url)
            return resp.status_code == 200
    except Exception:
        return False
