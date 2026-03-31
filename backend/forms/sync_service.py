"""Form sync orchestration — download, commit, inspect, analyze."""

from __future__ import annotations

import hashlib
import json
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from acroform_filler.inspector import AcroFormInspector
from acroform_filler.models import FieldMeta


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class SyncJob:
    job_id: str
    tax_year: int
    form_ids: list[str]
    status: str = "processing"  # processing | complete | failed
    results: list[dict[str, Any]] = field(default_factory=list)
    created_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).isoformat()


@dataclass
class FormSyncResult:
    form_id: str
    pdf_status: str = "pending"  # downloaded | url_recovered | failed
    instructions_status: str = "pending"
    fields_added: int = 0
    fields_removed: int = 0
    fields_changed: int = 0
    rule_changes_detected: int = 0
    committed_to_repo: bool = False
    sha256: str = ""
    file_size: int = 0


# ---------------------------------------------------------------------------
# In-memory job store (production: Redis/DB)
# ---------------------------------------------------------------------------

_JOB_STORE: dict[str, SyncJob] = {}


def get_job(job_id: str) -> SyncJob | None:
    return _JOB_STORE.get(job_id)


# ---------------------------------------------------------------------------
# Sync service
# ---------------------------------------------------------------------------

class FormSyncService:
    """Orchestrates form download → repo commit → field inspection → rule analysis."""

    def __init__(
        self,
        forms_dir: str | Path,
        *,
        github_token: str | None = None,
        github_repo: str | None = None,
        forms_registry: list[dict[str, Any]] | None = None,
    ):
        self.forms_dir = Path(forms_dir)
        self.github_token = github_token
        self.github_repo = github_repo  # "owner/repo"
        self.forms_registry = forms_registry or []
        self.inspector = AcroFormInspector()

    def start_sync(
        self,
        tax_year: int,
        form_ids: list[str] | str,
    ) -> SyncJob:
        """Create a sync job and return it immediately."""
        if form_ids == "all":
            form_ids = [
                r["form_id"]
                for r in self.forms_registry
                if r.get("tax_year") == tax_year
            ]

        job = SyncJob(
            job_id=str(uuid.uuid4()),
            tax_year=tax_year,
            form_ids=form_ids,
        )
        _JOB_STORE[job.job_id] = job
        return job

    async def execute_sync(self, job: SyncJob) -> SyncJob:
        """Run the full sync pipeline for a job."""
        for form_id in job.form_ids:
            result = await self._sync_single_form(form_id, job.tax_year)
            job.results.append(result.__dict__)

        job.status = "complete"
        all_failed = all(r.get("pdf_status") == "failed" for r in job.results)
        if all_failed and job.results:
            job.status = "failed"

        return job

    async def _sync_single_form(
        self, form_id: str, tax_year: int
    ) -> FormSyncResult:
        """Sync a single form: download, commit, inspect."""
        result = FormSyncResult(form_id=form_id)
        registry_entry = self._find_registry_entry(form_id, tax_year)

        if not registry_entry:
            result.pdf_status = "failed"
            result.instructions_status = "failed"
            return result

        # Step 1: Resolve + download PDF
        pdf_url = registry_entry.get("pdf_url", "")
        pdf_ok = await self._verify_url(pdf_url)

        if not pdf_ok:
            # Trigger URL recovery (Module 3)
            result.pdf_status = "failed"
            return result

        # Step 2: Download
        year_dir = self.forms_dir / str(tax_year)
        year_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = year_dir / f"{form_id}.pdf"
        pdf_bytes = await self._download(pdf_url)
        if pdf_bytes:
            pdf_path.write_bytes(pdf_bytes)
            result.sha256 = hashlib.sha256(pdf_bytes).hexdigest()
            result.file_size = len(pdf_bytes)
            result.pdf_status = "downloaded"
        else:
            result.pdf_status = "failed"
            return result

        # Download instructions
        inst_url = registry_entry.get("instructions_url", "")
        if inst_url:
            inst_ok = await self._verify_url(inst_url)
            if inst_ok:
                inst_bytes = await self._download(inst_url)
                if inst_bytes:
                    inst_path = year_dir / f"{form_id}_instructions.pdf"
                    inst_path.write_bytes(inst_bytes)
                    result.instructions_status = "downloaded"
                else:
                    result.instructions_status = "failed"
            else:
                result.instructions_status = "failed"

        # Step 3: Commit to GitHub
        if self.github_token and self.github_repo:
            committed = await self._commit_to_github(
                form_id, tax_year, pdf_bytes
            )
            result.committed_to_repo = committed

        # Step 4: AcroForm inspection
        try:
            fields = self.inspector.inspect(str(pdf_path))
            result.fields_added = len(fields)
        except Exception:
            pass

        return result

    def _find_registry_entry(
        self, form_id: str, tax_year: int
    ) -> dict[str, Any] | None:
        for entry in self.forms_registry:
            if entry.get("form_id") == form_id and entry.get("tax_year") == tax_year:
                return entry
        return None

    async def _verify_url(self, url: str) -> bool:
        """HEAD request to verify URL is reachable."""
        if not url:
            return False
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                resp = await client.head(url)
                return resp.status_code == 200
        except Exception:
            return False

    async def _download(self, url: str) -> bytes | None:
        """Download a file and return its bytes."""
        try:
            async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return resp.content
        except Exception:
            pass
        return None

    async def _commit_to_github(
        self, form_id: str, tax_year: int, content: bytes
    ) -> bool:
        """Commit a file to the GitHub repo via the Contents API."""
        if not self.github_token or not self.github_repo:
            return False

        import base64
        path = f"forms/{tax_year}/{form_id}.pdf"
        url = f"https://api.github.com/repos/{self.github_repo}/contents/{path}"

        body = {
            "message": f"Sync IRS form {form_id} for tax year {tax_year}",
            "content": base64.b64encode(content).decode(),
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                # Check if file exists (to get sha for update)
                existing = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {self.github_token}",
                        "Accept": "application/vnd.github.v3+json",
                    },
                )
                if existing.status_code == 200:
                    body["sha"] = existing.json().get("sha")

                resp = await client.put(
                    url,
                    json=body,
                    headers={
                        "Authorization": f"Bearer {self.github_token}",
                        "Accept": "application/vnd.github.v3+json",
                    },
                )
                return resp.status_code in (200, 201)
        except Exception:
            return False
