"""Database schema definitions for all Module 1-3 tables.

These are SQLAlchemy ORM models. In production, run ``alembic`` migrations
generated from these models.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Module 1: QBO audit & security
# ---------------------------------------------------------------------------

class QBOAuditLog(Base):
    __tablename__ = "qbo_audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    endpoint = Column(String(500), nullable=False)
    params_json = Column(Text, default="{}")
    response_status = Column(Integer, nullable=False)
    user_id = Column(String(200), default="")


class SecurityIncident(Base):
    __tablename__ = "security_incidents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    attempted_endpoint = Column(String(500), nullable=False)
    method = Column(String(10), nullable=False)
    user_id = Column(String(200), default="")
    resolved = Column(Boolean, default=False)


# ---------------------------------------------------------------------------
# Module 2: Forms registry & sync
# ---------------------------------------------------------------------------

class FormsRegistry(Base):
    __tablename__ = "forms_registry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    form_id = Column(String(50), nullable=False)
    tax_year = Column(Integer, nullable=False)
    pdf_url = Column(String(1000), default="")
    instructions_url = Column(String(1000), default="")
    last_verified_at = Column(DateTime(timezone=True))


class FormsSyncStatus(Base):
    __tablename__ = "forms_sync_status"

    id = Column(Integer, primary_key=True, autoincrement=True)
    form_id = Column(String(50), nullable=False)
    tax_year = Column(Integer, nullable=False)
    status = Column(String(50), default="pending")  # pending|available|needs_review|failed
    sha256 = Column(String(64), default="")
    synced_at = Column(DateTime(timezone=True))
    file_size = Column(Integer, default=0)
    committed_to_repo = Column(Boolean, default=False)


class FormField(Base):
    __tablename__ = "form_fields"

    id = Column(Integer, primary_key=True, autoincrement=True)
    form_id = Column(String(50), nullable=False)
    tax_year = Column(Integer, nullable=False)
    field_id = Column(String(500), nullable=False)
    field_type = Column(String(50), default="Text")
    mandatory = Column(Boolean, default=False)
    page_number = Column(Integer, default=0)
    bbox_json = Column(Text, default="{}")


# ---------------------------------------------------------------------------
# Module 3: Rule changes & recovery
# ---------------------------------------------------------------------------

class RuleChangeReportRow(Base):
    __tablename__ = "rule_change_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    form_id = Column(String(50), nullable=False)
    prior_year = Column(Integer, nullable=False)
    current_year = Column(Integer, nullable=False)
    report_json = Column(Text, default="{}")
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now())


class DescriptorUpdateTask(Base):
    __tablename__ = "descriptor_update_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    form_id = Column(String(50), nullable=False)
    tax_year = Column(Integer, nullable=False)
    field_id = Column(String(500), default="")
    change_type = Column(String(50), default="")
    yaml_suggestion = Column(Text, default="")
    resolved = Column(Boolean, default=False)


class AdminAlert(Base):
    __tablename__ = "admin_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    form_id = Column(String(50), nullable=False)
    tax_year = Column(Integer, nullable=False)
    severity = Column(String(20), nullable=False)  # BREAKING | IMPORTANT | MINOR
    message = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    acknowledged = Column(Boolean, default=False)
