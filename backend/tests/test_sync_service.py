"""Tests for the form sync service."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import pytest
import pytest_asyncio

from backend.forms.sync_service import FormSyncService, SyncJob, get_job


@pytest.fixture
def registry():
    return [
        {
            "form_id": "f1120s",
            "tax_year": 2024,
            "pdf_url": "https://www.irs.gov/pub/irs-pdf/f1120s.pdf",
            "instructions_url": "https://www.irs.gov/pub/irs-pdf/i1120s.pdf",
        },
        {
            "form_id": "f1040",
            "tax_year": 2024,
            "pdf_url": "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
            "instructions_url": "",
        },
    ]


@pytest.fixture
def service(tmp_path, registry):
    return FormSyncService(
        forms_dir=tmp_path / "forms",
        forms_registry=registry,
    )


class TestSyncJobCreation:
    """Sync job creation and tracking."""

    def test_start_sync_creates_job(self, service):
        """start_sync returns a job with valid ID and status."""
        job = service.start_sync(2024, ["f1120s"])
        assert job.job_id
        assert job.status == "processing"
        assert job.form_ids == ["f1120s"]

    def test_start_sync_all_resolves_from_registry(self, service):
        """form_ids='all' resolves to all forms for that year."""
        job = service.start_sync(2024, "all")
        assert set(job.form_ids) == {"f1120s", "f1040"}

    def test_get_job_retrieves(self, service):
        """get_job returns the created job by ID."""
        job = service.start_sync(2024, ["f1120s"])
        retrieved = get_job(job.job_id)
        assert retrieved is not None
        assert retrieved.job_id == job.job_id

    def test_get_job_missing(self):
        """get_job with unknown ID → None."""
        assert get_job("nonexistent-id") is None


class TestSyncExecution:
    """Sync pipeline execution."""

    @pytest.mark.asyncio
    async def test_valid_url_downloads(self, service, tmp_path):
        """Valid URL → downloads, saves, computes sha256."""
        job = service.start_sync(2024, ["f1120s"])
        completed = await service.execute_sync(job)

        assert completed.status == "complete"
        assert len(completed.results) == 1

        result = completed.results[0]
        assert result["pdf_status"] == "downloaded"
        assert len(result["sha256"]) == 64
        assert result["file_size"] > 0

        # File exists on disk
        pdf_path = tmp_path / "forms" / "2024" / "f1120s.pdf"
        assert pdf_path.exists()

    @pytest.mark.asyncio
    async def test_broken_url_does_not_crash(self, tmp_path):
        """Broken URL → status='failed', does not crash."""
        service = FormSyncService(
            forms_dir=tmp_path / "forms",
            forms_registry=[{
                "form_id": "broken_form",
                "tax_year": 2024,
                "pdf_url": "https://www.irs.gov/pub/irs-pdf/NONEXISTENT_FORM.pdf",
                "instructions_url": "",
            }],
        )
        job = service.start_sync(2024, ["broken_form"])
        completed = await service.execute_sync(job)
        result = completed.results[0]
        assert result["pdf_status"] == "failed"

    @pytest.mark.asyncio
    async def test_sha256_stored_correctly(self, service, tmp_path):
        """SHA-256 in result matches actual file hash."""
        job = service.start_sync(2024, ["f1120s"])
        completed = await service.execute_sync(job)
        result = completed.results[0]

        pdf_path = tmp_path / "forms" / "2024" / "f1120s.pdf"
        actual_sha = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
        assert result["sha256"] == actual_sha

    @pytest.mark.asyncio
    async def test_unknown_form_id_fails(self, service):
        """Unknown form_id → result with failed status."""
        job = service.start_sync(2024, ["nonexistent_form"])
        completed = await service.execute_sync(job)
        result = completed.results[0]
        assert result["pdf_status"] == "failed"

    @pytest.mark.asyncio
    async def test_github_commit_without_token(self, service, tmp_path):
        """No GitHub token → committed_to_repo=False."""
        job = service.start_sync(2024, ["f1120s"])
        completed = await service.execute_sync(job)
        result = completed.results[0]
        assert result["committed_to_repo"] is False
