"""Admin API routes for form sync and status polling."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from backend.forms.sync_service import FormSyncService, get_job

router = APIRouter(prefix="/api/admin", tags=["admin"])


class SyncFormsRequest(BaseModel):
    tax_year: int
    form_ids: list[str] | str


class SyncFormsResponse(BaseModel):
    job_id: str
    forms_queued: int
    estimated_completion_seconds: int
    status: str


class SyncStatusResponse(BaseModel):
    job_id: str
    status: str
    results: list[dict] = []


def _check_admin(role: str = "admin") -> bool:
    """Placeholder admin check — replace with real JWT inspection."""
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return True


@router.post("/sync-forms", response_model=SyncFormsResponse)
async def sync_forms(
    body: SyncFormsRequest,
    is_admin: bool = Depends(_check_admin),
):
    """Start a form sync job. Admin-only."""
    service = FormSyncService(
        forms_dir="public/forms",
    )
    job = service.start_sync(body.tax_year, body.form_ids)

    # In production, dispatch execute_sync to background task queue
    # For now, return immediately with job_id
    return SyncFormsResponse(
        job_id=job.job_id,
        forms_queued=len(job.form_ids),
        estimated_completion_seconds=len(job.form_ids) * 10,
        status=job.status,
    )


@router.get("/sync-status/{job_id}", response_model=SyncStatusResponse)
async def sync_status(job_id: str):
    """Poll sync job status."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return SyncStatusResponse(
        job_id=job.job_id,
        status=job.status,
        results=job.results,
    )
